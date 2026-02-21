import { useRef, useState, useCallback } from 'react';
import { CardData, DesignConfig, generateId } from '../types';
import CardCanvas from '../components/CardCanvas';
import DesignPanel from '../components/DesignPanel';
import { downloadSingleCard, downloadAllCardsAsZip } from '../utils/download';

interface EditorPageProps {
  cards: CardData[];
  setCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  design: DesignConfig;
  setDesign: React.Dispatch<React.SetStateAction<DesignConfig>>;
  onBack: () => void;
}

export default function EditorPage({
  cards,
  setCards,
  design,
  setDesign,
  onBack,
}: EditorPageProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const addCard = () => {
    if (cards.length >= 10) return;
    const newCard: CardData = {
      id: generateId(),
      type: 'body',
      subtitle: '소제목을 입력하세요',
      body: '새 카드 내용을 입력하세요.',
    };
    // 마지막 카드(ending) 앞에 삽입
    setCards((prev) => [...prev.slice(0, -1), newCard, prev[prev.length - 1]]);
    setSelectedIndex(cards.length - 1);
  };

  const deleteCard = (index: number) => {
    if (cards.length <= 2) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex >= cards.length - 1) {
      setSelectedIndex(Math.max(0, cards.length - 2));
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleDownloadSingle = async () => {
    const el = cardRefs.current[selectedIndex];
    if (!el) return;
    setDownloading(true);
    try {
      await downloadSingleCard(el, selectedIndex);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadAllCardsAsZip(cardRefs.current.slice(0, cards.length));
    } finally {
      setDownloading(false);
    }
  };

  const previewScale = 420 / 1080;

  const cardTypeLabel = (type: string, index: number) => {
    if (type === 'title') return '표지';
    if (type === 'ending') return '마무리';
    return `본문 ${index}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 상단 바 */}
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

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 카드 리스트 + 디자인 패널 */}
        <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* 카드 리스트 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                {card.type === 'title' && (
                  <div className="space-y-2">
                    <input
                      value={card.title || ''}
                      onChange={(e) =>
                        updateCard(index, { title: e.target.value })
                      }
                      placeholder="제목"
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                    <input
                      value={card.subtitle || ''}
                      onChange={(e) =>
                        updateCard(index, { subtitle: e.target.value })
                      }
                      placeholder="부제"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                    <input
                      value={card.tags || ''}
                      onChange={(e) =>
                        updateCard(index, { tags: e.target.value })
                      }
                      placeholder="태그 (예: #스타트업 #로봇 #테크)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none text-indigo-500"
                    />
                  </div>
                )}

                {card.type === 'body' && (
                  <div className="space-y-2">
                    <input
                      value={card.subtitle || ''}
                      onChange={(e) =>
                        updateCard(index, { subtitle: e.target.value })
                      }
                      placeholder="소제목"
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                    <textarea
                      value={card.body || ''}
                      onChange={(e) =>
                        updateCard(index, { body: e.target.value })
                      }
                      placeholder="본문 내용"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none resize-none"
                    />
                  </div>
                )}

                {card.type === 'ending' && (
                  <div className="space-y-2">
                    <textarea
                      value={card.body || ''}
                      onChange={(e) =>
                        updateCard(index, { body: e.target.value })
                      }
                      placeholder="마무리 멘트"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none resize-none"
                    />
                    <input
                      value={card.source || ''}
                      onChange={(e) =>
                        updateCard(index, { source: e.target.value })
                      }
                      placeholder="출처"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                )}

                {/* 삭제 버튼 */}
                {cards.length > 2 && (
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

            {/* 카드 추가 버튼 */}
            {cards.length < 10 && (
              <button
                onClick={addCard}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                + 카드 추가
              </button>
            )}
          </div>

          {/* 디자인 패널 */}
          <div className="border-t border-slate-200 p-4 max-h-[380px] overflow-y-auto">
            <DesignPanel design={design} onChange={setDesign} />
          </div>
        </div>

        {/* 우측: 미리보기 */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-800/5">
          {/* 카드 미리보기 영역 */}
          <div
            className="rounded-xl overflow-hidden shadow-2xl shadow-slate-400/20"
            style={{
              width: 1080 * previewScale,
              height: 1350 * previewScale,
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              <CardCanvas card={cards[selectedIndex]} design={design} />
            </div>
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              &#8249;
            </button>

            <div className="flex items-center gap-2">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === selectedIndex
                      ? 'bg-indigo-500 scale-125'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() =>
                setSelectedIndex(
                  Math.min(cards.length - 1, selectedIndex + 1)
                )
              }
              disabled={selectedIndex === cards.length - 1}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              &#8250;
            </button>
          </div>

          <div className="text-sm text-slate-500 mt-2">
            {selectedIndex + 1} / {cards.length}
          </div>

          {/* 다운로드 버튼 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownloadSingle}
              disabled={downloading}
              className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl shadow-md hover:bg-slate-50 disabled:opacity-50 transition-all text-sm"
            >
              {downloading ? '처리 중...' : '현재 카드 다운로드'}
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
            >
              {downloading ? '처리 중...' : '전체 ZIP 다운로드'}
            </button>
          </div>
        </div>
      </div>

      {/* 숨겨진 렌더링 영역 (다운로드용) */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
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
    </div>
  );
}
