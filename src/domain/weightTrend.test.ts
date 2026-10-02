import { describe, expect, test } from 'vitest';
import { addDays } from './date';
import { adjustmentAlert, avg7, weeklyLoss, weightByDate } from './weightTrend';

/** start부터 days일 동안, 하루에 perDay씩 줄어드는 체중 */
function series(start: string, days: number, from: number, perDay: number): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < days; i++) m.set(addDays(start, i), Math.round((from - perDay * i) * 100) / 100);
  return m;
}

describe('weightByDate', () => {
  test('체중이 있는 날만 담는다', () => {
    const m = weightByDate([
      { date: '2026-10-01', weightKg: 95 },
      { date: '2026-10-02', weightKg: null },
    ]);
    expect([...m.entries()]).toEqual([['2026-10-01', 95]]);
  });
});

describe('avg7', () => {
  test('그날 포함 7일 중 기록한 날의 평균', () => {
    const m = new Map([
      ['2026-10-01', 95],
      ['2026-10-03', 94],
      ['2026-10-05', 93],
      ['2026-10-07', 92],
    ]);
    expect(avg7(m, '2026-10-07')).toBe(93.5);
  });
  test('기록이 4일 미만이면 null', () => {
    const m = new Map([
      ['2026-10-05', 93],
      ['2026-10-06', 93],
      ['2026-10-07', 92],
    ]);
    expect(avg7(m, '2026-10-07')).toBeNull();
  });
  test('7일보다 오래된 기록은 넣지 않는다', () => {
    const m = new Map([
      ['2026-09-30', 200],
      ['2026-10-01', 95],
      ['2026-10-02', 95],
      ['2026-10-03', 95],
      ['2026-10-04', 95],
    ]);
    expect(avg7(m, '2026-10-07')).toBe(95);
  });
});

describe('weeklyLoss', () => {
  test('7일 전 평균 − 오늘 평균', () => {
    const m = series('2026-10-01', 14, 95, 0.1);
    expect(weeklyLoss(m, '2026-10-14')).toBe(0.7);
  });
  test('정확히 0.3kg이면 0.3 (부동소수 오차 없음)', () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 7; i++) m.set(addDays('2026-10-01', i), 95.1);
    for (let i = 7; i < 14; i++) m.set(addDays('2026-10-01', i), 94.8);
    expect(weeklyLoss(m, '2026-10-14')).toBe(0.3);
  });
  test('평균을 낼 수 없으면 null', () => {
    expect(weeklyLoss(series('2026-10-08', 7, 95, 0.1), '2026-10-14')).toBeNull();
  });
});

describe('adjustmentAlert', () => {
  test('2주 연속 주 0.3kg 미만이면 slow', () => {
    const m = series('2026-10-01', 21, 95, 0.02);
    expect(adjustmentAlert(m, '2026-10-21', '2026-10-01')).toBe('slow');
  });
  test('2주 연속 주 0.9kg 이상이면 fast', () => {
    const m = series('2026-10-01', 21, 95, 0.15);
    expect(adjustmentAlert(m, '2026-10-21', '2026-10-01')).toBe('fast');
  });
  test('목표 범위 안이면 null', () => {
    const m = series('2026-10-01', 21, 95, 0.085);
    expect(adjustmentAlert(m, '2026-10-21', '2026-10-01')).toBeNull();
  });
  test('한 주만 느리면 null', () => {
    const m = series('2026-10-01', 14, 95, 0.1);
    for (let i = 14; i < 21; i++) m.set(addDays('2026-10-01', i), 93.7);
    expect(adjustmentAlert(m, '2026-10-21', '2026-10-01')).toBeNull();
  });
  test('첫 목표 시작 후 14일이 지나지 않았으면 null', () => {
    const m = series('2026-09-15', 30, 95, 0.02);
    expect(adjustmentAlert(m, '2026-10-14', '2026-10-01')).toBeNull();
    expect(adjustmentAlert(m, '2026-10-15', '2026-10-01')).toBe('slow');
  });
  test('목표가 없거나 계산할 수 없으면 null', () => {
    const m = series('2026-10-01', 21, 95, 0.02);
    expect(adjustmentAlert(m, '2026-10-21', null)).toBeNull();
    expect(adjustmentAlert(new Map(), '2026-10-21', '2026-10-01')).toBeNull();
  });
});
