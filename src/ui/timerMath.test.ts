import { describe, expect, test } from 'vitest';
import { formatClock, remainingSeconds } from './timerMath';

describe('remainingSeconds', () => {
  test('남은 시간을 초 단위로 올림한다', () => {
    expect(remainingSeconds(120_000, 0)).toBe(120);
    expect(remainingSeconds(120_000, 119_100)).toBe(1);
  });
  test('다른 앱에 다녀와서 종료 시각을 지났으면 0이다', () => {
    expect(remainingSeconds(120_000, 500_000)).toBe(0);
  });
});

describe('formatClock', () => {
  test('분:초', () => {
    expect(formatClock(120)).toBe('2:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(9)).toBe('0:09');
  });
});
