import { useState } from 'react';
import { DailyForm } from './DailyForm';
import { TrendSummary } from './TrendSummary';
import { WeeklyMeasure } from './WeeklyMeasure';

export default function BodyPage() {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  return (
    <main className="page">
      <h1>몸 상태</h1>
      <TrendSummary />
      <div className="segment" role="group" aria-label="기록 종류">
        <button type="button" aria-pressed={tab === 'daily'} onClick={() => setTab('daily')}>매일 기록</button>
        <button type="button" aria-pressed={tab === 'weekly'} onClick={() => setTab('weekly')}>주간 측정</button>
      </div>
      {tab === 'daily' ? <DailyForm /> : <WeeklyMeasure />}
    </main>
  );
}
