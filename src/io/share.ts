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
  const file = new File([JSON.stringify(data)], fileName, { type: 'application/json' });
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }
  download(fileName, data);
  return 'downloaded';
}
