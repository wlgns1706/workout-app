import { describe, expect, test } from 'vitest';
import { newSetLog } from './progress';
import { workoutSummary } from './summary';
import { TEST_CHART as C } from './testChart';
import type { DayLog, SetLog } from './types';

let seq = 0;
function log(p: { week: number; dayNo?: number; performed?: number; name?: string; kg?: number | null; reps?: number; at: string; type?: SetLog['type']; done?: boolean }): SetLog {
  const dayNo = p.dayNo ?? 1;
  const base = newSetLog('p1', p.week, dayNo, { exerciseIndex: 0, rowIndex: 0, setIndex: seq++, exerciseName: p.name ?? '스쿼트', rpe: 8 }, 'kg');
  const kg = p.kg === undefined ? 100 : p.kg;
  return {
    ...base,
    weight: kg,
    weightKg: kg,
    reps: p.reps ?? 5,
    type: p.type ?? 'work',
    done: p.done ?? true,
    doneAt: p.at,
    performedDayNo: p.performed ?? dayNo,
  };
}
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour, 0).toISOString();
const dayLog = (startedAt: string | null, finishedAt: string | null): DayLog => ({
  id: 'p1|1|1', planId: 'p1', planWeek: 1, dayNo: 1, startedAt, finishedAt, cardioDone: false, optionChoices: [], note: '', deferred: [],
});
const input = (logs: SetLog[], extra: Partial<Parameters<typeof workoutSummary>[0]> = {}) => ({
  chart: C, planId: 'p1', planWeek: 1, dayNo: 1, logs, dayLog: dayLog(at(12, 10), at(12, 11)), plannedSets: 4, ...extra,
});

describe('workoutSummary', () => {
  test('운동 시간, 본 세트 수, 볼륨(kg×회). 웜업과 체크하지 않은 세트는 빼고 센다', () => {
    const logs = [
      log({ week: 1, at: at(12, 10) }),
      log({ week: 1, at: at(12, 10), kg: 80, reps: 10 }),
      log({ week: 1, at: at(12, 10), kg: 40, type: 'warmup' }),
      log({ week: 1, at: at(12, 10), done: false }),
    ];
    const s = workoutSummary(input(logs));
    expect(s.minutes).toBe(60);
    expect(s.setsDone).toBe(2);
    expect(s.setsPlanned).toBe(4);
    expect(s.volumeKg).toBe(100 * 5 + 80 * 10);
  });

  test('같은 요일의 지난번 볼륨과 비교한다. 지난번이 없으면 null', () => {
    const prev = [log({ week: 0, at: at(5) }), log({ week: 0, at: at(5) })];
    const today = [log({ week: 1, at: at(12) }), log({ week: 1, at: at(12) }), log({ week: 1, at: at(12) })];
    expect(workoutSummary(input([...prev, ...today])).prevVolumeKg).toBe(1000);
    expect(workoutSummary(input(today)).prevVolumeKg).toBeNull();
  });

  test('D5에서 이어서 한 세트는 D5 요약에 들어간다', () => {
    const logs = [log({ week: 1, dayNo: 1, performed: 5, at: at(14) }), log({ week: 1, dayNo: 1, performed: 1, at: at(12) })];
    const s = workoutSummary(input(logs, { dayNo: 5, plannedSets: null }));
    expect(s.setsDone).toBe(1);
    expect(s.setsPlanned).toBeNull();
  });

  test('지난번보다 추정 1RM이 오른 종목과 새 PR', () => {
    const logs = [
      log({ week: 0, at: at(1), kg: 110 }), // 예전 최고
      log({ week: 0, at: at(5), kg: 90 }), // 지난번
      log({ week: 1, at: at(12), kg: 100 }), // 오늘: 지난번보다 높지만 PR은 아님
      log({ week: 0, name: '벤치', at: at(5), kg: 60 }),
      log({ week: 1, name: '벤치', at: at(12), kg: 65 }), // 오늘: PR
    ];
    const s = workoutSummary(input(logs));
    expect(s.improved.map((i) => i.name)).toEqual(['스쿼트', '벤치']);
    expect(s.improved[0].after).toBeGreaterThan(s.improved[0].before);
    expect(s.prs).toEqual(['벤치']);
  });

  test('시작이나 끝 시각이 없으면 운동 시간은 null', () => {
    expect(workoutSummary(input([], { dayLog: dayLog(null, at(12)) })).minutes).toBeNull();
  });
});
