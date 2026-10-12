import { useState } from 'react';
import { disableNotify, enableNotify, notifyEnabled, notifySupported } from '../../ui/timerNotify';

/** 다른 앱을 쓰는 동안 휴식 타이머를 알림창에 띄울지 */
export function RestNotifySetting() {
  const [on, setOn] = useState(notifyEnabled);
  const [blocked, setBlocked] = useState(() => notifySupported() && Notification.permission === 'denied');
  if (!notifySupported()) return <p className="muted">이 브라우저는 알림을 지원하지 않습니다.</p>;

  async function change(checked: boolean) {
    if (!checked) {
      disableNotify();
      setOn(false);
      return;
    }
    const ok = await enableNotify();
    setOn(ok);
    setBlocked(!ok && Notification.permission === 'denied');
  }

  return (
    <>
      <label className="row">
        <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} />
        <span>다른 앱을 쓸 때도 알림창에서 휴식 시간 보기</span>
      </label>
      <p className="muted">남은 시간과 끝나는 시각이 5초마다 바뀌고, 30초 전과 끝날 때 진동이 울립니다. 알림을 누르면 앱으로 돌아옵니다.</p>
      {blocked && (
        <div className="error">
          폰에서 이 앱의 알림이 막혀 있습니다. 폰 설정 → 애플리케이션 → Chrome(또는 운동 기록) → 알림을 켠 뒤 다시 체크하세요.
        </div>
      )}
    </>
  );
}
