import { useState } from 'react';
import { diffDays } from '../domain/date';

export interface ChartPoint {
  date: string;
  value: number;
  highlight?: boolean;
}

export interface ChartSeries {
  kind: 'line' | 'dots' | 'diamonds' | 'bars';
  label: string;
  color: string; // CSS 색. 예: 'var(--accent)'
  points: ChartPoint[];
}

interface Props {
  start: string;
  end: string;
  series: ChartSeries[];
  bands?: { date: string; min: number; max: number }[];
  markerDate?: string;
  unit: string;
  height?: number;
}

const W = 340;
const PAD = { l: 40, r: 8, t: 22, b: 20 };
const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : String(Math.round(v * 10) / 10));

/** 날짜를 가로축으로 하는 SVG 그래프. 점을 누르면 위에 값을 보여준다. */
export function TimeChart({ start, end, series, bands = [], markerDate, unit, height = 180 }: Props) {
  const [picked, setPicked] = useState<{ label: string; point: ChartPoint } | null>(null);
  const H = height;
  const span = Math.max(1, diffDays(start, end));
  const x = (date: string) => PAD.l + (diffDays(start, date) / span) * (W - PAD.l - PAD.r);

  const values = [...series.flatMap((s) => s.points.map((p) => p.value)), ...bands.flatMap((b) => [b.min, b.max])];
  if (series.some((s) => s.kind === 'bars')) values.push(0);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const padY = (hi - lo) * 0.08;
  lo -= padY;
  hi += padY;
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const barW = Math.max(2, ((W - PAD.l - PAD.r) / (span + 1)) * 0.7);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.label).join(', ')} className="chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="2 3" />
          <text x={PAD.l - 4} y={y(t) + 4} textAnchor="end" className="axis">{fmt(t)}</text>
        </g>
      ))}
      <text x={PAD.l} y={H - 4} className="axis">{start.slice(5)}</text>
      <text x={W - PAD.r} y={H - 4} textAnchor="end" className="axis">{end.slice(5)}</text>

      {bands.map((b) => (
        <rect key={`band-${b.date}`} x={x(b.date) - barW / 2} width={barW} y={y(b.max)} height={Math.max(1, y(b.min) - y(b.max))} fill="var(--ok-bg)" />
      ))}
      {markerDate && markerDate >= start && markerDate <= end && (
        <line x1={x(markerDate)} x2={x(markerDate)} y1={PAD.t} y2={H - PAD.b} stroke="var(--failure)" strokeDasharray="4 3" />
      )}

      {series.map((s) => {
        const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
        if (s.kind === 'bars') {
          return pts.map((p) => (
            <rect key={`${s.label}-${p.date}`} x={x(p.date) - barW / 2} width={barW} y={y(p.value)} height={Math.max(0, y(lo + padY) - y(p.value))} fill={s.color} opacity={0.75} onClick={() => setPicked({ label: s.label, point: p })} />
          ));
        }
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
        return (
          <g key={s.label}>
            {s.kind === 'line' && pts.length > 1 && <path d={path} fill="none" stroke={s.color} strokeWidth={2} />}
            {pts.map((p) =>
              s.kind === 'diamonds' ? (
                <rect key={p.date} x={x(p.date) - 4} y={y(p.value) - 4} width={8} height={8} transform={`rotate(45 ${x(p.date)} ${y(p.value)})`} fill={s.color} onClick={() => setPicked({ label: s.label, point: p })} />
              ) : (
                <circle
                  key={p.date}
                  cx={x(p.date)}
                  cy={y(p.value)}
                  r={p.highlight ? 5 : s.kind === 'dots' ? 2.5 : 3}
                  fill={p.highlight ? 'var(--ok)' : s.color}
                  opacity={s.kind === 'dots' ? 0.45 : 1}
                  onClick={() => setPicked({ label: s.label, point: p })}
                />
              ),
            )}
          </g>
        );
      })}

      {picked && (
        <text x={W / 2} y={14} textAnchor="middle" className="picked">
          {picked.point.date.slice(5)} · {picked.label} {fmt(picked.point.value)}{unit}
        </text>
      )}
    </svg>
  );
}
