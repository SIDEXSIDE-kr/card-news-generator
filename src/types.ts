export interface CardData {
  id: string;
  type: 'title' | 'body' | 'ending' | 'funding-cover' | 'funding-overview' | 'funding-analysis' | 'funding-hiring' | 'funding-cta';
  title?: string;
  subtitle?: string;
  body?: string;
  source?: string;
  tags?: string;
  // Funding-specific fields
  weekLabel?: string;
  companyName?: string;
  round?: string;
  serviceName?: string;
  roundAmount?: string;
  investors?: string[];
  reasons?: string[];
  positions?: string[];
  hiringSource?: string;
  logoUrl?: string;
  emoji?: string;
}

export interface FundingData {
  weekLabel: string;
  companyName: string;
  serviceName: string;
  emoji: string;
  companyWebsite: string;
  round: string;
  amount: string;
  roundAmount: string;
  investors: string[];
  reasons: string[];
  source: string;
  caption: string;
}

export interface DesignConfig {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  textAlign: 'left' | 'center';
}

export const COLOR_PRESETS = [
  { bg: '#0C0C0C', text: '#ffffff', accent: '#FF633E', name: '에브리 스타트업' },
];

export const FONT_OPTIONS = [
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조' },
];

export const DEFAULT_DESIGN: DesignConfig = {
  backgroundColor: '#0C0C0C',
  textColor: '#ffffff',
  accentColor: '#FF633E',
  fontFamily: "'Noto Sans KR', sans-serif",
  textAlign: 'left',
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
