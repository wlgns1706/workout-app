import { Link } from 'react-router-dom';
import { todayStr } from '../../domain/date';
import { parseRpe } from '../../domain/reps';
import { getWeek, positionOn, totalWeeks } from '../../domain/schedule';
import { useActive } from '../useActive';
import { WeekDays } from './WeekDays';

export default function TodayPage() {
  const active = useActive();
  if (!active) return null;
  const { plan, program, programs } = active;

  if (programs.length === 0 || !plan) {
    return (
      <main className="page">
        <h1>오늘</h1>
        <div className="card">
          <p>{programs.length === 0 ? '먼저 프로그램 파일을 가져오세요.' : '일정을 만들면 운동을 시작할 수 있어요.'}</p>
          <Link className="btn primary block" to="/settings">설정으로 가기</Link>
          <Link className="btn block" to="/guide" style={{ marginTop: 8 }}>사용법 보기</Link>
        </div>
      </main>
    );
  }
  if (!program) {
    return (
      <main className="page">
        <h1>오늘</h1>
        <div className="error">이 일정의 프로그램이 폰에 없습니다. 설정에서 프로그램 파일을 다시 가져오세요.</div>
        <Link className="btn primary block" to="/settings">설정으로 가기</Link>
      </main>
    );
  }

  const position = positionOn(plan, todayStr());
  if (position.status === 'before') {
    return (
      <main className="page">
        <h1>오늘</h1>
        <div className="card">
          <p>{plan.startDate}에 시작합니다. {position.daysUntil}일 남았어요.</p>
          <p className="muted">{program.name} · 총 {totalWeeks(plan)}주</p>
        </div>
        <Link className="btn block" to="/schedule">전체 일정 보기</Link>
      </main>
    );
  }
  if (position.status === 'finished') {
    return (
      <main className="page">
        <h1>오늘</h1>
        <div className="card">
          <p>일정이 끝났어요. 새 일정을 만드세요.</p>
          <Link className="btn primary block" to="/settings">새 일정 만들기</Link>
        </div>
        <Link className="btn block" to="/schedule">전체 일정 보기</Link>
      </main>
    );
  }

  const week = getWeek(program, plan, position.planWeek);
  const rpe = week?.days[0]?.exercises[0]?.rows[0]?.rpe ?? null;
  return (
    <main className="page">
      <h1>오늘</h1>
      <div className="card">
        <strong>{position.planWeek + 1}주차 / {totalWeeks(plan)}주</strong>
        <p className="muted">
          {program.name} · 블록 {position.block}
          {position.occurrence > 1 && ` (${position.occurrence}회차)`} · {position.week}주차
          {parseRpe(rpe) != null && ` · 기본 @${parseRpe(rpe)}`}
          <br />{position.weekStart} ~ {position.weekEnd}
        </p>
        <WeekDays program={program} plan={plan} planWeek={position.planWeek} highlightNext />
      </div>
      <p className="muted">테두리가 굵은 요일이 다음에 할 운동입니다. 요일을 누르면 기록 화면이 열립니다.</p>
      <Link className="btn block" to="/schedule">전체 일정 보기</Link>
    </main>
  );
}
