import { TEST_CHART } from './testChart';
import type { Program, ProgramDay, ProgramWeek } from './types';

function day(dayNo: number, rpe: string): ProgramDay {
  return {
    dayNo,
    optional: false,
    exercises: [
      { name: `운동A${dayNo}`, rows: [{ sets: 1, reps: '3~6', rpe }, { sets: 2, reps: '8~12', rpe }] },
      { name: `운동B${dayNo}`, rows: [{ sets: 3, reps: '15~20', rpe }] },
    ],
    cardio: { label: '저강도 유산소(권장사항)', detail: '20분', required: false },
    optionsText: null,
  };
}

function optionalDay(dayNo: number): ProgramDay {
  return {
    dayNo,
    optional: true,
    exercises: [],
    cardio: null,
    optionsText: '옵션 0. 못한 운동 마무리\n\n옵션 1. 스트레칭 30분\nex) 폼롤러 포함\n\n옵션 2. 유산소 60분',
  };
}

function week(rpe: string): ProgramWeek {
  return { rest: false, days: [day(1, rpe), day(2, rpe), day(3, rpe), day(4, rpe), optionalDay(5), optionalDay(6)] };
}

const restWeek: ProgramWeek = {
  rest: true,
  days: [1, 2, 3, 4, 5, 6].map((dayNo) => ({
    dayNo,
    optional: dayNo > 4,
    exercises: [],
    cardio: null,
    optionsText: null,
  })),
};

export function makeTestProgram(): Program {
  return {
    type: 'workout-program',
    formatVersion: 1,
    id: 'test-program',
    name: '테스트 프로그램',
    blocks: [
      { weeks: [week('@7'), week('@7'), week('@7'), week('@7')] },
      { weeks: [week('@8'), week('@8'), week('@8'), week('@8')] },
      { weeks: [week('@9'), week('@9'), week('@9'), restWeek] },
    ],
    rpeChart: TEST_CHART,
  };
}
