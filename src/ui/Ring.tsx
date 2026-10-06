interface Props {
  value: number; // 0~1
  center: string;
  label: string;
  sub?: string;
  color?: string;
}

/** 진행 링 하나. 값은 0~1로 잘라서 그린다. */
export function Ring({ value, center, label, sub, color = 'var(--accent)' }: Props) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <>
      <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${label} ${center}`}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="8" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 38 38)" />
        <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text)">{center}</text>
      </svg>
      <span className="rlabel">{label}</span>
      {sub && <span className="rsub">{sub}</span>}
    </>
  );
}
