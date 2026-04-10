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

// ========================================
// 투자 뉴스 전용 요약 엔드포인트
// ========================================
app.post('/api/summarize-funding', summarizeLimiter, async (req, res) => {
  try {
    const { title, content, accessCode } = req.body;

    const serverKey = process.env.ANTHROPIC_API_KEY;
    const requiredCode = process.env.ACCESS_CODE;

    let aiKey = null;
    if (serverKey) {
      if (requiredCode) {
        if (!accessCode || accessCode !== requiredCode) {
          return res.status(403).json({ error: 'AI 기능을 사용하려면 올바른 액세스 코드가 필요합니다.' });
        }
      }
      aiKey = serverKey;
    }

    if (!aiKey) {
      return res.status(503).json({ error: '투자 뉴스 모드는 AI가 필요합니다. ANTHROPIC_API_KEY를 설정해주세요.' });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: aiKey });

    // 현재 월/주차 계산
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    // 일요일=0 기준, 월요일 시작 주차 계산
    const weekNumber = Math.ceil((day + ((firstDayOfMonth + 6) % 7)) / 7);
    const weekLabel = `${month}월 ${weekNumber}주차`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `당신은 스타트업 투자 뉴스 분석 전문가입니다. 아래 기사에서 투자 정보를 구조화하여 추출해주세요.

반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "companyName": "투자받은 기업명",
  "serviceName": "서비스/제품명 (기업명과 다를 수 있음, 같으면 기업명과 동일하게)",
  "companyWebsite": "회사 공식 웹사이트 URL (예: https://example.com)",
  "round": "투자 라운드 (예: Seed, Pre-A, Series A, Series B 등)",
  "amount": "투자 금액 (예: 30억, 100억 등)",
  "investors": ["투자사1", "투자사2"],
  "reasons": ["투자 이유 1 (한 줄 요약)", "투자 이유 2", "투자 이유 3"],
  "source": "출처: 매체명",
  "caption": "인스타그램 캡션 텍스트"
}

규칙:
1. 기사에서 명확히 언급된 정보만 추출하세요.
2. reasons는 기사에서 투자 이유/배경을 3~5개 핵심 포인트로 요약하세요.
3. 각 reason은 ~에요/~해요체로, 한 줄(30자 이내)로 작성하세요.
4. 투자사는 기사에 언급된 모든 투자사를 포함하세요 (리드 투자사를 맨 앞에).
5. 금액이 명시되지 않았으면 "비공개"로 표시하세요.
6. round가 명확하지 않으면 기사 맥락에서 유추하되, 불확실하면 "투자"로 표시하세요.
7. companyWebsite는 기사에 언급된 회사 공식 웹사이트 URL을 추출하세요. 없으면 빈 문자열로.
8. caption은 인스타그램 게시글 캡션입니다. 아래 형식으로 작성하세요:
   - 첫 줄: "every_startup [투자사]가 [서비스/기업] 관련 스타트업 [기업명]에 [라운드] 투자를 집행했습니다." 형태로 핵심 요약
   - 이후 2~3개 문단으로 투자 배경, 서비스 특징, 기술력 등을 ~합니다/~했습니다 존댓말로 요약
   - 마지막 문단 앞에 "💡" 이모지를 붙이고, 게시자의 개인적인 의견/코멘트를 1~2문장으로 작성 (호기심/감탄/응원 톤)
   - 전체 길이: 150~300자`,
      messages: [
        {
          role: 'user',
          content: `기사 제목: ${title}\n\n기사 본문:\n${content.substring(0, 5000)}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI 응답을 파싱할 수 없습니다.' });
    }

    const data = JSON.parse(jsonMatch[0]);

    res.json({
      weekLabel,
      companyName: data.companyName || '기업명',
      serviceName: data.serviceName || data.companyName || '서비스명',
      companyWebsite: data.companyWebsite || '',
      round: data.round || '투자',
      amount: data.amount || '비공개',
      roundAmount: `${data.round || '투자'} ${data.amount || ''}`.trim(),
      investors: data.investors || [],
      reasons: data.reasons || [],
      source: data.source || '출처: 원문 기사',
      caption: data.caption || '',
    });
  } catch (error) {
    console.error('Funding summarize error:', error.message);
    res.status(500).json({ error: '투자 정보 추출에 실패했습니다.' });
  }
});

// ========================================
// 로고 스크래핑 엔드포인트
// ========================================
app.post('/api/fetch-logo', crawlLimiter, async (req, res) => {
  try {
    const { companyWebsite } = req.body;
    if (!companyWebsite) {
      return res.json({ logoUrl: null });
    }

    // URL 정규화
    let baseUrl = companyWebsite;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }

    let logoSourceUrl = null;

    // 1) 회사 웹사이트에서 og:image, apple-touch-icon, favicon 추출
    try {
      const siteRes = await axios.get(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const html = typeof siteRes.data === 'string' ? siteRes.data : '';
      const dom = new JSDOM(html, { url: baseUrl });
      const doc = dom.window.document;

      // og:image
      const ogImage = doc.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.getAttribute('content')) {
        logoSourceUrl = new URL(ogImage.getAttribute('content'), baseUrl).href;
      }

      // apple-touch-icon (보통 깔끔한 정사각형 로고)
      if (!logoSourceUrl) {
        const touchIcon = doc.querySelector('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]');
        if (touchIcon && touchIcon.getAttribute('href')) {
          logoSourceUrl = new URL(touchIcon.getAttribute('href'), baseUrl).href;
        }
      }

      // 큰 사이즈 favicon
      if (!logoSourceUrl) {
        const icons = doc.querySelectorAll('link[rel="icon"]');
        let bestSize = 0;
        icons.forEach(icon => {
          const sizes = icon.getAttribute('sizes') || '';
          const sizeNum = parseInt(sizes.split('x')[0]) || 0;
          if (sizeNum > bestSize && icon.getAttribute('href')) {
            bestSize = sizeNum;
            logoSourceUrl = new URL(icon.getAttribute('href'), baseUrl).href;
          }
        });
      }

      // 기본 favicon fallback
      if (!logoSourceUrl) {
        const favicon = doc.querySelector('link[rel="shortcut icon"], link[rel="icon"]');
        if (favicon && favicon.getAttribute('href')) {
          logoSourceUrl = new URL(favicon.getAttribute('href'), baseUrl).href;
        }
      }
    } catch (e) {
      // 사이트 접근 실패
    }

    // 2) Clearbit Logo API fallback
    if (!logoSourceUrl) {
      try {
        const domain = new URL(baseUrl).hostname;
        const clearbitUrl = `https://logo.clearbit.com/${domain}`;
        await axios.head(clearbitUrl, { timeout: 5000 });
        logoSourceUrl = clearbitUrl;
      } catch (e) {
        // Clearbit에도 없음
      }
    }

    if (!logoSourceUrl) {
      return res.json({ logoUrl: null });
    }

    // 이미지를 base64로 변환하여 반환 (CORS 회피)
    try {
      const imgRes = await axios.get(logoSourceUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const contentType = imgRes.headers['content-type'] || 'image/png';
      const base64 = Buffer.from(imgRes.data).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;

      res.json({ logoUrl: dataUrl });
    } catch (e) {
      res.json({ logoUrl: null });
    }
  } catch (error) {
    console.error('Logo fetch error:', error.message);
    res.json({ logoUrl: null });
  }
});

