import { todayStr } from '../../domain/date';
import { positionOn, totalWeeks, weekInfo } from '../../domain/schedule';
import { WeekDays } from '../today/WeekDays';
import { useActive } from '../useActive';

export default function SchedulePage() {
  const active = useActive();
  if (!active) return null;
  const { plan, program } = active;
  if (!plan || !program) {
    return (
      <main className="page">
        <h1>일정</h1>
        <p className="muted">일정이 없습니다. 설정에서 프로그램을 가져오고 일정을 만드세요.</p>
      </main>
    );
  }
  const position = positionOn(plan, todayStr());
  const currentWeek = position.status === 'active' ? position.planWeek : -1;
  const weeks = Array.from({ length: totalWeeks(plan) }, (_, i) => weekInfo(plan, i));

  return (
    <main className="page">
      <h1>일정</h1>
      <p className="muted">{program.name} · {plan.startDate} 시작</p>
      {weeks.map((w) => (
        <div key={w.planWeek} className="card" style={w.planWeek === currentWeek ? { borderColor: 'var(--accent)' } : undefined}>
          <div className="row between">
            <strong>{w.planWeek + 1}주차{w.planWeek === currentWeek && ' (이번 주)'}</strong>
            <span className="muted">{w.weekStart.slice(5)} ~ {w.weekEnd.slice(5)}</span>
          </div>
          <p className="muted">블록 {w.block}{w.occurrence > 1 && ` (${w.occurrence}회차)`} · {w.week}주차</p>
          <WeekDays program={program} plan={plan} planWeek={w.planWeek} highlightNext={false} />
        </div>
      ))}
    </main>
  );
}
