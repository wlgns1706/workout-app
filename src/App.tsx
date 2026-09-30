import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import BodyPage from './features/body/BodyPage';
import SchedulePage from './features/schedule/SchedulePage';
import SettingsPage from './features/settings/SettingsPage';
import TodayPage from './features/today/TodayPage';
import WorkoutPage from './features/workout/WorkoutPage';
import { Banners } from './ui/Banners';
import { RestTimerBar, TimerProvider } from './ui/timer';

const tabs = [
  { to: '/', label: '오늘' },
  { to: '/schedule', label: '일정' },
  { to: '/body', label: '몸 상태' },
  { to: '/settings', label: '설정' },
];

export default function App() {
  return (
    <HashRouter>
      <TimerProvider>
        <Banners />
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/workout/:planWeek/:dayNo" element={<WorkoutPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <RestTimerBar />
        <nav className="tabbar">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </TimerProvider>
    </HashRouter>
  );
}
