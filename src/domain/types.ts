export type Unit = 'kg' | 'lb';
export type SetType = 'warmup' | 'work' | 'failure';

export interface PrescriptionRow {
  sets: number;
  reps: string; // "8~12", "30", "30s"
  rpe: string | null; // "@7"
}

export interface ProgramExercise {
  name: string;
  rows: PrescriptionRow[];
}

export interface Cardio {
  label: string;
  detail: string;
  required: boolean;
}

export interface ProgramDay {
  dayNo: number; // 1~6
  optional: boolean;
  exercises: ProgramExercise[];
  cardio: Cardio | null;
  optionsText: string | null;
}

export interface ProgramWeek {
  rest: boolean; // 완전 휴식 주
  days: ProgramDay[];
}

export interface ProgramBlock {
  weeks: ProgramWeek[];
}

export interface RpeChart {
  reps: number[]; // [1..12]
  rows: { rpe: number; pct: number[] }[];
}

export interface Program {
  type: 'workout-program';
  formatVersion: 1;
  id: string;
  name: string;
  blocks: ProgramBlock[];
  rpeChart: RpeChart;
}

export interface Plan {
  id: string;
  programId: string;
  startDate: string; // YYYY-MM-DD
  blockSequence: number[]; // 1부터 세는 블록 번호. 예: [1, 1, 2, 3]
  createdAt: string; // ISO
}

export interface SetLog {
  id: string;
  planId: string;
  planWeek: number; // 0부터
  dayNo: number; // 처방이 속한 요일
  exerciseIndex: number;
  rowIndex: number | null; // 추가한 세트는 null
  setIndex: number;
  exerciseName: string;
  type: SetType;
  prescribedRpe: number | null;
  weight: number | null; // 입력한 단위 기준
  unit: Unit;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  memo: string;
  done: boolean;
  doneAt: string | null; // ISO
  performedDayNo: number | null; // 실제로 수행한 요일
}

export interface DayLog {
  id: string; // `${planId}|${planWeek}|${dayNo}`
  planId: string;
  planWeek: number;
  dayNo: number;
  startedAt: string | null;
  finishedAt: string | null;
  cardioDone: boolean;
  optionChoices: number[];
  note: string;
  deferred: number[]; // "나중에 하기"로 미룬 종목의 exerciseIndex, 미룬 순서
}

export interface BodyLog {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  sleepHours: number | null;
  nutrition: number | null;
  motivation: number | null;
  confidence: number | null;
  stress: number | null;
  fatigue: number | null;
}

export interface ExerciseSetting {
  exerciseName: string;
  unit: Unit;
  restSeconds: number;
  note: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

export const DEFAULT_REST_SECONDS = 120;
