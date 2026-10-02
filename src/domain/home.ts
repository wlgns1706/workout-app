import { addDays, localDateOf } from './date';
import { isPR, setE1RM } from './e1rm';
import type { DietDay } from './nutrition';
import type { DayLog, Nutrients, NutritionTarget, RpeChart, SetLog } from './types';
import { avg7 } from './weightTrend';

export const WEDDING_DATE = '2027-01-31';

/** 체중 연속 기록 일수. 오늘 아직 안 적었으면 어제부터 센다. */
export function weightStreak(weights: Map<string, number>, today: string): { streak: number; loggedToday: boolean } {
  const loggedToday = weights.has(today);
  let day = loggedToday ? today : addDays(today, -1);
  let streak = 0;
  while (weights.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return { streak, loggedToday };
}

/** 처음으로 7일 평균이 계산된 날과 그 값 */
export function firstAverage(weights: Map<string, number>): { date: string; value: number } | null {
  for (const date of [...weights.keys()].sort()) {
    const value = avg7(weights, date);
    if (value != null) return { date, value };
  }
  return null;
}

/** 시작 체중에서 목표 범위 상단까지 얼마나 왔는지 (0~100, 정수) */
export function goalProgress(start: number, now: number, goalMax: number): number {
  if (start <= goalMax) return 100;
  const pct = ((start - now) / (start - goalMax)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

/** 오늘 남은 칼로리(기준까지)와 단백질(최솟값까지). 0 아래로 내려가지 않는다. */
export function remainingToday(target: NutritionTarget, totals: Nutrients): { kcal: number; protein: number } {
  return {
    kcal: Math.max(0, Math.round(target.kcal.base - totals.kcal)),
    protein: Math.max(0, Math.round(target.protein.min - totals.protein)),
  };
}

/** "운동 완료"를 누른 현지 날짜 → 그날 완료한 요일 번호들 */
export function workoutDates(dayLogs: DayLog[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const d of dayLogs) {
    if (!d.finishedAt) continue;
    const date = localDateOf(d.finishedAt);
    m.set(date, [...(m.get(date) ?? []), d.dayNo]);
  }
  return m;
}

/** 그 달의 운동한 날 수, 식단을 지킨 날 수, 식단을 기록한 날 수 */
export function monthSummary(
  year: number,
  month: number,
  workouts: Map<string, number[]>,
  diet: Map<string, DietDay>,
): { workout: number; kept: number; recorded: number } {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const inMonth = (d: string) => d.startsWith(prefix);
  const dietDays = [...diet.entries()].filter(([d, s]) => inMonth(d) && s !== 'none');
  return {
    workout: [...workouts.keys()].filter(inMonth).length,
    kept: dietDays.filter(([, s]) => s === 'kept').length,
    recorded: dietDays.length,
  };
}

export interface RecentPR {
  name: string;
  date: string;
  value: number;
  gainPct: number;
}

/** 최근 days일 안에 세운 PR 중 가장 최근 것 */
export function recentPR(chart: RpeChart, logs: SetLog[], today: string, days = 14): RecentPR | null {
  const since = addDays(today, -(days - 1));
  const byName = new Map<string, SetLog[]>();
  for (const l of logs) byName.set(l.exerciseName, [...(byName.get(l.exerciseName) ?? []), l]);
  let best: (RecentPR & { at: string }) | null = null;
  for (const [name, history] of byName) {
    for (const log of history) {
      if (!log.doneAt || localDateOf(log.doneAt) < since || !isPR(chart, log, history)) continue;
      const value = setE1RM(chart, log)!;
      const prior = history
        .filter((h) => h.id !== log.id && h.doneAt != null && h.doneAt < log.doneAt!)
        .map((h) => setE1RM(chart, h))
        .filter((v): v is number => v != null);
      const gainPct = Math.round((value / Math.max(...prior) - 1) * 100);
      if (!best || log.doneAt > best.at) best = { name, date: localDateOf(log.doneAt), value, gainPct, at: log.doneAt };
    }
  }
  if (!best) return null;
  const { at: _at, ...rest } = best;
  return rest;
}
