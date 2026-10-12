import type { RestNotice } from './timerMath';

// 다른 앱을 쓰는 동안 휴식 타이머를 폰 알림창에 띄운다.
const PREF_KEY = 'restNotify'; // 'on' | 'off'. 없으면 아직 묻지 않았다
const TAG = 'rest-timer';

export const notifySupported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

export function notifyPref(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function savePref(v: 'on' | 'off') {
  try {
    localStorage.setItem(PREF_KEY, v);
  } catch {
    // 저장하지 못해도 이번에는 동작한다.
  }
}

export const notifyEnabled = () => notifySupported() && notifyPref() === 'on' && Notification.permission === 'granted';

/** 버튼을 누른 순간에 불러야 한다. 허용되면 true */
export async function enableNotify(): Promise<boolean> {
  if (!notifySupported()) return false;
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  const ok = permission === 'granted';
  savePref(ok ? 'on' : 'off');
  return ok;
}

export function disableNotify() {
  savePref('off');
  void closeRestNotice();
}

export async function showRestNotice(notice: RestNotice, endAt: number) {
  if (!notifyEnabled()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // vibrate, renotify, timestamp는 TypeScript 기본 타입에 없어서 넓혀서 넘긴다.
    const options: NotificationOptions & Record<string, unknown> = {
      tag: TAG,
      body: notice.body,
      icon: 'icon-192.png',
      silent: notice.silent,
      renotify: !notice.silent,
      timestamp: endAt,
      ...(notice.vibrate ? { vibrate: notice.vibrate } : {}),
    };
    await reg.showNotification(notice.title, options);
  } catch {
    // 알림을 못 띄워도 앱 안의 타이머는 그대로 돈다.
  }
}

export async function closeRestNotice() {
  if (!notifySupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    for (const n of (await reg?.getNotifications({ tag: TAG })) ?? []) n.close();
  } catch {
    // 닫지 못해도 다음 알림이 같은 자리를 덮어쓴다.
  }
}
