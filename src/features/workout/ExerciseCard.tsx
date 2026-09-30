import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { defaultSetting, deleteSetLog, exerciseHistory, patchSetting, saveSetLog } from '../../db/repo';
import { formatSet, isPR, lastSession, prefill, type DayKey, type Prefill } from '../../domain/e1rm';
import { autofillPatch, exerciseDone, newSetLog, slotsForExercise } from '../../domain/progress';
import { defaultReps } from '../../domain/reps';
import type { Plan, Program, ProgramExercise, SetLog, Unit } from '../../domain/types';
import { fromKg, roundTo, toKg } from '../../domain/units';
import { useTimer } from '../../ui/timer';
import { SetRow } from './SetRow';

interface Props {
  program: Program;
  plan: Plan;
  planWeek: number;
  dayNo: number; // 처방이 속한 요일
  performedDayNo: number; // 지금 화면의 요일
  exerciseIndex: number;
  exercise: ProgramExercise;
  logs: SetLog[]; // 이 주의 모든 세트 기록
  onDefer?: () => void;
  onChecked(): void;
}

interface Item {
  key: string;
  rowIndex: number | null;
  setIndex: number;
  repsText: string | null;
  rpe: number | null;
  log: SetLog | undefined;
}

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300];

export function ExerciseCard(props: Props) {
  const { plan, planWeek, dayNo, exerciseIndex, exercise } = props;
  const timer = useTimer();
  const [open, setOpen] = useState(false);
  const setting = useLiveQuery(() => db.exerciseSettings.get(exercise.name), [exercise.name]) ?? defaultSetting(exercise.name);
  const history = useLiveQuery(() => exerciseHistory(db, exercise.name), [exercise.name]) ?? [];

  const mine = props.logs.filter((l) => l.dayNo === dayNo && l.exerciseIndex === exerciseIndex);
  const slots = slotsForExercise(exercise, exerciseIndex);
  const extras = mine.filter((l) => l.rowIndex === null).sort((a, b) => a.setIndex - b.setIndex);
  const extraItem = (l: SetLog): Item => ({ key: l.id, rowIndex: null, setIndex: l.setIndex, repsText: null, rpe: slots[0]?.rpe ?? null, log: l });
  const items: Item[] = [
    ...extras.filter((l) => l.type === 'warmup').map(extraItem),
    ...slots.map((s) => ({
      key: `${s.rowIndex}-${s.setIndex}`,
      rowIndex: s.rowIndex,
      setIndex: s.setIndex,
      repsText: s.reps,
      rpe: s.rpe,
      log: mine.find((l) => l.rowIndex === s.rowIndex && l.setIndex === s.setIndex),
    })),
    ...extras.filter((l) => l.type !== 'warmup').map(extraItem),
  ];

  const current: DayKey = { planId: plan.id, planWeek, dayNo };
  const last = lastSession(history, current);
  const finished = exerciseDone(plan.id, planWeek, dayNo, exercise, exerciseIndex, props.logs);
  const unitLabel = (u: Unit) => (u === 'lb' ? 'lbs' : 'kg');

  // 같은 종목에서 이미 체크한 세트가 있으면 "다음 세트 자동 채우기"가 맡는다.
  const doneReps = new Set(items.filter((i) => i.log?.done && i.log.type !== 'warmup').map((i) => i.repsText));
  const anyDoneToday = doneReps.size > 0;
  const suggestFor = (item: Item): Prefill | null =>
    item.repsText == null || doneReps.has(item.repsText)
      ? null
      : prefill(props.program.rpeChart, history, current, item.repsText, item.rpe, item.log?.unit ?? setting.unit);

  async function write(item: Item, patch: Partial<SetLog>) {
    const base =
      item.log ??
      newSetLog(plan.id, planWeek, dayNo, { exerciseIndex, rowIndex: item.rowIndex, setIndex: item.setIndex, exerciseName: exercise.name, rpe: item.rpe }, setting.unit);
    await saveSetLog(db, { ...base, ...patch });
  }

  async function toggle(item: Item, weight: number | null, reps: number | null) {
    if (item.log?.done) {
      await write(item, { done: false, doneAt: null, performedDayNo: null });
      timer.cancel();
      return;
    }
    await write(item, { weight, reps, done: true, doneAt: new Date().toISOString(), performedDayNo: props.performedDayNo });
    timer.start(setting.restSeconds);
    props.onChecked();
    const next = items.slice(items.indexOf(item) + 1).find((i) => !i.log?.done && i.repsText === item.repsText);
    const patch = next && autofillPatch({ repsText: item.repsText, weight, reps }, { repsText: next.repsText, weight: next.log?.weight ?? null, reps: next.log?.reps ?? null });
    if (next && patch) await write(next, patch);
  }

  async function addSet() {
    const setIndex = extras.length === 0 ? 0 : Math.max(...extras.map((l) => l.setIndex)) + 1;
    const log = newSetLog(plan.id, planWeek, dayNo, { exerciseIndex, rowIndex: null, setIndex, exerciseName: exercise.name, rpe: slots[0]?.rpe ?? null }, setting.unit);
    await saveSetLog(db, { ...log, type: 'warmup' });
  }

  async function changeUnit(unit: Unit) {
    await patchSetting(db, exercise.name, { unit });
    for (const log of mine) {
      if (log.done || log.unit === unit) continue;
      const weight = log.weight == null ? null : roundTo(fromKg(toKg(log.weight, log.unit), unit), unit === 'lb' ? 1 : 0.5);
      await saveSetLog(db, { ...log, unit, weight });
    }
  }

  if (finished && !open) {
    return (
      <div className="card">
        <button type="button" className="row between" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setOpen(true)}>
          <strong>
            ✓ {exercise.name}
            {mine.some((l) => isPR(props.program.rpeChart, l, history)) && <> <span className="chip pr">PR</span></>}
          </strong>
          <span className="muted">{mine.filter((l) => l.done && l.type !== 'warmup').map(formatSet).join(', ')}</span>
        </button>
      </div>
    );
  }

  let workNumber = 0;
  return (
    <div className="card">
      <div className="row between">
        <strong>{exercise.name}</strong>
        {finished && <button className="btn small" type="button" onClick={() => setOpen(false)}>접기</button>}
      </div>
      <div className="row" style={{ margin: '6px 0' }}>
        <select aria-label="무게 단위" value={setting.unit} onChange={(e) => changeUnit(e.target.value as Unit)}>
          <option value="kg">kg</option>
          <option value="lb">lbs</option>
        </select>
        <select aria-label="휴식 시간" value={setting.restSeconds} onChange={(e) => patchSetting(db, exercise.name, { restSeconds: Number(e.target.value) })}>
          {REST_OPTIONS.map((s) => <option key={s} value={s}>휴식 {s}초</option>)}
        </select>
        {props.onDefer && !finished && <button className="btn small" type="button" onClick={props.onDefer}>나중에 하기</button>}
      </div>
      <input
        type="text"
        aria-label="종목 메모"
        placeholder="종목 메모 (기구 세팅 등)"
        key={setting.note}
        defaultValue={setting.note}
        style={{ width: '100%' }}
        onBlur={(e) => e.target.value !== setting.note && patchSetting(db, exercise.name, { note: e.target.value })}
      />
      {last && <p className="muted">지난번({last.date.slice(5)}) {last.sets.map(formatSet).join(', ')}</p>}
      {!anyDoneToday && items.some((i) => i.repsText != null && suggestFor(i)?.source === 'recommended') && (
        <p className="muted">흐린 숫자는 지난 기록으로 계산한 추천 무게입니다.</p>
      )}

      {items.map((item) => {
        const type = item.log?.type ?? 'work';
        if (type !== 'warmup') workNumber += 1;
        const suggestion = item.repsText == null ? null : suggestFor(item);
        const unit = item.log?.unit ?? setting.unit;
        return (
          <SetRow
            key={item.key}
            number={String(workNumber)}
            prescription={item.repsText == null ? null : `${item.repsText}${/\d$/.test(item.repsText) ? '회' : ''}${item.rpe != null ? ` @${item.rpe}` : ''}`}
            log={item.log}
            unit={unit}
            suggestedWeight={suggestion?.weight ?? null}
            suggestedReps={item.repsText == null ? null : defaultReps(item.repsText)}
            pr={item.log != null && isPR(props.program.rpeChart, item.log, history)}
            removable={item.rowIndex === null}
            onChange={(patch) => write(item, patch)}
            onToggle={(weight, reps) => toggle(item, weight, reps)}
            onRemove={() => item.log && deleteSetLog(db, item.log.id)}
          />
        );
      })}
      <button className="btn small" type="button" style={{ marginTop: 8 }} onClick={addSet}>＋ 세트 추가 (웜업)</button>
      <span className="muted"> 단위: {unitLabel(setting.unit)}</span>
    </div>
  );
}
