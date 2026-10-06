import type { AppDB } from '../db/db';
import { META_LAST_BACKUP } from '../db/repo';
import { localDateOf, todayStr } from '../domain/date';
import type {
  BodyLog,
  BodyMeasurement,
  DayLog,
  ExerciseSetting,
  FavoriteFood,
  FoodEntry,
  MetaRow,
  NutritionTarget,
  Plan,
  Program,
  SetLog,
} from '../domain/types';

export const FORMAT_VERSION = 2;
/** 프로그램 파일 형식은 백업과 따로 센다. */
export const PROGRAM_FORMAT_VERSION = 1;

export class ImportError extends Error {}

export interface BackupFile {
  type: 'workout-backup';
  formatVersion: 1 | 2;
  exportedAt: string;
  programs: Program[];
  plans: Plan[];
  setLogs: SetLog[];
  dayLogs: DayLog[];
  bodyLogs: BodyLog[];
  exerciseSettings: ExerciseSetting[];
  meta: MetaRow[];
  foodEntries: FoodEntry[];
  favoriteFoods: FavoriteFood[];
  nutritionTargets: NutritionTarget[];
  bodyMeasurements: BodyMeasurement[];
}

export type Parsed = { kind: 'program'; program: Program } | { kind: 'backup'; backup: BackupFile };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v !== '';

function fail(message: string): never {
  throw new ImportError(message);
}

function checkVersion(data: Obj, max: number) {
  if (typeof data.formatVersion !== 'number') fail('파일 형식 버전이 없습니다.');
  if (data.formatVersion > max) fail('이 파일은 더 새로운 버전의 앱에서 만든 것입니다. 앱을 새 버전으로 갱신한 뒤 다시 시도하세요.');
}

function checkProgram(data: Obj): Program {
  checkVersion(data, PROGRAM_FORMAT_VERSION);
  if (!isStr(data.id) || !isStr(data.name)) fail('프로그램 파일에 이름이 없습니다.');
  if (!Array.isArray(data.blocks) || data.blocks.length === 0) fail('프로그램 파일에 블록이 없습니다.');
  for (const block of data.blocks as unknown[]) {
    if (!isObj(block) || !Array.isArray(block.weeks) || block.weeks.length === 0) fail('프로그램 파일의 블록 구조가 잘못됐습니다.');
    for (const week of block.weeks as unknown[]) {
      if (!isObj(week) || typeof week.rest !== 'boolean' || !Array.isArray(week.days)) fail('프로그램 파일의 주 구조가 잘못됐습니다.');
      for (const day of week.days as unknown[]) {
        if (!isObj(day) || typeof day.dayNo !== 'number' || typeof day.optional !== 'boolean' || !Array.isArray(day.exercises)) {
          fail('프로그램 파일의 요일 구조가 잘못됐습니다.');
        }
        for (const exercise of day.exercises as unknown[]) {
          if (!isObj(exercise) || !isStr(exercise.name) || !Array.isArray(exercise.rows)) fail('프로그램 파일의 종목 구조가 잘못됐습니다.');
          if (exercise.alternatives !== undefined && (!Array.isArray(exercise.alternatives) || !exercise.alternatives.every(isStr))) {
            fail('프로그램 파일의 대체 운동 목록이 잘못됐습니다.');
          }
          for (const row of exercise.rows as unknown[]) {
            if (!isObj(row) || !Number.isInteger(row.sets) || (row.sets as number) < 1 || typeof row.reps !== 'string') {
              fail('프로그램 파일의 세트 구조가 잘못됐습니다.');
            }
          }
        }
      }
    }
  }
  const chart = data.rpeChart;
  if (!isObj(chart) || !Array.isArray(chart.reps) || !Array.isArray(chart.rows) || chart.rows.length === 0) {
    fail('프로그램 파일에 RPE 차트가 없습니다.');
  }
  return data as unknown as Program;
}

const TABLE_KEYS: [keyof BackupFile, string][] = [
  ['programs', 'id'],
  ['plans', 'id'],
  ['setLogs', 'id'],
  ['dayLogs', 'id'],
  ['bodyLogs', 'date'],
  ['exerciseSettings', 'exerciseName'],
  ['meta', 'key'],
  ['foodEntries', 'id'],
  ['favoriteFoods', 'id'],
  ['nutritionTargets', 'startDate'],
  ['bodyMeasurements', 'date'],
];

