import type { Meal, Nutrients, NutritionTarget } from './types';

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'snack', label: '간식' },
  { key: 'dinner', label: '저녁' },
];

/** 다이어트 플랜의 끼니당 단백질 기준 */
export const MEAL_PROTEIN_MIN = 40;

/** 다이어트 1차 플랜(2026-10-01)의 시작 목표. 설정 화면의 처음 값으로 쓴다. */
export function planTarget(startDate: string): NutritionTarget {
  return {
    startDate,
    kcal: { min: 2200, base: 2250, max: 2300 },
    protein: { min: 170, base: 180, max: 190 },
    fat: { min: 60, base: 65, max: 70 },
    lossRate: { min: 0.5, max: 0.7 },
  };
}

/** 그날 적용되던 목표: 적용 시작일이 그날 이하인 것 중 가장 늦은 것 */
export function targetOn(targets: NutritionTarget[], date: string): NutritionTarget | null {
  let best: NutritionTarget | null = null;
  for (const t of targets) {
    if (t.startDate <= date && (best == null || t.startDate > best.startDate)) best = t;
  }
  return best;
}

export function earliestTargetStart(targets: NutritionTarget[]): string | null {
  return targets.length === 0 ? null : targets.map((t) => t.startDate).sort()[0];
}

/** 탄수화물 기준값(g) = 남은 열량 ÷ 4 */
export function carbsBase(t: NutritionTarget): number {
  return Math.max(0, Math.round((t.kcal.base - t.protein.base * 4 - t.fat.base * 9) / 4));
}

export function validateTarget(t: NutritionTarget): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.startDate)) return '적용 시작일을 골라 주세요.';
  const ranges: [string, { min: number; base?: number; max: number }][] = [
    ['칼로리', t.kcal],
    ['단백질', t.protein],
    ['지방', t.fat],
    ['감량 속도', t.lossRate],
  ];
  for (const [name, r] of ranges) {
    const values = [r.min, r.base ?? r.min, r.max];
    if (values.some((v) => !Number.isFinite(v) || v < 0)) return `${name}: 0 이상의 숫자를 넣어 주세요.`;
    if (r.base != null && (r.min > r.base || r.base > r.max)) return `${name}: 최소 ≤ 기준 ≤ 최대가 되도록 넣어 주세요.`;
    if (r.min > r.max) return `${name}: 최소가 최대보다 클 수 없습니다.`;
  }
  return null;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0};
  for (const i of items) {
    sum.kcal += i.kcal;
    sum.protein += i.protein;
    sum.carbs += i.carbs;
    sum.fat += i.fat;
  }
  return { kcal: round1(sum.kcal), protein: round1(sum.protein), carbs: round1(sum.carbs), fat: round1(sum.fat)};
}

export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function scaleFood(food: { name: string } & Nutrients, factor: number): { name: string } & Nutrients {
  return {
    name: factor === 1 ? food.name : `${food.name} ×${factor}`,
    kcal: round1(food.kcal * factor),
    protein: round1(food.protein * factor),
    carbs: round1(food.carbs * factor),
    fat: round1(food.fat * factor),
  };
}

export type BarState = 'low' | 'ok' | 'high';

export function barState(value: number, min: number, max: number): BarState {
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'ok';
}

export type DietDay = 'none' | 'recorded' | 'kept';

/** 지킨 날: 칼로리가 범위 안이고 단백질이 최소 이상 */
export function dietDayStatus(entries: Nutrients[], target: NutritionTarget | null): DietDay {
  if (entries.length === 0) return 'none';
  if (!target) return 'recorded';
  const sum = sumNutrients(entries);
  const kept = barState(sum.kcal, target.kcal.min, target.kcal.max) === 'ok' && sum.protein >= target.protein.min;
  return kept ? 'kept' : 'recorded';
}
