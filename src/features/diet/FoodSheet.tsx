import { useRef, useState } from 'react';
import { db } from '../../db/db';
import { addFood, copyMeal, deleteFavorite, deleteFood, saveFavorite, updateFood } from '../../db/dietRepo';
import { addDays } from '../../domain/date';
import { kcalFromMacros, MEALS, scaleFood } from '../../domain/nutrition';
import type { FavoriteFood, FoodEntry, Meal, Nutrients } from '../../domain/types';
import { parseNumber } from '../../domain/units';
import { Sheet } from '../../ui/Sheet';

interface Props {
  date: string;
  meal: Meal;
  editing?: FoodEntry;
  favorites: FavoriteFood[];
  canCopy: boolean;
  onClose(): void;
}

const FACTORS = [0.5, 1, 1.5, 2];
const FIELDS: { key: keyof Nutrients; label: string }[] = [
  { key: 'kcal', label: '칼로리 (비우면 탄단지로 계산)' },
  { key: 'protein', label: '단백질 g' },
  { key: 'carbs', label: '탄수화물 g' },
  { key: 'fat', label: '지방 g' },
];

type Texts = Record<keyof Nutrients, string>;
const toTexts = (n?: Nutrients): Texts => ({
  kcal: n ? String(n.kcal) : '',
  protein: n ? String(n.protein) : '',
  carbs: n ? String(n.carbs) : '',
  fat: n ? String(n.fat) : '',
});

export function FoodSheet({ date, meal, editing, favorites, canCopy, onClose }: Props) {
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? '';
  const [factor, setFactor] = useState(1);
  const [name, setName] = useState(editing?.name ?? '');
  const [texts, setTexts] = useState<Texts>(toTexts(editing));
  const [keep, setKeep] = useState(false);
  const [manage, setManage] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function read(): { name: string } & Nutrients {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('음식 이름을 적어 주세요.');
    const num = (key: keyof Nutrients): number | null => {
      const t = texts[key].trim();
      if (t === '') return null;
      const v = parseNumber(t);
      if (v == null) throw new Error(`${FIELDS.find((f) => f.key === key)?.label.split(' ')[0]}: 0 이상의 숫자를 넣어 주세요.`);
      return v;
    };
    const protein = num('protein') ?? 0;
    const carbs = num('carbs') ?? 0;
    const fat = num('fat') ?? 0;
    return { name: trimmed, kcal: num('kcal') ?? kcalFromMacros(protein, carbs, fat), protein, carbs, fat};
  }

  async function submit() {
    try {
      const food = read();
      if (favoriteId) {
        await saveFavorite(db, { ...food, id: favoriteId });
        setFavoriteId(null);
        setName('');
        setTexts(toTexts());
        setError(null);
        return;
      }
      if (editing) await updateFood(db, editing.id, food);
      else await addFood(db, { ...food, date, meal });
      if (keep) await saveFavorite(db, food);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.');
    }
  }

  async function addFromFavorite(f: FavoriteFood) {
    await addFood(db, { ...scaleFood(f, factor), date, meal });
    onClose();
  }

  async function copyYesterday() {
    await copyMeal(db, addDays(date, -1), date, meal);
    onClose();
  }

  /** 자주 먹는 음식을 아래 입력 칸으로 불러온다. 고른 양(×)을 곱해서 채운다. */
  function loadFavorite(f: FavoriteFood) {
    const scaled = scaleFood(f, factor);
    setFavoriteId(null);
    setName(scaled.name);
    setTexts(toTexts(scaled));
    setError(null);
    setTimeout(() => nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  function editFavorite(f: FavoriteFood) {
    setFavoriteId(f.id);
    setName(f.name);
    setTexts(toTexts(f));
  }

  return (
    <Sheet title={editing ? `${mealLabel} 음식 수정` : `${mealLabel}에 음식 추가`} onClose={onClose} closeLabel="닫기">
      {!editing && (
        <>
          <div className="row between">
            <strong>자주 먹는 음식</strong>
            <button type="button" className="btn small" onClick={() => setManage((v) => !v)}>{manage ? '완료' : '편집'}</button>
          </div>
          {!manage && (
            <div className="choices" role="group" aria-label="양">
              {FACTORS.map((f) => (
                <button key={f} type="button" aria-pressed={factor === f} onClick={() => setFactor(f)}>×{f}</button>
              ))}
            </div>
          )}
          {favorites.length === 0 && <p className="muted">아직 없습니다. 아래에서 음식을 넣을 때 "자주 먹는 음식으로 저장"을 체크하세요.</p>}
          {favorites.map((f) => (
            <div key={f.id} className="row between" style={{ borderTop: '1px dashed var(--border)', padding: '6px 0' }}>
              <button type="button" className="favname" onClick={() => loadFavorite(f)} aria-label={`${f.name} 불러오기`}>
                {f.name}
                <br />
                <small className="muted">{f.kcal}kcal · P{f.protein} C{f.carbs} F{f.fat} · 눌러서 불러오기</small>
              </button>
              {manage ? (
                <span className="row">
                  <button type="button" className="btn small" onClick={() => editFavorite(f)}>수정</button>
                  <button type="button" className="btn small" onClick={() => deleteFavorite(db, f.id)}>삭제</button>
                </span>
              ) : (
                <button type="button" className="btn small primary" onClick={() => addFromFavorite(f)}>추가</button>
              )}
            </div>
          ))}
          <button type="button" className="btn block" disabled={!canCopy} onClick={copyYesterday} style={{ margin: '8px 0' }}>
            어제 {mealLabel} 복사
          </button>
          <strong>{favoriteId ? '자주 먹는 음식 수정' : '직접 입력'}</strong>
        </>
      )}
      {error && <div className="error" role="alert">{error}</div>}
      <label className="field">
        <span>이름</span>
        <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
      </label>
      {FIELDS.map((f) => (
        <label className="field" key={f.key}>
          <span>{f.label}</span>
          <input type="text" inputMode="decimal" value={texts[f.key]} onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })} />
        </label>
      ))}
      {!editing && !favoriteId && (
        <label className="row">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <span>자주 먹는 음식으로 저장</span>
        </label>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn primary" onClick={submit}>{favoriteId ? '자주 먹는 음식 저장' : editing ? '수정' : '입력한 음식 추가'}</button>
        {editing && (
          <button type="button" className="btn" onClick={async () => { await deleteFood(db, editing.id); onClose(); }}>삭제</button>
        )}
      </div>
    </Sheet>
  );
}
