import { describe, expect, test } from 'vitest';
import { newSetLog } from './progress';
import { avg7Series, dailyBestE1RM, datesBetween, exerciseOrder, periodStart } from './statsSeries';
import { TEST_CHART as C } from './testChart';
import type { SetLog } from './types';

let seq = 0;
function log(name: string, at: Date, weight: number, reps = 10, patch: Partial<SetLog> = {}): SetLog {
  const base = newSetLog('p1', 0, 1, { exerciseIndex: 0, rowIndex: 0, setIndex: seq++, exerciseName: name, rpe: 7 }, 'kg');
  return { ...base, weight, weightKg: weight, reps, done: true, doneAt: at.toISOString(), performedDayNo: 1, ...patch };
}

describe('periodStart', () => {
  test('4주와 12주는 오늘 포함 28일, 84일', () => {
    expect(periodStart('2026-10-28', '4w', null)).toBe('2026-10-01');
    expect(periodStart('2026-12-23', '12w', null)).toBe('2026-10-01');
  });
  test('전체는 가장 이른 기록일, 없으면 오늘', () => {
    expect(periodStart('2026-12-23', 'all', '2026-09-01')).toBe('2026-09-01');
    expect(periodStart('2026-12-23', 'all', null)).toBe('2026-12-23');
  });
});

describe('datesBetween', () => {
  test('양 끝 포함', () => {
    expect(datesBetween('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(datesBetween('2026-10-02', '2026-10-01')).toEqual([]);
  });
});

describe('dailyBestE1RM', () => {
  test('날짜별 최고값, 웜업 제외, 이전 최고를 넘으면 record', () => {
    const logs = [
      log('A', new Date(2026, 9, 5, 10), 60),
      log('A', new Date(2026, 9, 5, 11), 65),
      log('A', new Date(2026, 9, 5, 12), 100, 10, { type: 'warmup' }),
      log('A', new Date(2026, 9, 8, 10), 62.5),
      log('A', new Date(2026, 9, 12, 10), 70),
    ];
    const result = dailyBestE1RM(C, logs);
    expect(result.map((r) => r.date)).toEqual(['2026-10-05', '2026-10-08', '2026-10-12']);
    expect(result[0].value).toBeCloseTo(65 / 0.653, 5);
    expect(result.map((r) => r.record)).toEqual([false, false, true]);
  });
  test('자정 직후 기록은 그날 날짜다', () => {
    const result = dailyBestE1RM(C, [log('A', new Date(2026, 9, 6, 0, 30), 60)]);
    expect(result[0].date).toBe('2026-10-06');
  });
  test('계산할 수 없는 기록만 있으면 빈 목록', () => {
    expect(dailyBestE1RM(C, [log('A', new Date(2026, 9, 5), 60, 20)])).toEqual([]);
  });
});

describe('exerciseOrder', () => {
  test('추정 1RM을 계산할 수 있는 기록이 많은 순, 같으면 이름순', () => {
    const d = new Date(2026, 9, 5, 10);
    const logs = [log('B', d, 50), log('B', d, 50), log('A', d, 50), log('C', d, 50), log('C', d, 50, 20), log('D', d, 50, 20)];
    expect(exerciseOrder(C, logs)).toEqual(['B', 'A', 'C']);
  });
});

describe('avg7Series', () => {
  test('기간 앞 6일의 기록도 써서 첫날부터 평균을 낸다', () => {
    const w = new Map([
      ['2026-09-28', 96],
      ['2026-09-29', 96],
      ['2026-09-30', 96],
      ['2026-10-01', 92],
      ['2026-10-02', 92],
    ]);
    expect(avg7Series(w, '2026-10-01', '2026-10-02')).toEqual([
      { date: '2026-10-01', value: 95 },
      { date: '2026-10-02', value: 94.4 },
    ]);
  });
});
