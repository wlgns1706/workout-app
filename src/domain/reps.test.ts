import { describe, expect, test } from 'vitest';
import { defaultReps, parseReps, parseRpe, targetReps } from './reps';

describe('parseReps', () => {
  test('범위', () => {
    expect(parseReps('8~12')).toEqual({ kind: 'range', min: 8, max: 12 });
    expect(parseReps(' 3 ~ 6 ')).toEqual({ kind: 'range', min: 3, max: 6 });
  });
  test('숫자 하나', () => {
    expect(parseReps('30')).toEqual({ kind: 'fixed', reps: 30 });
  });
  test('시간', () => {
    expect(parseReps('30s')).toEqual({ kind: 'time', seconds: 30 });
  });
  test('해석할 수 없는 값', () => {
    expect(parseReps('AMRAP')).toEqual({ kind: 'unknown' });
    expect(parseReps('')).toEqual({ kind: 'unknown' });
  });
});

describe('targetReps', () => {
  test('범위는 가운데 값, 정수가 아니면 올림', () => {
    expect(targetReps('8~12')).toBe(10);
    expect(targetReps('3~6')).toBe(5);
    expect(targetReps('5~8')).toBe(7);
  });
  test('숫자 하나는 그대로', () => {
    expect(targetReps('3')).toBe(3);
  });
  test('시간과 해석 불가는 null', () => {
    expect(targetReps('30s')).toBeNull();
    expect(targetReps('AMRAP')).toBeNull();
  });
});

describe('defaultReps', () => {
  test('범위는 최솟값, 숫자 하나는 그대로', () => {
    expect(defaultReps('8~12')).toBe(8);
    expect(defaultReps('30')).toBe(30);
  });
  test('시간과 해석 불가는 null', () => {
    expect(defaultReps('30s')).toBeNull();
    expect(defaultReps('')).toBeNull();
  });
});

describe('parseRpe', () => {
  test('@ 표기를 숫자로 바꾼다', () => {
    expect(parseRpe('@7')).toBe(7);
    expect(parseRpe('@8.5')).toBe(8.5);
    expect(parseRpe('9')).toBe(9);
  });
  test('없거나 잘못된 값은 null', () => {
    expect(parseRpe(null)).toBeNull();
    expect(parseRpe('')).toBeNull();
    expect(parseRpe('@')).toBeNull();
  });
});
