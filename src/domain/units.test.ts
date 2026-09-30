import { describe, expect, test } from 'vitest';
import { formatKg, fromKg, parseNumber, roundTo, toKg, weightSteps } from './units';

describe('toKg, fromKg', () => {
  test('kg은 그대로다', () => {
    expect(toKg(60, 'kg')).toBe(60);
    expect(fromKg(60, 'kg')).toBe(60);
  });
  test('lbs를 kg으로 바꾼다', () => {
    expect(toKg(100, 'lb')).toBeCloseTo(45.359237, 6);
  });
  test('kg을 lbs로 바꾼다', () => {
    expect(fromKg(45.359237, 'lb')).toBeCloseTo(100, 6);
  });
});

describe('formatKg', () => {
  test('소수 첫째 자리까지 보여준다', () => {
    expect(formatKg(45.359237)).toBe('45.4');
    expect(formatKg(60)).toBe('60.0');
  });
});

describe('weightSteps', () => {
  test('kg은 0.5와 5, lbs는 1과 10이다', () => {
    expect(weightSteps('kg')).toEqual([0.5, 5]);
    expect(weightSteps('lb')).toEqual([1, 10]);
  });
});

describe('roundTo', () => {
  test('단위에 맞춰 반올림한다', () => {
    expect(roundTo(62.48, 2.5)).toBe(62.5);
    expect(roundTo(61.2, 2.5)).toBe(60);
    expect(roundTo(137.7, 5)).toBe(140);
    expect(roundTo(60.3, 0.5)).toBe(60.5);
  });
});

describe('parseNumber', () => {
  test('숫자 문자열을 해석한다', () => {
    expect(parseNumber('62.5')).toBe(62.5);
    expect(parseNumber(' 10 ')).toBe(10);
    expect(parseNumber('0')).toBe(0);
  });
  test('빈 값과 잘못된 값은 null이다', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('-5')).toBeNull();
    expect(parseNumber('1e999')).toBeNull();
  });
});
