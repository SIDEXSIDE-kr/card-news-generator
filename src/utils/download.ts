import html2canvas from 'html2canvas';
import JSZip from 'jszip';

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function captureCardAsBlob(
  element: HTMLElement
): Promise<Blob> {
  await document.fonts.ready;

  const canvas = await html2canvas(element, {
    width: 1080,
    height: 1350,
    scale: 1,
    useCORS: true,
    logging: false,
    backgroundColor: null,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('이미지 변환에 실패했습니다.'));
      },
      'image/png',
      1.0
    );
  });
}

/**
 * 카드들을 순서대로 PNG File 객체로 렌더링한다.
 * 모바일 메모리를 고려해 한 장씩 순차 처리한다.
 */
export async function captureCardsAsFiles(
  elements: (HTMLElement | null)[],
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  const targets = elements.filter((el): el is HTMLElement => !!el);
  const files: File[] = [];

  for (let i = 0; i < targets.length; i++) {
    const blob = await captureCardAsBlob(targets[i]);
    files.push(
      new File([blob], `card-${i + 1}.png`, { type: 'image/png' })
    );
    onProgress?.(i + 1, targets.length);
    // 렌더링 사이에 프레임을 양보해 모바일에서 UI가 멈추지 않게 함
    await new Promise((r) => setTimeout(r, 0));
  }

  return files;
}

/** 이 브라우저가 파일 공유(웹 공유 API)를 지원하는지 */
export function canShareFiles(files?: File[]): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data: unknown) => boolean;
    share?: (data: unknown) => Promise<void>;
  };
  if (!nav.share || !nav.canShare) return false;
  if (!files || files.length === 0) return true;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * 이미지 파일들을 OS 공유 시트로 넘긴다 (사진 앱 저장 / 인스타 전송 등).
 * 사용자가 취소하면 false를 반환한다.
 * 주의: 반드시 사용자 탭 이벤트에서 곧바로 호출해야 iOS에서 차단되지 않는다.
 */
export async function shareFiles(
  files: File[],
  title = '카드뉴스'
): Promise<boolean> {
  const nav = navigator as Navigator & {
    share?: (data: unknown) => Promise<void>;
  };
  if (!nav.share) throw new Error('이 브라우저는 공유를 지원하지 않습니다.');

  try {
    await nav.share({ files, title });
    return true;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'AbortError') return false;
    throw err;
  }
}

/** 파일들을 개별 PNG로 저장 */
export function downloadFiles(files: File[]) {
  files.forEach((file, i) => {
    setTimeout(() => saveBlob(file, file.name), i * 300);
  });
}

/** 파일들을 ZIP 한 개로 묶어 저장 */
export async function downloadFilesAsZip(files: File[]) {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveBlob(zipBlob, 'card-news.zip');
}

/* ── 기존 호출부 호환용 ───────────────────────────── */

export async function downloadSingleCard(
  element: HTMLElement,
  index: number
) {
  const blob = await captureCardAsBlob(element);
  saveBlob(blob, `card-${index + 1}.png`);
}

export async function downloadAllCardsAsZip(
  elements: (HTMLElement | null)[]
) {
  const files = await captureCardsAsFiles(elements);
  await downloadFilesAsZip(files);
}
