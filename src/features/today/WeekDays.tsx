import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { weekLogs } from '../../db/repo';
import { dayStatus, nextDayNo, type DayStatus } from '../../domain/progress';
import { getWeek } from '../../domain/schedule';
import type { Plan, Program } from '../../domain/types';

interface Props {
  program: Program;
  plan: Plan;
  planWeek: number;
  highlightNext: boolean;
}

const STATUS_TEXT: Record<DayStatus, string> = { none: '', partial: '진행 중', done: '완료' };

export function WeekDays({ program, plan, planWeek, highlightNext }: Props) {
  const data = useLiveQuery(async () => {
    const logs = await weekLogs(db, plan.id, planWeek);
    const dayLogs = await db.dayLogs.where('planId').equals(plan.id).filter((d) => d.planWeek === planWeek).toArray();
    return { logs, dayLogs };
  }, [plan.id, planWeek]);

  const week = getWeek(program, plan, planWeek);
  if (!week) return <p className="error">이 주의 운동을 프로그램에서 찾을 수 없습니다. 설정에서 일정을 확인하세요.</p>;
  if (week.rest) return <p className="muted">이번 주는 완전 휴식입니다.</p>;
  if (!data) return null;

  const statusOf = (dayNo: number) => dayStatus(dayNo, data.logs, data.dayLogs.find((d) => d.dayNo === dayNo));
  const next = highlightNext ? nextDayNo(week, statusOf) : null;

  return (
    <div className="days">
      {week.days.map((day) => {
        const status = statusOf(day.dayNo);
        const classes = ['daybtn', status, day.dayNo === next ? 'next' : ''].join(' ');
        return (
          <Link key={day.dayNo} to={`/workout/${planWeek}/${day.dayNo}`} className={classes}>
            D{day.dayNo}
            <small>{STATUS_TEXT[status] || (day.optional ? '선택' : ' ')}</small>
          </Link>
        );
      })}
    </div>
  );
}
