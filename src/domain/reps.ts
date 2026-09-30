export type RepTarget =
  | { kind: 'range'; min: number; max: number }
  | { kind: 'fixed'; reps: number }
  | { kind: 'time'; seconds: number }
  | { kind: 'unknown' };

export function parseReps(text: string): RepTarget {
  const t = text.trim();
  let m = /^(\d+)\s*[~\-]\s*(\d+)$/.exec(t);
  if (m) return { kind: 'range', min: Number(m[1]), max: Number(m[2]) };
  m = /^(\d+)\s*s$/i.exec(t);
  if (m) return { kind: 'time', seconds: Number(m[1]) };
  m = /^(\d+)$/.exec(t);
  if (m) return { kind: 'fixed', reps: Number(m[1]) };
  return { kind: 'unknown' };
}

export function targetReps(text: string): number | null {
  const r = parseReps(text);
  if (r.kind === 'range') return Math.ceil((r.min + r.max) / 2);
  if (r.kind === 'fixed') return r.reps;
  return null;
}

export function defaultReps(text: string): number | null {
  const r = parseReps(text);
  if (r.kind === 'range') return r.min;
  if (r.kind === 'fixed') return r.reps;
  return null;
}

export function parseRpe(text: string | null): number | null {
  if (text == null) return null;
  const t = text.trim().replace(/^@/, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
