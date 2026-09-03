import { useCallback, useEffect, useRef, useState } from 'react';
import { CardData, DesignConfig, generateId } from '../types';
import CardCanvas from '../components/CardCanvas';
import CardFields from '../components/CardFields';
import DesignPanel from '../components/DesignPanel';
import PreviewStage from '../components/PreviewStage';
import ExportSheet from '../components/ExportSheet';
import { useIsMobile } from '../hooks/useMediaQuery';
import { captureCardsAsFiles } from '../utils/download';

interface EditorPageProps {
  cards: CardData[];
  setCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  design: DesignConfig;
  setDesign: React.Dispatch<React.SetStateAction<DesignConfig>>;
  caption: string;
  setCaption: React.Dispatch<React.SetStateAction<string>>;
  onBack: () => void;
}

type ArrayField = 'investors' | 'reasons' | 'positions';

const MAX_CARDS = 10;
const MIN_CARDS = 2;

/** navigator.clipboard는 보안 컨텍스트(https/localhost)에서만 존재한다 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 아래 폴백으로 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function EditorPage({
  cards,
  setCards,
  design,
  setDesign,
  caption,
  setCaption,
  onBack,
}: EditorPageProps) {
  const isMobile = useIsMobile();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<'content' | 'design' | 'caption'>(
    'content'
  );
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [exportFiles, setExportFiles] = useState<File[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 카드가 줄어들면 선택 인덱스를 범위 안으로 되돌린다
  useEffect(() => {
    if (selectedIndex > cards.length - 1) {
      setSelectedIndex(Math.max(0, cards.length - 1));
    }
  }, [cards.length, selectedIndex]);

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  const updateCard = (index: number, updates: Partial<CardData>) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, ...updates } : card))
    );
  };

  const updateArrayField = (
    index: number,
    field: ArrayField,
    itemIndex: number,
    value: string
  ) => {
    setCards((prev) =>
      prev.map((card, i) => {
        if (i !== index) return card;
        const arr = [...(card[field] || [])];
        arr[itemIndex] = value;
        return { ...card, [field]: arr };
      })
    );
  };

  const addArrayItem = (index: number, field: ArrayField) => {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, [field]: [...(card[field] || []), ''] } : card
      )
    );
  };

  const removeArrayItem = (
    index: number,
    field: ArrayField,
    itemIndex: number
  ) => {
    setCards((prev) =>
      prev.map((card, i) => {
        if (i !== index) return card;
        const arr = [...(card[field] || [])];
        arr.splice(itemIndex, 1);
        return { ...card, [field]: arr };
      })
    );
  };

  /** 인덱스를 미리 묶어 CardFields에 넘길 콜백 묶음 */
  const fieldHandlers = (index: number) => ({
    onChange: (updates: Partial<CardData>) => updateCard(index, updates),
    onArrayChange: (field: ArrayField, itemIndex: number, value: string) =>
      updateArrayField(index, field, itemIndex, value),
    onArrayAdd: (field: ArrayField) => addArrayItem(index, field),
    onArrayRemove: (field: ArrayField, itemIndex: number) =>
      removeArrayItem(index, field, itemIndex),
  });

  const addCard = () => {
    if (cards.length >= MAX_CARDS) return;
    const newCard: CardData = {
      id: generateId(),
      type: 'body',
      subtitle: '소제목을 입력하세요',
      body: '새 카드 내용을 입력하세요.',
    };
    // 마지막 카드 바로 앞에 삽입
    setCards((prev) => [...prev.slice(0, -1), newCard, prev[prev.length - 1]]);
    setSelectedIndex(cards.length - 1);
  };

  const deleteCard = (index: number) => {
    if (cards.length <= MIN_CARDS) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      const next = prev > index ? prev - 1 : prev;
      return Math.max(0, Math.min(next, cards.length - 2));
    });
  };

  /** 카드를 PNG로 렌더링한 뒤 저장·공유 시트를 연다 */
  const runExport = async (scope: 'current' | 'all') => {
    const targets =
      scope === 'current'
        ? [cardRefs.current[selectedIndex]]
        : cardRefs.current.slice(0, cards.length);

    if (!targets.some(Boolean)) return;

    setError('');
    setProgress({ done: 0, total: targets.filter(Boolean).length });
    try {
      const files = await captureCardsAsFiles(targets, (done, total) =>
        setProgress({ done, total })
      );
      setExportFiles(files);
    } catch {
      setError('이미지를 만드는 데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setProgress(null);
    }
  };

  const handleCopyCaption = async () => {
    const ok = await copyText(caption);
    setCopied(ok);
    setError(ok ? '' : '복사에 실패했습니다. 길게 눌러 직접 복사해주세요.');
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const cardTypeLabel = (type: string, index: number) => {
    if (type === 'title') return '표지';
    if (type === 'ending') return '마무리';
    if (type === 'funding-cover') return '표지';
    if (type === 'funding-overview') return '서비스 개요';
    if (type === 'funding-analysis') return '투자 이유';
    if (type === 'funding-hiring') return '채용 정보';
    if (type === 'funding-cta') return '팔로우 CTA';
    return `본문 ${index}`;
  };

  const current = cards[selectedIndex];
  const busy = progress !== null;

  /* ── 카드 넘기기 네비게이션 ───────────────────────── */
  const nav = (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
        disabled={selectedIndex === 0}
        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 disabled:opacity-30 transition-all shrink-0"
        aria-label="이전 카드"
      >
        &#8249;
      </button>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === selectedIndex ? 'bg-indigo-500 scale-125' : 'bg-slate-300'
            }`}
            aria-label={`카드 ${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={() =>
          setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1))
        }
        disabled={selectedIndex === cards.length - 1}
        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 disabled:opacity-30 transition-all shrink-0"
        aria-label="다음 카드"
      >
        &#8250;
      </button>
    </div>
  );

  /* ── 다운로드용 숨김 렌더링 영역 ──────────────────── */
  const hiddenRender = (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: -99999,
        top: 0,
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {cards.map((card, i) => (
        <CardCanvas
          key={card.id}
          ref={setCardRef(i)}
          card={card}
          design={design}
        />
      ))}
    </div>
  );

  const overlays = (
    <>
      {busy && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
            <div className="w-8 h-8 mx-auto mb-3 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">
              이미지 만드는 중...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {progress.done} / {progress.total}장
            </p>
          </div>
        </div>
      )}

      {exportFiles && (
        <ExportSheet files={exportFiles} onClose={() => setExportFiles(null)} />
      )}
    </>
  );

  if (!current) return null;

  const captionPanel = (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-600">
          인스타그램 캡션
        </span>
        <button
          onClick={handleCopyCaption}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-2 py-1"
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={isMobile ? 12 : 6}
        className="w-full px-3 py-2 text-base lg:text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none resize-none text-slate-700"
      />
    </div>
  );

  /* ══════════════════ 모바일 레이아웃 ══════════════════ */
  if (isMobile) {
    const tabs = [
      ['content', cardTypeLabel(current.type, selectedIndex)],
      ['design', '디자인'],
      ...(caption ? [['caption', '캡션'] as const] : []),
    ] as const;

    return (
      <div className="bg-slate-100 flex flex-col" style={{ height: '100dvh' }}>
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={onBack}
            className="text-slate-500 text-sm font-medium flex items-center gap-1"
          >
            <span>&#8592;</span> 돌아가기
          </button>
          <h1 className="text-base font-bold text-slate-800">에디터</h1>
          <span className="text-sm text-slate-400">
            {selectedIndex + 1}/{cards.length}
          </span>
        </header>

        {/* 미리보기 */}
        <div className="shrink-0 px-4 pt-4 pb-3">
          <PreviewStage
            card={current}
            design={design}
            maxWidth="min(100%, calc(32dvh * 0.8))"
          />
          <div className="mt-3">{nav}</div>
        </div>

        {/* 탭 */}
        <div className="shrink-0 flex border-b border-slate-200 bg-white">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMobileTab(key as typeof mobileTab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 truncate px-1 ${
                mobileTab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 편집 영역 */}
        <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
          {mobileTab === 'content' && (
            <div className="space-y-4">
              <CardFields card={current} {...fieldHandlers(selectedIndex)} />

              <div className="flex gap-2 pt-1">
                {cards.length < MAX_CARDS && (
                  <button
                    onClick={addCard}
                    className="flex-1 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500"
                  >
                    + 카드 추가
                  </button>
                )}
                {cards.length > MIN_CARDS && (
                  <button
                    onClick={() => deleteCard(selectedIndex)}
                    className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm"
                  >
                    이 카드 삭제
                  </button>
                )}
              </div>
            </div>
          )}

          {mobileTab === 'design' && (
            <DesignPanel design={design} onChange={setDesign} />
          )}

          {mobileTab === 'caption' && captionPanel}
        </div>

        {error && (
          <p className="shrink-0 px-4 py-2 bg-red-50 text-red-600 text-xs">
            {error}
          </p>
        )}

        {/* 하단 고정 액션 바 */}
        <div
          className="shrink-0 bg-white border-t border-slate-200 px-4 pt-3 flex gap-2"
          style={{
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={() => runExport('current')}
            disabled={busy}
            className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm disabled:opacity-50"
          >
            현재 카드
          </button>
          <button
            onClick={() => runExport('all')}
            disabled={busy}
            className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            전체 {cards.length}장 저장 / 공유
          </button>
        </div>

        {hiddenRender}
        {overlays}
      </div>
    );
  }

  /* ══════════════════ 데스크톱 레이아웃 ══════════════════ */
  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>&#8592;</span> 돌아가기
        </button>
        <h1 className="text-lg font-bold text-slate-800">카드뉴스 에디터</h1>
        <div className="text-sm text-slate-400">{cards.length}장</div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 좌측: 카드 리스트 + 캡션 + 디자인 패널 */}
        <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {cards.map((card, index) => (
              <div
                key={card.id}
                onClick={() => setSelectedIndex(index)}
                className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  selectedIndex === index
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                    {cardTypeLabel(card.type, index)}
                  </span>
                  <span className="text-xs text-slate-400">
                    카드 {index + 1}
                  </span>
                </div>

                <CardFields card={card} {...fieldHandlers(index)} />

                {cards.length > MIN_CARDS && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard(index);
                    }}
                    className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}

            {cards.length < MAX_CARDS && (
              <button
                onClick={addCard}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                + 카드 추가
              </button>
            )}
          </div>

          {caption && (
            <div className="border-t border-slate-200 p-4">{captionPanel}</div>
          )}

          <div className="border-t border-slate-200 p-4 max-h-[380px] overflow-y-auto">
            <DesignPanel design={design} onChange={setDesign} />
          </div>
        </div>

        {/* 우측: 미리보기 */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 bg-slate-800/5 overflow-y-auto">
          <PreviewStage
            card={current}
            design={design}
            maxWidth="min(420px, calc(58vh * 0.8))"
          />

          <div className="mt-6">{nav}</div>

          <div className="text-sm text-slate-500 mt-2">
            {selectedIndex + 1} / {cards.length}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => runExport('current')}
              disabled={busy}
              className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl shadow-md hover:bg-slate-50 disabled:opacity-50 transition-all text-sm"
            >
              현재 카드 저장
            </button>
            <button
              onClick={() => runExport('all')}
              disabled={busy}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
            >
              전체 {cards.length}장 저장
            </button>
          </div>
        </div>
      </div>

      {hiddenRender}
      {overlays}
    </div>
  );
}
