import { describe, expect, test } from 'vitest';
import { bestE1RM, estimate1RM, formatSet, isPR, lastSession, pctFor, prefill, recommendWeight, setE1RM } from './e1rm';
import { newSetLog } from './progress';
import { TEST_CHART as C } from './testChart';
import type { SetLog, Unit } from './types';

let seq = 0;
function log(patch: Partial<SetLog> & { at: string; planWeek?: number; dayNo?: number }): SetLog {
  const { at, ...rest } = patch;
  const planWeek = patch.planWeek ?? 0;
  const dayNo = patch.dayNo ?? 1;
  const unit: Unit = patch.unit ?? 'kg';
  const base = newSetLog('p1', planWeek, dayNo, { exerciseIndex: 0, rowIndex: 0, setIndex: seq++, exerciseName: '운동A', rpe: 7 }, unit);
  const weight = patch.weight === undefined ? 60 : patch.weight;
  return {
    ...base,
    weight,
    weightKg: weight == null ? null : unit === 'lb' ? weight * 0.45359237 : weight,
    reps: 10,
    done: true,
    doneAt: at,
    performedDayNo: dayNo,
    ...rest,
  };
}
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour, 0).toISOString();
const NOW = { planId: 'p1', planWeek: 1, dayNo: 1 };

describe('pctFor', () => {
  test('차트 값을 찾는다', () => {
    expect(pctFor(C, 5, 8)).toBe(0.811);
    expect(pctFor(C, 10, 7)).toBe(0.653);
    expect(pctFor(C, 1, 10)).toBe(1);
  });
  test('RPE는 0.5 단위로 맞추고, 6.5보다 작으면 6.5, 10보다 크면 10으로 본다', () => {
    expect(pctFor(C, 5, 8.2)).toBe(0.811);
    expect(pctFor(C, 5, 5)).toBe(0.774);
    expect(pctFor(C, 5, 11)).toBe(0.863);
  });
  test('반복 수가 1~12회 정수가 아니면 null', () => {
    expect(pctFor(C, 13, 8)).toBeNull();
    expect(pctFor(C, 30, 9)).toBeNull();
    expect(pctFor(C, 0, 8)).toBeNull();
    expect(pctFor(C, 5.5, 8)).toBeNull();
  });
});

describe('estimate1RM', () => {
  test('무게 ÷ 비율', () => {
    expect(estimate1RM(C, 100, 5, 8)).toBeCloseTo(123.3, 1);
  });
  test('무게가 0이면 null', () => {
    expect(estimate1RM(C, 0, 5, 8)).toBeNull();
  });
});

describe('setE1RM', () => {
  test('입력한 RPE를 쓴다', () => {
    expect(setE1RM(C, log({ at: at(5), rpe: 8 }))).toBeCloseTo(60 / 0.68, 5);
  });
  test('RPE를 입력하지 않았으면 처방 RPE를 쓴다', () => {
    expect(setE1RM(C, log({ at: at(5) }))).toBeCloseTo(60 / 0.653, 5);
  });
  test('실패 세트는 RPE 10으로 본다', () => {
    expect(setE1RM(C, log({ at: at(5), type: 'failure', rpe: 8 }))).toBeCloseTo(60 / 0.739, 5);
  });
  test('웜업, 미수행, 12회 초과는 null', () => {
    expect(setE1RM(C, log({ at: at(5), type: 'warmup' }))).toBeNull();
    expect(setE1RM(C, log({ at: at(5), done: false }))).toBeNull();
    expect(setE1RM(C, log({ at: at(5), reps: 30 }))).toBeNull();
  });
  test('무게를 비운 맨몸 운동은 null', () => {
    expect(setE1RM(C, log({ at: at(5), weight: null }))).toBeNull();
    expect(setE1RM(C, log({ at: at(5), weight: 0 }))).toBeNull();
  });
  test('RPE도 처방 RPE도 없으면 null', () => {
    expect(setE1RM(C, log({ at: at(5), prescribedRpe: null }))).toBeNull();
  });
});

describe('recommendWeight', () => {
  const base = 60 / 0.653; // 60kg × 10회 @7
  test('스펙의 예시: 8~12회 @8이면 62.5kg', () => {
    expect(recommendWeight(C, base, '8~12', 8, 'kg')).toBe(62.5);
  });
  test('lbs는 5 단위로 반올림한다', () => {
    expect(recommendWeight(C, base, '8~12', 8, 'lb')).toBe(140);
  });
  test('12회를 넘거나 시간이거나 RPE가 없으면 null', () => {
    expect(recommendWeight(C, base, '15~20', 7, 'kg')).toBeNull();
    expect(recommendWeight(C, base, '30', 9, 'kg')).toBeNull();
    expect(recommendWeight(C, base, '30s', 7, 'kg')).toBeNull();
    expect(recommendWeight(C, base, '8~12', null, 'kg')).toBeNull();
  });
});