// ========================================
// 채용 정보 스크래핑 엔드포인트
// ========================================
app.post('/api/scrape-hiring', crawlLimiter, async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: '회사명을 입력해주세요.', positions: [] });
    }

    const positions = [];

    // 1) 원티드 API 시도
    try {
      const wantedRes = await axios.get('https://www.wanted.co.kr/api/v4/jobs', {
        params: {
          query: companyName,
          country: 'kr',
          job_sort: 'job.latest_order',
          years: -1,
          limit: 20,
          offset: 0,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        timeout: 10000,
      });

      if (wantedRes.data && wantedRes.data.data) {
        for (const job of wantedRes.data.data) {
          if (job.position) {
            positions.push(job.position);
          } else if (job.title) {
            positions.push(job.title);
          }
        }
      }

      if (positions.length > 0) {
        return res.json({ positions: [...new Set(positions)].slice(0, 10), source: 'wanted.co.kr' });
      }
    } catch (e) {
      // wanted API 실패, 다음 방법 시도
    }

    // 2) 원티드 검색 페이지 HTML 파싱 시도
    try {
      const searchUrl = `https://www.wanted.co.kr/search?query=${encodeURIComponent(companyName)}&tab=position`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        timeout: 10000,
      });

      const html = typeof response.data === 'string' ? response.data : '';
      // __NEXT_DATA__ 에서 job 정보 추출 시도
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        const jobs = nextData?.props?.pageProps?.jobs || nextData?.props?.pageProps?.data || [];
        if (Array.isArray(jobs)) {
          for (const job of jobs) {
            const title = job.position || job.title || job.name;
            if (title) positions.push(title);
          }
        }
      }

      if (positions.length > 0) {
        return res.json({ positions: [...new Set(positions)].slice(0, 10), source: 'wanted.co.kr' });
      }
    } catch (e) {
      // HTML 파싱 실패
    }

    // 3) 채용 정보를 찾지 못한 경우
    res.json({ positions: [], source: null });
  } catch (error) {
    console.error('Hiring scrape error:', error.message);
    res.json({ positions: [], source: null });
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
