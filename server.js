import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ========================================
// 1) Rate Limiting — IP당 요청 횟수 제한
// ========================================
const crawlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 30,                   // 15분에 30회
  message: { error: '요청이 너무 많습니다. 15분 후에 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const summarizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 15,                   // 15분에 15회 (AI 호출은 더 엄격하게)
  message: { error: '요청이 너무 많습니다. 15분 후에 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 프로덕션: 빌드된 프론트엔드 정적 파일 서빙
app.use(express.static(join(__dirname, 'dist')));

// ========================================
// 2) 서버 AI 사용 가능 여부 확인 엔드포인트
// ========================================
app.get('/api/config', (req, res) => {
  res.json({
    hasServerAI: !!process.env.ANTHROPIC_API_KEY,
    requiresAccessCode: !!process.env.ACCESS_CODE,
  });
});

// URL 크롤링 엔드포인트
app.post('/api/crawl', crawlLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL을 입력해주세요.' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000,
      responseType: 'arraybuffer',
    });

    // 인코딩 감지 및 디코딩
    const contentType = response.headers['content-type'] || '';
    let charset = 'utf-8';
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    if (charsetMatch) {
      charset = charsetMatch[1].toLowerCase();
    }

    let html;
    if (charset === 'euc-kr' || charset === 'euc_kr') {
      const decoder = new TextDecoder('euc-kr');
      html = decoder.decode(response.data);
    } else {
      const decoder = new TextDecoder('utf-8');
      html = decoder.decode(response.data);
    }

    // meta 태그에서 charset 재확인
    const metaCharsetMatch = html.match(
      /<meta[^>]+charset=["']?([^"'\s;>]+)/i
    );
    if (
      metaCharsetMatch &&
      (metaCharsetMatch[1].toLowerCase() === 'euc-kr' ||
        metaCharsetMatch[1].toLowerCase() === 'euc_kr') &&
      charset !== 'euc-kr'
    ) {
      const decoder = new TextDecoder('euc-kr');
      html = decoder.decode(response.data);
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res
        .status(422)
        .json({ error: '기사 내용을 추출할 수 없습니다.' });
    }

    res.json({
      title: article.title || '',
      content: article.textContent || '',
      excerpt: article.excerpt || '',
    });
  } catch (error) {
    console.error('Crawl error:', error.message);
    res.status(500).json({ error: 'URL을 가져오는 데 실패했습니다.' });
  }
});

// ========================================
// AI 요약 엔드포인트 (보호됨)
// ========================================
app.post('/api/summarize', summarizeLimiter, async (req, res) => {
  try {
    const { title, content, cardCount = 5, accessCode } = req.body;

    // --- 3) 액세스 코드 검증 ---
    // 서버에 ANTHROPIC_API_KEY가 있는 경우,
    // ACCESS_CODE도 설정되어 있으면 반드시 매칭해야 사용 가능
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const requiredCode = process.env.ACCESS_CODE;

    let aiKey = null;

    if (serverKey) {
      if (requiredCode) {
        // 액세스 코드가 설정된 경우: 코드 매칭 필수
        if (!accessCode || accessCode !== requiredCode) {
          // 코드 불일치 → AI 없이 단순 분할로 fallback
          const cards = simpleTextSplit(title, content, cardCount);
          return res.json({ cards, aiUsed: false });
        }
      }
      aiKey = serverKey;
    }

    if (!aiKey) {
      // 서버에 키가 없으면 단순 분할
      const cards = simpleTextSplit(title, content, cardCount);
      return res.json({ cards, aiUsed: false });
    }

    // AI 호출
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: aiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `당신은 카드뉴스 에디터입니다. 아래 기사를 인스타그램 카드뉴스용 텍스트로 변환해주세요.

규칙:
1. 말투는 ~에요/해요체를 사용하세요.
2. 카드 한 장에 한 가지 핵심 메시지만 담으세요.
3. 카드당 3~4줄(60~80자) 분량으로 작성하세요.
4. 핵심 숫자, 팩트, 데이터를 우선으로 뽑아주세요.
5. 어려운 전문 용어는 쉬운 말로 바꿔주세요.
6. 첫 번째 카드 제목은 질문형 또는 호기심을 유발하는 형태로 작성하세요.
7. 마지막 카드에는 기사 출처를 포함하세요.
8. 원문에 없는 내용을 추가하거나 과장하지 마세요.
9. 총 카드 수는 ${cardCount}장으로 만들어주세요.
10. 표지 카드에는 기사 주제에 맞는 해시태그(tags)를 3~4개 포함하세요.
11. 본문 카드에는 각각 짧고 강렬한 소제목(subtitle)을 반드시 포함하세요.
12. 마지막 카드의 body는 "더 많은 스타트업 소식이 궁금하다면?" 같은 CTA 문구로 작성하세요.

출력 형식 (반드시 유효한 JSON만 출력):
{
  "cards": [
    { "type": "title", "title": "제목", "subtitle": "부제", "tags": "#태그1 #태그2 #태그3" },
    { "type": "body", "subtitle": "소제목", "body": "본문 내용" },
    ...
    { "type": "ending", "body": "마무리 CTA 문구", "source": "출처: 매체명" }
  ]
}

반드시 유효한 JSON만 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.`,
      messages: [
        {
          role: 'user',
          content: `기사 제목: ${title}\n\n기사 본문:\n${content.substring(0, 5000)}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ ...parsed, aiUsed: true });
    }

    const cards = simpleTextSplit(title, content, cardCount);
    res.json({ cards, aiUsed: false });
  } catch (error) {
    console.error('Summarize error:', error.message);
    const { title, content, cardCount = 5 } = req.body;
    const cards = simpleTextSplit(title, content, cardCount);
    res.json({ cards, aiUsed: false });
  }
});

function simpleTextSplit(title, content, cardCount) {
  // 텍스트 정리
  const cleanContent = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();

  const sentences = cleanContent
    .split(/(?<=[.!?다요음])\s+/)
    .filter((s) => s.trim().length > 10);

  const cards = [];

  // 1장: 제목 카드
  cards.push({
    type: 'title',
    title: title || '제목을 입력하세요',
    subtitle:
      sentences.length > 0
        ? sentences[0].substring(0, 60)
        : '부제를 입력하세요',
    tags: '#스타트업 #뉴스 #테크',
  });

  // 2~N-1장: 본문 카드
  const bodyCardCount = Math.max(1, cardCount - 2);
  const sentencesPerCard = Math.max(
    1,
    Math.ceil(sentences.length / (bodyCardCount + 1))
  );

  const subtitles = ['핵심 포인트', '주요 내용', '배경 이야기', '전문가 의견', '향후 전망', '관련 데이터', '업계 반응', '추가 정보'];

  for (let i = 0; i < bodyCardCount; i++) {
    const start = (i + 1) * sentencesPerCard;
    const cardSentences = sentences.slice(start, start + sentencesPerCard);
    const bodyText =
      cardSentences.length > 0
        ? cardSentences.join(' ').substring(0, 200)
        : `카드 ${i + 2}의 내용을 입력하세요.`;

    cards.push({
      type: 'body',
      subtitle: subtitles[i % subtitles.length],
      body: bodyText,
    });
  }

  // 마지막 장: 출처/마무리 카드
  cards.push({
    type: 'ending',
    body: '더 많은 스타트업 소식이\n궁금하다면?',
    source: '출처: 원문 기사',
  });

  return cards;
}

// SPA 라우팅: API가 아닌 모든 요청은 index.html로
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
