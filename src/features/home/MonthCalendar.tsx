import { useState } from 'react';
import { monthGrid, shiftMonth } from '../../domain/calendar';
import { monthSummary } from '../../domain/home';
import type { DietDay } from '../../domain/nutrition';
import type { Nutrients } from '../../domain/types';

interface Props {
  today: string;
  workouts: Map<string, number[]>; // 날짜 → 그날 완료한 요일
  diet: Map<string, DietDay>;
  dietTotals: Map<string, Nutrients>;
}

const HEAD = ['월', '화', '수', '목', '금', '토', '일'];

/** 홈의 이번 달 달력: 운동한 날(✓)과 식단을 지킨 날(●)·기록한 날(○) */
export function MonthCalendar({ today, workouts, diet, dietTotals }: Props) {
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [picked, setPicked] = useState<string | null>(null);
  const sum = monthSummary(view.year, view.month, workouts, diet);

  const detail = (date: string) => {
    const parts = [date.slice(5).replace('-', '/')];
    const days = workouts.get(date);
    parts.push(days ? `${days.map((d) => `D${d}`).join(', ')} 운동 완료` : '운동 없음');
    const t = dietTotals.get(date);
    parts.push(t ? `${Math.round(t.kcal).toLocaleString()}kcal · 단백질 ${Math.round(t.protein)}g` : '식단 기록 없음');
    return parts.join(' · ');
  };

  return (
    <div className="card">
      <div className="row between">
        <button type="button" className="btn small" aria-label="이전 달" onClick={() => setView(shiftMonth(view.year, view.month, -1))}>◀</button>
        <strong>{view.year}년 {view.month}월</strong>
        <button type="button" className="btn small" aria-label="다음 달" onClick={() => setView(shiftMonth(view.year, view.month, 1))}>▶</button>
      </div>
      <div className="cal homecal">
        {HEAD.map((h) => <span key={h} className="calhead">{h}</span>)}
        {monthGrid(view.year, view.month).map((date, i) => {
          if (date == null) return <span key={`e${i}`} />;
          const d = diet.get(date);
          return (
            <button
              key={date}
              type="button"
              className={['calday', date === today ? 'today' : '', date === picked ? 'selected' : ''].join(' ')}
              disabled={date > today}
              onClick={() => setPicked(date)}
            >
              {Number(date.slice(8))}
              <span className="marks">
                <span className="wk">{workouts.has(date) ? '✓' : ''}</span>
                <span className={`dm ${d ?? ''}`}>{d === 'kept' ? '●' : d === 'recorded' ? '○' : ''}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        운동 {sum.workout}일 · 식단 지킨 날 {sum.kept}일 / 기록 {sum.recorded}일
      </p>
      {picked && <p style={{ margin: '6px 0 0' }}>{detail(picked)}</p>}
    </div>
  );
}
