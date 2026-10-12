import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { weekLogs } from '../../db/repo';
import { todayStr } from '../../domain/date';
import { workoutDates } from '../../domain/home';
import { koName } from '../../domain/exerciseKo';
import { weekLabel, weekRpe } from '../../domain/labels';
import { dayStatus, nextDayNo } from '../../domain/progress';
import { getWeek, positionOn, totalWeeks } from '../../domain/schedule';
import { WeekDays } from '../today/WeekDays';
import { useActive } from '../useActive';

/** 하단 "운동" 탭. 이번 주 요일과 다음에 할 운동을 보여준다. */
export default function WorkoutHome() {
  const active = useActive();
  const plan = active?.plan;
  const today = todayStr();
  const position = plan ? positionOn(plan, today) : null;
  const planWeek = position?.status === 'active' ? position.planWeek : 0;
  const data = useLiveQuery(async () => {
    if (!plan) return null;
    return {
      logs: await weekLogs(db, plan.id, planWeek),
      dayLogs: await db.dayLogs.where('planId').equals(plan.id).toArray(),
    };
  }, [plan?.id, planWeek]);
  if (!active || data === undefined) return null;
  const { program } = active;

  if (!plan || !program || !data || !position) {
    return (
      <main className="page">
        <h1>운동</h1>
        <div className="card">
          <p>{active.programs.length === 0 ? '먼저 프로그램 파일을 가져오세요.' : '일정을 만들면 운동을 시작할 수 있어요.'}</p>
          <Link className="btn primary block" to="/settings">설정으로 가기</Link>
        </div>
      </main>
    );
  }

  const week = getWeek(program, plan, planWeek);
  const scheduleLink = <Link className="btn block" to="/schedule">전체 일정 보기</Link>;

  if (position.status !== 'active' || !week) {
    return (
      <main className="page">
        <h1>운동</h1>
        <p className="muted">{program.name}</p>
        <div className="card">
          {position.status === 'before' ? (
            <>
              <p>{plan.startDate}에 시작합니다. {position.daysUntil}일 남았어요.</p>
              <p className="muted">첫 주 운동을 미리 볼 수 있어요.</p>
              <WeekDays program={program} plan={plan} planWeek={0} highlightNext={false} />
            </>
          ) : (
            <>
              <p>운동 일정이 끝났어요.</p>
              <Link className="btn primary block" to="/settings">새 일정 만들기</Link>
            </>
          )}
        </div>
        {scheduleLink}
      </main>
    );
  }

  const weekDayLogs = data.dayLogs.filter((d) => d.planWeek === planWeek);
  const statusOf = (dayNo: number) => dayStatus(dayNo, data.logs, weekDayLogs.find((d) => d.dayNo === dayNo));
  const doneToday = workoutDates(data.dayLogs.filter((d) => d.planId === plan.id)).get(today);
  const allDone = !week.rest && week.days.filter((d) => !d.optional).every((d) => statusOf(d.dayNo) === 'done');
  const nextNo = week.rest ? null : nextDayNo(week, statusOf);
  const next = week.days.find((d) => d.dayNo === nextNo);
  const nextStatus = next ? statusOf(next.dayNo) : null;

  return (
    <main className="page">
      <h1>운동</h1>
      <p className="muted">{program.name} · {weekLabel(position, totalWeeks(plan), weekRpe(week))}</p>
      <div className="card">
        {week.rest ? (
          <p>이번 주는 완전 휴식입니다. 푹 쉬세요.</p>
        ) : (
          <>
            {doneToday && <p className="ok">오늘 {doneToday.map((d) => `D${d}`).join(', ')} 완료했어요</p>}
            {allDone && <p className="muted">이번 주 정규 운동을 모두 했어요. 선택 요일은 원하면 하세요.</p>}
            {next && nextStatus !== 'done' && (
              <>
                <Link className="btn primary block big-start" to={`/workout/${planWeek}/${next.dayNo}`}>
                  {nextStatus === 'partial' ? `D${next.dayNo} 이어서 하기` : `D${next.dayNo} 시작`}
                  {next.optional ? ' (선택)' : ` · 종목 ${next.exercises.length}개`}
                </Link>
                {next.exercises.length > 0 && (
                  <p className="muted" style={{ margin: '8px 0 0' }}>
                    {next.exercises.slice(0, 3).map((e) => koName(e.name) ?? e.name).join(', ')}
                    {next.exercises.length > 3 && ` 외 ${next.exercises.length - 3}개`}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
      <h2>이번 주</h2>
      <div className="card">
        <WeekDays program={program} plan={plan} planWeek={planWeek} highlightNext={true} />
      </div>
      {scheduleLink}
    </main>
  );
}
