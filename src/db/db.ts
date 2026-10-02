import Dexie, { type Table } from 'dexie';
import type {
  BodyLog,
  BodyMeasurement,
  DayLog,
  ExerciseSetting,
  FavoriteFood,
  FoodEntry,
  MetaRow,
  NutritionTarget,
  Plan,
  Program,
  SetLog,
} from '../domain/types';

export class AppDB extends Dexie {
  programs!: Table<Program, string>;
  plans!: Table<Plan, string>;
  setLogs!: Table<SetLog, string>;
  dayLogs!: Table<DayLog, string>;
  bodyLogs!: Table<BodyLog, string>;
  exerciseSettings!: Table<ExerciseSetting, string>;
  meta!: Table<MetaRow, string>;
  foodEntries!: Table<FoodEntry, string>;
  favoriteFoods!: Table<FavoriteFood, string>;
  nutritionTargets!: Table<NutritionTarget, string>;
  bodyMeasurements!: Table<BodyMeasurement, string>;

  constructor(name = 'workout-app') {
    super(name);
    this.version(1).stores({
      programs: 'id',
      plans: 'id, createdAt',
      setLogs: 'id, [planId+planWeek], exerciseName',
      dayLogs: 'id, planId',
      bodyLogs: 'date',
      exerciseSettings: 'exerciseName',
      meta: 'key',
    });
    this.version(2).stores({
      foodEntries: 'id, date',
      favoriteFoods: 'id',
      nutritionTargets: 'startDate',
      bodyMeasurements: 'date',
    });
  }
}

export const db = new AppDB();
