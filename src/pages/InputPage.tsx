import { useState, useEffect } from 'react';
import { CardData } from '../types';
import {
  crawlUrl,
  summarizeArticle,
  summarizeFundingArticle,
  scrapeHiring,
  buildFundingCards,
  getServerConfig,
} from '../utils/api';

type Mode = 'general' | 'funding';

interface InputPageProps {
  onGenerate: (cards: CardData[], caption?: string) => void;
}

export default function InputPage({ onGenerate }: InputPageProps) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<Mode>('funding');
  const [accessCode, setAccessCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [cardCount, setCardCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [serverConfig, setServerConfig] = useState({
    hasServerAI: false,
    requiresAccessCode: false,
  });

  useEffect(() => {
    getServerConfig().then(setServerConfig);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setStatus('기사를 가져오는 중...');

    try {
      const article = await crawlUrl(url.trim());

      if (mode === 'funding') {
        // 투자 뉴스 모드
        setStatus('투자 정보를 분석하는 중...');
        const funding = await summarizeFundingArticle(
          article.title,
          article.content,
          accessCode || undefined
        );

        setStatus('채용 정보를 검색하는 중...');
        const hiring = await scrapeHiring(funding.companyName);

        const cards = buildFundingCards(funding, hiring.positions, hiring.source);
        onGenerate(cards, funding.caption);
      } else {
        // 일반 모드
        setStatus('카드뉴스 텍스트를 생성하는 중...');
        const result = await summarizeArticle(
          article.title,
          article.content,
          cardCount,
          accessCode || undefined
        );
        onGenerate(result.cards);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-800 mb-3">
            카드뉴스 생성기
          </h1>
          <p className="text-slate-500 text-lg">
            URL을 입력하면 인스타그램 카드뉴스를 자동으로 만들어드려요
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 space-y-6"
        >
          {/* 모드 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              카드뉴스 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('funding')}
                disabled={loading}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === 'funding'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="text-lg mb-1">&#x1F4B0;</div>
                투자 뉴스
              </button>
              <button
                type="button"
                onClick={() => setMode('general')}
                disabled={loading}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === 'general'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="text-lg mb-1">&#x1F4F0;</div>
                일반 기사
              </button>
            </div>
            {mode === 'funding' && (
              <p className="text-xs text-indigo-500 mt-2">
                표지 → 서비스/라운드/투자사 → 투자 이유 → 채용 정보 → 팔로우 CTA (5장 고정)
              </p>
            )}
          </div>

          {/* URL 입력 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              기사 URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://news.example.com/article/..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-slate-800 placeholder:text-slate-300"
              disabled={loading}
              required
            />
          </div>

          {/* 카드 수 (일반 모드에서만 표시) */}
          {mode === 'general' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                카드 수: {cardCount}장
              </label>
              <input
                type="range"
                min={2}
                max={10}
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full accent-indigo-500"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>2장</span>
                <span>10장</span>
              </div>
            </div>
          )}

          {/* AI 요약 설정 */}
          {serverConfig.hasServerAI && (
            <div>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <span
                  className={`transform transition-transform ${showSettings ? 'rotate-90' : ''}`}
                >
                  ▶
                </span>
                AI 요약 설정
              </button>
              {showSettings && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl space-y-3">
                  {serverConfig.requiresAccessCode && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        액세스 코드
                      </label>
                      <input
                        type="password"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="액세스 코드 입력"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        disabled={loading}
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg">
                    <span className="text-emerald-600 text-xs mt-0.5">&#10003;</span>
                    <p className="text-xs text-emerald-700">
                      AI 요약이 서버에서 안전하게 처리됩니다.
                      {serverConfig.requiresAccessCode
                        ? ' 액세스 코드를 입력하면 AI 요약이 활성화됩니다.'
                        : ' 별도 설정 없이 AI 요약이 자동 적용됩니다.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!serverConfig.hasServerAI && (
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-amber-700">
                AI 요약이 설정되지 않았습니다. 기사 텍스트를 자동 분할하여 카드를 생성합니다.
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* 생성 버튼 */}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-indigo-200 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {status}
              </span>
            ) : (
              '카드뉴스 생성하기'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          인스타그램 4:5 비율 (1080 x 1350px) 카드뉴스를 자동 생성합니다
        </p>
      </div>
    </div>
  );
}
