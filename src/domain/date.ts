const pad = (n: number) => String(n).padStart(2, '0');

/** 현지 시간 기준의 YYYY-MM-DD */
export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localDateOf(iso: string): string {
  return todayStr(new Date(iso));
}

// 날짜 문자열끼리의 계산은 UTC 자정으로 바꿔서 한다. 서머타임의 영향을 받지 않는다.
function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = new Date(toUtc(date) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}
