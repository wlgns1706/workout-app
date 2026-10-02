import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { getMeta, setMeta } from '../../db/repo';
import { parseNumber } from '../../domain/units';
import { META_GOAL_MAX, META_GOAL_MIN } from '../home/HomePage';

/** 홈의 목표 체중 진행 막대에 쓰는 목표 범위. 처음 값은 다이어트 플랜의 83~87kg */
export function GoalWeight() {
  const saved = useLiveQuery(async () => ({ min: await getMeta(db, META_GOAL_MIN), max: await getMeta(db, META_GOAL_MAX) }), []);
  const [draft, setDraft] = useState<{ min: string; max: string } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!saved) return null;
  const form = draft ?? { min: saved.min ?? '83', max: saved.max ?? '87' };

  async function save() {
    const min = parseNumber(form.min);
    const max = parseNumber(form.max);
    if (min == null || max == null || min < 30 || max > 300 || min > max) {
      setMessage({ kind: 'error', text: '목표 체중: 30~300kg 사이에서 최소 ≤ 최대가 되도록 넣어 주세요.' });
      return;
    }
    await setMeta(db, META_GOAL_MIN, String(min));
    await setMeta(db, META_GOAL_MAX, String(max));
    setDraft(null);
    setMessage({ kind: 'ok', text: `목표 체중 ${min}~${max}kg을 저장했습니다.` });
  }

  return (
    <div className="card">
      {saved.min == null && <p className="muted">다이어트 플랜의 1차 목표 범위를 채워 두었습니다. 확인한 뒤 "저장"을 누르세요.</p>}
      {message && <div className={message.kind} role="status">{message.text}</div>}
      <div className="row">
        <input type="text" inputMode="decimal" aria-label="목표 체중 최소" value={form.min} onChange={(e) => setDraft({ ...form, min: e.target.value })} style={{ width: 80 }} />
        <span>~</span>
        <input type="text" inputMode="decimal" aria-label="목표 체중 최대" value={form.max} onChange={(e) => setDraft({ ...form, max: e.target.value })} style={{ width: 80 }} />
        <span className="muted">kg</span>
        <button type="button" className="btn small primary" onClick={save}>저장</button>
      </div>
    </div>
  );
}
