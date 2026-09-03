import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardData, DesignConfig } from '../types';
import CardCanvas from './CardCanvas';

const CARD_W = 1080;
const CARD_H = 1350;

interface PreviewStageProps {
  card: CardData;
  design: DesignConfig;
  /**
   * 미리보기의 최대 폭 (CSS 길이).
   * 실제 폭은 min(부모 폭, maxWidth)이고 높이는 4:5 비율로 따라간다.
   */
  maxWidth: string;
  className?: string;
}

/**
 * 1080x1350 카드를 컨테이너 폭에 맞춰 축소해 보여준다.
 * 폭을 실측해 배율을 계산하므로 화면 크기가 바뀌어도 정확히 들어맞는다.
 */
export default function PreviewStage({
  card,
  design,
  maxWidth,
  className = '',
}: PreviewStageProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 주소창 접힘·회전 등으로 뷰포트가 변할 때도 다시 측정
  useEffect(() => {
    const onResize = () => {
      const el = boxRef.current;
      if (el) setWidth(el.getBoundingClientRect().width);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const scale = width / CARD_W;

  return (
    <div
      ref={boxRef}
      className={`overflow-hidden rounded-xl shadow-xl shadow-slate-400/20 bg-slate-200 mx-auto ${className}`}
      style={{
        width: '100%',
        maxWidth,
        aspectRatio: `${CARD_W} / ${CARD_H}`,
      }}
    >
      {width > 0 && (
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: CARD_W,
            height: CARD_H,
          }}
        >
          <CardCanvas card={card} design={design} />
        </div>
      )}
    </div>
  );
}
