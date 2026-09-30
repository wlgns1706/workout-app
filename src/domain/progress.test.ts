import { describe, expect, test } from 'vitest';
import {
  dayLogId,
  dayStatus,
  exerciseDone,
  leftovers,
  newSetLog,
  nextDayNo,
  parseOptions,
  slotId,
  slotsForExercise,
} from './progress';
import { makeTestProgram } from './testProgram';
import type { DayLog, SetLog } from './types';

const program = makeTestProgram();
const week = program.blocks[0].weeks[0];
const PLAN = 'p1';

function doneLog(dayNo: number, exerciseIndex: number, rowIndex: number | null, setIndex: number): SetLog {
  const ex = week.days[dayNo - 1].exercises[exerciseIndex];
  return {
    ...newSetLog(PLAN, 0, dayNo, { exerciseIndex, rowIndex, setIndex, exerciseName: ex.name, rpe: 7 }, 'kg'),
    done: true,
    doneAt: '2026-10-05T10:00:00.000Z',
    performedDayNo: dayNo,
  };
}

describe('slotsForExercise', () => {
  test('세트 줄의 세트 수만큼 자리를 만든다', () => {
    const slots = slotsForExercise(week.days[0].exercises[0], 0);
    expect(slots.map((s) => [s.rowIndex, s.setIndex, s.reps, s.rpe])).toEqual([
      [0, 0, '3~6', 7],
      [1, 0, '8~12', 7],
      [1, 1, '8~12', 7],
    ]);
  });
});

describe('slotId, dayLogId', () => {
  test('처방 세트와 추가 세트의 id가 다르다', () => {
    expect(slotId(PLAN, 0, 1, 0, 1, 1)).toBe('p1|0|1|0|1|1');
    expect(slotId(PLAN, 0, 1, 0, null, 0)).toBe('p1|0|1|0|x|0');
    expect(dayLogId(PLAN, 0, 1)).toBe('p1|0|1');
  });
});

describe('leftovers', () => {
  test('아무것도 안 했으면 D1~D4의 모든 종목이 남는다', () => {
    const result = leftovers(PLAN, 0, week, []);
    expect(result).toHaveLength(8);
    expect(result[0]).toMatchObject({ dayNo: 1, exerciseIndex: 0, missing: 3 });
    expect(result.every((l) => l.dayNo <= 4)).toBe(true);
  });
  test('일부만 체크한 종목은 남은 세트 수를 센다', () => {
    const logs = [doneLog(1, 0, 0, 0), doneLog(1, 0, 1, 0)];
    const first = leftovers(PLAN, 0, week, logs).find((l) => l.dayNo === 1 && l.exerciseIndex === 0);
    expect(first?.missing).toBe(1);
  });
  test('다 한 종목은 빠진다', () => {
    const logs = [doneLog(1, 0, 0, 0), doneLog(1, 0, 1, 0), doneLog(1, 0, 1, 1)];
    const result = leftovers(PLAN, 0, week, logs);
    expect(result.find((l) => l.dayNo === 1 && l.exerciseIndex === 0)).toBeUndefined();
    expect(result).toHaveLength(7);
  });
  test('추가한 세트는 처방 세트로 세지 않는다', () => {
    const logs = [doneLog(1, 0, null, 0), doneLog(1, 0, null, 1), doneLog(1, 0, null, 2)];
    const first = leftovers(PLAN, 0, week, logs).find((l) => l.dayNo === 1 && l.exerciseIndex === 0);
    expect(first?.missing).toBe(3);
  });
  test('체크를 취소한 세트는 남은 것으로 센다', () => {
    const logs = [{ ...doneLog(1, 0, 0, 0), done: false, doneAt: null }];
    const first = leftovers(PLAN, 0, week, logs).find((l) => l.dayNo === 1 && l.exerciseIndex === 0);
    expect(first?.missing).toBe(3);
  });
  test('다른 주의 기록은 세지 않는다', () => {
    const other = { ...doneLog(1, 0, 0, 0), planWeek: 1, id: slotId(PLAN, 1, 1, 0, 0, 0) };
    expect(leftovers(PLAN, 0, week, [other])[0].missing).toBe(3);
  });
  test('완전 휴식 주에는 남는 것이 없다', () => {
    expect(leftovers(PLAN, 15, program.blocks[2].weeks[3], [])).toEqual([]);
  });
});

