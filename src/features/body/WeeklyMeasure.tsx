import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { emptyMeasurement, saveMeasurement } from '../../db/dietRepo';
import { diffDays, todayStr } from '../../domain/date';
import type { BodyMeasurement } from '../../domain/types';
import { parseNumber } from '../../domain/units';
import { DatePicker, type DayMark } from '../../ui/CalendarSheet';

type Field = Exclude<keyof BodyMeasurement, 'date'>;
const FIELDS: { key: Field; label: string; short: string; unit: string; min: number; max: number }[] = [
  { key: 'weightKg', label: '체중 (kg)', short: '체중', unit: 'kg', min: 0.1, max: 500 },
  { key: 'skeletalMuscleKg', label: '골격근량 (kg)', short: '골격근량', unit: 'kg', min: 0.1, max: 500 },
  { key: 'bodyFatKg', label: '체지방량 (kg)', short: '체지방량', unit: 'kg', min: 0.1, max: 500 },
  { key: 'bodyFatPct', label: '체지방률 (%)', short: '체지방률', unit: '%', min: 1, max: 70 },
  { key: 'waistCm', label: '허리둘레 (cm)', short: '허리', unit: 'cm', min: 30, max: 250 },
];

function diffText(now: BodyMeasurement, prev: BodyMeasurement): string {
  return FIELDS.filter((f) => now[f.key] != null && prev[f.key] != null)
    .map((f) => {
      const d = Math.round(((now[f.key] as number) - (prev[f.key] as number)) * 10) / 10;
      return `${f.short} ${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}${f.unit}`;
    })
    .join(' · ');
}

export function WeeklyMeasure() {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const all = useLiveQuery(() => db.bodyMeasurements.orderBy('date').reverse().toArray(), []);
  if (!all) return null;
  const current = all.find((m) => m.date === date) ?? emptyMeasurement(date);
  const marks: Record<string, DayMark> = Object.fromEntries(all.map((m) => [m.date, 'recorded' as DayMark]));
  const due = all.length === 0 || diffDays(all[0].date, today) >= 7;

  async function save(field: (typeof FIELDS)[number], text: string) {
    const value = text.trim() === '' ? null : parseNumber(text);
    if (text.trim() !== '' && (value == null || value < field.min || value > field.max)) {
      setError(`${field.label}: ${field.min}~${field.max} 사이로 입력해 주세요.`);
      return;
    }
    setError(null);
    await saveMeasurement(db, { ...current, [field.key]: value });
  }

  return (
    <>
      {due && <div className="banner" style={{ borderRadius: 10, marginBottom: 12 }}>이번 주 측정할 때예요. (인바디, 허리둘레)</div>}
      <DatePicker value={date} onChange={setDate} marks={marks} />
      {error && <div className="error" role="alert">{error}</div>}
      <div className="card">
        {FIELDS.map((f) => (
          <label className="field" key={`${date}-${f.key}-${current[f.key] ?? ''}`}>
            <span>{f.label}</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={current[f.key] ?? ''}
              onBlur={(e) => save(f, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </label>
        ))}
        <p className="muted">같은 기기, 비슷한 조건(아침 공복 등)에서 재면 추세 비교가 정확합니다. 모든 칸을 비우면 그 날짜의 측정이 지워집니다.</p>
      </div>
      <h2>최근 측정</h2>
      {all.length === 0 && <p className="muted">아직 측정이 없습니다.</p>}
      {all.slice(0, 8).map((m, i) => (
        <button key={m.date} type="button" className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => setDate(m.date)}>
          <strong>{m.date.slice(5)}</strong>{' '}
          <span>
            {FIELDS.filter((f) => m[f.key] != null).map((f) => `${f.short} ${m[f.key]}${f.unit}`).join(' · ')}
          </span>
          {all[i + 1] && <div className="muted">{diffText(m, all[i + 1]) || '비교할 항목 없음'}</div>}
        </button>
      ))}
    </>
  );
}
