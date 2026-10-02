import { Link } from 'react-router-dom';
import { barState, carbsBase } from '../../domain/nutrition';
import type { Nutrients, NutritionTarget } from '../../domain/types';

const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10));

export function TargetBars({ totals, target }: { totals: Nutrients; target: NutritionTarget | null }) {
  if (!target) {
    return (
      <div className="card">
        <p>
          {fmt(totals.kcal)}kcal · 단백질 {fmt(totals.protein)}g · 탄수화물 {fmt(totals.carbs)}g · 지방 {fmt(totals.fat)}g
        </p>
        <Link to="/settings">설정에서 영양 목표를 입력하세요</Link>
      </div>
    );
  }
  const rows = [
    { label: '칼로리', value: totals.kcal, base: target.kcal.base, min: target.kcal.min, max: target.kcal.max, unit: 'kcal' },
    { label: '단백질', value: totals.protein, base: target.protein.base, min: target.protein.min, max: target.protein.max, unit: 'g' },
    { label: '탄수화물', value: totals.carbs, base: carbsBase(target), min: null, max: null, unit: 'g' },
    { label: '지방', value: totals.fat, base: target.fat.base, min: target.fat.min, max: target.fat.max, unit: 'g' },
  ];
  return (
    <div className="card">
      {rows.map((r) => {
        const state = r.min == null || r.max == null ? '' : barState(r.value, r.min, r.max);
        const width = r.base > 0 ? Math.min(100, (r.value / r.base) * 100) : 0;
        return (
          <div className="nbar" key={r.label}>
            <span>{r.label}</span>
            <span className="track" title={r.min != null ? `${r.min}~${r.max}${r.unit}` : ''}>
              <span className={`fill ${state}`} style={{ width: `${width}%`, display: 'block' }} />
            </span>
            <span className="num">
              {fmt(r.value)} / {fmt(r.base)}
              {r.unit === 'g' ? 'g' : ''}
            </span>
          </div>
        );
      })}
      <p className="muted" style={{ margin: '4px 0 0' }}>
        칼로리 {target.kcal.min}~{target.kcal.max} · 단백질 {target.protein.min}g 이상이면 지킨 날
      </p>
    </div>
  );
}
