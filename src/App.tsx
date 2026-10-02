import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import BodyPage from './features/body/BodyPage';
import DietPage from './features/diet/DietPage';
import GuidePage from './features/guide/GuidePage';
import StatsPage from './features/stats/StatsPage';
import SchedulePage from './features/schedule/SchedulePage';
import SettingsPage from './features/settings/SettingsPage';
import HomePage from './features/home/HomePage';
import WorkoutPage from './features/workout/WorkoutPage';
import { Banners } from './ui/Banners';
import { RestTimerBar, TimerProvider } from './ui/timer';

const tabs = [
  { to: '/', label: '홈' },
  { to: '/diet', label: '식단' },
  { to: '/body', label: '몸 상태' },
  { to: '/stats', label: '기록' },
  { to: '/settings', label: '설정' },
];

export default function App() {
  return (
    <HashRouter>
      <TimerProvider>
        <Banners />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout/:planWeek/:dayNo" element={<WorkoutPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/guide" element={<GuidePage />} />
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
