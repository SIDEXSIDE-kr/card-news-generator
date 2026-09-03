import { useEffect, useMemo, useState } from 'react';
import {
  canShareFiles,
  shareFiles,
  downloadFiles,
  downloadFilesAsZip,
} from '../utils/download';

interface ExportSheetProps {
  files: File[];
  onClose: () => void;
}

/**
 * 렌더링이 끝난 카드 이미지를 보여주고 저장/공유 수단을 제공한다.
 *
 * 이미지를 미리 만들어 두고 여기서 공유를 실행하는 2단계 구조인 이유:
 * iOS Safari는 navigator.share()가 사용자 탭 직후에 호출되지 않으면 차단한다.
 * 렌더링(수 초)을 먼저 끝내 두면 공유 버튼 탭 → 즉시 share() 가 되어 안정적이다.
 */
export default function ExportSheet({ files, onClose }: ExportSheetProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const shareSupported = canShareFiles(files);

  const handleShare = async () => {
    setMessage('');
    try {
      const done = await shareFiles(files, '카드뉴스');
      if (done) setMessage('공유했습니다.');
    } catch {
      setMessage('공유에 실패했습니다. 아래 다운로드를 사용해주세요.');
    }
  };

  const handleZip = async () => {
    setBusy(true);
    setMessage('');
    try {
      await downloadFilesAsZip(files);
      setMessage('ZIP 파일을 저장했습니다.');
    } catch {
      setMessage('ZIP 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleEach = () => {
    setMessage('');
    downloadFiles(files);
    setMessage(`PNG ${files.length}장을 저장합니다.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative w-full lg:max-w-md bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="dialog"
        aria-modal="true"
        aria-label="카드 저장 및 공유"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800">
            카드 {files.length}장 준비 완료
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 text-xl leading-none"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {previews.map((p) => (
              <img
                key={p.name}
                src={p.url}
                alt={p.name}
                className="h-32 w-auto rounded-lg border border-slate-200 shrink-0"
              />
            ))}
          </div>

          {shareSupported ? (
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              눌러서 '이미지 저장'을 고르면 갤러리(사진 앱)에 바로 들어가요.
              인스타그램으로 곧장 보낼 수도 있어요.
            </p>
          ) : !window.isSecureContext ? (
            <p className="text-xs text-amber-600 mt-3 leading-relaxed">
              지금은 http로 접속 중이라 '파일'에만 저장돼요. 갤러리에 바로
              저장하려면 https 주소로 접속해야 합니다.
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              이 브라우저는 공유 기능을 지원하지 않아요. 다운로드를
              사용해주세요.
            </p>
          )}

          {message && (
            <p className="text-xs text-indigo-600 mt-2">{message}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0">
          {shareSupported && (
            <button
              onClick={handleShare}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
            >
              갤러리에 저장 / 공유
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleEach}
              disabled={busy}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              PNG 낱장
            </button>
            <button
              onClick={handleZip}
              disabled={busy}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {busy ? '처리 중...' : 'ZIP 묶음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
