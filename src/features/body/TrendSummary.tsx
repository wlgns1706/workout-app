import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { todayStr } from '../../domain/date';
import { earliestTargetStart, targetOn } from '../../domain/nutrition';
import { adjustmentAlert, ALERT_TEXT, avg7, weeklyLoss, weightByDate } from '../../domain/weightTrend';

export function TrendSummary() {
  const data = useLiveQuery(async () => ({ logs: await db.bodyLogs.toArray(), targets: await db.nutritionTargets.toArray() }), []);
  if (!data) return null;
  const today = todayStr();
  const weights = weightByDate(data.logs);
  const average = avg7(weights, today);
  const loss = weeklyLoss(weights, today);
  const target = targetOn(data.targets, today);
  const alert = adjustmentAlert(weights, today, earliestTargetStart(data.targets));
  const inRange = loss != null && target != null && loss >= target.lossRate.min && loss <= target.lossRate.max;

  return (
    <div className="card">
      <strong>체중 추세</strong>
      {average == null ? (
        <p className="muted" style={{ margin: '4px 0' }}>7일 평균: 기록이 부족해요 (최근 7일 중 4일 이상 필요)</p>
      ) : (
        <p style={{ margin: '4px 0' }}>
          7일 평균 <strong>{average.toFixed(1)}kg</strong>
          {loss != null && <span className="muted"> · 지난주보다 {loss >= 0 ? '−' : '+'}{Math.abs(loss).toFixed(1)}kg</span>}
        </p>
      )}
      {loss != null && (
        <p className="muted" style={{ margin: 0 }}>
          이번 주 감량 속도: 주 {loss.toFixed(1)}kg{' '}
          {target && (inRange ? '✓ 목표 범위' : `(목표 ${target.lossRate.min}~${target.lossRate.max}kg)`)}
        </p>
      )}
      {alert && <div className="banner" style={{ borderRadius: 10, marginTop: 8 }}>{ALERT_TEXT[alert]}</div>}
    </div>
  );
}
