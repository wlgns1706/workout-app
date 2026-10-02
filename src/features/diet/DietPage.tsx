import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { addDays, todayStr } from '../../domain/date';
import { dietDayStatus, MEAL_PROTEIN_MIN, MEALS, round1, sumNutrients, targetOn } from '../../domain/nutrition';
import type { FoodEntry, Meal } from '../../domain/types';
import { DatePicker, type DayMark } from '../../ui/CalendarSheet';
import { FoodSheet } from './FoodSheet';
import { TargetBars } from './TargetBars';

export default function DietPage() {
  const [date, setDate] = useState(todayStr());
  const [sheet, setSheet] = useState<{ meal: Meal; editing?: FoodEntry } | null>(null);
  const data = useLiveQuery(async () => ({
    entries: await db.foodEntries.toArray(),
    targets: await db.nutritionTargets.toArray(),
    favorites: await db.favoriteFoods.toArray(),
  }), []);
  if (!data) return null;
  const { entries, targets, favorites } = data;

  const byDate = new Map<string, FoodEntry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const marks: Record<string, DayMark> = {};
  for (const [d, list] of byDate) {
    const s = dietDayStatus(list, targetOn(targets, d));
    if (s !== 'none') marks[d] = s;
  }
  const summary = (year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const inMonth = Object.entries(marks).filter(([d]) => d.startsWith(prefix));
    return `이번 달 지킨 날 ${inMonth.filter(([, m]) => m === 'kept').length}일 / 기록한 날 ${inMonth.length}일`;
  };

  const day = (byDate.get(date) ?? []).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const yesterdayMeals = new Set((byDate.get(addDays(date, -1)) ?? []).map((e) => e.meal));

  return (
    <main className="page">
      <h1>식단</h1>
      <DatePicker value={date} onChange={setDate} marks={marks} summary={summary} />
      <TargetBars totals={sumNutrients(day)} target={targetOn(targets, date)} />
      {MEALS.map(({ key, label }) => {
        const foods = day.filter((e) => e.meal === key);
        const sum = sumNutrients(foods);
        return (
          <div className="card" key={key}>
            <div className="row between">
              <span>
                <strong>{label}</strong>
                <span className="muted"> · {Math.round(sum.kcal)}kcal · 단백질 {round1(sum.protein)}g</span>
                {foods.length > 0 && sum.protein < MEAL_PROTEIN_MIN && <span className="muted"> · 단백질 부족</span>}
              </span>
              <button type="button" className="btn small" aria-label={`${label}에 음식 추가`} onClick={() => setSheet({ meal: key })}>＋</button>
            </div>
            {foods.map((f) => (
              <button type="button" key={f.id} className="food" onClick={() => setSheet({ meal: key, editing: f })}>
                <span>{f.name}</span>
                <small>{Math.round(f.kcal)}kcal · P{f.protein} C{f.carbs} F{f.fat}</small>
              </button>
            ))}
          </div>
        );
      })}
      {sheet && (
        <FoodSheet
          date={date}
          meal={sheet.meal}
          editing={sheet.editing}
          favorites={favorites}
          canCopy={yesterdayMeals.has(sheet.meal)}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  );
}
