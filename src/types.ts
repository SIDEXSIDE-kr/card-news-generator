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
  logoUrl?: string;
}

export interface FundingData {
  weekLabel: string;
  companyName: string;
  serviceName: string;
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
  { bg: '#1a1a2e', text: '#ffffff', accent: '#FFD166', name: '다크 네이비' },
  { bg: '#ffffff', text: '#1e293b', accent: '#4f46e5', name: '화이트' },
  { bg: '#0f172a', text: '#e2e8f0', accent: '#38bdf8', name: '미드나이트' },
  { bg: '#1e1e1e', text: '#f5f5f5', accent: '#ff6b6b', name: '다크 모던' },
  { bg: '#2d6a4f', text: '#ffffff', accent: '#95d5b2', name: '포레스트' },
  { bg: '#7c3aed', text: '#ffffff', accent: '#c4b5fd', name: '퍼플' },
  { bg: '#0c4a6e', text: '#e0f2fe', accent: '#38bdf8', name: '오션블루' },
  { bg: '#dbeafe', text: '#1e3a5f', accent: '#3b82f6', name: '파스텔 블루' },
  { bg: '#fef3c7', text: '#92400e', accent: '#f59e0b', name: '웜 옐로' },
  { bg: '#f3e8ff', text: '#581c87', accent: '#a855f7', name: '라벤더' },
];

export const FONT_OPTIONS = [
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조' },
];

export const DEFAULT_DESIGN: DesignConfig = {
  backgroundColor: '#1a1a2e',
  textColor: '#ffffff',
  accentColor: '#FFD166',
  fontFamily: "'Noto Sans KR', sans-serif",
  textAlign: 'left',
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
