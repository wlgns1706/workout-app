/** 종료 시각 기준으로 계산한다. 화면이 꺼졌다 켜져도 정확하다. */
export function remainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export type TimerCue = 'warn' | 'tick' | 'end';

/**
 * 남은 시간이 prev → now로 바뀌었을 때 낼 신호.
 * 30초 전 한 번(휴식이 30초보다 길 때), 5~1초 전 매초 짧은 비프, 0초에 긴 비프.
 * 여러 초를 한 번에 건너뛰면 가장 마지막 신호만 낸다.
 */
export function timerCue(prev: number, now: number, total: number): TimerCue | null {
  if (now >= prev) return null;
  if (now <= 0) return 'end';
  if (now <= 5) return 'tick';
  if (total > 30 && prev > 30 && now <= 30) return 'warn';
  return null;
}
