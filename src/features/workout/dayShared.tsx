import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { patchDayLog } from '../../db/repo';
import type { DayLog, Plan, Program, ProgramDay, SetLog } from '../../domain/types';

export interface DayViewProps {
  program: Program;
  plan: Plan;
  planWeek: number;
  day: ProgramDay;
  logs: SetLog[];
  dayLog: DayLog | undefined;
}

function durationText(dayLog: DayLog | undefined): string {
  if (!dayLog?.startedAt || !dayLog.finishedAt) return '';
  const minutes = Math.max(1, Math.round((new Date(dayLog.finishedAt).getTime() - new Date(dayLog.startedAt).getTime()) / 60000));
  return ` · 운동 시간 ${minutes}분`;
}

/** 첫 세트를 체크한 시각을 운동 시작 시각으로 남긴다. */
export function markStarted(plan: Plan, planWeek: number, dayNo: number, dayLog: DayLog | undefined) {
  if (!dayLog?.startedAt) void patchDayLog(db, plan.id, planWeek, dayNo, { startedAt: new Date().toISOString() });
}

export function DayFooter({ plan, planWeek, day, dayLog, missing }: DayViewProps & { missing: number }) {
  const navigate = useNavigate();
  const patch = (p: Partial<DayLog>) => patchDayLog(db, plan.id, planWeek, day.dayNo, p);

  async function finish() {
    const now = new Date().toISOString();
    await patch({ finishedAt: now, startedAt: dayLog?.startedAt ?? now });
    if (missing > 0) window.alert(`기록하지 않은 세트가 ${missing}개 있어요. 남은 운동은 D5나 D6에서 이어서 할 수 있어요.`);
    navigate('/');
  }

  return (
    <div className="card">
      {day.cardio && (
        <label className="row">
          <input type="checkbox" checked={dayLog?.cardioDone ?? false} onChange={(e) => patch({ cardioDone: e.target.checked })} />
          <span>{day.cardio.label}<br /><span className="muted">{day.cardio.detail}</span></span>
        </label>
      )}
      <textarea
        aria-label="오늘 메모"
        placeholder="오늘 메모"
        rows={2}
        key={dayLog?.note ?? ''}
        defaultValue={dayLog?.note ?? ''}
        style={{ margin: '8px 0' }}
        onBlur={(e) => e.target.value !== (dayLog?.note ?? '') && patch({ note: e.target.value })}
      />
      {dayLog?.finishedAt ? (
        <>
          <p className="ok">완료했어요{durationText(dayLog)}</p>
          <button className="btn block" onClick={() => patch({ finishedAt: null })}>완료 취소</button>
        </>
      ) : (
        <button className="btn primary block" onClick={finish}>운동 완료</button>
      )}
    </div>
  );
}
