import { downloadJson } from './download';

interface ShareNavigator {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title?: string }) => Promise<void>;
}

export type ShareResult = { kind: 'shared' } | { kind: 'cancelled' } | { kind: 'downloaded'; reason: string };

/** 공유 창(드라이브, 카카오톡 등)으로 보낸다. 지원하지 않거나 실패하면 다운로드 폴더에 저장하고 그 이유를 돌려준다. */
export async function shareOrDownload(
  fileName: string,
  data: unknown,
  nav: ShareNavigator = navigator as ShareNavigator,
  download: (fileName: string, data: unknown) => void = downloadJson,
): Promise<ShareResult> {
  const text = JSON.stringify(data);
  // 안드로이드 크롬은 json 파일 공유를 막는다. 그때는 같은 내용을 txt 파일로 보낸다(가져오기에서 txt도 고를 수 있다).
  const candidates = [
    new File([text], fileName, { type: 'application/json' }),
    new File([text], fileName.replace(/\.json$/, '.txt'), { type: 'text/plain' }),
  ];
  let reason: string;
  if (!nav.share || !nav.canShare) {
    reason = '이 브라우저에는 파일 공유 기능이 없음';
  } else {
    const file = candidates.find((f) => nav.canShare!({ files: [f] }));
    if (!file) {
      reason = '이 브라우저가 백업 파일 공유를 허용하지 않음';
    } else {
      try {
        await nav.share({ files: [file], title: file.name });
        return { kind: 'shared' };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return { kind: 'cancelled' };
        reason = `공유 실패 (${err instanceof Error ? `${err.name}: ${err.message}` : String(err)})`;
      }
    }
  }
  download(fileName, data);
  return { kind: 'downloaded', reason };
}
