import { localDateOf } from './date';
import { isPR, setE1RM } from './e1rm';
import type { DayLog, RpeChart, SetLog } from './types';

export interface SummaryInput {
  chart: RpeChart;
  planId: string;
  planWeek: number;
  dayNo: number; // 실제로 운동한 요일
  logs: SetLog[]; // 모든 세트 기록
  dayLog: DayLog | undefined;
  plannedSets: number | null; // 처방 세트 수. 선택 요일은 null
}

export interface WorkoutSummary {
  minutes: number | null;
  setsDone: number; // 웜업을 뺀 체크한 세트
  setsPlanned: number | null;
  volumeKg: number; // kg × 회의 합
  prevVolumeKg: number | null; // 같은 요일 지난번
  improved: { name: string; before: number; after: number }[]; // 지난번보다 오른 추정 1RM
  prs: string[]; // 새 PR이 나온 종목
}

const counts = (l: SetLog) => l.done && l.type !== 'warmup';
const performedOn = (l: SetLog) => l.performedDayNo ?? l.dayNo;
const volume = (logs: SetLog[]) => logs.reduce((sum, l) => sum + (l.weightKg ?? 0) * (l.reps ?? 0), 0);
const maxOf = (values: (number | null)[]) => {
  const v = values.filter((x): x is number => x != null);
  return v.length === 0 ? null : Math.max(...v);
};

/** "운동 완료"를 눌렀을 때 보여줄 오늘 운동 요약 */
export function workoutSummary(input: SummaryInput): WorkoutSummary {
  const { chart, planId, planWeek, dayNo, logs, dayLog } = input;
  const today = logs.filter((l) => counts(l) && l.planId === planId && l.planWeek === planWeek && performedOn(l) === dayNo);
  const todayIds = new Set(today.map((l) => l.id));

  // 같은 요일의 가장 최근 지난 주
  const earlier = logs.filter((l) => counts(l) && l.planId === planId && l.planWeek < planWeek && performedOn(l) === dayNo);
  const prevWeek = earlier.length === 0 ? null : Math.max(...earlier.map((l) => l.planWeek));

  const names = [...new Set(today.map((l) => l.exerciseName))];
  const improved: WorkoutSummary['improved'] = [];
  const prs: string[] = [];
  for (const name of names) {
    const mine = today.filter((l) => l.exerciseName === name);
    const history = logs.filter((l) => counts(l) && l.exerciseName === name);
    const firstToday = mine.map((l) => l.doneAt ?? '').sort()[0];
    // 오늘 이전의 마지막 운동 날
    const past = history.filter((l) => !todayIds.has(l.id) && l.doneAt != null && l.doneAt < firstToday);
    const lastDate = past.length === 0 ? null : past.map((l) => localDateOf(l.doneAt!)).sort().at(-1);
    const before = maxOf(past.filter((l) => localDateOf(l.doneAt!) === lastDate).map((l) => setE1RM(chart, l)));
    const after = maxOf(mine.map((l) => setE1RM(chart, l)));
    if (before != null && after != null && after > before + 0.05) improved.push({ name, before, after });
    if (mine.some((l) => isPR(chart, l, history))) prs.push(name);
  }

  const start = dayLog?.startedAt;
  const end = dayLog?.finishedAt;
  return {
    minutes: start && end ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null,
    setsDone: today.length,
    setsPlanned: input.plannedSets,
    volumeKg: volume(today),
    prevVolumeKg: prevWeek == null ? null : volume(earlier.filter((l) => l.planWeek === prevWeek)),
    improved,
    prs,
  };
}
