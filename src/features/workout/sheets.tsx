import { useEffect, useState } from 'react';
import type { SetType, Unit } from '../../domain/types';
import { formatKg, parseNumber, toKg, weightSteps } from '../../domain/units';
import { formatClock } from '../../ui/timerMath';
import { Sheet } from '../../ui/Sheet';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 큰 숫자 입력칸. 입력을 마치면(칸을 벗어나면) 값을 알린다. */
function BigNumber({ label, value, placeholder, onChange }: { label: string; value: number | null; placeholder: number | null; onChange(v: number | null): void }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => setText(value == null ? '' : String(value)), [value]);
  return (
    <input
      className="big"
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder={placeholder == null ? '' : String(placeholder)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(parseNumber(text))}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

interface WeightProps {
  value: number | null;
  placeholder: number | null;
  unit: Unit;
  onChange(value: number | null): void;
  onUnit(unit: Unit): void;
  onClose(): void;
}

export function WeightSheet({ value, placeholder, unit, onChange, onUnit, onClose }: WeightProps) {
  const [small, big] = weightSteps(unit);
  const shown = value ?? placeholder;
  const bump = (d: number) => onChange(Math.max(0, round2((value ?? placeholder ?? 0) + d)));
  return (
    <Sheet title={`무게 (${unit === 'lb' ? 'lbs' : 'kg'})`} onClose={onClose}>
      <BigNumber label="무게" value={value} placeholder={placeholder} onChange={onChange} />
      {unit === 'lb' && shown != null && <p className="muted" style={{ textAlign: 'center' }}>{formatKg(toKg(shown, 'lb'))} kg</p>}
      <div className="steps">
        <button type="button" onClick={() => bump(-big)}>−{big}</button>
        <button type="button" onClick={() => bump(-small)}>−{small}</button>
        <button type="button" onClick={() => bump(small)}>+{small}</button>
        <button type="button" onClick={() => bump(big)}>+{big}</button>
      </div>
      <div className="choices" role="group" aria-label="단위">
        <button type="button" aria-pressed={unit === 'kg'} onClick={() => onUnit('kg')}>kg</button>
        <button type="button" aria-pressed={unit === 'lb'} onClick={() => onUnit('lb')}>lbs</button>
        <button type="button" onClick={() => onChange(null)}>무게 없음 (맨몸)</button>
      </div>
    </Sheet>
  );
}

const RPE_OPTIONS = [6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface RepsProps {
  value: number | null;
  placeholder: number | null;
  rpe: number | null;
  type: SetType;
  onChange(value: number | null): void;
  onRpe(rpe: number | null): void;
  onFailure(failure: boolean): void;
  onClose(): void;
}

export function RepsSheet({ value, placeholder, rpe, type, onChange, onRpe, onFailure, onClose }: RepsProps) {
  const bump = (d: number) => onChange(Math.max(0, (value ?? placeholder ?? 0) + d));
  return (
    <Sheet title="횟수" onClose={onClose}>
      <BigNumber label="횟수" value={value} placeholder={placeholder} onChange={(v) => onChange(v == null ? null : Math.round(v))} />
      <div className="steps two">
        <button type="button" onClick={() => bump(-1)}>−1</button>
        <button type="button" onClick={() => bump(1)}>+1</button>
      </div>
      <p className="muted">RPE (선택)</p>
      <div className="choices" role="group" aria-label="RPE">
        {RPE_OPTIONS.map((r) => (
          <button key={r} type="button" aria-pressed={rpe === r} onClick={() => onRpe(rpe === r ? null : r)}>{r}</button>
        ))}
      </div>
      <label className="row" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={type === 'failure'} onChange={(e) => onFailure(e.target.checked)} />
        <span>실패 세트 (끝까지 했는데 더 못 함)</span>
      </label>
    </Sheet>
  );
}

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

export function RestSheet({ value, onChange, onClose }: { value: number; onChange(seconds: number): void; onClose(): void }) {
  return (
    <Sheet title="휴식 시간" onClose={onClose}>
      <div className="choices" role="group" aria-label="휴식 시간">
        {REST_OPTIONS.map((s) => (
          <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)}>{formatClock(s)}</button>
        ))}
      </div>
    </Sheet>
  );
}

export function AltSheet({ original, options, current, onPick, onClose }: { original: string; options: string[]; current: string; onPick(name: string): void; onClose(): void }) {
  const all = [original, ...options.filter((o) => o !== original)];
  return (
    <Sheet title="대체 운동 고르기" onClose={onClose} closeLabel="닫기">
      {options.length === 0 && <p className="muted">이 종목에는 엑셀에 정해진 대체 운동이 없습니다.</p>}
      <div className="altlist">
        {all.map((n) => (
          <button key={n} type="button" aria-pressed={n === current} onClick={() => onPick(n)}>
            {n}
            {n === original && <small className="muted"> · 프로그램 종목</small>}
          </button>
        ))}
      </div>
      <p className="muted">바꾼 종목은 오늘 이 요일에만 적용됩니다. 기록은 실제로 한 종목 이름으로 남습니다.</p>
    </Sheet>
  );
}
