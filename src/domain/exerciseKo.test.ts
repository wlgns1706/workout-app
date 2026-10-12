import { describe, expect, test } from 'vitest';
import { koName, withKo } from './exerciseKo';

describe('koName', () => {
  test('사전에 있는 종목은 한글 이름', () => {
    expect(koName('Smith Machine Squat')).toBe('스미스 머신 스쿼트');
    expect(koName('Lat-Pull Down')).toBe('랫 풀다운');
  });
  test('대소문자, 하이픈, 공백이 달라도 찾는다', () => {
    expect(koName('lat pull-down')).toBe('랫 풀다운');
    expect(koName('  hip thruster ')).toBe('힙 쓰러스트');
  });
  test('Dumbell과 Dumbbell을 같게 본다', () => {
    expect(koName('Incline Dumbbell Press')).toBe('인클라인 덤벨 프레스');
  });
  test('모르는 종목은 null', () => {
    expect(koName('Zercher Squat')).toBeNull();
  });
});

describe('withKo', () => {
  test('영어 이름 옆에 한글 이름', () => {
    expect(withKo('Dips')).toBe('Dips (딥스)');
    expect(withKo('Zercher Squat')).toBe('Zercher Squat');
  });
});
