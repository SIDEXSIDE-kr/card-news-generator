import React, { forwardRef } from 'react';
import { CardData, DesignConfig } from '../types';

interface CardCanvasProps {
  card: CardData;
  design: DesignConfig;
}

/** 숫자 + 단위를 강조색으로 하이라이트 */
function renderHighlightedText(
  text: string,
  accentColor: string,
  style: React.CSSProperties
): React.ReactNode {
  const regex =
    /(\d[\d,.]*\s*(?:만|억|조|원|명|개|건|호|배|위|년|월|일|시간|분|초|%|km|kg|g|ml|L|달러|조원|만원|만명|천명|천만)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <span
        key={`h-${match.index}`}
        style={{ color: accentColor, fontWeight: 600 }}
      >
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <span style={style}>{parts}</span>;
}

const CardCanvas = forwardRef<HTMLDivElement, CardCanvasProps>(
  ({ card, design }, ref) => {
    const BOTTOM_BAR_HEIGHT = 72;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          position: 'relative',
          backgroundColor: card.type === 'funding-cta' ? '#ffffff' : design.backgroundColor,
          color: card.type === 'funding-cta' ? '#1e293b' : design.textColor,
          fontFamily: design.fontFamily,
          overflow: 'hidden',
        }}
      >
        {/* 배경 그라데이션 오버레이 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(168deg, rgba(255,255,255,0.06) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* 미세 도트 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* 투자 표지: 상단 그라데이션 + 이모지 */}
        {card.type === 'funding-cover' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '45%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: 200, lineHeight: 1 }}>
                {card.emoji || '🚀'}
              </span>
            </div>
          </>
        )}

        {/* 컨텐츠 영역 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: BOTTOM_BAR_HEIGHT,
            padding: '60px 72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* ====== 투자 뉴스: 표지 카드 ====== */}
          {card.type === 'funding-cover' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                height: '100%',
                textAlign: 'left',
              }}
            >
              {/* 주차 뱃지 */}
              <div style={{ marginBottom: 36 }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 40,
                    fontWeight: 600,
                    color: '#ffffff',
                    backgroundColor: design.accentColor,
                    padding: '12px 28px 16px',
                    borderRadius: 10,
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                  }}
                >
                  {card.weekLabel || '0월 0주차'}
                </span>
              </div>

              {/* 기업명 */}
              <h1
                style={{
                  fontSize: 110,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  margin: 0,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '-2px',
                }}
              >
                {card.companyName || '기업명'}
              </h1>

              {/* 금액 + 라운드 */}
              <h2
                style={{
                  fontSize: 110,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  margin: 0,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '-2px',
                }}
              >
                {card.roundAmount || card.round || '투자'}
              </h2>

              {/* 투자 유치 */}
              <h2
                style={{
                  fontSize: 110,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  margin: 0,
                  letterSpacing: '-1px',
                }}
              >
                투자 유치
              </h2>
            </div>
          )}

          {/* ====== 투자 뉴스: 개요 카드 ====== */}
          {card.type === 'funding-overview' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 40,
                textAlign: 'left',
                width: '100%',
              }}
            >
              {/* 서비스명 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: design.accentColor,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  서비스
                </span>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    wordBreak: 'keep-all',
                  }}
                >
                  {card.serviceName || '서비스명'}
                </span>
              </div>

              {/* 구분선 */}
              <div
                style={{
                  width: '100%',
                  height: 1,
                  backgroundColor: design.textColor,
                  opacity: 0.15,
                }}
              />

              {/* 라운드 · 규모 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: design.accentColor,
                    letterSpacing: '2px',
                  }}
                >
                  라운드 · 규모
                </span>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: design.accentColor,
                  }}
                >
                  {card.roundAmount || 'Pre-A 30억'}
                </span>
              </div>

              {/* 구분선 */}
              <div
                style={{
                  width: '100%',
                  height: 1,
                  backgroundColor: design.textColor,
                  opacity: 0.15,
                }}
              />

              {/* 투자사 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: design.accentColor,
                    letterSpacing: '2px',
                  }}
                >
                  투자사
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(card.investors && card.investors.length > 0
                    ? card.investors
                    : ['투자사 정보 없음']
                  ).map((investor, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 36,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        wordBreak: 'keep-all',
                      }}
                    >
                      {investor}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====== 투자 뉴스: 분석 카드 ====== */}
          {card.type === 'funding-analysis' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 36,
                textAlign: 'left',
                width: '100%',
              }}
            >
              {/* 제목 */}
              <h2
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: 0,
                  color: design.accentColor,
                  wordBreak: 'keep-all',
                  textShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                왜 투자받았을까?
              </h2>
              <div
                style={{
                  width: 48,
                  height: 3,
                  backgroundColor: design.accentColor,
                  borderRadius: 2,
                  opacity: 0.6,
                }}
              />

              {/* 이유 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(card.reasons && card.reasons.length > 0
                  ? card.reasons
                  : ['투자 이유를 입력하세요']
                ).map((reason, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 600,
                        color: design.accentColor,
                        lineHeight: 1.7,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 500,
                        lineHeight: 1.7,
                        wordBreak: 'keep-all',
                      }}
                    >
                      {reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====== 투자 뉴스: 채용 카드 ====== */}
          {card.type === 'funding-hiring' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 36,
                textAlign: 'left',
                width: '100%',
              }}
            >
              {/* 제목 */}
              <h2
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: 0,
                  color: design.accentColor,
                  wordBreak: 'keep-all',
                  textShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                지금 채용 중!
              </h2>
              <div
                style={{
                  width: 48,
                  height: 3,
                  backgroundColor: design.accentColor,
                  borderRadius: 2,
                  opacity: 0.6,
                }}
              />

              {/* 채용 목록 */}
              {card.positions && card.positions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {card.positions.map((pos, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: design.accentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 34,
                          fontWeight: 500,
                          lineHeight: 1.6,
                          wordBreak: 'keep-all',
                        }}
                      >
                        {pos}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                    padding: '40px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 36,
                      fontWeight: 500,
                      opacity: 0.7,
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    현재 공개 채용 정보가 없어요
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 400,
                      opacity: 0.5,
                      textAlign: 'center',
                    }}
                  >
                    채용 페이지를 직접 확인해보세요
                  </span>
                </div>
              )}

              {/* 출처 */}
              {card.source && (
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 300,
                    opacity: 0.4,
                    marginTop: 'auto',
                  }}
                >
                  {card.source}
                </span>
              )}
            </div>
          )}

          {/* ====== 투자 뉴스: CTA 팔로우 카드 ====== */}
          {card.type === 'funding-cta' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                gap: 48,
              }}
            >
              {/* 메인 타이틀 */}
              <h2
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: 0,
                  color: '#1e293b',
                  letterSpacing: '-0.5px',
                }}
              >
                세상의 모든 스타트업
              </h2>

              {/* 인스타 프로필 카드 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  borderRadius: 24,
                  padding: '24px 40px',
                  minWidth: 500,
                }}
              >
                {/* 프로필 이미지 */}
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                    <img
                    src="/profile.png"
                    alt="profile"
                    style={{
                      width: '110%',
                      height: 'auto',
                      objectFit: 'cover',
                      marginTop: -4,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* 유저네임 */}
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    color: '#ffffff',
                    flex: 1,
                    textAlign: 'left',
                    position: 'relative',
                    top: -4,
                  }}
                >
                  every_startup
                </span>

                {/* 팔로우 버튼 */}
                <div
                  style={{
                    padding: '10px 36px 14px',
                    backgroundColor: '#3b82f6',
                    borderRadius: 12,
                    fontSize: 28,
                    fontWeight: 600,
                    color: '#ffffff',
                    flexShrink: 0,
                    textAlign: 'center',
                    position: 'relative',
                    top: -4,
                  }}
                >
                  팔로우
                </div>
              </div>

              {/* 설명 문구 */}
              <p
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  lineHeight: 1.8,
                  margin: 0,
                  color: '#1e293b',
                  opacity: 0.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {'팔로우하면\n스타트업 최신 소식과 정보를\n빠르게 만날 수 있어요!'}
              </p>
            </div>
          )}

          {/* ====== 표지 카드 ====== */}
          {card.type === 'title' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
                textAlign: design.textAlign,
                alignItems:
                  design.textAlign === 'center' ? 'center' : 'flex-start',
              }}
            >
              {/* 카테고리 태그 */}
              {card.tags && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    justifyContent:
                      design.textAlign === 'center' ? 'center' : 'flex-start',
                  }}
                >
                  {card.tags
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: design.accentColor,
                          letterSpacing: '0.5px',
                          textShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                </div>
              )}

              {/* 장식 라인 */}
              <div
                style={{
                  width: 60,
                  height: 4,
                  backgroundColor: design.accentColor,
                  borderRadius: 2,
                  alignSelf:
                    design.textAlign === 'center' ? 'center' : 'flex-start',
                }}
              />

              {/* 제목 */}
              <h1
                style={{
                  fontSize: 68,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: 0,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                  textShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  letterSpacing: '-0.5px',
                }}
              >
                {card.title || '제목을 입력하세요'}
              </h1>

              {/* 부제 */}
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  margin: 0,
                  opacity: 0.75,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                  textShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}
              >
                {card.subtitle || '부제를 입력하세요'}
              </p>
            </div>
          )}

          {/* ====== 본문 카드 ====== */}
          {card.type === 'body' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
                textAlign: 'left',
                width: '100%',
              }}
            >
              {/* 소제목 */}
              {card.subtitle && (
                <>
                  <h2
                    style={{
                      fontSize: 48,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      margin: 0,
                      color: design.accentColor,
                      wordBreak: 'keep-all',
                      whiteSpace: 'pre-wrap',
                      textShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {card.subtitle}
                  </h2>
                  <div
                    style={{
                      width: 48,
                      height: 3,
                      backgroundColor: design.accentColor,
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                </>
              )}

              {/* 본문 텍스트 (숫자 하이라이트) */}
              {renderHighlightedText(
                card.body || '내용을 입력하세요',
                design.accentColor,
                {
                  fontSize: 38,
                  fontWeight: 400,
                  lineHeight: 1.85,
                  wordBreak: 'keep-all' as const,
                  whiteSpace: 'pre-wrap' as const,
                  textShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  display: 'block',
                }
              )}
            </div>
          )}

          {/* ====== 마지막 카드 ====== */}
          {card.type === 'ending' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 36,
                width: '100%',
              }}
            >
              {/* 마무리 문구 */}
              <p
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.6,
                  margin: 0,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                  textShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                {card.body || '더 많은 스타트업 소식이\n궁금하다면?'}
              </p>

              {/* CTA 버튼 스타일 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div
                  style={{
                    padding: '18px 48px',
                    backgroundColor: design.accentColor,
                    color: design.backgroundColor,
                    borderRadius: 50,
                    fontSize: 30,
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  @every_startup 팔로우
                </div>
              </div>

              {/* 구분선 */}
              <div
                style={{
                  width: 60,
                  height: 2,
                  backgroundColor: design.textColor,
                  opacity: 0.2,
                }}
              />

              {/* 출처 */}
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 300,
                  lineHeight: 1.5,
                  margin: 0,
                  opacity: 0.5,
                  wordBreak: 'keep-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {card.source || '출처를 입력하세요'}
              </p>
            </div>
          )}
        </div>

        {/* ====== 하단 바 ====== */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            height: BOTTOM_BAR_HEIGHT,
            padding: '0 60px',
            backgroundColor: card.type === 'funding-cta' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 300,
              opacity: 0.6,
              color: card.type === 'funding-cta' ? '#ffffff' : design.textColor,
              position: 'relative',
              top: -2,
            }}
          >
            세상의 모든 스타트업 | 모든 여정을 응원합니다
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: card.type === 'funding-cta' ? '#ffffff' : design.textColor,
              opacity: 0.7,
              position: 'relative',
              top: -2,
            }}
          >
            @every_startup
          </span>
        </div>
      </div>
    );
  }
);

CardCanvas.displayName = 'CardCanvas';
export default CardCanvas;
