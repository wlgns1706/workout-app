const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** 기준 시각(마지막 백업, 없으면 첫 기록)에서 7일이 지났으면 true */
export function shouldRemindBackup(lastBackupAt: string | null, earliestRecordAt: string | null, now: Date): boolean {
  if (earliestRecordAt == null) return false;
  const reference = lastBackupAt ?? earliestRecordAt;
  return now.getTime() - new Date(reference).getTime() >= WEEK_MS;
}

/** 마지막 백업에서 지난 날 수(내림). 백업한 적이 없으면 null */
export function daysSinceBackup(lastBackupAt: string | null, now: Date): number | null {
  if (lastBackupAt == null) return null;
  return Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / DAY_MS);
}
