import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { activePlan } from '../../db/repo';
import { diffDays, localDateOf, todayStr } from '../../domain/date';
import { dietDayStatus, sumNutrients, targetOn } from '../../domain/nutrition';
import { avg7Series, dailyBestE1RM, datesBetween, exerciseOrder, periodStart, type Period } from '../../domain/statsSeries';
import type { FoodEntry } from '../../domain/types';
import { avg7, weightByDate } from '../../domain/weightTrend';
import { TimeChart } from '../../ui/TimeChart';
import { TrendSummary } from '../body/TrendSummary';

const WEDDING = '2027-01-31';
const PERIODS: { key: Period; label: string }[] = [
  { key: '4w', label: '4주' },
  { key: '12w', label: '12주' },
  { key: 'all', label: '전체' },
];
const Empty = () => <p className="muted">기록이 더 쌓이면 보여드릴게요.</p>;

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('12w');
  const [exercise, setExercise] = useState<string | null>(null);
  const data = useLiveQuery(async () => {
    const plan = await activePlan(db);
    const programs = await db.programs.toArray();
    return {
      bodyLogs: await db.bodyLogs.toArray(),
      measures: await db.bodyMeasurements.orderBy('date').toArray(),
      setLogs: await db.setLogs.toArray(),
      foods: await db.foodEntries.toArray(),
      targets: await db.nutritionTargets.toArray(),
      program: programs.find((p) => p.id === plan?.programId) ?? programs[0],
    };
  }, []);
  if (!data) return null;

  const today = todayStr();
  const allDates = [
    ...data.bodyLogs.map((b) => b.date),
    ...data.measures.map((m) => m.date),
    ...data.foods.map((f) => f.date),
    ...data.setLogs.filter((l) => l.doneAt).map((l) => localDateOf(l.doneAt!)),
  ].sort();
  const start = periodStart(today, period, allDates[0] ?? null);
  const inRange = (d: string) => d >= start && d <= today;

  // 1. 체중
  const weights = weightByDate(data.bodyLogs);
  const daily = [...weights.entries()].filter(([d]) => inRange(d)).map(([date, value]) => ({ date, value }));
  const avgLine = avg7Series(weights, start, today);
  const measuredWeights = data.measures.filter((m) => m.weightKg != null && inRange(m.date)).map((m) => ({ date: m.date, value: m.weightKg! }));
  const weightDates = [...weights.keys()].sort();
  const firstAvgDate = weightDates.find((d) => avg7(weights, d) != null) ?? null;
  const firstAvg = firstAvgDate ? avg7(weights, firstAvgDate) : null;
  const nowAvg = avg7(weights, today) ?? avgLine.at(-1)?.value ?? null;
  const weeks = firstAvgDate ? diffDays(firstAvgDate, today) / 7 : 0;

  // 2. 체성분
  const measures = data.measures.filter((m) => inRange(m.date));
  const firstOf = (key: 'bodyFatPct' | 'waistCm') => data.measures.find((m) => m[key] != null)?.[key] ?? null;
  const lastOf = (key: 'bodyFatPct' | 'waistCm') => [...data.measures].reverse().find((m) => m[key] != null)?.[key] ?? null;

  // 3. 1RM
  const chart = data.program?.rpeChart;
  const names = chart ? exerciseOrder(chart, data.setLogs) : [];
  const chosen = exercise && names.includes(exercise) ? exercise : names[0] ?? null;
  const best = chart && chosen ? dailyBestE1RM(chart, data.setLogs.filter((l) => l.exerciseName === chosen)) : [];
  const bestInRange = best.filter((b) => inRange(b.date));
  const topValue = best.length ? Math.max(...best.map((b) => b.value)) : null;

  // 4. 식단
  const byDate = new Map<string, FoodEntry[]>();
  for (const f of data.foods) if (inRange(f.date)) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);
  const dietDays = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const totals = dietDays.map(([date, list]) => ({ date, sum: sumNutrients(list), status: dietDayStatus(list, targetOn(data.targets, date)) }));
  const bands = datesBetween(start, today)
    .map((date) => ({ date, t: targetOn(data.targets, date) }))
    .filter((b) => b.t != null)
    .map((b) => ({ date: b.date, min: b.t!.kcal.min, max: b.t!.kcal.max }));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  return (
    <main className="page">
      <h1>기록</h1>
      <div className="segment" role="group" aria-label="기간">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      <h2>체중</h2>
      <TrendSummary />
      <div className="card">
        {daily.length < 2 ? <Empty /> : (
          <>
            <TimeChart
              start={start}
              end={today}
              unit="kg"
              markerDate={WEDDING}
              series={[
                { kind: 'dots', label: '매일 체중', color: 'var(--muted)', points: daily },
                { kind: 'line', label: '7일 평균', color: 'var(--accent)', points: avgLine },
                { kind: 'diamonds', label: '인바디 체중', color: 'var(--warmup)', points: measuredWeights },
              ]}
            />
            <div className="legend"><span><i style={{ background: 'var(--muted)' }} />매일</span><span><i style={{ background: 'var(--accent)' }} />7일 평균</span><span><i style={{ background: 'var(--warmup)' }} />인바디</span></div>
            {firstAvg != null && nowAvg != null && (
              <p className="muted">
                처음 기록 {firstAvg.toFixed(1)} → 현재 7일 평균 {nowAvg.toFixed(1)}kg
                {weeks >= 1 && ` · 주 평균 ${((firstAvg - nowAvg) / weeks).toFixed(2)}kg 감량`}
              </p>
            )}
          </>
        )}
      </div>

      <h2>체성분</h2>
      <div className="card">
        {measures.length < 2 ? <Empty /> : (
          <>
            <TimeChart
              start={start}
              end={today}
              unit="kg"
              series={[
                { kind: 'line', label: '골격근량', color: 'var(--accent)', points: measures.filter((m) => m.skeletalMuscleKg != null).map((m) => ({ date: m.date, value: m.skeletalMuscleKg! })) },
                { kind: 'line', label: '체지방량', color: 'var(--failure)', points: measures.filter((m) => m.bodyFatKg != null).map((m) => ({ date: m.date, value: m.bodyFatKg! })) },
              ]}
            />
            <div className="legend"><span><i style={{ background: 'var(--accent)' }} />골격근량</span><span><i style={{ background: 'var(--failure)' }} />체지방량</span></div>
          </>
        )}
        <p className="muted">
          체지방률 {firstOf('bodyFatPct') ?? '—'} → {lastOf('bodyFatPct') ?? '—'}% · 허리 {firstOf('waistCm') ?? '—'} → {lastOf('waistCm') ?? '—'}cm
        </p>
      </div>

      <h2>추정 1RM</h2>
      <div className="card">
        {!chart || names.length === 0 ? <Empty /> : (
          <>
            <select aria-label="종목" value={chosen ?? ''} onChange={(e) => setExercise(e.target.value)} style={{ width: '100%' }}>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {bestInRange.length < 2 ? <Empty /> : (
              <TimeChart
                start={start}
                end={today}
                unit="kg"
                series={[{ kind: 'line', label: chosen ?? '', color: 'var(--accent)', points: bestInRange.map((b) => ({ date: b.date, value: b.value, highlight: b.record })) }]}
              />
            )}
            {best.length > 0 && topValue != null && (
              <p className="muted">
                첫 기록 {best[0].value.toFixed(1)} → 최고 {topValue.toFixed(1)}kg (+{Math.round((topValue / best[0].value - 1) * 100)}%) · 초록 점은 최고 기록 갱신
              </p>
            )}
          </>
        )}
      </div>

      <h2>식단</h2>
      <div className="card">
        {totals.length < 2 ? <Empty /> : (
          <>
            <TimeChart start={start} end={today} unit="kcal" bands={bands} series={[{ kind: 'bars', label: '칼로리', color: 'var(--accent)', points: totals.map((t) => ({ date: t.date, value: t.sum.kcal })) }]} />
            <TimeChart start={start} end={today} unit="g" height={120} series={[{ kind: 'line', label: '단백질', color: 'var(--ok)', points: totals.map((t) => ({ date: t.date, value: t.sum.protein })) }]} />
            <div className="legend"><span><i style={{ background: 'var(--accent)' }} />칼로리</span><span><i style={{ background: 'var(--ok-bg)' }} />목표 범위</span><span><i style={{ background: 'var(--ok)' }} />단백질</span></div>
          </>
        )}
        <p className="muted">
          지킨 날 {totals.filter((t) => t.status === 'kept').length}일 / 기록한 날 {totals.length}일 · 평균 {avg(totals.map((t) => t.sum.kcal)).toLocaleString()}kcal · 단백질 {avg(totals.map((t) => t.sum.protein))}g
        </p>
      </div>
    </main>
  );
}
