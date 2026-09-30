import { describe, expect, test } from 'vitest';
import { addDays, diffDays, localDateOf, todayStr } from './date';

describe('todayStr', () => {
  test('현지 시간 기준 날짜를 돌려준다', () => {
    expect(todayStr(new Date(2026, 9, 5, 12, 0))).toBe('2026-10-05');
  });
  test('자정 직후에도 그날 날짜다 (UTC로 계산하지 않는다)', () => {
    expect(todayStr(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05');
  });
  test('밤 11시 59분에도 그날 날짜다', () => {
    expect(todayStr(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });
});

describe('localDateOf', () => {
  test('ISO 시각을 현지 날짜로 바꾼다', () => {
    const iso = new Date(2026, 9, 5, 0, 30).toISOString();
    expect(localDateOf(iso)).toBe('2026-10-05');
  });
});

describe('addDays, diffDays', () => {
  test('월과 연도를 넘어간다', () => {
    expect(addDays('2026-10-05', 27)).toBe('2026-11-01');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });
  test('날짜 차이를 일 단위로 센다', () => {
    expect(diffDays('2026-10-05', '2026-10-05')).toBe(0);
    expect(diffDays('2026-10-05', '2027-01-24')).toBe(111);
    expect(diffDays('2026-10-05', '2026-10-04')).toBe(-1);
  });
});
