import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatClock, remainingSeconds } from './timerMath';

interface TimerApi {
  endAt: number | null;
  start(seconds: number): void;
  cancel(): void;
  add(seconds: number): void;
}

const TimerContext = createContext<TimerApi | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const start = useCallback((seconds: number) => setEndAt(Date.now() + seconds * 1000), []);
  const cancel = useCallback(() => setEndAt(null), []);
  const add = useCallback((seconds: number) => setEndAt((e) => (e == null ? null : e + seconds * 1000)), []);
  const api = useMemo(() => ({ endAt, start, cancel, add }), [endAt, start, cancel, add]);
  return <TimerContext.Provider value={api}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerApi {
  const api = useContext(TimerContext);
  if (!api) throw new Error('TimerProvider 안에서만 쓸 수 있습니다.');
  return api;
}

function notifyDone() {
  navigator.vibrate?.([300, 150, 300]);
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // 소리를 낼 수 없는 환경에서는 진동만 쓴다.
  }
}

export function RestTimerBar() {
  const { endAt, cancel, add } = useTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (endAt != null && now >= endAt) {
      notifyDone();
      cancel();
    }
  }, [now, endAt, cancel]);

  if (endAt == null) return null;
  return (
    <div className="timerbar" role="timer" aria-label="휴식 타이머">
      <span>휴식</span>
      <strong>{formatClock(remainingSeconds(endAt, now))}</strong>
      <span className="row">
        <button className="btn small" onClick={() => add(30)}>+30초</button>
        <button className="btn small" onClick={cancel}>건너뛰기</button>
      </span>
    </div>
  );
}
