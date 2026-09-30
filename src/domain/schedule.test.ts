import { describe, expect, test } from 'vitest';
import { getWeek, parseSequence, positionOn, totalWeeks, weekInfo } from './schedule';
import { makeTestProgram } from './testProgram';
import type { Plan } from './types';

const plan: Plan = {
  id: 'p1',
  programId: 'test-program',
  startDate: '2026-10-05',
  blockSequence: [1, 1, 2, 3],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('totalWeeks', () => {
  test('블록 하나는 4주다', () => {
    expect(totalWeeks(plan)).toBe(16);
  });
});

describe('positionOn', () => {
  test('시작 전', () => {
    expect(positionOn(plan, '2026-10-04')).toEqual({ status: 'before', daysUntil: 1 });
    expect(positionOn(plan, '2026-09-30')).toEqual({ status: 'before', daysUntil: 5 });
  });
  test('첫날', () => {
    expect(positionOn(plan, '2026-10-05')).toEqual({
      status: 'active',
      planWeek: 0,
      block: 1,
      occurrence: 1,
      week: 1,
      weekStart: '2026-10-05',
      weekEnd: '2026-10-11',
    });
  });
  test('첫 블록의 마지막 날', () => {
    expect(positionOn(plan, '2026-11-01')).toMatchObject({ planWeek: 3, block: 1, occurrence: 1, week: 4 });
  });
  test('블록 1을 두 번째로 하는 구간', () => {
    expect(positionOn(plan, '2026-11-02')).toMatchObject({ planWeek: 4, block: 1, occurrence: 2, week: 1 });
  });
  test('블록 2와 블록 3', () => {
    expect(positionOn(plan, '2026-11-30')).toMatchObject({ planWeek: 8, block: 2, occurrence: 1, week: 1 });
    expect(positionOn(plan, '2026-12-28')).toMatchObject({ planWeek: 12, block: 3, occurrence: 1, week: 1 });
  });
  test('마지막 날과 종료 후', () => {
    expect(positionOn(plan, '2027-01-24')).toMatchObject({ status: 'active', planWeek: 15, block: 3, week: 4 });
    expect(positionOn(plan, '2027-01-25')).toEqual({ status: 'finished' });
  });
});

describe('weekInfo', () => {
  test('주의 날짜 범위를 계산한다', () => {
    expect(weekInfo(plan, 15)).toMatchObject({ weekStart: '2027-01-18', weekEnd: '2027-01-24' });
  });
});

describe('getWeek', () => {
  const program = makeTestProgram();
  test('블록 순서에 따라 프로그램의 주를 찾는다', () => {
    expect(getWeek(program, plan, 4)).toBe(program.blocks[0].weeks[0]);
    expect(getWeek(program, plan, 9)).toBe(program.blocks[1].weeks[1]);
  });
  test('완전 휴식 주', () => {
    expect(getWeek(program, plan, 15)?.rest).toBe(true);
  });
  test('프로그램에 없는 블록이면 null이다', () => {
    const bad: Plan = { ...plan, blockSequence: [4] };
    expect(getWeek(program, bad, 0)).toBeNull();
  });
  test('범위를 벗어난 주차면 null이다', () => {
    expect(getWeek(program, plan, 16)).toBeNull();
    expect(getWeek(program, plan, -1)).toBeNull();
  });
});

describe('parseSequence', () => {
  test('쉼표나 화살표로 구분한 블록 순서를 읽는다', () => {
    expect(parseSequence('1,1,2,3', 3)).toEqual([1, 1, 2, 3]);
    expect(parseSequence(' 1 → 2 → 3 ', 3)).toEqual([1, 2, 3]);
    expect(parseSequence('1 2 3', 3)).toEqual([1, 2, 3]);
  });
  test('프로그램에 없는 블록 번호나 빈 값은 null', () => {
    expect(parseSequence('1,4', 3)).toBeNull();
    expect(parseSequence('0,1', 3)).toBeNull();
    expect(parseSequence('', 3)).toBeNull();
    expect(parseSequence('a,b', 3)).toBeNull();
  });
});
