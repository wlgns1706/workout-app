import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { saveTarget } from '../../db/dietRepo';
import { todayStr } from '../../domain/date';
import { carbsBase, planTarget, validateTarget } from '../../domain/nutrition';
import type { NutritionTarget } from '../../domain/types';

type RangeKey = 'kcal' | 'protein' | 'fat';
const RANGES: { key: RangeKey; label: string; unit: string }[] = [
  { key: 'kcal', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
];

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange(v: number): void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      aria-label={label}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      style={{ width: 80 }}
    />
  );
}

export function NutritionTargets() {
  const targets = useLiveQuery(() => db.nutritionTargets.toArray(), []);
  const [form, setForm] = useState<NutritionTarget | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!targets) return null;

  const history = [...targets].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const draft = form ?? { ...(history[0] ?? planTarget(todayStr())), startDate: todayStr() };
  const update = (patch: Partial<NutritionTarget>) => setForm({ ...draft, ...patch });

  async function save() {
    const error = validateTarget(draft);
    if (error) {
      setMessage({ kind: 'error', text: error });
      return;
    }
    await saveTarget(db, draft);
    setForm(null);
    setMessage({ kind: 'ok', text: `${draft.startDate}부터 적용되는 목표를 저장했습니다.` });
  }

  return (
    <div className="card">
      {history.length === 0 && <p className="muted">다이어트 플랜의 시작 목표를 채워 두었습니다. 확인한 뒤 "저장"을 누르세요.</p>}
      {message && <div className={message.kind} role="status">{message.text}</div>}
      <p className="muted">최소 · 기준 · 최대</p>
      {RANGES.map(({ key, label, unit }) => (
        <div className="row" key={key} style={{ marginBottom: 6 }}>
          <span style={{ width: 56 }}>{label}</span>
          <NumberInput label={`${label} 최소`} value={draft[key].min} onChange={(v) => update({ [key]: { ...draft[key], min: v } })} />
          <NumberInput label={`${label} 기준`} value={draft[key].base} onChange={(v) => update({ [key]: { ...draft[key], base: v } })} />
          <NumberInput label={`${label} 최대`} value={draft[key].max} onChange={(v) => update({ [key]: { ...draft[key], max: v } })} />
          <span className="muted">{unit}</span>
        </div>
      ))}
      <p className="muted">탄수화물 기준: 남은 열량으로 계산 → {Number.isFinite(carbsBase(draft)) ? carbsBase(draft) : '—'}g</p>
      <div className="row" style={{ marginBottom: 6 }}>
        <span style={{ width: 56 }}>감량</span>
        <NumberInput label="감량 속도 최소" value={draft.lossRate.min} onChange={(v) => update({ lossRate: { ...draft.lossRate, min: v } })} />
        <span>~</span>
        <NumberInput label="감량 속도 최대" value={draft.lossRate.max} onChange={(v) => update({ lossRate: { ...draft.lossRate, max: v } })} />
        <span className="muted">kg/주</span>
      </div>
      <label className="field">
        <span>적용 시작일</span>
        <input type="date" value={draft.startDate} onChange={(e) => update({ startDate: e.target.value })} />
      </label>
      <button type="button" className="btn primary block" onClick={save}>저장</button>
      {history.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: 12 }}>변경 이력</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {history.map((t) => (
              <li key={t.startDate} className="muted">
                {t.startDate}부터 · {t.kcal.min}~{t.kcal.max}kcal · 단백질 {t.protein.min}g 이상
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
