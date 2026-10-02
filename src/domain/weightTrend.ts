import { addDays, diffDays } from './date';

export function weightByDate(logs: { date: string; weightKg: number | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) if (l.weightKg != null) m.set(l.date, l.weightKg);
  return m;
}

/** 그날 포함 최근 7일 중 기록한 날의 평균. 기록이 4일 미만이면 null */
export function avg7(weights: Map<string, number>, date: string): number | null {
  const values: number[] = [];
  for (let i = 0; i < 7; i++) {
    const v = weights.get(addDays(date, -i));
    if (v != null) values.push(v);
  }
  if (values.length < 4) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** (7일 전의 7일 평균) − (그날의 7일 평균). 감량이면 양수. 소수 둘째 자리 반올림 */
export function weeklyLoss(weights: Map<string, number>, date: string): number | null {
  const before = avg7(weights, addDays(date, -7));
  const now = avg7(weights, date);
  if (before == null || now == null) return null;
  return Math.round((before - now) * 100) / 100;
}

export type TrendAlert = 'slow' | 'fast';

export function adjustmentAlert(weights: Map<string, number>, today: string, firstTargetStart: string | null): TrendAlert | null {
  if (firstTargetStart == null || diffDays(firstTargetStart, today) < 14) return null;
  const thisWeek = weeklyLoss(weights, today);
  const lastWeek = weeklyLoss(weights, addDays(today, -7));
  if (thisWeek == null || lastWeek == null) return null;
  if (thisWeek < 0.3 && lastWeek < 0.3) return 'slow';
  if (thisWeek >= 0.9 && lastWeek >= 0.9) return 'fast';
  return null;
}

export const ALERT_TEXT: Record<TrendAlert, string> = {
  slow: '2주 연속 감량이 주 0.3kg보다 적어요. 식단을 잘 지켰다면 하루 100~150kcal 줄이거나 걸음을 늘리는 걸 검토하세요. (한 번에 하나만)',
  fast: '2주 연속 주 0.9kg 이상 빠지고 있어요. 근력·수면·컨디션을 확인하고 하루 100~200kcal 늘리는 걸 검토하세요.',
};
