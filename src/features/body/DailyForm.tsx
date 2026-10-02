import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { emptyBodyLog } from '../../db/repo';
import { todayStr } from '../../domain/date';
import type { BodyLog } from '../../domain/types';
import { parseNumber } from '../../domain/units';
import { DatePicker, type DayMark } from '../../ui/CalendarSheet';

type NumberField = Exclude<keyof BodyLog, 'date'>;

const FIELDS: { key: NumberField; label: string; hint: string; min: number; max: number; integer: boolean }[] = [
  { key: 'weightKg', label: '체중 (kg)', hint: '아침 화장실 다녀온 뒤, 식사 전', min: 0.1, max: 500, integer: false },
  { key: 'sleepHours', label: '수면 (시간)', hint: '', min: 0, max: 24, integer: false },
  { key: 'nutrition', label: '영양', hint: '1=매우 나쁨, 10=매우 좋음', min: 1, max: 10, integer: true },
  { key: 'motivation', label: '동기', hint: '1=전혀 강하지 않다, 10=매우 강하다', min: 1, max: 10, integer: true },
  { key: 'confidence', label: '자신감', hint: '1=전혀 없다, 10=매우 있다', min: 1, max: 10, integer: true },
  { key: 'stress', label: '스트레스', hint: '1=전혀 없다, 10=매우 심하다', min: 1, max: 10, integer: true },
  { key: 'fatigue', label: '피로도', hint: '1=전혀 피곤하지 않다, 10=매우 피곤하다', min: 1, max: 10, integer: true },
];

export function DailyForm() {
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);
  const data = useLiveQuery(async () => {
    const all = await db.bodyLogs.orderBy('date').reverse().toArray();
    return { current: all.find((l) => l.date === date), recent: all.slice(0, 14), all };
  }, [date]);
  if (!data) return null;
  const log = data.current ?? emptyBodyLog(date);
  const marks: Record<string, DayMark> = {};
  for (const l of data.all) if (l.weightKg != null) marks[l.date] = 'recorded';

  async function save(field: (typeof FIELDS)[number], text: string) {
    const value = text.trim() === '' ? null : parseNumber(text);
    if (text.trim() !== '' && (value == null || value < field.min || value > field.max || (field.integer && !Number.isInteger(value)))) {
      setError(`${field.label}: ${field.min}~${field.max} 사이${field.integer ? '의 정수' : ''}로 입력해 주세요.`);
      return;
    }
    setError(null);
    const next: BodyLog = { ...log, [field.key]: value };
    const empty = FIELDS.every((f) => next[f.key] == null);
    try {
      if (empty) await db.bodyLogs.delete(date);
      else await db.bodyLogs.put(next);
    } catch {
      setError('저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  return (
    <>
      <DatePicker value={date} onChange={setDate} marks={marks} />
      {error && <div className="error" role="alert">{error}</div>}
      <div className="card">
        {FIELDS.map((field) => (
          <label className="field" key={`${date}-${field.key}-${log[field.key] ?? ''}`}>
            <span>{field.label}{field.hint && ` · ${field.hint}`}</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={log[field.key] ?? ''}
              onBlur={(e) => save(field, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </label>
        ))}
        <p className="muted">칸을 벗어나면 저장됩니다. 체중만 적어도 됩니다.</p>
      </div>
      <h2>최근 기록</h2>
      {data.recent.length === 0 && <p className="muted">아직 기록이 없습니다.</p>}
      {data.recent.map((r) => (
        <button key={r.date} type="button" className="card row between" style={{ width: '100%', textAlign: 'left' }} onClick={() => setDate(r.date)}>
          <strong>{r.date.slice(5)}</strong>
          <span>{r.weightKg != null ? `${r.weightKg.toFixed(1)}kg` : '—'}</span>
          <span className="muted">
            {r.sleepHours != null && `수면 ${r.sleepHours}h `}
            {r.fatigue != null && `피로 ${r.fatigue}`}
          </span>
        </button>
      ))}
    </>
  );
}
