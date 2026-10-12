import { describe, expect, test } from 'vitest';
import { prescriptionText, weekLabel, weekRpe } from './labels';
import { weekInfo } from './schedule';
import type { Plan, ProgramWeek } from './types';

const plan: Plan = {
  id: 'p1',
  programId: 'test-program',
  startDate: '2026-10-05',
  blockSequence: [1, 1, 2, 3],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('weekLabel', () => {
  test('전체 몇 주 중 몇 주인지와 블록 안의 주차를 나눠 쓴다', () => {
    expect(weekLabel(weekInfo(plan, 1), 16, null)).toBe('전체 2/16주 · 블록 1의 2주차');
  });
  test('같은 블록을 두 번째 하면 회차를 붙인다', () => {
    expect(weekLabel(weekInfo(plan, 5), 16, null)).toBe('전체 6/16주 · 블록 1(2회차)의 2주차');
  });
  test('그 주의 RPE를 붙인다', () => {
    expect(weekLabel(weekInfo(plan, 8), 16, 8)).toBe('전체 9/16주 · 블록 2의 1주차 · RPE 8 주간');
  });
});

const day = (dayNo: number, rpes: (string | null)[], optional = false) => ({
  dayNo,
  optional,
  cardio: null,
  optionsText: null,
  exercises: rpes.map((rpe) => ({ name: 'X', rows: [{ sets: 2, reps: '8~12', rpe }] })),
});

describe('weekRpe', () => {
  test('정규 요일에서 가장 많이 나온 RPE', () => {
    const week: ProgramWeek = { rest: false, days: [day(1, ['@7', '@7', '@8']), day(5, ['@9', '@9', '@9', '@9'], true)] };
    expect(weekRpe(week)).toBe(7);
  });
  test('RPE가 없거나 휴식 주면 null', () => {
    expect(weekRpe({ rest: false, days: [day(1, [null])] })).toBeNull();
    expect(weekRpe({ rest: true, days: [] })).toBeNull();
  });
});

describe('prescriptionText', () => {
  test('세트 수, 횟수, RPE를 한 줄로', () => {
    expect(prescriptionText({ name: 'A', rows: [{ sets: 2, reps: '8~12', rpe: '@7' }] })).toBe('2세트 × 8~12회 · RPE 7');
  });
  test('처방 줄이 여러 개면 +로 잇는다', () => {
    expect(
      prescriptionText({ name: 'A', rows: [{ sets: 1, reps: '6', rpe: '@8' }, { sets: 2, reps: '10', rpe: '@7' }] }),
    ).toBe('1세트 × 6회 · RPE 8 + 2세트 × 10회 · RPE 7');
  });
  test('숫자로 끝나지 않는 횟수는 회를 붙이지 않고, RPE가 없으면 뺀다', () => {
    expect(prescriptionText({ name: 'A', rows: [{ sets: 3, reps: '30s', rpe: null }] })).toBe('3세트 × 30s');
  });
});
