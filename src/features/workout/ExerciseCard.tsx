import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { defaultSetting, deleteSetLog, exerciseHistory, patchDayLog, patchSetting, saveSetLog } from '../../db/repo';
import { bestE1RM, formatSet, isPR, lastSession, prefill, type DayKey, type Prefill } from '../../domain/e1rm';
import { autofillPatch, dayLogId, exerciseDone, exerciseNameFor, newSetLog, nextSetType, slotsForExercise } from '../../domain/progress';
import { defaultReps } from '../../domain/reps';
import type { Plan, Program, ProgramExercise, SetLog, Unit } from '../../domain/types';
import { fromKg, roundTo, toKg } from '../../domain/units';
import { useTimer } from '../../ui/timer';
import { formatClock } from '../../ui/timerMath';
import { AltSheet, RepsSheet, RestSheet, WeightSheet } from './sheets';
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

type SheetState = { kind: 'weight' | 'reps'; key: string } | { kind: 'rest' } | { kind: 'alt' } | null;

export function ExerciseCard(props: Props) {
  const { plan, planWeek, dayNo, exerciseIndex, exercise } = props;
  const timer = useTimer();
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // 대체 운동은 처방이 속한 요일의 기록(dayLog)에 저장한다.
  const dayLog = useLiveQuery(() => db.dayLogs.get(dayLogId(plan.id, planWeek, dayNo)), [plan.id, planWeek, dayNo]);
  const name = exerciseNameFor(exercise, exerciseIndex, dayLog);
  const setting = useLiveQuery(() => db.exerciseSettings.get(name), [name]) ?? defaultSetting(name);
  const history = useLiveQuery(() => exerciseHistory(db, name), [name]) ?? [];

  const mine = props.logs.filter((l) => l.dayNo === dayNo && l.exerciseIndex === exerciseIndex);
  const slots = slotsForExercise(exercise, exerciseIndex);
  const extras = mine.filter((l) => l.rowIndex === null).sort((a, b) => a.setIndex - b.setIndex);
  const extraItem = (l: SetLog): Item => ({ key: l.id, rowIndex: null, setIndex: l.setIndex, repsText: null, rpe: slots[0]?.rpe ?? null, log: l });
  // 처방 세트 다음에 추가한 세트가 온다. 세트 타입을 바꿔도 순서는 그대로다.
  const items: Item[] = [
    ...slots.map((s) => ({
      key: `${s.rowIndex}-${s.setIndex}`,
      rowIndex: s.rowIndex,
      setIndex: s.setIndex,
      repsText: s.reps,
      rpe: s.rpe,
      log: mine.find((l) => l.rowIndex === s.rowIndex && l.setIndex === s.setIndex),
    })),
    ...extras.map(extraItem),
  ];

  const current: DayKey = { planId: plan.id, planWeek, dayNo };
  const last = lastSession(history, current);
  const finished = exerciseDone(plan.id, planWeek, dayNo, exercise, exerciseIndex, props.logs);
  const best = bestE1RM(props.program.rpeChart, history);

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
      newSetLog(plan.id, planWeek, dayNo, { exerciseIndex, rowIndex: item.rowIndex, setIndex: item.setIndex, exerciseName: name, rpe: item.rpe }, setting.unit);
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
    const last = items.at(-1)?.log;
    const log = newSetLog(plan.id, planWeek, dayNo, { exerciseIndex, rowIndex: null, setIndex, exerciseName: name, rpe: slots[0]?.rpe ?? null }, setting.unit);
    await saveSetLog(db, { ...log, weight: last?.weight ?? null, unit: last?.unit ?? setting.unit });
  }

  /** 마지막에 추가한 세트를 지운다. 처방 세트는 지우지 않는다. */
  async function removeSet() {
    const lastExtra = extras.at(-1);
    if (lastExtra) await deleteSetLog(db, lastExtra.id);
  }

  async function changeUnit(unit: Unit) {
    await patchSetting(db, name, { unit });
    for (const log of mine) {
      if (log.done || log.unit === unit) continue;
      const weight = log.weight == null ? null : roundTo(fromKg(toKg(log.weight, log.unit), unit), unit === 'lb' ? 1 : 0.5);
      await saveSetLog(db, { ...log, unit, weight });
    }
  }

  async function chooseAlternative(choice: string) {
    const substitutions = { ...(dayLog?.substitutions ?? {}) };
    if (choice === exercise.name) delete substitutions[exerciseIndex];
    else substitutions[exerciseIndex] = choice;
    await patchDayLog(db, plan.id, planWeek, dayNo, { substitutions });
    setSheet(null);
  }

  const pr = mine.some((l) => isPR(props.program.rpeChart, l, history));
  const nameButton = (
    <button type="button" className="exname" aria-label={`${name}. 누르면 대체 운동을 고릅니다`} onClick={() => setSheet({ kind: 'alt' })}>
      {finished && '✓ '}{name}
      {name !== exercise.name && <small className="muted"> (원래 {exercise.name})</small>}
      {exercise.alternatives?.length ? <span className="swap"> ⇄</span> : null}
    </button>
  );
  const altSheet = sheet?.kind === 'alt' && (
    <AltSheet original={exercise.name} options={exercise.alternatives ?? []} current={name} onPick={chooseAlternative} onClose={() => setSheet(null)} />
  );

  if (collapsed) {
    return (
      <div className="card">
        <button type="button" className="row between" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setCollapsed(false)}>
          <strong>
            {finished && '✓ '}{name}
            {pr && <> <span className="chip pr">PR</span></>}
          </strong>
          <span className="muted">{mine.filter((l) => l.done && l.type !== 'warmup').map(formatSet).join(', ') || '펼치기'}</span>
        </button>
      </div>
    );
  }

  const sheetItem = sheet && (sheet.kind === 'weight' || sheet.kind === 'reps') ? items.find((i) => i.key === sheet.key) : undefined;
  const sheetSuggestion = sheetItem ? suggestFor(sheetItem) : null;

  let workNumber = 0;
  return (
    <div className="card">
      <div className="exhead">
        {nameButton}
        <span style={{ position: 'relative' }}>
          <button className="btn small" type="button" aria-label="종목 메뉴" onClick={() => setMenuOpen((v) => !v)}>⋮</button>
          {menuOpen && (
            <div className="menu" onClick={() => setMenuOpen(false)}>
              <button type="button" onClick={() => changeUnit(setting.unit === 'kg' ? 'lb' : 'kg')}>단위를 {setting.unit === 'kg' ? 'lbs' : 'kg'}로 바꾸기</button>
              {props.onDefer && !finished && <button type="button" onClick={props.onDefer}>나중에 하기</button>}
              <button type="button" onClick={() => setCollapsed(true)}>접기</button>
            </div>
          )}
        </span>
      </div>
      <div className="exmeta">
        <button type="button" aria-label="휴식 시간 설정" onClick={() => setSheet({ kind: 'rest' })}>⏱ {formatClock(setting.restSeconds)}</button>
        {best != null && <span>e1RM {best.toFixed(1)}kg</span>}
      </div>
      {last && <p className="muted" style={{ margin: 0 }}>지난번({last.date.slice(5)}) {last.sets.map(formatSet).join(', ')}</p>}
      {!anyDoneToday && items.some((i) => i.repsText != null && suggestFor(i)?.source === 'recommended') && (
        <p className="muted" style={{ margin: 0 }}>흐린 숫자는 지난 기록으로 계산한 추천 무게입니다.</p>
      )}
      <input
        className="memo"
        type="text"
        aria-label="종목 메모"
        placeholder="메모... (기구 세팅 등)"
        key={setting.note}
        defaultValue={setting.note}
        onBlur={(e) => e.target.value !== setting.note && patchSetting(db, name, { note: e.target.value })}
      />
      <div className="setctl">
        <button type="button" aria-label="추가한 세트 지우기" disabled={extras.length === 0} onClick={removeSet}>−</button>
        <span>세트 {items.length}</span>
        <button type="button" aria-label="세트 추가" onClick={addSet}>+</button>
      </div>

      {items.map((item) => {
        const type = item.log?.type ?? 'work';
        if (type !== 'warmup') workNumber += 1;
        const suggestion = item.repsText == null ? null : suggestFor(item);
        const unit = item.log?.unit ?? setting.unit;
        return (
          <SetRow
            key={item.key}
            number={String(workNumber)}
            prescription={item.repsText == null ? '추가 세트' : `${item.repsText}${/\d$/.test(item.repsText) ? '회' : ''}${item.rpe != null ? ` @${item.rpe}` : ''}`}
            log={item.log}
            unit={unit}
            suggestedWeight={suggestion?.weight ?? null}
            suggestedReps={item.repsText == null ? null : defaultReps(item.repsText)}
            pr={item.log != null && isPR(props.program.rpeChart, item.log, history)}
            onTypeTap={() => write(item, { type: nextSetType(type) })}
            onWeightTap={() => setSheet({ kind: 'weight', key: item.key })}
            onRepsTap={() => setSheet({ kind: 'reps', key: item.key })}
            onToggle={(weight, reps) => toggle(item, weight, reps)}
          />
        );
      })}

      {altSheet}
      {sheet?.kind === 'rest' && (
        <RestSheet value={setting.restSeconds} onChange={(s) => patchSetting(db, name, { restSeconds: s })} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'weight' && sheetItem && (
        <WeightSheet
          value={sheetItem.log?.weight ?? null}
          placeholder={sheetSuggestion?.weight ?? null}
          unit={sheetItem.log?.unit ?? setting.unit}
          onChange={(weight) => write(sheetItem, { weight })}
          onUnit={changeUnit}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'reps' && sheetItem && (
        <RepsSheet
          value={sheetItem.log?.reps ?? null}
          placeholder={sheetItem.repsText == null ? null : defaultReps(sheetItem.repsText)}
          rpe={sheetItem.log?.rpe ?? null}
          type={sheetItem.log?.type ?? 'work'}
          onChange={(reps) => write(sheetItem, { reps })}
          onRpe={(rpe) => write(sheetItem, { rpe })}
          onFailure={(f) => write(sheetItem, { type: f ? 'failure' : 'work' })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
