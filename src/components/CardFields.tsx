import { CardData } from '../types';

type ArrayField = 'investors' | 'reasons' | 'positions';

interface CardFieldsProps {
  card: CardData;
  onChange: (updates: Partial<CardData>) => void;
  onArrayChange: (field: ArrayField, itemIndex: number, value: string) => void;
  onArrayAdd: (field: ArrayField) => void;
  onArrayRemove: (field: ArrayField, itemIndex: number) => void;
}

/* 모바일에서는 16px(text-base)이어야 iOS가 포커스 시 화면을 확대하지 않는다 */
const base =
  'w-full px-3 py-2.5 text-base lg:text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none';

/**
 * 카드 한 장의 편집 필드.
 * 데스크톱 카드 리스트와 모바일 편집 탭에서 공용으로 쓴다.
 * (데스크톱 리스트에서는 카드 클릭 = 선택이므로 버튼은 전파를 막는다)
 */
export default function CardFields({
  card,
  onChange,
  onArrayChange,
  onArrayAdd,
  onArrayRemove,
}: CardFieldsProps) {
  /** 투자사 / 이유 / 직군처럼 여러 줄을 넣는 항목 */
  const arrayEditor = (
    field: ArrayField,
    label: string,
    itemLabel: string,
    numbered = false
  ) => (
    <>
      <label className="block text-xs font-medium text-slate-500 mt-1">
        {label}
      </label>
      {(card[field] || []).map((value, i) => (
        <div key={i} className="flex gap-1 items-center">
          {numbered && (
            <span className="px-1 py-2 text-sm text-indigo-500 font-bold shrink-0">
              {i + 1}.
            </span>
          )}
          <input
            value={value}
            onChange={(e) => onArrayChange(field, i, e.target.value)}
            placeholder={`${itemLabel} ${i + 1}`}
            className={`${base} flex-1`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArrayRemove(field, i);
            }}
            className="px-3 py-2 text-red-400 hover:text-red-600 text-sm shrink-0"
            aria-label={`${itemLabel} ${i + 1} 삭제`}
          >
            &#10005;
          </button>
        </div>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArrayAdd(field);
        }}
        className="text-xs text-indigo-500 hover:text-indigo-700 py-1"
      >
        + {itemLabel} 추가
      </button>
    </>
  );

  switch (card.type) {
    case 'title':
      return (
        <div className="space-y-2">
          <input
            value={card.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="제목"
            className={`${base} font-bold`}
          />
          <input
            value={card.subtitle || ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="부제"
            className={base}
          />
          <input
            value={card.tags || ''}
            onChange={(e) => onChange({ tags: e.target.value })}
            placeholder="태그 (예: #스타트업 #로봇 #테크)"
            className={`${base} text-indigo-500`}
          />
        </div>
      );

    case 'body':
      return (
        <div className="space-y-2">
          <input
            value={card.subtitle || ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="소제목"
            className={`${base} font-bold`}
          />
          <textarea
            value={card.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="본문 내용"
            rows={4}
            className={`${base} resize-none`}
          />
        </div>
      );

    case 'ending':
      return (
        <div className="space-y-2">
          <textarea
            value={card.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="마무리 멘트"
            rows={2}
            className={`${base} resize-none`}
          />
          <input
            value={card.source || ''}
            onChange={(e) => onChange({ source: e.target.value })}
            placeholder="출처"
            className={base}
          />
        </div>
      );

    /* ── 투자 뉴스: 표지 ── */
    case 'funding-cover':
      return (
        <div className="space-y-2">
          <input
            value={card.emoji || ''}
            onChange={(e) => onChange({ emoji: e.target.value })}
            placeholder="이모지 (예: 🐂, ☕, 💰)"
            className={`${base} text-2xl text-center`}
          />
          <input
            value={card.weekLabel || ''}
            onChange={(e) => onChange({ weekLabel: e.target.value })}
            placeholder="0월 0주차"
            className={`${base} text-indigo-500`}
          />
          <input
            value={card.companyName || ''}
            onChange={(e) => onChange({ companyName: e.target.value })}
            placeholder="기업명"
            className={`${base} font-bold`}
          />
          <input
            value={card.roundAmount || ''}
            onChange={(e) => onChange({ roundAmount: e.target.value })}
            placeholder="금액 + 라운드 (예: 20억 pre-A)"
            className={base}
          />
        </div>
      );

    /* ── 투자 뉴스: 서비스 개요 ── */
    case 'funding-overview':
      return (
        <div className="space-y-2">
          <input
            value={card.serviceName || ''}
            onChange={(e) => onChange({ serviceName: e.target.value })}
            placeholder="서비스명"
            className={`${base} font-bold`}
          />
          <input
            value={card.roundAmount || ''}
            onChange={(e) => onChange({ roundAmount: e.target.value })}
            placeholder="라운드 규모 (예: Pre-A 30억)"
            className={`${base} text-indigo-500`}
          />
          {arrayEditor('investors', '투자사', '투자사')}
        </div>
      );

    /* ── 투자 뉴스: 투자 이유 ── */
    case 'funding-analysis':
      return (
        <div className="space-y-2">
          {arrayEditor('reasons', '왜 투자받았을까?', '이유', true)}
        </div>
      );

    /* ── 투자 뉴스: 채용 정보 ── */
    case 'funding-hiring':
      return (
        <div className="space-y-2">
          {card.hiringSource ? (
            <div className="flex items-start gap-1 p-2 bg-emerald-50 rounded-lg">
              <span className="text-emerald-600 text-xs mt-0.5">&#10003;</span>
              <p className="text-xs text-emerald-700">
                출처: <span className="font-semibold">{card.hiringSource}</span>
                에서 가져온 정보입니다. 정확한지 확인해주세요.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-1 p-2 bg-amber-50 rounded-lg">
              <span className="text-amber-600 text-xs mt-0.5">!</span>
              <p className="text-xs text-amber-700">
                채용 정보를 자동으로 찾지 못했습니다. 직접 추가하거나
                비워두세요.
              </p>
            </div>
          )}
          {arrayEditor('positions', '채용 중인 직군', '직군')}
          <input
            value={card.source || ''}
            onChange={(e) => onChange({ source: e.target.value })}
            placeholder="출처"
            className={`${base} mt-2`}
          />
        </div>
      );

    /* ── 투자 뉴스: CTA (고정 디자인) ── */
    case 'funding-cta':
      return (
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400">고정 디자인 카드입니다.</p>
        </div>
      );

    default:
      return null;
  }
}
