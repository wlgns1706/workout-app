import { parseRpe } from './reps';
import type { DayLog, ProgramExercise, ProgramWeek, SetLog, Unit } from './types';

export interface Slot {
  exerciseIndex: number;
  rowIndex: number;
  setIndex: number;
  exerciseName: string;
  reps: string;
  rpe: number | null;
}

export function slotsForExercise(exercise: ProgramExercise, exerciseIndex: number): Slot[] {
  const slots: Slot[] = [];
  exercise.rows.forEach((row, rowIndex) => {
    for (let setIndex = 0; setIndex < row.sets; setIndex++) {
      slots.push({
        exerciseIndex,
        rowIndex,
        setIndex,
        exerciseName: exercise.name,
        reps: row.reps,
        rpe: parseRpe(row.rpe),
      });
    }
  });
  return slots;
}

export function slotId(
  planId: string,
  planWeek: number,
  dayNo: number,
  exerciseIndex: number,
  rowIndex: number | null,
  setIndex: number,
): string {
  return [planId, planWeek, dayNo, exerciseIndex, rowIndex ?? 'x', setIndex].join('|');
}

export function dayLogId(planId: string, planWeek: number, dayNo: number): string {
  return [planId, planWeek, dayNo].join('|');
}

export function newSetLog(
  planId: string,
  planWeek: number,
  dayNo: number,
  slot: { exerciseIndex: number; rowIndex: number | null; setIndex: number; exerciseName: string; rpe: number | null },
  unit: Unit,
): SetLog {
  return {
    id: slotId(planId, planWeek, dayNo, slot.exerciseIndex, slot.rowIndex, slot.setIndex),
    planId,
    planWeek,
    dayNo,
    exerciseIndex: slot.exerciseIndex,
    rowIndex: slot.rowIndex,
    setIndex: slot.setIndex,
    exerciseName: slot.exerciseName,
    type: 'work',
    prescribedRpe: slot.rpe,
    weight: null,
    unit,
    weightKg: null,
    reps: null,
    rpe: null,
    memo: '',
    done: false,
    doneAt: null,
    performedDayNo: null,
  };
}

function doneIds(logs: SetLog[]): Set<string> {
  return new Set(logs.filter((l) => l.done).map((l) => l.id));
}

function missingCount(
  planId: string,
  planWeek: number,
  dayNo: number,
  exercise: ProgramExercise,
  exerciseIndex: number,
  done: Set<string>,
): number {
  return slotsForExercise(exercise, exerciseIndex).filter(
    (s) => !done.has(slotId(planId, planWeek, dayNo, s.exerciseIndex, s.rowIndex, s.setIndex)),
  ).length;
}

export function exerciseDone(
  planId: string,
  planWeek: number,
  dayNo: number,
  exercise: ProgramExercise,
  exerciseIndex: number,
  logs: SetLog[],
): boolean {
  return missingCount(planId, planWeek, dayNo, exercise, exerciseIndex, doneIds(logs)) === 0;
}

export interface Leftover {
  dayNo: number;
  exerciseIndex: number;
  exercise: ProgramExercise;
  missing: number;
}

/** 이번 주의 정규 요일(D1~D4)에서 체크하지 않은 처방 세트가 남은 종목 */
export function leftovers(planId: string, planWeek: number, week: ProgramWeek, logs: SetLog[]): Leftover[] {
  const done = doneIds(logs);
  const result: Leftover[] = [];
  for (const day of week.days) {
    if (day.optional) continue;
    day.exercises.forEach((exercise, exerciseIndex) => {
      const missing = missingCount(planId, planWeek, day.dayNo, exercise, exerciseIndex, done);
      if (missing > 0) result.push({ dayNo: day.dayNo, exerciseIndex, exercise, missing });
    });
  }
  return result;
}

export type DayStatus = 'none' | 'partial' | 'done';

/** logs는 같은 일정, 같은 주의 기록이다. */
export function dayStatus(dayNo: number, logs: SetLog[], dayLog: DayLog | undefined): DayStatus {
  if (dayLog?.finishedAt) return 'done';
  if (dayLog?.startedAt) return 'partial';
  return logs.some((l) => l.done && l.dayNo === dayNo) ? 'partial' : 'none';
}

export function nextDayNo(week: ProgramWeek, statusOf: (dayNo: number) => DayStatus): number {
  const regular = week.days.find((d) => !d.optional && statusOf(d.dayNo) !== 'done');
  if (regular) return regular.dayNo;
  const optional = week.days.find((d) => d.optional && statusOf(d.dayNo) !== 'done');
  if (optional) return optional.dayNo;
  return week.days[week.days.length - 1].dayNo;
}

export function parseOptions(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n(?=\s*옵션\s*\d)/)
    .map((part) => part.replace(/\n\s*\n/g, '\n').trim())
    .filter((part) => part !== '');
}

interface FillSide {
  repsText: string | null;
  weight: number | null;
  reps: number | null;
}

/** 방금 체크한 세트의 값을 다음 세트에 채울 내용. 반복 처방이 같은 세트의 빈 칸에만 채운다. */
export function autofillPatch(done: FillSide, next: FillSide): { weight?: number; reps?: number } | null {
  if (done.repsText !== next.repsText) return null;
  const patch: { weight?: number; reps?: number } = {};
  if (next.weight == null && done.weight != null) patch.weight = done.weight;
  if (next.reps == null && done.reps != null) patch.reps = done.reps;
  return Object.keys(patch).length > 0 ? patch : null;
}

/** 세트 번호를 눌렀을 때의 다음 타입. 본 세트와 웜업을 오가고, 실패 세트는 웜업이 된다. */
export function nextSetType(type: SetLog['type']): SetLog['type'] {
  return type === 'warmup' ? 'work' : 'warmup';
}
