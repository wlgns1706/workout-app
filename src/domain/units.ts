import type { Unit } from './types';

export const LB_TO_KG = 0.45359237;

export function toKg(weight: number, unit: Unit): number {
  return unit === 'lb' ? weight * LB_TO_KG : weight;
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg / LB_TO_KG : kg;
}

export function formatKg(kg: number): string {
  return kg.toFixed(1);
}

/** [작은 증감 폭, 큰 증감 폭] */
export function weightSteps(unit: Unit): [number, number] {
  return unit === 'lb' ? [1, 10] : [0.5, 5];
}

export function roundTo(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

/** 입력 칸의 글자를 숫자로 바꾼다. 비었거나 음수이거나 숫자가 아니면 null이다. */
export function parseNumber(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
