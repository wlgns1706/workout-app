import { downloadJson } from './download';

interface ShareNavigator {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title?: string }) => Promise<void>;
}

/** 공유 창(드라이브, 카카오톡 등)으로 보낸다. 지원하지 않거나 실패하면 다운로드 폴더에 저장한다. */
export async function shareOrDownload(
  fileName: string,
  data: unknown,
  nav: ShareNavigator = navigator as ShareNavigator,
  download: (fileName: string, data: unknown) => void = downloadJson,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = JSON.stringify(data);
  // 안드로이드 크롬은 json 파일 공유를 막는다. 그때는 같은 내용을 txt 파일로 보낸다(가져오기에서 txt도 고를 수 있다).
  const candidates = [
    new File([text], fileName, { type: 'application/json' }),
    new File([text], fileName.replace(/\.json$/, '.txt'), { type: 'text/plain' }),
  ];
  const file = candidates.find((f) => nav.canShare?.({ files: [f] }));
  if (nav.share && file) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }
  download(fileName, data);
  return 'downloaded';
}
