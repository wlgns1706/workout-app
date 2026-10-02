import { addDays, diffDays, localDateOf } from './date';
import { setE1RM } from './e1rm';
import type { RpeChart, SetLog } from './types';
import { avg7 } from './weightTrend';

export type Period = '4w' | '12w' | 'all';

export function periodStart(today: string, period: Period, earliest: string | null): string {
  if (period === '4w') return addDays(today, -27);
  if (period === '12w') return addDays(today, -83);
  return earliest != null && earliest < today ? earliest : today;
}

export function datesBetween(start: string, end: string): string[] {
  const n = diffDays(start, end);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDays(start, i));
}

export interface DailyValue {
  date: string;
  value: number;
  record: boolean; // 그때까지의 최고값을 넘었는지 (첫 값은 false)
}

export function dailyBestE1RM(chart: RpeChart, logs: SetLog[]): DailyValue[] {
  const best = new Map<string, number>();
  for (const log of logs) {
    const v = setE1RM(chart, log);
    if (v == null || !log.doneAt) continue;
    const date = localDateOf(log.doneAt);
    best.set(date, Math.max(best.get(date) ?? 0, v));
  }
  let top: number | null = null;
  return [...best.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => {
      const record = top != null && value > top + 1e-9;
      top = top == null ? value : Math.max(top, value);
      return { date, value, record };
    });
}

export function exerciseOrder(chart: RpeChart, logs: SetLog[]): string[] {
  const count = new Map<string, number>();
  for (const log of logs) {
    if (setE1RM(chart, log) == null) continue;
    count.set(log.exerciseName, (count.get(log.exerciseName) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([name]) => name);
}

export function avg7Series(weights: Map<string, number>, start: string, end: string): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  for (const date of datesBetween(start, end)) {
    const v = avg7(weights, date);
    if (v != null) result.push({ date, value: Math.round(v * 100) / 100 });
  }
  return result;
}
