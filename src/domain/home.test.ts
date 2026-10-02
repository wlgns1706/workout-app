import { describe, expect, test } from 'vitest';
import { addDays } from './date';
import { planTarget } from './nutrition';
import { newSetLog } from './progress';
import { TEST_CHART as C } from './testChart';
import type { DayLog, SetLog } from './types';
import {
  firstAverage,
  goalProgress,
  monthSummary,
  recentPR,
  remainingToday,
  weightStreak,
  workoutDates,
} from './home';

describe('weightStreak', () => {
  const w = (dates: string[]) => new Map(dates.map((d) => [d, 90]));
  test('오늘 기록했으면 오늘부터 거꾸로 센다', () => {
    expect(weightStreak(w(['2026-10-10', '2026-10-09', '2026-10-08', '2026-10-06']), '2026-10-10')).toEqual({ streak: 3, loggedToday: true });
  });
  test('오늘 아직 안 적었으면 어제부터 센다', () => {
    expect(weightStreak(w(['2026-10-09', '2026-10-08']), '2026-10-10')).toEqual({ streak: 2, loggedToday: false });
  });
  test('어제도 없으면 0', () => {
    expect(weightStreak(w(['2026-10-07']), '2026-10-10')).toEqual({ streak: 0, loggedToday: false });
  });
});

describe('firstAverage', () => {
  test('처음으로 7일 평균이 계산된 날과 값', () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 6; i++) m.set(addDays('2026-10-01', i), 95 - i * 0.1);
    expect(firstAverage(m)).toEqual({ date: '2026-10-04', value: expect.closeTo(94.85, 5) });
  });
  test('평균을 낼 수 없으면 null', () => {
    expect(firstAverage(new Map([['2026-10-01', 95]]))).toBeNull();
  });
});

describe('goalProgress', () => {
  test('목표 범위 상단까지의 진행률', () => {
    expect(goalProgress(95, 92.6, 87)).toBe(30);
    expect(goalProgress(95, 95, 87)).toBe(0);
  });
  test('0~100으로 자른다', () => {
    expect(goalProgress(95, 86, 87)).toBe(100);
    expect(goalProgress(95, 96, 87)).toBe(0);
  });
  test('시작부터 목표 이하면 100', () => {
    expect(goalProgress(86, 86, 87)).toBe(100);
  });
});

describe('remainingToday', () => {
  test('칼로리는 기준에서, 단백질은 최솟값에서 뺀다. 0 아래로 내려가지 않는다', () => {
    const t = planTarget('2026-10-01');
    expect(remainingToday(t, { kcal: 1400, protein: 110, carbs: 0, fat: 0 })).toEqual({ kcal: 850, protein: 60 });
    expect(remainingToday(t, { kcal: 2600, protein: 200, carbs: 0, fat: 0 })).toEqual({ kcal: 0, protein: 0 });
  });
});

const dayLog = (finishedAt: string | null, dayNo = 1): DayLog => ({
  id: `p|0|${dayNo}`,
  planId: 'p',
  planWeek: 0,
  dayNo,
  startedAt: null,
  finishedAt,
  cardioDone: false,
  optionChoices: [],
  note: '',
  deferred: [],
});

describe('workoutDates', () => {
  test('운동 완료를 누른 현지 날짜', () => {
    const logs = [dayLog(new Date(2026, 9, 5, 21).toISOString()), dayLog(new Date(2026, 9, 7, 0, 30).toISOString(), 2), dayLog(null, 3)];
    expect([...workoutDates(logs).keys()].sort()).toEqual(['2026-10-05', '2026-10-07']);
    expect(workoutDates(logs).get('2026-10-07')).toEqual([2]);
  });
});

describe('monthSummary', () => {
  test('그 달의 운동한 날, 지킨 날, 기록한 날을 센다', () => {
    const workouts = new Map([
      ['2026-10-05', [1]],
      ['2026-10-07', [2]],
      ['2026-09-30', [4]],
    ]);
    const diet = new Map([
      ['2026-10-05', 'kept' as const],
      ['2026-10-06', 'recorded' as const],
      ['2026-11-01', 'kept' as const],
    ]);
    expect(monthSummary(2026, 10, workouts, diet)).toEqual({ workout: 2, kept: 1, recorded: 2 });
  });
});

describe('recentPR', () => {
  let seq = 0;
  const log = (name: string, at: Date, weight: number): SetLog => ({
    ...newSetLog('p', 0, 1, { exerciseIndex: 0, rowIndex: 0, setIndex: seq++, exerciseName: name, rpe: 7 }, 'kg'),
    weight,
    weightKg: weight,
    reps: 10,
    done: true,
    doneAt: at.toISOString(),
    performedDayNo: 1,
  });
  test('최근 14일 안의 가장 최근 PR과 이전 최고 대비 증가율', () => {
    const logs = [
      log('A', new Date(2026, 8, 1), 60),
      log('A', new Date(2026, 9, 1), 62),
      log('B', new Date(2026, 8, 1), 100),
      log('B', new Date(2026, 9, 8), 103),
    ];
    const pr = recentPR(C, logs, '2026-10-10');
    expect(pr).toMatchObject({ name: 'B', date: '2026-10-08' });
    expect(pr!.gainPct).toBe(3);
    expect(pr!.value).toBeCloseTo(103 / 0.653, 5);
  });
  test('14일보다 오래된 PR과 첫 기록은 보여주지 않는다', () => {
    const logs = [log('A', new Date(2026, 8, 1), 60), log('A', new Date(2026, 8, 10), 65), log('C', new Date(2026, 9, 9), 50)];
    expect(recentPR(C, logs, '2026-10-10')).toBeNull();
  });
});
