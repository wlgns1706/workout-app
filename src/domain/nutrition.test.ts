import { describe, expect, test } from 'vitest';
import {
  barState,
  carbsBase,
  dietDayStatus,
  earliestTargetStart,
  kcalFromMacros,
  planTarget,
  scaleFood,
  sumNutrients,
  targetOn,
  validateTarget,
} from './nutrition';
import type { NutritionTarget } from './types';

const t = (startDate: string, kcalBase = 2250): NutritionTarget => ({ ...planTarget(startDate), kcal: { min: kcalBase - 50, base: kcalBase, max: kcalBase + 50 } });
const food = (kcal: number, protein: number) => ({ kcal, protein, carbs: 0, fat: 0});

describe('planTarget', () => {
  test('다이어트 플랜의 시작 목표', () => {
    expect(planTarget('2026-10-02')).toEqual({
      startDate: '2026-10-02',
      kcal: { min: 2200, base: 2250, max: 2300 },
      protein: { min: 170, base: 180, max: 190 },
      fat: { min: 60, base: 65, max: 70 },
      lossRate: { min: 0.5, max: 0.7 },
    });
  });
});

describe('targetOn', () => {
  const targets = [t('2026-10-15', 2100), t('2026-10-01', 2250)];
  test('적용 시작일이 그날 이하인 것 중 가장 늦은 목표', () => {
    expect(targetOn(targets, '2026-10-01')?.kcal.base).toBe(2250);
    expect(targetOn(targets, '2026-10-10')?.kcal.base).toBe(2250);
    expect(targetOn(targets, '2026-10-15')?.kcal.base).toBe(2100);
    expect(targetOn(targets, '2026-11-01')?.kcal.base).toBe(2100);
  });
  test('시작일 전이거나 목표가 없으면 null', () => {
    expect(targetOn(targets, '2026-09-30')).toBeNull();
    expect(targetOn([], '2026-10-10')).toBeNull();
  });
});

describe('earliestTargetStart', () => {
  test('가장 이른 적용 시작일', () => {
    expect(earliestTargetStart([t('2026-10-15'), t('2026-10-01')])).toBe('2026-10-01');
    expect(earliestTargetStart([])).toBeNull();
  });
});

describe('carbsBase', () => {
  test('남은 열량을 탄수화물로', () => {
    expect(carbsBase(planTarget('2026-10-01'))).toBe(236);
  });
  test('음수면 0', () => {
    const low = { ...planTarget('2026-10-01'), kcal: { min: 500, base: 500, max: 500 } };
    expect(carbsBase(low)).toBe(0);
  });
});

describe('validateTarget', () => {
  test('올바른 목표는 null', () => {
    expect(validateTarget(planTarget('2026-10-01'))).toBeNull();
  });
  test('최소가 기준보다 크면 오류', () => {
    const bad = { ...planTarget('2026-10-01'), protein: { min: 190, base: 180, max: 200 } };
    expect(validateTarget(bad)).toMatch(/단백질/);
  });
  test('음수면 오류', () => {
    const bad = { ...planTarget('2026-10-01'), fat: { min: -1, base: 65, max: 70 } };
    expect(validateTarget(bad)).toMatch(/지방/);
  });
  test('감량 속도의 최소가 최대보다 크면 오류', () => {
    expect(validateTarget({ ...planTarget('2026-10-01'), lossRate: { min: 1, max: 0.5 } })).toMatch(/감량/);
  });
  test('적용 시작일이 없으면 오류', () => {
    expect(validateTarget({ ...planTarget(''), startDate: '' })).toMatch(/시작일/);
  });
});

describe('sumNutrients', () => {
  test('항목별로 더하고 소수 첫째 자리로 반올림한다', () => {
    const sum = sumNutrients([
      { kcal: 0.1, protein: 0.1, carbs: 0.2, fat: 1},
      { kcal: 0.2, protein: 0.2, carbs: 0.1, fat: 2},
    ]);
    expect(sum).toEqual({ kcal: 0.3, protein: 0.3, carbs: 0.3, fat: 3});
  });
  test('빈 목록은 모두 0', () => {
    expect(sumNutrients([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0});
  });
});

describe('kcalFromMacros', () => {
  test('단백질·탄수화물 ×4, 지방 ×9', () => {
    expect(kcalFromMacros(18, 2, 15)).toBe(215);
    expect(kcalFromMacros(0.5, 0, 0)).toBe(2);
  });
});

describe('scaleFood', () => {
  const chicken = { name: '닭가슴살 100g', kcal: 110, protein: 23, carbs: 0, fat: 1.5};
  test('배수를 곱하고 이름에 표시한다', () => {
    expect(scaleFood(chicken, 2)).toEqual({ name: '닭가슴살 100g ×2', kcal: 220, protein: 46, carbs: 0, fat: 3});
    expect(scaleFood(chicken, 1.5)).toEqual({ name: '닭가슴살 100g ×1.5', kcal: 165, protein: 34.5, carbs: 0, fat: 2.3});
  });
  test('×1이면 이름을 바꾸지 않는다', () => {
    expect(scaleFood(chicken, 1).name).toBe('닭가슴살 100g');
  });
});

describe('barState', () => {
  test('범위 안, 아래, 위', () => {
    expect(barState(2250, 2200, 2300)).toBe('ok');
    expect(barState(2200, 2200, 2300)).toBe('ok');
    expect(barState(2300, 2200, 2300)).toBe('ok');
    expect(barState(2199, 2200, 2300)).toBe('low');
    expect(barState(2301, 2200, 2300)).toBe('high');
  });
});

describe('dietDayStatus', () => {
  const target = planTarget('2026-10-01');
  test('기록이 없으면 none', () => {
    expect(dietDayStatus([], target)).toBe('none');
  });
  test('칼로리가 범위 안이고 단백질이 최소 이상이면 kept', () => {
    expect(dietDayStatus([food(1200, 90), food(1050, 85)], target)).toBe('kept');
  });
  test('칼로리가 부족하면 recorded', () => {
    expect(dietDayStatus([food(1800, 180)], target)).toBe('recorded');
  });
  test('칼로리가 넘치면 recorded', () => {
    expect(dietDayStatus([food(2400, 180)], target)).toBe('recorded');
  });
  test('단백질이 부족하면 recorded', () => {
    expect(dietDayStatus([food(2250, 169)], target)).toBe('recorded');
  });
  test('목표가 없으면 recorded', () => {
    expect(dietDayStatus([food(2250, 180)], null)).toBe('recorded');
  });
});
