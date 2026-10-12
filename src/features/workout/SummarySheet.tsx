import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { workoutSummary } from '../../domain/summary';
import type { DayLog, Plan, RpeChart } from '../../domain/types';
import { BackupButton, backupAgeText, useBackupStatus } from '../../ui/backup';
import { Sheet } from '../../ui/Sheet';

interface Props {
  chart: RpeChart;
  plan: Plan;
  planWeek: number;
  dayNo: number;
  dayLog: DayLog | undefined;
  plannedSets: number | null;
  missing: number;
  onClose(): void;
}

const kg = (v: number) => Math.round(v).toLocaleString();

/** "운동 완료"를 누르면 뜨는 오늘 운동 요약 */
export function SummarySheet({ chart, plan, planWeek, dayNo, dayLog, plannedSets, missing, onClose }: Props) {
  const logs = useLiveQuery(() => db.setLogs.toArray(), []);
  const backup = useBackupStatus();
  if (!logs) return null;
  const s = workoutSummary({ chart, planId: plan.id, planWeek, dayNo, logs, dayLog, plannedSets });
  const diff = s.prevVolumeKg == null ? null : s.volumeKg - s.prevVolumeKg;

  return (
    <Sheet title={`D${dayNo} 운동 요약`} onClose={onClose}>
      <div className="sumgrid">
        <div>
          <b>{s.minutes ?? '—'}</b>
          <small>운동 시간(분)</small>
        </div>
        <div>
          <b>{s.setsDone}{s.setsPlanned != null && <span className="muted">/{s.setsPlanned}</span>}</b>
          <small>세트</small>
        </div>
        <div>
          <b>{kg(s.volumeKg)}</b>
          <small>볼륨(kg×회)</small>
        </div>
      </div>
      <p>
        {diff == null ? (
          '이 요일의 첫 기록이에요. 다음부터 지난번과 비교해 드려요.'
        ) : (
          <>
            지난번 같은 요일보다 볼륨{' '}
            <strong className={diff >= 0 ? 'up' : ''}>{diff >= 0 ? '+' : '−'}{kg(Math.abs(diff))}kg</strong>{' '}
            <span className="muted">(지난번 {kg(s.prevVolumeKg!)}kg)</span>
          </>
        )}
      </p>
      {s.prs.length > 0 && (
        <>
          <h4>새 PR</h4>
          <p className="row">{s.prs.map((n) => <span key={n} className="chip pr">{n}</span>)}</p>
        </>
      )}
      {s.improved.length > 0 ? (
        <>
          <h4>지난번보다 오른 종목 (추정 1RM)</h4>
          <ul className="sumlist">
            {s.improved.map((i) => (
              <li key={i.name}>
                {i.name} <span className="muted">{i.before.toFixed(1)} →</span> <strong>{i.after.toFixed(1)}kg</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        s.setsDone > 0 && <p className="muted">이번에는 지난번보다 추정 1RM이 오른 종목이 없어요.</p>
      )}
      {missing > 0 && <p className="muted">기록하지 않은 세트 {missing}개는 D5나 D6에서 이어서 할 수 있어요.</p>}
      {backup?.due && (
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <p style={{ marginTop: 0 }}>{backupAgeText(backup)}. 오늘 기록까지 백업해 두세요.</p>
          <BackupButton />
        </div>
      )}
    </Sheet>
  );
}
