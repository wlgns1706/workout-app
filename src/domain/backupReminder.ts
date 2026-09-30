const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 기준 시각(마지막 백업, 없으면 첫 기록)에서 7일이 지났으면 true */
export function shouldRemindBackup(lastBackupAt: string | null, earliestRecordAt: string | null, now: Date): boolean {
  if (earliestRecordAt == null) return false;
  const reference = lastBackupAt ?? earliestRecordAt;
  return now.getTime() - new Date(reference).getTime() >= WEEK_MS;
}
