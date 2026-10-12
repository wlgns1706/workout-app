import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '운동 기록',
        short_name: '운동 기록',
        description: '개인 운동 프로그램 기록',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111317',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // notify-sw.js: 휴식 타이머 알림을 누르면 앱으로 돌아가게 한다.
      workbox: { globPatterns: ['**/*.{js,css,html,png}'], importScripts: ['notify-sw.js'] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
