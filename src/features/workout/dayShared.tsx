import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { patchDayLog } from '../../db/repo';
import type { DayLog, Plan, Program, ProgramDay, SetLog } from '../../domain/types';
import { SummarySheet } from './SummarySheet';

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

export function DayFooter({ program, plan, planWeek, day, dayLog, missing, plannedSets }: DayViewProps & { missing: number; plannedSets: number | null }) {
  const navigate = useNavigate();
  // 'finish': 방금 완료해서 연 요약. 닫으면 운동 탭으로 간다. 'view': 다시 본 요약
  const [summary, setSummary] = useState<'finish' | 'view' | null>(null);
  const patch = (p: Partial<DayLog>) => patchDayLog(db, plan.id, planWeek, day.dayNo, p);

  async function finish() {
    const now = new Date().toISOString();
    await patch({ finishedAt: now, startedAt: dayLog?.startedAt ?? now });
    setSummary('finish');
  }

  function closeSummary() {
    if (summary === 'finish') navigate('/workout');
    setSummary(null);
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
          <button className="btn block" onClick={() => setSummary('view')}>오늘 운동 요약 보기</button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => patch({ finishedAt: null })}>완료 취소</button>
        </>
      ) : (
        <button className="btn primary block" onClick={finish}>운동 완료</button>
      )}
      {summary && (
        <SummarySheet
          chart={program.rpeChart}
          plan={plan}
          planWeek={planWeek}
          dayNo={day.dayNo}
          dayLog={dayLog}
          plannedSets={plannedSets}
          missing={missing}
          onClose={closeSummary}
        />
      )}
    </div>
  );
}
