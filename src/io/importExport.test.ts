import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppDB } from '../db/db';
import { patchDayLog, patchSetting, saveSetLog, setMeta } from '../db/repo';
import { newSetLog } from '../domain/progress';
import { makeTestProgram } from '../domain/testProgram';
import type { Plan } from '../domain/types';
import {
  applyBackup,
  applyProgram,
  backupFileName,
  backupSummary,
  exportBackup,
  ImportError,
  parseImport,
  type BackupFile,
} from './importExport';

let db: AppDB;
let n = 0;
beforeEach(() => {
  db = new AppDB(`io-test-${n++}`);
});

const plan: Plan = {
  id: 'p1',
  programId: 'test-program',
  startDate: '2026-10-05',
  blockSequence: [1, 1, 2, 3],
  createdAt: '2026-10-01T00:00:00.000Z',
};

async function seed(target: AppDB) {
  await target.programs.put(makeTestProgram());
  await target.plans.put(plan);
  await saveSetLog(target, {
    ...newSetLog('p1', 0, 1, { exerciseIndex: 0, rowIndex: 0, setIndex: 0, exerciseName: '운동A1', rpe: 7 }, 'kg'),
    weight: 60,
    reps: 5,
    done: true,
    doneAt: '2026-10-05T10:00:00.000Z',
    performedDayNo: 1,
  });
  await patchDayLog(target, 'p1', 0, 1, { cardioDone: true });
  await target.bodyLogs.put({
    date: '2026-10-07',
    weightKg: 80.5,
    sleepHours: 7,
    nutrition: 8,
    motivation: null,
    confidence: null,
    stress: null,
    fatigue: null,
  });
  await patchSetting(target, '운동A1', { unit: 'lb', note: '시트 3칸' });
  await setMeta(target, 'lastBackupAt', '2026-10-06T00:00:00.000Z');
}

async function dump(target: AppDB) {
  return {
    programs: await target.programs.toArray(),
    plans: await target.plans.toArray(),
    setLogs: await target.setLogs.toArray(),
    dayLogs: await target.dayLogs.toArray(),
    bodyLogs: await target.bodyLogs.toArray(),
    exerciseSettings: await target.exerciseSettings.toArray(),
  };
}

describe('백업 왕복', () => {
  test('내보낸 뒤 다른 기기에서 가져오면 모든 테이블이 같다', async () => {
    await seed(db);
    const text = JSON.stringify(await exportBackup(db));
    const parsed = parseImport(text);
    expect(parsed.kind).toBe('backup');
    const other = new AppDB(`io-test-other-${n++}`);
    if (parsed.kind === 'backup') await applyBackup(other, parsed.backup);
    expect(await dump(other)).toEqual(await dump(db));
  });
  test('가져오면 기존 데이터는 전부 교체된다', async () => {
    await seed(db);
    const backup = await exportBackup(db);
    await db.bodyLogs.put({ ...(await db.bodyLogs.toArray())[0], date: '2026-10-09' });
    await applyBackup(db, backup);
    expect((await db.bodyLogs.toArray()).map((b) => b.date)).toEqual(['2026-10-07']);
  });
  test('내보내면 마지막 백업 시각을 기록한다', async () => {
    await seed(db);
    const now = new Date('2026-10-20T09:00:00.000Z');
    const backup = await exportBackup(db, now);
    expect(backup.exportedAt).toBe(now.toISOString());
    expect((await db.meta.get('lastBackupAt'))?.value).toBe(now.toISOString());
  });
});

describe('parseImport: 잘못된 파일', () => {
  const bad = (text: string) => () => parseImport(text);
  test('JSON이 아닌 파일', () => {
    expect(bad('PK\u0003\u0004 엑셀 파일 내용')).toThrow(ImportError);
    expect(bad('')).toThrow(ImportError);
  });
  test('다른 앱의 JSON', () => {
    expect(bad('{"foo": 1}')).toThrow(ImportError);
    expect(bad('[1, 2, 3]')).toThrow(ImportError);
    expect(bad('null')).toThrow(ImportError);
  });
  test('앱보다 높은 형식 버전', () => {
    const p = { ...makeTestProgram(), formatVersion: 2 };
    expect(bad(JSON.stringify(p))).toThrow(/버전/);
  });
  test('블록이 없는 프로그램', () => {
    expect(bad(JSON.stringify({ ...makeTestProgram(), blocks: [] }))).toThrow(ImportError);
  });
  test('세트 수가 숫자가 아닌 프로그램', () => {
    const p = makeTestProgram();
    (p.blocks[0].weeks[0].days[0].exercises[0].rows[0] as { sets: unknown }).sets = '3';
    expect(bad(JSON.stringify(p))).toThrow(ImportError);
  });
  test('RPE 차트가 없는 프로그램', () => {
    const { rpeChart: _omit, ...rest } = makeTestProgram();
    expect(bad(JSON.stringify(rest))).toThrow(ImportError);
  });
  test('테이블이 빠진 백업', () => {
    expect(bad(JSON.stringify({ type: 'workout-backup', formatVersion: 1, exportedAt: 'x', programs: [] }))).toThrow(ImportError);
  });
  test('id가 없는 기록이 들어 있는 백업', async () => {
    await seed(db);
    const backup = await exportBackup(db);
    (backup.setLogs[0] as { id?: string }).id = undefined;
    expect(bad(JSON.stringify(backup))).toThrow(ImportError);
  });
});

describe('parseImport: 올바른 파일', () => {
  test('프로그램 파일을 알아본다', () => {
    const parsed = parseImport(JSON.stringify(makeTestProgram()));
    expect(parsed.kind).toBe('program');
  });
});

describe('applyBackup: 실패하면 기존 데이터를 지킨다', () => {
  test('저장 도중 오류가 나면 아무것도 바뀌지 않는다', async () => {
    await seed(db);
    const before = await dump(db);
    const broken = { ...(await exportBackup(db)), bodyLogs: [{ weightKg: 1 }] } as unknown as BackupFile;
    await expect(applyBackup(db, broken)).rejects.toThrow();
    expect(await dump(db)).toEqual(before);
  });
});

describe('applyProgram', () => {
  test('같은 id의 프로그램을 덮어쓰고 기록은 그대로 둔다', async () => {
    await seed(db);
    await applyProgram(db, { ...makeTestProgram(), name: '새 이름' });
    expect((await db.programs.get('test-program'))?.name).toBe('새 이름');
    expect(await db.setLogs.count()).toBe(1);
  });
});

describe('backupSummary, backupFileName', () => {
  test('기록 개수와 기간을 요약한다', async () => {
    await seed(db);
    expect(backupSummary(await exportBackup(db))).toEqual({
      setCount: 1,
      bodyCount: 1,
      programNames: ['테스트 프로그램'],
      from: '2026-10-05',
      to: '2026-10-07',
    });
  });
  test('빈 백업', async () => {
    expect(backupSummary(await exportBackup(db))).toMatchObject({ setCount: 0, bodyCount: 0, from: null, to: null });
  });
  test('파일 이름에 날짜가 들어간다', () => {
    expect(backupFileName(new Date(2026, 9, 20, 9, 0))).toBe('workout-backup-2026-10-20.json');
  });
});
