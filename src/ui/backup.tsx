import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { earliestRecordAt, getMeta, META_LAST_BACKUP } from '../db/repo';
import { daysSinceBackup, shouldRemindBackup } from '../domain/backupReminder';
import { localDateOf, todayStr } from '../domain/date';
import { runBackup } from '../io/importExport';
import { shareOrDownload } from '../io/share';

export interface BackupStatus {
  last: string | null;
  due: boolean; // 7일 넘게 백업하지 않았다
  days: number | null; // 마지막 백업에서 지난 날 수
  today: boolean; // 오늘 백업했다
}

/** 백업 상태. 읽는 중이면 undefined다. */
export function useBackupStatus(): BackupStatus | undefined {
  return useLiveQuery(async () => {
    const [last, earliest] = await Promise.all([getMeta(db, META_LAST_BACKUP), earliestRecordAt(db)]);
    const now = new Date();
    return {
      last,
      due: shouldRemindBackup(last, earliest, now),
      days: daysSinceBackup(last, now),
      today: last != null && localDateOf(last) === todayStr(now),
    };
  }, []);
}

export function backupAgeText(status: BackupStatus): string {
  if (status.last == null) return '아직 백업한 적이 없어요';
  if (status.today) return '오늘 백업했어요';
  return `마지막 백업 ${status.days}일 전`;
}

/** 누르면 바로 공유 창을 띄워 백업한다. */
export function BackupButton({ label = '지금 백업', className = 'btn small primary' }: { label?: string; className?: string }) {
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  async function backup() {
    try {
      const result = await runBackup(db, shareOrDownload);
      if (result === 'shared') setMessage({ kind: 'ok', text: '백업 파일을 보냈습니다.' });
      if (result === 'downloaded') setMessage({ kind: 'ok', text: '백업 파일을 다운로드 폴더에 저장했습니다. (내 파일 → 다운로드)' });
      if (result === 'cancelled') setMessage(null);
    } catch {
      setMessage({ kind: 'error', text: '백업 파일을 만들지 못했습니다.' });
    }
  }
  return (
    <>
      <button type="button" className={className} onClick={backup}>{label}</button>
      {message && <div className={message.kind} role="status">{message.text}</div>}
    </>
  );
}