describe('lastSession', () => {
  test('가장 최근 날짜의 본 세트와 실패 세트를 시간순으로 돌려준다', () => {
    const history = [
      log({ at: at(5, 10), weight: 50 }),
      log({ at: at(8, 10), weight: 60 }),
      log({ at: at(8, 11), weight: 62.5, type: 'failure' }),
      log({ at: at(8, 9), weight: 20, type: 'warmup' }),
    ];
    const s = lastSession(history, NOW);
    expect(s?.date).toBe('2026-10-08');
    expect(s?.sets.map((x) => x.weight)).toEqual([60, 62.5]);
  });
  test('지금 기록 중인 요일의 세트는 뺀다', () => {
    const history = [log({ at: at(5) }), log({ at: at(12), planWeek: 1, dayNo: 1 })];
    expect(lastSession(history, NOW)?.date).toBe('2026-10-05');
  });
  test('기록이 없으면 null', () => {
    expect(lastSession([], NOW)).toBeNull();
    expect(lastSession([log({ at: at(5), done: false, doneAt: null })], NOW)).toBeNull();
  });
});

describe('prefill', () => {
  test('최근 기록으로 추천 무게를 계산한다', () => {
    expect(prefill(C, [log({ at: at(5) })], NOW, '8~12', 8, 'kg')).toEqual({ weight: 62.5, source: 'recommended' });
  });
  test('그날의 세트 중 추정 1RM이 가장 큰 것을 기준으로 한다', () => {
    const history = [log({ at: at(5, 10), weight: 50 }), log({ at: at(5, 11), weight: 60 })];
    expect(prefill(C, history, NOW, '8~12', 8, 'kg')?.weight).toBe(62.5);
  });
  test('12회를 넘는 처방은 지난번 무게를 채운다', () => {
    const history = [log({ at: at(5), weight: 12, reps: 18 })];
    expect(prefill(C, history, NOW, '15~20', 7, 'kg')).toEqual({ weight: 12, source: 'last' });
  });
  test('지난 기록이 lbs이고 지금 단위가 kg이면 환산한다', () => {
    const history = [log({ at: at(5), weight: 25, unit: 'lb', reps: 18 })];
    expect(prefill(C, history, NOW, '15~20', 7, 'kg')).toEqual({ weight: 11.5, source: 'last' });
  });
  test('지난 기록이 lbs여도 추천 무게는 지금 단위로 나온다', () => {
    const history = [log({ at: at(5), weight: 132.5, unit: 'lb' })];
    expect(prefill(C, history, NOW, '8~12', 8, 'kg')).toEqual({ weight: 62.5, source: 'recommended' });
  });
  test('기록이 없거나 맨몸 운동이면 null', () => {
    expect(prefill(C, [], NOW, '8~12', 8, 'kg')).toBeNull();
    expect(prefill(C, [log({ at: at(5), weight: null })], NOW, '10~20', 7, 'kg')).toBeNull();
  });
});

describe('isPR', () => {
  test('첫 기록에는 표시하지 않는다', () => {
    const first = log({ at: at(5) });
    expect(isPR(C, first, [first])).toBe(false);
  });
  test('이전 최고값을 넘으면 PR이다', () => {
    const old = log({ at: at(5), weight: 60 });
    const better = log({ at: at(12), weight: 62.5 });
    expect(isPR(C, better, [old, better])).toBe(true);
  });
  test('같거나 낮으면 PR이 아니다', () => {
    const old = log({ at: at(5), weight: 60 });
    const same = log({ at: at(12), weight: 60 });
    expect(isPR(C, same, [old, same])).toBe(false);
  });
  test('나중에 한 기록은 비교 대상이 아니다', () => {
    const early = log({ at: at(5), weight: 60 });
    const mid = log({ at: at(8), weight: 62.5 });
    const late = log({ at: at(12), weight: 70 });
    expect(isPR(C, mid, [early, mid, late])).toBe(true);
  });
});

describe('formatSet', () => {
  test('무게와 횟수', () => {
    expect(formatSet(log({ at: at(5), weight: 60, reps: 10 }))).toBe('60kg×10');
    expect(formatSet(log({ at: at(5), weight: 135, unit: 'lb', reps: 8 }))).toBe('135lbs×8');
  });
  test('무게가 없으면 횟수만', () => {
    expect(formatSet(log({ at: at(5), weight: null, reps: 12 }))).toBe('12회');
  });
});

describe('bestE1RM', () => {
  test('모든 기록 중 가장 큰 추정 1RM', () => {
    const history = [log({ at: at(5), weight: 60 }), log({ at: at(8), weight: 70 }), log({ at: at(9), weight: 90, type: 'warmup' })];
    expect(bestE1RM(C, history)).toBeCloseTo(70 / 0.653, 5);
  });
  test('계산할 수 있는 기록이 없으면 null', () => {
    expect(bestE1RM(C, [])).toBeNull();
    expect(bestE1RM(C, [log({ at: at(5), weight: null })])).toBeNull();
  });
});