/** 버전 2에서 생긴 테이블. 버전 1 백업에는 없으므로 빈 배열로 본다. */
const V2_TABLES = ['foodEntries', 'favoriteFoods', 'nutritionTargets', 'bodyMeasurements'];

function checkBackup(data: Obj): BackupFile {
  checkVersion(data, FORMAT_VERSION);
  if (data.formatVersion === 1) {
    for (const table of V2_TABLES) if (data[table] === undefined) data[table] = [];
  }
  for (const [table, key] of TABLE_KEYS) {
    const rows = data[table];
    if (!Array.isArray(rows)) fail('백업 파일의 내용이 빠져 있습니다.');
    for (const row of rows as unknown[]) {
      if (!isObj(row) || !isStr(row[key])) fail('백업 파일의 기록이 손상됐습니다.');
    }
  }
  for (const program of data.programs as Obj[]) checkProgram(program);
  return data as unknown as BackupFile;
}

export function parseImport(text: string): Parsed {
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    fail('이 앱의 파일이 아닙니다. 프로그램 파일이나 백업 파일(.json)을 골라 주세요.');
  }
  if (!isObj(data)) fail('이 앱의 파일이 아닙니다.');
  if (data.type === 'workout-program') return { kind: 'program', program: checkProgram(data) };
  if (data.type === 'workout-backup') return { kind: 'backup', backup: checkBackup(data) };
  fail('이 앱의 파일이 아닙니다. 프로그램 파일이나 백업 파일(.json)을 골라 주세요.');
}

export async function exportBackup(db: AppDB, now: Date = new Date()): Promise<BackupFile> {
  const exportedAt = now.toISOString();
  await db.meta.put({ key: META_LAST_BACKUP, value: exportedAt });
  return {
    type: 'workout-backup',
    formatVersion: 2,
    exportedAt,
    programs: await db.programs.toArray(),
    plans: await db.plans.toArray(),
    setLogs: await db.setLogs.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    bodyLogs: await db.bodyLogs.toArray(),
    exerciseSettings: await db.exerciseSettings.toArray(),
    meta: await db.meta.toArray(),
    foodEntries: await db.foodEntries.toArray(),
    favoriteFoods: await db.favoriteFoods.toArray(),
    nutritionTargets: await db.nutritionTargets.toArray(),
    bodyMeasurements: await db.bodyMeasurements.toArray(),
  };
}

export async function applyBackup(db: AppDB, backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.programs.bulkPut(backup.programs);
    await db.plans.bulkPut(backup.plans);
    await db.setLogs.bulkPut(backup.setLogs);
    await db.dayLogs.bulkPut(backup.dayLogs);
    await db.bodyLogs.bulkPut(backup.bodyLogs);
    await db.exerciseSettings.bulkPut(backup.exerciseSettings);
    await db.meta.bulkPut(backup.meta);
    await db.foodEntries.bulkPut(backup.foodEntries);
    await db.favoriteFoods.bulkPut(backup.favoriteFoods);
    await db.nutritionTargets.bulkPut(backup.nutritionTargets);
    await db.bodyMeasurements.bulkPut(backup.bodyMeasurements);
  });
}

export async function applyProgram(db: AppDB, program: Program): Promise<void> {
  await db.programs.put(program);
}

export function backupSummary(backup: BackupFile) {
  const dates = [
    ...backup.setLogs.filter((l) => l.doneAt).map((l) => localDateOf(l.doneAt!)),
    ...backup.bodyLogs.map((b) => b.date),
    ...backup.foodEntries.map((f) => f.date),
    ...backup.bodyMeasurements.map((m) => m.date),
  ].sort();
  return {
    setCount: backup.setLogs.filter((l) => l.done).length,
    bodyCount: backup.bodyLogs.length,
    foodCount: backup.foodEntries.length,
    measureCount: backup.bodyMeasurements.length,
    programNames: backup.programs.map((p) => p.name),
    from: dates[0] ?? null,
    to: dates.at(-1) ?? null,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `workout-backup-${todayStr(now)}.json`;
}
