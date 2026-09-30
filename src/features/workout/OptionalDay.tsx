import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { patchDayLog } from '../../db/repo';
import { leftovers, parseOptions } from '../../domain/progress';
import { getWeek } from '../../domain/schedule';
import { ExerciseCard } from './ExerciseCard';
import { DayFooter, markStarted, type DayViewProps } from './dayShared';

export function OptionalDay(view: DayViewProps) {
  const { program, plan, planWeek, day, logs, dayLog } = view;
  const week = getWeek(program, plan, planWeek);
  const [frozen, setFrozen] = useState<{ dayNo: number; exerciseIndex: number }[] | null>(null);

  useEffect(() => {
    if (frozen == null && week) {
      setFrozen(leftovers(plan.id, planWeek, week, logs).map((l) => ({ dayNo: l.dayNo, exerciseIndex: l.exerciseIndex })));
    }
  }, [frozen, week, plan.id, planWeek, logs]);

  if (!week || frozen == null) return null;
  const options = parseOptions(day.optionsText);
  const chosen = dayLog?.optionChoices ?? [];
  const toggleOption = (index: number) =>
    patchDayLog(db, plan.id, planWeek, day.dayNo, {
      optionChoices: chosen.includes(index) ? chosen.filter((i) => i !== index) : [...chosen, index].sort((a, b) => a - b),
    });

  return (
    <>
      <h2>이번 주에 못 한 운동</h2>
      {frozen.length === 0 && <p className="muted">D1~D4의 운동을 모두 했어요.</p>}
      {frozen.map(({ dayNo, exerciseIndex }) => {
        const exercise = week.days.find((d) => d.dayNo === dayNo)?.exercises[exerciseIndex];
        if (!exercise) return null;
        return (
          <div key={`${dayNo}-${exerciseIndex}`}>
            <span className="chip">D{dayNo}에서 넘어옴</span>
            <ExerciseCard
              program={program}
              plan={plan}
              planWeek={planWeek}
              dayNo={dayNo}
              performedDayNo={day.dayNo}
              exerciseIndex={exerciseIndex}
              exercise={exercise}
              logs={logs}
              onChecked={() => markStarted(plan, planWeek, day.dayNo, dayLog)}
            />
          </div>
        );
      })}

      {options.length > 0 && (
        <>
          <h2>오늘 한 것</h2>
          <div className="card">
            {options.map((text, index) => (
              <label key={index} className="row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <input type="checkbox" checked={chosen.includes(index)} onChange={() => toggleOption(index)} />
                <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{text}</span>
              </label>
            ))}
          </div>
        </>
      )}
      <DayFooter {...view} missing={0} />
    </>
  );
}
