import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { planTarget } from '../domain/nutrition';
import { AppDB } from './db';
import {
  addFood,
  copyMeal,
  deleteFavorite,
  deleteFood,
  emptyMeasurement,
  saveFavorite,
  saveMeasurement,
  saveTarget,
  updateFood,
  type FoodInput,
} from './dietRepo';
import { earliestRecordAt } from './repo';

let db: AppDB;
let n = 0;
beforeEach(() => {
  db = new AppDB(`diet-${n++}`);
});

const egg: FoodInput = { date: '2026-10-01', meal: 'breakfast', name: '달걀 2개', kcal: 150, protein: 12, carbs: 1, fat: 10};

describe('식단 항목', () => {
  test('추가하면 id와 생성 시각이 붙는다', async () => {
    const id = await addFood(db, egg);
    const saved = await db.foodEntries.get(id);
    expect(saved).toMatchObject({ ...egg, id });
    expect(saved?.createdAt).toMatch(/^\d{4}-/);
  });
  test('날짜로 찾는다', async () => {
    await addFood(db, egg);
    await addFood(db, { ...egg, date: '2026-10-02' });
    expect(await db.foodEntries.where('date').equals('2026-10-01').count()).toBe(1);
  });
  test('수정과 삭제', async () => {
    const id = await addFood(db, egg);
    await updateFood(db, id, { kcal: 160 });
    expect((await db.foodEntries.get(id))?.kcal).toBe(160);
    await deleteFood(db, id);
    expect(await db.foodEntries.count()).toBe(0);
  });
  test('끼니 복사: 같은 끼니만 새 id로 복사한다', async () => {
    await addFood(db, egg);
    await addFood(db, { ...egg, name: '오트밀' });
    await addFood(db, { ...egg, meal: 'lunch', name: '밥' });
    expect(await copyMeal(db, '2026-10-01', '2026-10-02', 'breakfast')).toBe(2);
    const copied = await db.foodEntries.where('date').equals('2026-10-02').toArray();
    expect(copied.map((f) => f.name).sort()).toEqual(['달걀 2개', '오트밀']);
    expect(copied.every((f) => f.meal === 'breakfast')).toBe(true);
    expect(await db.foodEntries.count()).toBe(5);
  });
  test('복사할 것이 없으면 0', async () => {
    expect(await copyMeal(db, '2026-09-30', '2026-10-01', 'dinner')).toBe(0);
  });
});

describe('자주 먹는 음식', () => {
  test('저장, 수정, 삭제', async () => {
    const id = await saveFavorite(db, { name: '닭가슴살', kcal: 110, protein: 23, carbs: 0, fat: 1.5});
    await saveFavorite(db, { id, name: '닭가슴살 100g', kcal: 110, protein: 23, carbs: 0, fat: 1.5});
    expect((await db.favoriteFoods.toArray()).map((f) => f.name)).toEqual(['닭가슴살 100g']);
    await deleteFavorite(db, id);
    expect(await db.favoriteFoods.count()).toBe(0);
  });
});

describe('영양 목표', () => {
  test('적용 시작일이 같으면 덮어쓰고, 다르면 추가한다', async () => {
    await saveTarget(db, planTarget('2026-10-01'));
    await saveTarget(db, { ...planTarget('2026-10-01'), kcal: { min: 2100, base: 2150, max: 2200 } });
    await saveTarget(db, planTarget('2026-10-15'));
    const all = await db.nutritionTargets.toArray();
    expect(all).toHaveLength(2);
    expect(all.find((t) => t.startDate === '2026-10-01')?.kcal.base).toBe(2150);
  });
});

describe('주간 측정', () => {
  test('저장하고, 모든 칸을 비우면 지운다', async () => {
    await saveMeasurement(db, { ...emptyMeasurement('2026-10-03'), weightKg: 94.2, waistCm: 98 });
    expect((await db.bodyMeasurements.get('2026-10-03'))?.waistCm).toBe(98);
    await saveMeasurement(db, emptyMeasurement('2026-10-03'));
    expect(await db.bodyMeasurements.count()).toBe(0);
  });
});

describe('earliestRecordAt', () => {
  test('식단과 주간 측정도 첫 기록 시각에 포함한다', async () => {
    await addFood(db, { ...egg, date: '2026-09-28' });
    await saveMeasurement(db, { ...emptyMeasurement('2026-09-29'), weightKg: 95 });
    expect(await earliestRecordAt(db)).toBe(new Date(2026, 8, 28).toISOString());
  });
});
