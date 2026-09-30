import Dexie, { type Table } from 'dexie';
import type { BodyLog, DayLog, ExerciseSetting, MetaRow, Plan, Program, SetLog } from '../domain/types';

export class AppDB extends Dexie {
  programs!: Table<Program, string>;
  plans!: Table<Plan, string>;
  setLogs!: Table<SetLog, string>;
  dayLogs!: Table<DayLog, string>;
  bodyLogs!: Table<BodyLog, string>;
  exerciseSettings!: Table<ExerciseSetting, string>;
  meta!: Table<MetaRow, string>;

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
  }
}

export const db = new AppDB();
