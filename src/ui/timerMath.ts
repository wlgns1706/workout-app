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

/** 시각을 "14:32:10"처럼 쓴다. */
export function clockTime(ms: number): string {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

export interface RestNotice {
  title: string;
  body: string;
  silent: boolean;
  vibrate?: number[];
}

/** 다른 앱을 쓰는 동안 알림창에 띄울 휴식 타이머 내용 */
export function restNotice(left: number, endAt: number, cue: TimerCue | null): RestNotice {
  if (left <= 0 || cue === 'end') return { title: '휴식 끝! 다음 세트를 시작하세요', body: '누르면 앱으로 돌아갑니다', silent: false, vibrate: [400, 150, 400] };
  const notice: RestNotice = { title: `휴식 ${formatClock(left)} 남음`, body: `${clockTime(endAt)}에 끝나요 · 누르면 앱으로 돌아갑니다`, silent: true };
  return cue === 'warn' ? { ...notice, silent: false, vibrate: [200] } : notice;
}
