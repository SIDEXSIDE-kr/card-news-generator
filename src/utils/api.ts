import { CardData, FundingData, generateId } from '../types';

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

// ========================================
// 투자 뉴스 전용 API
// ========================================

export async function summarizeFundingArticle(
  title: string,
  content: string,
  accessCode?: string
): Promise<FundingData> {
  const res = await fetch('/api/summarize-funding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, accessCode }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || '투자 정보 추출에 실패했습니다.');
  }

  return res.json();
}

export async function fetchLogo(
  companyWebsite: string
): Promise<string | null> {
  if (!companyWebsite) return null;

  try {
    const res = await fetch('/api/fetch-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyWebsite }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.logoUrl || null;
  } catch {
    return null;
  }
}

export async function scrapeHiring(
  companyName: string
): Promise<{ positions: string[]; source: string | null }> {
  const res = await fetch('/api/scrape-hiring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName }),
  });

  if (!res.ok) {
    return { positions: [], source: null };
  }

  return res.json();
}

export function buildFundingCards(
  funding: FundingData,
  positions: string[],
  hiringSource?: string | null
): CardData[] {
  return [
    {
      id: generateId(),
      type: 'funding-cover',
      weekLabel: funding.weekLabel,
      companyName: funding.companyName,
      round: funding.round,
      roundAmount: `${funding.amount || ''} ${funding.round || ''}`.trim(),
      emoji: funding.emoji,
    },
    {
      id: generateId(),
      type: 'funding-overview',
      serviceName: funding.serviceName,
      roundAmount: funding.roundAmount,
      investors: funding.investors,
    },
    {
      id: generateId(),
      type: 'funding-analysis',
      reasons: funding.reasons,
    },
    {
      id: generateId(),
      type: 'funding-hiring',
      positions: positions.length > 0 ? positions : [],
      source: funding.source,
      hiringSource: hiringSource || undefined,
    },
    {
      id: generateId(),
      type: 'funding-cta',
    },
  ];
}
