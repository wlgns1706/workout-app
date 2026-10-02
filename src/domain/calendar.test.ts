import { describe, expect, test } from 'vitest';
import { formatDateLabel, monthGrid, shiftMonth } from './calendar';

describe('monthGrid', () => {
  test('월요일 시작. 2026년 10월 1일은 목요일이라 앞에 빈칸 3개', () => {
    const grid = monthGrid(2026, 10);
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(grid.filter(Boolean)).toHaveLength(31);
    expect(grid.length % 7).toBe(0);
  });
  test('1일이 일요일이면 빈칸 6개 (2026년 2월)', () => {
    const grid = monthGrid(2026, 2);
    expect(grid.indexOf('2026-02-01')).toBe(6);
    expect(grid.filter(Boolean)).toHaveLength(28);
  });
  test('윤년 2월은 29일까지', () => {
    expect(monthGrid(2028, 2)).toContain('2028-02-29');
  });
});

describe('shiftMonth', () => {
  test('연도를 넘어간다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 });
    expect(shiftMonth(2026, 10, 0)).toEqual({ year: 2026, month: 10 });
  });
});

describe('formatDateLabel', () => {
  test('월 일 (요일)', () => {
    expect(formatDateLabel('2026-10-01')).toBe('10월 1일 (목)');
    expect(formatDateLabel('2026-10-05')).toBe('10월 5일 (월)');
  });
});
