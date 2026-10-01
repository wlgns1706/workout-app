import type { SetLog, Unit } from '../../domain/types';
import { formatKg, toKg } from '../../domain/units';

interface Props {
  number: string; // 본 세트 번호
  prescription: string | null; // 예: "8~12회 @7". 추가한 세트는 null
  log: SetLog | undefined;
  unit: Unit;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  pr: boolean;
  onTypeTap(): void;
  onWeightTap(): void;
  onRepsTap(): void;
  onToggle(weight: number | null, reps: number | null): void;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function SetRow(props: Props) {
  const { log, unit, suggestedWeight, suggestedReps } = props;
  const type = log?.type ?? 'work';
  const done = log?.done ?? false;
  const weight = log?.weight ?? null;
  const reps = log?.reps ?? null;
  const shownWeight = weight ?? suggestedWeight;
  const shownReps = reps ?? suggestedReps;
  const label = type === 'warmup' ? 'W' : type === 'failure' ? 'F' : props.number;
  const unitText = unit === 'lb' ? 'lbs' : 'kg';

  const sub = [
    props.prescription,
    unit === 'lb' && shownWeight != null ? `${formatKg(toKg(shownWeight, 'lb'))}kg` : null,
    log?.rpe != null ? `RPE ${log.rpe}` : null,
  ].filter(Boolean);

  return (
    <div className={`set2 ${done ? 'done' : ''}`}>
      <button type="button" className={`num ${type}`} aria-label={`세트 ${label}. 누르면 웜업으로 바뀝니다`} onClick={props.onTypeTap}>
        {label}
      </button>
      <button type="button" className={`val ${weight == null ? 'placeholder' : ''}`} aria-label="무게 수정" onClick={props.onWeightTap}>
        {shownWeight == null ? '—' : fmt(shownWeight)}
        <small> {unitText}</small>
      </button>
      <button type="button" className={`val ${reps == null ? 'placeholder' : ''}`} aria-label="횟수 수정" onClick={props.onRepsTap}>
        {shownReps == null ? '—' : shownReps}
        <small> 회</small>
        {props.pr && <> <span className="chip pr">PR</span></>}
      </button>
      <button
        type="button"
        className={`check ${done ? 'on' : ''}`}
        aria-label={done ? '수행 취소' : '수행 완료'}
        aria-pressed={done}
        onClick={() => props.onToggle(shownWeight, shownReps)}
      >
        ✓
      </button>
      {sub.length > 0 && <div className="sub">{sub.join(' · ')}</div>}
    </div>
  );
}
