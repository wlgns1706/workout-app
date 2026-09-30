import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { patchDayLog, weekLogs } from '../../db/repo';
import { dayLogId, exerciseDone, slotId, slotsForExercise } from '../../domain/progress';
import { getWeek, weekInfo } from '../../domain/schedule';
import { useWakeLock } from '../../ui/useWakeLock';
import { useActive } from '../useActive';
import { DayFooter, markStarted, type DayViewProps } from './dayShared';
import { ExerciseCard } from './ExerciseCard';
import { OptionalDay } from './OptionalDay';

export default function WorkoutPage() {
  const params = useParams();
  const planWeek = Number(params.planWeek);
  const dayNo = Number(params.dayNo);
  const active = useActive();
  const plan = active?.plan;
  const data = useLiveQuery(async () => {
    if (!plan) return null;
    const logs = await weekLogs(db, plan.id, planWeek);
    const dayLog = await db.dayLogs.get(dayLogId(plan.id, planWeek, dayNo));
    return { logs, dayLog };
  }, [plan?.id, planWeek, dayNo]);
  useWakeLock(true);

  if (!active || data === undefined) return null;
  const program = active.program;
  const week = plan && program ? getWeek(program, plan, planWeek) : null;
  const day = week?.days.find((d) => d.dayNo === dayNo);
  if (!plan || !program || !data || !week || !day) {
    return (
      <main className="page">
        <div className="error">이 운동을 찾을 수 없습니다.</div>
        <Link className="btn" to="/">오늘로 돌아가기</Link>
      </main>
    );
  }
  const info = weekInfo(plan, planWeek);
  const view: DayViewProps = { program, plan, planWeek, day, logs: data.logs, dayLog: data.dayLog };

  return (
    <main className="page">
      <div className="row between">
        <h1>D{dayNo}{day.optional && ' (선택)'}</h1>
        <Link className="btn small" to="/">닫기</Link>
      </div>
      <p className="muted">{planWeek + 1}주차 · 블록 {info.block} · {info.week}주차</p>
      {week.rest ? (
        <p className="muted">이번 주는 완전 휴식입니다.</p>
      ) : day.optional ? (
        <OptionalDay {...view} />
      ) : (
        <RegularDay {...view} />
      )}
    </main>
  );
}

function RegularDay(view: DayViewProps) {
  const { program, plan, planWeek, day, logs, dayLog } = view;
  const deferred = (dayLog?.deferred ?? []).filter((i) => i < day.exercises.length);
  const order = [...day.exercises.map((_, i) => i).filter((i) => !deferred.includes(i)), ...deferred];
  const doneCount = day.exercises.filter((ex, i) => exerciseDone(plan.id, planWeek, day.dayNo, ex, i, logs)).length;
  const doneIds = new Set(logs.filter((l) => l.done).map((l) => l.id));
  const missing = day.exercises
    .flatMap((ex, i) => slotsForExercise(ex, i))
    .filter((s) => !doneIds.has(slotId(plan.id, planWeek, day.dayNo, s.exerciseIndex, s.rowIndex, s.setIndex))).length;

  const defer = (exerciseIndex: number) =>
    patchDayLog(db, plan.id, planWeek, day.dayNo, { deferred: [...deferred.filter((i) => i !== exerciseIndex), exerciseIndex] });

  return (
    <>
      <div className="progress">
        <strong>{doneCount} / {day.exercises.length} 종목</strong>
        <progress value={doneCount} max={day.exercises.length} style={{ width: '100%' }} />
      </div>
      {order.map((exerciseIndex) => (
        <ExerciseCard
          key={exerciseIndex}
          program={program}
          plan={plan}
          planWeek={planWeek}
          dayNo={day.dayNo}
          performedDayNo={day.dayNo}
          exerciseIndex={exerciseIndex}
          exercise={day.exercises[exerciseIndex]}
          logs={logs}
          onDefer={() => defer(exerciseIndex)}
          onChecked={() => markStarted(plan, planWeek, day.dayNo, dayLog)}
        />
      ))}
      <DayFooter {...view} missing={missing} />
    </>
  );
}
