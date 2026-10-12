import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { BackupButton, backupAgeText, useBackupStatus } from './backup';

export function Banners() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const backup = useBackupStatus();
  // 홈에서는 "오늘 할 일"의 백업 줄이 같은 일을 한다.
  const { pathname } = useLocation();

  return (
    <>
      {needRefresh && (
        <div className="banner">
          <span>새 버전이 있어요.</span>
          <button className="btn small" onClick={() => updateServiceWorker(true)}>지금 갱신</button>
        </div>
      )}
      {backup?.due && pathname !== '/' && (
        <div className="banner">
          <span>{backupAgeText(backup)}. 폰을 잃어버리면 기록도 사라져요.</span>
          <BackupButton className="btn small" />
        </div>
      )}
    </>
  );
}
