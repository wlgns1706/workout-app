import { useState } from 'react';
import type { SetLog, SetType, Unit } from '../../domain/types';
import { formatKg, toKg, weightSteps } from '../../domain/units';
import { Stepper } from '../../ui/Stepper';

interface Props {
  number: string; // 본 세트 번호
  prescription: string | null; // 예: "8~12회 @7". 추가한 세트는 null
  log: SetLog | undefined;
  unit: Unit;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  pr: boolean;
  removable: boolean;
  onChange(patch: Partial<SetLog>): void;
  onToggle(weight: number | null, reps: number | null): void;
  onRemove(): void;
}

const NEXT_TYPE: Record<SetType, SetType> = { work: 'warmup', warmup: 'failure', failure: 'work' };
const TYPE_NAME: Record<SetType, string> = { work: '본 세트', warmup: '웜업', failure: '실패' };
const RPE_OPTIONS = [6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export function SetRow(props: Props) {
  const { log, unit, suggestedWeight, suggestedReps } = props;
  const [memoOpen, setMemoOpen] = useState(false);
  const type = log?.type ?? 'work';
  const done = log?.done ?? false;
  const weight = log?.weight ?? null;
  const reps = log?.reps ?? null;
  const shownWeight = weight ?? suggestedWeight;
  const shownReps = reps ?? suggestedReps;
  const typeLabel = type === 'warmup' ? 'W' : type === 'failure' ? 'F' : props.number;

  return (
    <div className={`setrow ${done ? 'done' : ''}`}>
      <div className="row between">
        <span className="muted">
          {props.prescription ?? TYPE_NAME[type]}
          {props.prescription && type !== 'work' && ` · ${TYPE_NAME[type]}`}
          {props.pr && <> <span className="chip pr">PR</span></>}
        </span>
        <span className="row">
          <button className="btn small" type="button" onClick={() => setMemoOpen((v) => !v)}>
            메모{log?.memo ? ' ●' : ''}
          </button>
          {props.removable && <button className="btn small" type="button" onClick={props.onRemove}>삭제</button>}
        </span>
      </div>
      <div className="grid">
        <button
          type="button"
          className={`settype ${type}`}
          aria-label={`세트 타입: ${TYPE_NAME[type]}. 누르면 바뀝니다`}
          onClick={() => props.onChange({ type: NEXT_TYPE[type] })}
        >
          {typeLabel}
        </button>
        <span>
          <Stepper
            label={`무게(${unit === 'lb' ? 'lbs' : 'kg'})`}
            value={weight}
            placeholder={suggestedWeight}
            steps={weightSteps(unit)}
            onChange={(v) => props.onChange({ weight: v })}
          />
          <div className="muted" style={{ textAlign: 'center' }}>
            {unit === 'lb' ? 'lbs' : 'kg'}
            {unit === 'lb' && shownWeight != null && ` · ${formatKg(toKg(shownWeight, 'lb'))}kg`}
          </div>
        </span>
        <span>
          <Stepper label="횟수" value={reps} placeholder={suggestedReps} steps={[1]} onChange={(v) => props.onChange({ reps: v == null ? null : Math.round(v) })} />
          <div className="muted" style={{ textAlign: 'center' }}>회</div>
        </span>
        <select
          aria-label="RPE"
          value={log?.rpe ?? ''}
          onChange={(e) => props.onChange({ rpe: e.target.value === '' ? null : Number(e.target.value) })}
        >
          <option value="">RPE</option>
          {RPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          type="button"
          className={`check ${done ? 'on' : ''}`}
          aria-label={done ? '수행 취소' : '수행 완료'}
          aria-pressed={done}
          onClick={() => props.onToggle(shownWeight, shownReps)}
        >
          ✓
        </button>
      </div>
      {memoOpen && (
        <input
          type="text"
          aria-label="세트 메모"
          placeholder="세트 메모"
          defaultValue={log?.memo ?? ''}
          style={{ width: '100%', marginTop: 6 }}
          onBlur={(e) => props.onChange({ memo: e.target.value })}
        />
      )}
    </div>
  );
}