describe('exerciseDone', () => {
  test('처방 세트를 모두 체크해야 끝난 것이다', () => {
    const ex = week.days[0].exercises[0];
    expect(exerciseDone(PLAN, 0, 1, ex, 0, [doneLog(1, 0, 0, 0)])).toBe(false);
    const all = [doneLog(1, 0, 0, 0), doneLog(1, 0, 1, 0), doneLog(1, 0, 1, 1)];
    expect(exerciseDone(PLAN, 0, 1, ex, 0, all)).toBe(true);
  });
});

describe('dayStatus', () => {
  const dayLog = (patch: Partial<DayLog>): DayLog => ({
    id: dayLogId(PLAN, 0, 1),
    planId: PLAN,
    planWeek: 0,
    dayNo: 1,
    startedAt: null,
    finishedAt: null,
    cardioDone: false,
    optionChoices: [],
    note: '',
    deferred: [],
    ...patch,
  });
  test('기록이 없으면 none', () => {
    expect(dayStatus(1, [], undefined)).toBe('none');
  });
  test('체크한 세트가 있으면 partial', () => {
    expect(dayStatus(1, [doneLog(1, 0, 0, 0)], undefined)).toBe('partial');
  });
  test('운동 완료를 누르면 done', () => {
    expect(dayStatus(1, [], dayLog({ finishedAt: '2026-10-05T11:00:00.000Z' }))).toBe('done');
  });
  test('다른 요일의 기록은 세지 않는다', () => {
    expect(dayStatus(2, [doneLog(1, 0, 0, 0)], undefined)).toBe('none');
  });
});

describe('nextDayNo', () => {
  test('완료하지 않은 가장 앞의 정규 요일', () => {
    expect(nextDayNo(week, () => 'none')).toBe(1);
    expect(nextDayNo(week, (d) => (d <= 2 ? 'done' : 'none'))).toBe(3);
  });
  test('D1~D4를 다 끝냈으면 D5', () => {
    expect(nextDayNo(week, (d) => (d <= 4 ? 'done' : 'none'))).toBe(5);
  });
  test('전부 끝냈으면 마지막 요일', () => {
    expect(nextDayNo(week, () => 'done')).toBe(6);
  });
});

describe('parseOptions', () => {
  test('옵션 단위로 나눈다. 설명 줄은 앞 옵션에 붙는다', () => {
    const text = '옵션 0. 못한 운동 마무리\n\n옵션 1. 스트레칭 30분\nex) 폼롤러 포함\n\n옵션 2. 유산소 60분';
    expect(parseOptions(text)).toEqual([
      '옵션 0. 못한 운동 마무리',
      '옵션 1. 스트레칭 30분\nex) 폼롤러 포함',
      '옵션 2. 유산소 60분',
    ]);
  });
  test('옵션이 하나뿐인 글', () => {
    expect(parseOptions('옵션 1. HIIT 20분')).toEqual(['옵션 1. HIIT 20분']);
  });
  test('없으면 빈 배열', () => {
    expect(parseOptions(null)).toEqual([]);
    expect(parseOptions('  ')).toEqual([]);
  });
});

describe('newSetLog', () => {
  test('빈 기록을 만든다', () => {
    const log = newSetLog(PLAN, 0, 1, { exerciseIndex: 0, rowIndex: 1, setIndex: 1, exerciseName: '운동A1', rpe: 7 }, 'lb');
    expect(log).toMatchObject({
      id: 'p1|0|1|0|1|1',
      type: 'work',
      prescribedRpe: 7,
      unit: 'lb',
      weight: null,
      weightKg: null,
      reps: null,
      done: false,
      performedDayNo: null,
    });
  });
});
