import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatClock, remainingSeconds, timerCue, type TimerCue } from './timerMath';

interface TimerApi {
  endAt: number | null;
  total: number;
  start(seconds: number): void;
  cancel(): void;
  add(seconds: number): void;
}

const TimerContext = createContext<TimerApi | null>(null);

// 소리는 사용자가 버튼을 누른 순간에 만든 AudioContext로만 낼 수 있다(브라우저 자동 재생 제한).
let audio: AudioContext | null = null;
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

function beep(frequency: number, seconds: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = frequency;
  gain.gain.value = 0.25;
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + seconds);
}

function play(cue: TimerCue) {
  if (cue === 'warn') {
    beep(660, 0.15);
    navigator.vibrate?.(200);
  } else if (cue === 'tick') {
    beep(880, 0.08);
  } else {
    beep(988, 0.9);
    navigator.vibrate?.([400, 150, 400]);
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const start = useCallback((seconds: number) => {
    unlockAudio();
    setTotal(seconds);
    setEndAt(Date.now() + seconds * 1000);
  }, []);
  const cancel = useCallback(() => setEndAt(null), []);
  const add = useCallback((seconds: number) => {
    setTotal((t) => t + seconds);
    setEndAt((e) => (e == null ? null : e + seconds * 1000));
  }, []);
  const api = useMemo(() => ({ endAt, total, start, cancel, add }), [endAt, total, start, cancel, add]);
  return <TimerContext.Provider value={api}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerApi {
  const api = useContext(TimerContext);
  if (!api) throw new Error('TimerProvider 안에서만 쓸 수 있습니다.');
  return api;
}

export function RestTimerBar() {
  const { endAt, total, cancel, add } = useTimer();
  const [now, setNow] = useState(() => Date.now());
  const prev = useRef<number | null>(null);

  useEffect(() => {
    prev.current = null;
    if (endAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (endAt == null) return;
    const left = remainingSeconds(endAt, now);
    if (prev.current != null) {
      const cue = timerCue(prev.current, left, total);
      if (cue) play(cue);
    }
    prev.current = left;
    if (left <= 0) cancel();
  }, [now, endAt, total, cancel]);

  if (endAt == null) return null;
  const left = remainingSeconds(endAt, now);
  return (
    <div className={`timerbar ${left <= 5 ? 'urgent' : ''}`} role="timer" aria-label="휴식 타이머">
      <span>휴식</span>
      <strong>{formatClock(left)}</strong>
      <span className="row">
        <button className="btn small" onClick={() => add(30)}>+30초</button>
        <button className="btn small" onClick={cancel}>건너뛰기</button>
      </span>
    </div>
  );
}
