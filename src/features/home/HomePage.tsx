import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { emptyBodyLog, getMeta } from '../../db/repo';
import { diffDays, todayStr } from '../../domain/date';
import { firstAverage, goalProgress, recentPR, remainingToday, WEDDING_DATE, weekWorkoutProgress, weightStreak, workoutDates } from '../../domain/home';
import { dietDayStatus, sumNutrients, targetOn, type DietDay } from '../../domain/nutrition';
import { dayStatus, nextDayNo } from '../../domain/progress';
import { getWeek, positionOn, totalWeeks } from '../../domain/schedule';
import type { FoodEntry, Nutrients } from '../../domain/types';
import { parseNumber } from '../../domain/units';
import { avg7, weightByDate } from '../../domain/weightTrend';
import { Ring } from '../../ui/Ring';
import { TimeChart } from '../../ui/TimeChart';
import { TrendSummary } from '../body/TrendSummary';
import { useActive } from '../useActive';
import { MonthCalendar } from './MonthCalendar';

export const META_GOAL_MIN = 'goalWeightMin';
export const META_GOAL_MAX = 'goalWeightMax';

function Item({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div className="todo">
      <span className={`todo-mark ${done ? 'on' : ''}`}>{done ? '●' : '○'}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function HomePage() {
  const active = useActive();
  const today = todayStr();
  const [weightText, setWeightText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const data = useLiveQuery(async () => ({
    bodyLogs: await db.bodyLogs.toArray(),
    foods: await db.foodEntries.toArray(),
    targets: await db.nutritionTargets.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    setLogs: await db.setLogs.toArray(),
    lastMeasure: await db.bodyMeasurements.orderBy('date').last(),
    goalMin: await getMeta(db, META_GOAL_MIN),
    goalMax: await getMeta(db, META_GOAL_MAX),
  }), []);
  if (!active || !data) return null;
  const { plan, program, programs } = active;

  // 운동 일정
  const position = plan ? positionOn(plan, today) : null;
  const active_ = position?.status === 'active' ? position : null;
  const week = plan && program && active_ ? getWeek(program, plan, active_.planWeek) : null;
  const weekLogs = active_ && plan ? data.setLogs.filter((l) => l.planId === plan.id && l.planWeek === active_.planWeek) : [];
  const weekDayLogs = active_ && plan ? data.dayLogs.filter((d) => d.planId === plan.id && d.planWeek === active_.planWeek) : [];
  const statusOf = (dayNo: number) => dayStatus(dayNo, weekLogs, weekDayLogs.find((d) => d.dayNo === dayNo));
  const workouts = workoutDates(data.dayLogs);
  const workedToday = workouts.has(today);
  const next = week && !week.rest ? nextDayNo(week, statusOf) : null;
  const weekAllDone = week != null && !week.rest && week.days.every((d) => statusOf(d.dayNo) === 'done');
  const nextDay = next != null ? week!.days.find((d) => d.dayNo === next) : undefined;

  // 식단
  const byDate = new Map<string, FoodEntry[]>();
  for (const f of data.foods) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);
  const diet = new Map<string, DietDay>();
  const dietTotals = new Map<string, Nutrients>();
  for (const [d, list] of byDate) {
    diet.set(d, dietDayStatus(list, targetOn(data.targets, d)));
    dietTotals.set(d, sumNutrients(list));
  }
  const todayTarget = targetOn(data.targets, today);
  const todayTotals = dietTotals.get(today) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const dietKept = diet.get(today) === 'kept';

  // 체중
  const weights = weightByDate(data.bodyLogs);
  const streak = weightStreak(weights, today);
  const start = firstAverage(weights);
  const nowAvg = avg7(weights, today);
  const goalMin = data.goalMin != null ? Number(data.goalMin) : null;
  const goalMax = data.goalMax != null ? Number(data.goalMax) : null;
  const last14 = [...weights.entries()].filter(([d]) => diffDays(d, today) < 14).map(([date, value]) => ({ date, value }));

  // 주간 측정, PR
  const measureDue = !data.lastMeasure || diffDays(data.lastMeasure.date, today) >= 7;
  const pr = program ? recentPR(program.rpeChart, data.setLogs, today) : null;
  const dDay = diffDays(today, WEDDING_DATE);
  const weekProgress = week && !week.rest ? weekWorkoutProgress(week.days.filter((d) => !d.optional).map((d) => d.dayNo), statusOf) : null;
  const goalPct = start && nowAvg != null && goalMax != null ? goalProgress(start.value, nowAvg, goalMax) : null;
  const kcalRatio = todayTarget ? todayTotals.kcal / todayTarget.kcal.base : 0;
  const kcalOver = todayTarget != null && todayTotals.kcal > todayTarget.kcal.max;

  async function saveWeight() {
    const v = parseNumber(weightText);
    if (v == null || v < 0.1 || v > 500) {
      setError('체중: 0.1~500 사이로 입력해 주세요.');
      return;
    }
    setError(null);
    const existing = data!.bodyLogs.find((b) => b.date === today) ?? emptyBodyLog(today);
    await db.bodyLogs.put({ ...existing, weightKg: v });
    setWeightText('');
  }

  return (
    <main className="page">
      {(programs.length === 0 || !plan) && (
        <div className="card">
          <p>{programs.length === 0 ? '먼저 프로그램 파일을 가져오세요.' : '일정을 만들면 운동을 시작할 수 있어요.'}</p>
          <Link className="btn primary block" to="/settings">설정으로 가기</Link>
          <Link className="btn block" to="/guide" style={{ marginTop: 8 }}>사용법 보기</Link>
        </div>
      )}

      {/* ① 디데이 */}
      <div className="hero">
        {dDay >= 0 && (
          <>
            <div className="muted">결혼식까지</div>
            <div className="dday">{dDay === 0 ? 'D-DAY' : `D-${dDay}`}</div>
          </>
        )}
        {plan && position && (
          <div className="muted">
            {position.status === 'active' && `${totalWeeks(plan)}주 중 ${position.planWeek + 1}주차 · 블록 ${position.block}${position.occurrence > 1 ? ` (${position.occurrence}회차)` : ''} · ${position.week}주차`}
            {position.status === 'before' && `${plan.startDate}에 시작합니다. ${position.daysUntil}일 남았어요.`}
            {position.status === 'finished' && '운동 일정이 끝났어요.'}
          </div>
        )}
      </div>

      {/* 링 대시보드 */}
      <div className="rings">
        <Link to="/body" className="ring">
          <Ring value={(goalPct ?? 0) / 100} center={goalPct != null ? `${goalPct}%` : '—'} label="목표 체중" sub={goalMin != null && goalMax != null ? `${goalMin}~${goalMax}kg` : '설정 필요'} />
        </Link>
        <Link to="/diet" className="ring">
          <Ring
            value={kcalRatio}
            center={todayTarget ? `${Math.round(kcalRatio * 100)}%` : '—'}
            label="오늘 칼로리"
            sub={todayTarget ? `${Math.round(todayTotals.kcal).toLocaleString()}/${todayTarget.kcal.base.toLocaleString()}` : '목표 필요'}
            color={kcalOver ? 'var(--hot)' : 'var(--accent)'}
          />
        </Link>
        <Link to="/schedule" className="ring">
          <Ring
            value={weekProgress && weekProgress.total > 0 ? weekProgress.done / weekProgress.total : 0}
            center={weekProgress ? `${weekProgress.done}/${weekProgress.total}` : '—'}
            label="이번 주 운동"
            sub={week?.rest ? '완전 휴식' : weekProgress ? '정규 요일' : '일정 없음'}
          />
        </Link>
      </div>

      {/* ② 오늘 할 일 */}
      <h2>오늘 할 일</h2>
      <div className="card">
        <Item done={weights.has(today)}>
          <strong>체중</strong>{' '}
          {weights.has(today) ? (
            <span className="muted">{weights.get(today)!.toFixed(1)}kg</span>
          ) : (
            <span className="row" style={{ marginTop: 4 }}>
              <input type="text" inputMode="decimal" aria-label="오늘 체중" placeholder="kg" value={weightText} onChange={(e) => setWeightText(e.target.value)} style={{ width: 90 }} />
              <button type="button" className="btn small primary" onClick={saveWeight}>저장</button>
            </span>
          )}
          {error && <div className="error" role="alert">{error}</div>}
        </Item>
        {week && !week.rest && (
          <Item done={workedToday}>
            <strong>운동</strong>{' '}
            {workedToday ? (
              <span className="muted">{workouts.get(today)!.map((d) => `D${d}`).join(', ')} 완료</span>
            ) : weekAllDone ? (
              <span className="muted">이번 주 운동을 모두 했어요</span>
            ) : nextDay ? (
              <Link to={`/workout/${active_!.planWeek}/${nextDay.dayNo}`}>
                다음: D{nextDay.dayNo}{nextDay.optional ? ' (선택)' : ` · 종목 ${nextDay.exercises.length}개`} →
              </Link>
            ) : null}
          </Item>
        )}
        {week?.rest && <Item done={true}><strong>운동</strong> <span className="muted">이번 주는 완전 휴식</span></Item>}
        <Item done={dietKept}>
          <strong>식단</strong>{' '}
          {!todayTarget ? (
            <Link to="/settings">영양 목표를 입력하세요</Link>
          ) : dietKept ? (
            <span className="muted">오늘 식단을 지켰어요</span>
          ) : (
            <Link to="/diet">
              남은 칼로리 {remainingToday(todayTarget, todayTotals).kcal.toLocaleString()} · 단백질 {remainingToday(todayTarget, todayTotals).protein}g →
            </Link>
          )}
        </Item>
        {measureDue && (
          <Item done={false}>
            <strong>주간 측정</strong> <Link to="/body">인바디와 허리둘레를 잴 때예요 →</Link>
          </Item>
        )}
      </div>

      {/* ③ 체중 */}
      <h2>체중</h2>
      <TrendSummary />
      <div className="card">
        {start && nowAvg != null && (
          <p style={{ margin: '0 0 6px' }}>
            시작보다 <strong>{nowAvg - start.value <= 0 ? '−' : '+'}{Math.abs(nowAvg - start.value).toFixed(1)}kg</strong>
            <span className="muted"> (시작 {start.value.toFixed(1)} → 지금 {nowAvg.toFixed(1)})</span>
          </p>
        )}
        {start && nowAvg != null && goalMin != null && goalMax != null ? (
          <>
            <div className="goalbar"><span style={{ width: `${goalProgress(start.value, nowAvg, goalMax)}%` }} /></div>
            <p className="muted" style={{ margin: '4px 0' }}>
              시작 {start.value.toFixed(1)} → 목표 {goalMin}~{goalMax}kg · {goalProgress(start.value, nowAvg, goalMax)}%
            </p>
          </>
        ) : goalMin == null || goalMax == null ? (
          <p className="muted" style={{ margin: '4px 0' }}><Link to="/settings">설정에서 목표 체중을 정하세요</Link></p>
        ) : null}
        <p style={{ margin: '4px 0' }}>
          체중 {streak.streak}일 연속 기록 중
          {!streak.loggedToday && <span className="muted"> · 오늘 기록하면 {streak.streak + 1}일</span>}
        </p>
        {last14.length >= 2 && (
          <TimeChart
            start={last14.reduce((a, b) => (a.date < b.date ? a : b)).date}
            end={today}
            unit="kg"
            height={110}
            series={[{ kind: 'line', label: '체중', color: 'var(--accent)', points: last14 }]}
          />
        )}
      </div>

      {/* ④ 이번 달 */}
      <h2>운동과 식단</h2>
      <MonthCalendar today={today} workouts={workouts} diet={diet} dietTotals={dietTotals} />

      {/* ⑤ 최근 PR */}
      {pr && (
        <>
          <h2>최근 PR</h2>
          <div className="card">
            <strong>{pr.name}</strong>
            <p style={{ margin: '4px 0 0' }}>
              추정 1RM {pr.value.toFixed(1)}kg <span className="chip pr">+{pr.gainPct}%</span>
              <span className="muted"> · {pr.date.slice(5).replace('-', '/')}</span>
            </p>
          </div>
        </>
      )}

      {plan && <Link className="btn block" to="/schedule">전체 일정 보기</Link>}
    </main>
  );
}
