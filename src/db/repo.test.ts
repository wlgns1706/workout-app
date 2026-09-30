import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { newSetLog } from '../domain/progress';
import type { Plan } from '../domain/types';
import { AppDB } from './db';
import {
  activePlan,
  defaultSetting,
  deleteSetLog,
  earliestRecordAt,
  emptyDayLog,
  exerciseHistory,
  getMeta,
  patchDayLog,
  patchSetting,
  saveSetLog,
  setMeta,
  weekLogs,
} from './repo';

let db: AppDB;
let n = 0;
beforeEach(() => {
  db = new AppDB(`test-${n++}`);
});

const plan = (id: string, createdAt: string): Plan => ({
  id,
  programId: 'prog',
  startDate: '2026-10-05',
  blockSequence: [1, 1, 2, 3],
  createdAt,
});

const slot = { exerciseIndex: 0, rowIndex: 0, setIndex: 0, exerciseName: '운동A', rpe: 7 };

describe('activePlan', () => {
  test('일정이 없으면 undefined', async () => {
    expect(await activePlan(db)).toBeUndefined();
  });
  test('가장 최근에 만든 일정을 돌려준다', async () => {
    await db.plans.bulkPut([plan('old', '2026-10-01T00:00:00.000Z'), plan('new', '2027-01-25T00:00:00.000Z')]);
    expect((await activePlan(db))?.id).toBe('new');
  });
});

describe('세트 기록', () => {
  test('저장할 때 kg 환산값을 계산한다', async () => {
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'lb'), weight: 100 });
    const [saved] = await weekLogs(db, 'p1', 0);
    expect(saved.weightKg).toBeCloseTo(45.359237, 6);
  });
  test('무게를 비우면 kg 환산값도 비운다', async () => {
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'kg'), weight: 60 });
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'kg'), weight: null });
    const [saved] = await weekLogs(db, 'p1', 0);
    expect(saved.weight).toBeNull();
    expect(saved.weightKg).toBeNull();
  });
  test('같은 자리에 다시 저장하면 덮어쓴다', async () => {
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'kg'), weight: 60 });
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'kg'), weight: 62.5 });
    expect(await weekLogs(db, 'p1', 0)).toHaveLength(1);
  });
  test('주 단위로 읽는다', async () => {
    await saveSetLog(db, newSetLog('p1', 0, 1, slot, 'kg'));
    await saveSetLog(db, newSetLog('p1', 1, 1, slot, 'kg'));
    await saveSetLog(db, newSetLog('p2', 0, 1, slot, 'kg'));
    expect(await weekLogs(db, 'p1', 0)).toHaveLength(1);
  });
  test('종목 이름으로 모든 일정의 기록을 읽는다', async () => {
    await saveSetLog(db, newSetLog('p1', 0, 1, slot, 'kg'));
    await saveSetLog(db, newSetLog('p2', 3, 2, slot, 'kg'));
    await saveSetLog(db, newSetLog('p1', 0, 1, { ...slot, exerciseIndex: 1, exerciseName: '운동B' }, 'kg'));
    expect(await exerciseHistory(db, '운동A')).toHaveLength(2);
  });
  test('삭제', async () => {
    const log = newSetLog('p1', 0, 1, { ...slot, rowIndex: null }, 'kg');
    await saveSetLog(db, log);
    await deleteSetLog(db, log.id);
    expect(await weekLogs(db, 'p1', 0)).toHaveLength(0);
  });
});

describe('요일 기록', () => {
  test('없으면 기본값으로 만들고 일부만 바꾼다', async () => {
    await patchDayLog(db, 'p1', 0, 1, { cardioDone: true });
    await patchDayLog(db, 'p1', 0, 1, { note: '메모' });
    const saved = await db.dayLogs.get(emptyDayLog('p1', 0, 1).id);
    expect(saved).toMatchObject({ cardioDone: true, note: '메모', finishedAt: null, deferred: [] });
  });
});

describe('종목 설정', () => {
  test('기본값은 kg, 120초, 빈 메모', () => {
    expect(defaultSetting('운동A')).toEqual({ exerciseName: '운동A', unit: 'kg', restSeconds: 120, note: '' });
  });
  test('일부만 바꾼다', async () => {
    await patchSetting(db, '운동A', { unit: 'lb' });
    await patchSetting(db, '운동A', { restSeconds: 90 });
    expect(await db.exerciseSettings.get('운동A')).toEqual({ exerciseName: '운동A', unit: 'lb', restSeconds: 90, note: '' });
  });
});

describe('메타와 첫 기록 시각', () => {
  test('메타 값을 저장하고 읽는다', async () => {
    expect(await getMeta(db, 'lastBackupAt')).toBeNull();
    await setMeta(db, 'lastBackupAt', '2026-10-10T00:00:00.000Z');
    expect(await getMeta(db, 'lastBackupAt')).toBe('2026-10-10T00:00:00.000Z');
  });
  test('기록이 없으면 null', async () => {
    expect(await earliestRecordAt(db)).toBeNull();
  });
  test('세트 기록과 몸 상태 기록 중 가장 이른 시각', async () => {
    await saveSetLog(db, { ...newSetLog('p1', 0, 1, slot, 'kg'), done: true, doneAt: '2026-10-06T10:00:00.000Z' });
    await db.bodyLogs.put({
      date: '2026-10-05',
      weightKg: 80,
      sleepHours: null,
      nutrition: null,
      motivation: null,
      confidence: null,
      stress: null,
      fatigue: null,
    });
    expect(await earliestRecordAt(db)).toBe(new Date(2026, 9, 5).toISOString());
  });
});
