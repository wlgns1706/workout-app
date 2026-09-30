import { addDays, diffDays } from './date';
import type { Plan, Program, ProgramWeek } from './types';

export interface WeekInfo {
  planWeek: number;
  block: number;
  occurrence: number; // 이 블록을 몇 번째로 하는지
  week: number; // 블록 안의 주차, 1~4
  weekStart: string;
  weekEnd: string;
}

export type Position =
  | { status: 'before'; daysUntil: number }
  | ({ status: 'active' } & WeekInfo)
  | { status: 'finished' };

export function totalWeeks(plan: Plan): number {
  return plan.blockSequence.length * 4;
}

export function weekInfo(plan: Plan, planWeek: number): WeekInfo {
  const seqIndex = Math.floor(planWeek / 4);
  const block = plan.blockSequence[seqIndex];
  const occurrence = plan.blockSequence.slice(0, seqIndex + 1).filter((b) => b === block).length;
  const weekStart = addDays(plan.startDate, planWeek * 7);
  return { planWeek, block, occurrence, week: (planWeek % 4) + 1, weekStart, weekEnd: addDays(weekStart, 6) };
}

export function positionOn(plan: Plan, today: string): Position {
  const days = diffDays(plan.startDate, today);
  if (days < 0) return { status: 'before', daysUntil: -days };
  const planWeek = Math.floor(days / 7);
  if (planWeek >= totalWeeks(plan)) return { status: 'finished' };
  return { status: 'active', ...weekInfo(plan, planWeek) };
}

export function getWeek(program: Program, plan: Plan, planWeek: number): ProgramWeek | null {
  if (planWeek < 0 || planWeek >= totalWeeks(plan)) return null;
  const info = weekInfo(plan, planWeek);
  return program.blocks[info.block - 1]?.weeks[info.week - 1] ?? null;
}

/** "1,1,2,3" 같은 글자를 블록 순서로 바꾼다. 잘못된 값이면 null이다. */
export function parseSequence(text: string, blockCount: number): number[] | null {
  const parts = text.split(/[^0-9a-zA-Z]+/).filter((p) => p !== '');
  if (parts.length === 0) return null;
  const numbers = parts.map(Number);
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > blockCount)) return null;
  return numbers;
}
