import { describe, expect, test } from 'vitest';
import { clockTime, formatClock, remainingSeconds, restNotice, timerCue } from './timerMath';

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

describe('timerCue', () => {
  test('30초 남았을 때 한 번 알린다 (휴식이 30초보다 길 때만)', () => {
    expect(timerCue(31, 30, 120)).toBe('warn');
    expect(timerCue(31, 30, 30)).toBeNull();
    expect(timerCue(30, 30, 120)).toBeNull();
  });
  test('5초 전부터 1초마다 짧은 비프', () => {
    expect(timerCue(6, 5, 120)).toBe('tick');
    expect(timerCue(2, 1, 120)).toBe('tick');
    expect(timerCue(7, 6, 120)).toBeNull();
  });
  test('끝날 때 긴 비프', () => {
    expect(timerCue(1, 0, 120)).toBe('end');
  });
  test('다른 앱에 다녀와서 여러 초를 건너뛰면 마지막 신호만 낸다', () => {
    expect(timerCue(40, 3, 120)).toBe('tick');
    expect(timerCue(40, 0, 120)).toBe('end');
    expect(timerCue(50, 20, 120)).toBe('warn');
  });
});

describe('clockTime', () => {
  test('시:분:초', () => {
    expect(clockTime(new Date(2026, 9, 12, 9, 5, 7).getTime())).toBe('09:05:07');
  });
});

describe('restNotice', () => {
  const endAt = new Date(2026, 9, 12, 14, 32, 10).getTime();
  test('쉬는 중에는 소리 없이 남은 시간과 끝나는 시각', () => {
    expect(restNotice(105, endAt, null)).toEqual({ title: '휴식 1:45 남음', body: '14:32:10에 끝나요 · 누르면 앱으로 돌아갑니다', silent: true });
  });
  test('30초 전에는 진동으로 한 번 알린다', () => {
    expect(restNotice(30, endAt, 'warn')).toEqual({ title: '휴식 0:30 남음', body: '14:32:10에 끝나요 · 누르면 앱으로 돌아갑니다', silent: false, vibrate: [200] });
  });
  test('끝나면 길게 알린다', () => {
    expect(restNotice(0, endAt, 'end')).toEqual({ title: '휴식 끝! 다음 세트를 시작하세요', body: '누르면 앱으로 돌아갑니다', silent: false, vibrate: [400, 150, 400] });
  });
});
