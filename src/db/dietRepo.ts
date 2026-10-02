import type { BodyMeasurement, FavoriteFood, FoodEntry, Meal, NutritionTarget } from '../domain/types';
import type { AppDB } from './db';

export type FoodInput = Omit<FoodEntry, 'id' | 'createdAt'>;

export async function addFood(db: AppDB, input: FoodInput): Promise<string> {
  const id = crypto.randomUUID();
  await db.foodEntries.put({ ...input, id, createdAt: new Date().toISOString() });
  return id;
}

export async function updateFood(db: AppDB, id: string, patch: Partial<FoodInput>): Promise<void> {
  await db.foodEntries.update(id, patch);
}

export async function deleteFood(db: AppDB, id: string): Promise<void> {
  await db.foodEntries.delete(id);
}

export async function copyMeal(db: AppDB, fromDate: string, toDate: string, meal: Meal): Promise<number> {
  const source = await db.foodEntries.where('date').equals(fromDate).filter((f) => f.meal === meal).toArray();
  const now = new Date().toISOString();
  await db.foodEntries.bulkPut(source.map((f) => ({ ...f, id: crypto.randomUUID(), date: toDate, createdAt: now })));
  return source.length;
}

export async function saveFavorite(db: AppDB, food: Omit<FavoriteFood, 'id'> & { id?: string }): Promise<string> {
  const id = food.id ?? crypto.randomUUID();
  await db.favoriteFoods.put({ ...food, id });
  return id;
}

export async function deleteFavorite(db: AppDB, id: string): Promise<void> {
  await db.favoriteFoods.delete(id);
}

export async function saveTarget(db: AppDB, target: NutritionTarget): Promise<void> {
  await db.nutritionTargets.put(target);
}

export function emptyMeasurement(date: string): BodyMeasurement {
  return { date, weightKg: null, skeletalMuscleKg: null, bodyFatKg: null, bodyFatPct: null, waistCm: null };
}

export async function saveMeasurement(db: AppDB, m: BodyMeasurement): Promise<void> {
  const empty = [m.weightKg, m.skeletalMuscleKg, m.bodyFatKg, m.bodyFatPct, m.waistCm].every((v) => v == null);
  if (empty) await db.bodyMeasurements.delete(m.date);
  else await db.bodyMeasurements.put(m);
}
