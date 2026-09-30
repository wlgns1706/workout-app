import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from '../db/db';
import { earliestRecordAt, getMeta, META_LAST_BACKUP } from '../db/repo';
import { shouldRemindBackup } from '../domain/backupReminder';

export function Banners() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const remind = useLiveQuery(async () => {
    const [last, earliest] = await Promise.all([getMeta(db, META_LAST_BACKUP), earliestRecordAt(db)]);
    return shouldRemindBackup(last, earliest, new Date());
  }, []);

  return (
    <>
      {needRefresh && (
        <div className="banner">
          <span>새 버전이 있어요.</span>
          <button className="btn small" onClick={() => updateServiceWorker(true)}>지금 갱신</button>
        </div>
      )}
      {remind && (
        <div className="banner">
          <span>백업한 지 7일이 지났어요.</span>
          <Link className="btn small" to="/settings">백업하기</Link>
        </div>
      )}
    </>
  );
}
