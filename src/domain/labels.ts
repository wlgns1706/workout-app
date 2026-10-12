import { parseRpe } from './reps';
import type { WeekInfo } from './schedule';
import type { ProgramExercise, ProgramWeek } from './types';

/** "전체 2/16주 · 블록 1의 2주차 · RPE 7 주간" */
export function weekLabel(info: WeekInfo, total: number, rpe: number | null): string {
  const block = `블록 ${info.block}${info.occurrence > 1 ? `(${info.occurrence}회차)` : ''}의 ${info.week}주차`;
  return [`전체 ${info.planWeek + 1}/${total}주`, block, rpe != null ? `RPE ${rpe} 주간` : null].filter(Boolean).join(' · ');
}

/** 그 주 정규 요일 처방에서 가장 많이 나온 RPE. 없으면 null이다. */
export function weekRpe(week: ProgramWeek): number | null {
  if (week.rest) return null;
  const counts = new Map<number, number>();
  for (const day of week.days.filter((d) => !d.optional)) {
    for (const row of day.exercises.flatMap((e) => e.rows)) {
      const rpe = parseRpe(row.rpe);
      if (rpe != null) counts.set(rpe, (counts.get(rpe) ?? 0) + row.sets);
    }
  }
  let best: number | null = null;
  for (const [rpe, n] of counts) if (best == null || n > counts.get(best)!) best = rpe;
  return best;
}

/** 횟수 글자. 숫자로 끝나면 "회"를 붙인다. */
export function repsText(reps: string): string {
  return /\d$/.test(reps) ? `${reps}회` : reps;
}

/** "2세트 × 8~12회 · RPE 7". 처방 줄이 여러 개면 +로 잇는다. */
export function prescriptionText(exercise: ProgramExercise): string {
  return exercise.rows
    .map((row) => {
      const rpe = parseRpe(row.rpe);
      return `${row.sets}세트 × ${repsText(row.reps)}${rpe != null ? ` · RPE ${rpe}` : ''}`;
    })
    .join(' + ');
}
