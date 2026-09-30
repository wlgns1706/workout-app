import { useEffect, useState } from 'react';
import { parseNumber } from '../domain/units';

interface Props {
  label: string;
  value: number | null;
  placeholder: number | null; // 값이 없을 때 흐리게 보여주는 제안값
  steps: number[]; // 작은 폭부터. 예: [0.5, 5]
  onChange(value: number | null): void;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function Stepper({ label, value, placeholder, steps, onChange }: Props) {
  const [text, setText] = useState(value == null ? '' : fmt(value));
  useEffect(() => setText(value == null ? '' : fmt(value)), [value]);

  const bump = (delta: number) => {
    const base = value ?? placeholder ?? 0;
    onChange(Math.max(0, Math.round((base + delta) * 100) / 100));
  };
  const commit = () => {
    const parsed = parseNumber(text);
    if (parsed !== value) onChange(parsed);
    setText(parsed == null ? '' : fmt(parsed));
  };
  const minus = [...steps].reverse();

  return (
    <span className="stepper">
      {minus.map((s) => (
        <button key={`m${s}`} type="button" aria-label={`${label} ${s} 줄이기`} onClick={() => bump(-s)}>−{steps.length > 1 ? s : ''}</button>
      ))}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={text}
        placeholder={placeholder == null ? '' : fmt(placeholder)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {steps.map((s) => (
        <button key={`p${s}`} type="button" aria-label={`${label} ${s} 늘리기`} onClick={() => bump(s)}>+{steps.length > 1 ? s : ''}</button>
      ))}
    </span>
  );
}
