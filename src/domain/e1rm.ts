import { localDateOf } from './date';
import { targetReps } from './reps';
import type { RpeChart, SetLog, Unit } from './types';
import { fromKg, roundTo } from './units';

export function pctFor(chart: RpeChart, reps: number, rpe: number): number | null {
  if (!Number.isInteger(reps)) return null;
  const col = chart.reps.indexOf(reps);
  if (col < 0) return null;
  const rounded = Math.min(10, Math.max(6.5, Math.round(rpe * 2) / 2));
  const row = chart.rows.find((r) => r.rpe === rounded);
  return row ? row.pct[col] : null;
}

export function estimate1RM(chart: RpeChart, weightKg: number, reps: number, rpe: number): number | null {
  if (!(weightKg > 0)) return null;
  const pct = pctFor(chart, reps, rpe);
  return pct == null ? null : weightKg / pct;
}

export function setE1RM(chart: RpeChart, log: SetLog): number | null {
  if (!log.done || log.type === 'warmup') return null;
  if (log.weightKg == null || log.reps == null) return null;
  const rpe = log.type === 'failure' ? 10 : log.rpe ?? log.prescribedRpe;
  if (rpe == null) return null;
  return estimate1RM(chart, log.weightKg, log.reps, rpe);
}

/** 추천 무게. unit 기준의 값으로 돌려준다. kg은 2.5, lbs는 5 단위다. */
export function recommendWeight(
  chart: RpeChart,
  baseE1RM: number,
  repsText: string,
  rpe: number | null,
  unit: Unit,
): number | null {
  if (rpe == null) return null;
  const reps = targetReps(repsText);
  if (reps == null) return null;
  const pct = pctFor(chart, reps, rpe);
  if (pct == null) return null;
  return roundTo(fromKg(baseE1RM * pct, unit), unit === 'lb' ? 5 : 2.5);
}

export interface DayKey {
  planId: string;
  planWeek: number;
  dayNo: number;
}

export interface Session {
  date: string;
  sets: SetLog[];
}

function sameDay(log: SetLog, key: DayKey): boolean {
  return log.planId === key.planId && log.planWeek === key.planWeek && log.dayNo === key.dayNo;
}

/** 지금 기록 중인 요일을 뺀 과거 기록을 날짜별로 묶는다. 최근 날짜가 앞이다. */
function sessions(history: SetLog[], current: DayKey): Session[] {
  const byDate = new Map<string, SetLog[]>();
  for (const log of history) {
    if (!log.done || !log.doneAt || log.type === 'warmup' || sameDay(log, current)) continue;
    const date = localDateOf(log.doneAt);
    const list = byDate.get(date) ?? [];
    list.push(log);
    byDate.set(date, list);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, sets]) => ({ date, sets: sets.sort((a, b) => (a.doneAt! < b.doneAt! ? -1 : 1)) }));
}

export function lastSession(history: SetLog[], current: DayKey): Session | null {
  return sessions(history, current)[0] ?? null;
}

export interface Prefill {
  weight: number;
  source: 'recommended' | 'last';
}

export function prefill(
  chart: RpeChart,
  history: SetLog[],
  current: DayKey,
  repsText: string,
  rpe: number | null,
  unit: Unit,
): Prefill | null {
  const all = sessions(history, current);
  for (const session of all) {
    const values = session.sets.map((s) => setE1RM(chart, s)).filter((v): v is number => v != null);
    if (values.length === 0) continue;
    const weight = recommendWeight(chart, Math.max(...values), repsText, rpe, unit);
    if (weight != null) return { weight, source: 'recommended' };
    break;
  }
  const last = all[0]?.sets.filter((s) => s.weightKg != null && s.weightKg > 0).at(-1);
  if (!last) return null;
  if (last.unit === unit && last.weight != null) return { weight: last.weight, source: 'last' };
  return { weight: roundTo(fromKg(last.weightKg!, unit), unit === 'lb' ? 1 : 0.5), source: 'last' };
}

export function isPR(chart: RpeChart, log: SetLog, history: SetLog[]): boolean {
  const value = setE1RM(chart, log);
  if (value == null || !log.doneAt) return false;
  const prior = history
    .filter((h) => h.id !== log.id && h.doneAt != null && h.doneAt < log.doneAt!)
    .map((h) => setE1RM(chart, h))
    .filter((v): v is number => v != null);
  if (prior.length === 0) return false;
  return value > Math.max(...prior) + 1e-9;
}

export function formatSet(log: SetLog): string {
  const reps = log.reps ?? 0;
  if (log.weight == null || log.weight === 0) return `${reps}회`;
  return `${log.weight}${log.unit === 'lb' ? 'lbs' : 'kg'}×${reps}`;
}
