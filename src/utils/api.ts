import { CardData, generateId } from '../types';

interface CrawlResponse {
  title: string;
  content: string;
  excerpt: string;
}

interface ConfigResponse {
  hasServerAI: boolean;
  requiresAccessCode: boolean;
}

interface SummarizeResponse {
  cards: Array<{
    type: 'title' | 'body' | 'ending';
    title?: string;
    subtitle?: string;
    body?: string;
    source?: string;
    tags?: string;
  }>;
  aiUsed: boolean;
}

export async function getServerConfig(): Promise<ConfigResponse> {
  const res = await fetch('/api/config');
  if (!res.ok) return { hasServerAI: false, requiresAccessCode: false };
  return res.json();
}

export async function crawlUrl(url: string): Promise<CrawlResponse> {
  const res = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'URL 크롤링에 실패했습니다.');
  }

  return res.json();
}

export async function summarizeArticle(
  title: string,
  content: string,
  cardCount: number,
  accessCode?: string
): Promise<{ cards: CardData[]; aiUsed: boolean }> {
  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, cardCount, accessCode }),
  });

  if (!res.ok) {
    throw new Error('카드 생성에 실패했습니다.');
  }

  const data: SummarizeResponse = await res.json();

  const cards = data.cards.map((card) => ({
    ...card,
    id: generateId(),
  }));

  return { cards, aiUsed: data.aiUsed };
}
