import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatClock, remainingSeconds, restNotice, timerCue, type TimerCue } from './timerMath';
import { closeRestNotice, disableNotify, enableNotify, notifyPref, notifySupported, showRestNotice } from './timerNotify';

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
  // 알림을 아직 묻지 않았으면 타이머 아래에 한 번 묻는다.
  const [askNotify, setAskNotify] = useState(() => notifySupported() && notifyPref() == null);

  // 다른 앱으로 넘어가면 알림창에 남은 시간을 띄우고, 앱으로 돌아오면 지운다.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) void closeRestNotice();
      else if (endAt != null) void showRestNotice(restNotice(remainingSeconds(endAt, Date.now()), endAt, null), endAt);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [endAt]);

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
      // 다른 앱을 쓰는 중이면 알림창도 고친다. 평소에는 5초마다 소리 없이, 30초 전과 끝은 진동과 함께.
      if (document.hidden && left !== prev.current && (cue === 'warn' || cue === 'end' || left % 5 === 0)) {
        void showRestNotice(restNotice(left, endAt, cue), endAt);
      }
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
      {askNotify && (
        <div className="timerask">
          <span>다른 앱에서도 알림으로 볼까요?</span>
          <span className="row">
            <button className="btn small" onClick={async () => { await enableNotify(); setAskNotify(false); }}>알림 켜기</button>
            <button className="btn small" onClick={() => { disableNotify(); setAskNotify(false); }}>괜찮아요</button>
          </span>
        </div>
      )}
    </div>
  );
}
