// 서비스 워커에 붙는 스크립트. 휴식 타이머 알림을 누르면 열려 있는 앱으로 돌아간다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.length > 0) return windows[0].focus();
      return self.clients.openWindow(self.registration.scope);
    })(),
  );
});
