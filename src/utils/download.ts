import html2canvas from 'html2canvas';
import JSZip from 'jszip';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

export async function downloadSingleCard(
  element: HTMLElement,
  index: number
) {
  const blob = await captureCardAsBlob(element);
  downloadBlob(blob, `card-${index + 1}.png`);
}

export async function downloadAllCardsAsZip(
  elements: (HTMLElement | null)[]
) {
  const zip = new JSZip();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;
    const blob = await captureCardAsBlob(el);
    zip.file(`card-${i + 1}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'card-news.zip');
}
