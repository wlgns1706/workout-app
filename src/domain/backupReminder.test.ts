import { describe, expect, test } from 'vitest';
import { shouldRemindBackup } from './backupReminder';

const now = new Date('2026-10-20T12:00:00.000Z');

describe('shouldRemindBackup', () => {
  test('기록이 하나도 없으면 알리지 않는다', () => {
    expect(shouldRemindBackup(null, null, now)).toBe(false);
  });
  test('백업한 적이 없고 첫 기록이 7일 넘었으면 알린다', () => {
    expect(shouldRemindBackup(null, '2026-10-05T10:00:00.000Z', now)).toBe(true);
  });
  test('백업한 적이 없어도 첫 기록이 7일 안쪽이면 알리지 않는다', () => {
    expect(shouldRemindBackup(null, '2026-10-16T10:00:00.000Z', now)).toBe(false);
  });
  test('마지막 백업이 7일 넘었으면 알린다', () => {
    expect(shouldRemindBackup('2026-10-13T11:59:00.000Z', '2026-10-05T10:00:00.000Z', now)).toBe(true);
  });
  test('마지막 백업이 7일 안쪽이면 알리지 않는다', () => {
    expect(shouldRemindBackup('2026-10-14T12:00:00.000Z', '2026-10-05T10:00:00.000Z', now)).toBe(false);
  });
});
