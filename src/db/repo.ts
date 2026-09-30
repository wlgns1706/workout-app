import { dayLogId } from '../domain/progress';
import {
  DEFAULT_REST_SECONDS,
  type BodyLog,
  type DayLog,
  type ExerciseSetting,
  type Plan,
  type SetLog,
} from '../domain/types';
import { toKg } from '../domain/units';
import type { AppDB } from './db';

export const META_LAST_BACKUP = 'lastBackupAt';

export async function activePlan(db: AppDB): Promise<Plan | undefined> {
  return db.plans.orderBy('createdAt').last();
}

export function weekLogs(db: AppDB, planId: string, planWeek: number): Promise<SetLog[]> {
  return db.setLogs.where('[planId+planWeek]').equals([planId, planWeek]).toArray();
}

export function exerciseHistory(db: AppDB, exerciseName: string): Promise<SetLog[]> {
  return db.setLogs.where('exerciseName').equals(exerciseName).toArray();
}

export async function saveSetLog(db: AppDB, log: SetLog): Promise<void> {
  const weightKg = log.weight == null ? null : toKg(log.weight, log.unit);
  await db.setLogs.put({ ...log, weightKg });
}

export async function deleteSetLog(db: AppDB, id: string): Promise<void> {
  await db.setLogs.delete(id);
}

export function emptyDayLog(planId: string, planWeek: number, dayNo: number): DayLog {
  return {
    id: dayLogId(planId, planWeek, dayNo),
    planId,
    planWeek,
    dayNo,
    startedAt: null,
    finishedAt: null,
    cardioDone: false,
    optionChoices: [],
    note: '',
    deferred: [],
  };
}

export async function patchDayLog(
  db: AppDB,
  planId: string,
  planWeek: number,
  dayNo: number,
  patch: Partial<DayLog>,
): Promise<void> {
  await db.transaction('rw', db.dayLogs, async () => {
    const base = emptyDayLog(planId, planWeek, dayNo);
    const current = (await db.dayLogs.get(base.id)) ?? base;
    await db.dayLogs.put({ ...current, ...patch, id: base.id });
  });
}

export function defaultSetting(exerciseName: string): ExerciseSetting {
  return { exerciseName, unit: 'kg', restSeconds: DEFAULT_REST_SECONDS, note: '' };
}

export async function patchSetting(db: AppDB, exerciseName: string, patch: Partial<ExerciseSetting>): Promise<void> {
  await db.transaction('rw', db.exerciseSettings, async () => {
    const current = (await db.exerciseSettings.get(exerciseName)) ?? defaultSetting(exerciseName);
    await db.exerciseSettings.put({ ...current, ...patch, exerciseName });
  });
}

export function emptyBodyLog(date: string): BodyLog {
  return {
    date,
    weightKg: null,
    sleepHours: null,
    nutrition: null,
    motivation: null,
    confidence: null,
    stress: null,
    fatigue: null,
  };
}

export async function getMeta(db: AppDB, key: string): Promise<string | null> {
  return (await db.meta.get(key))?.value ?? null;
}

export async function setMeta(db: AppDB, key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

/** 세트 기록과 몸 상태 기록 중 가장 이른 시각. 백업 알림의 기준이다. */
export async function earliestRecordAt(db: AppDB): Promise<string | null> {
  const times: string[] = [];
  await db.setLogs.each((log) => {
    if (log.doneAt) times.push(log.doneAt);
  });
  const firstBody = await db.bodyLogs.orderBy('date').first();
  if (firstBody) {
    const [y, m, d] = firstBody.date.split('-').map(Number);
    times.push(new Date(y, m - 1, d).toISOString());
  }
  return times.length === 0 ? null : times.sort()[0];
}
