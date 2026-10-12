import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import BodyPage from './features/body/BodyPage';
import DietPage from './features/diet/DietPage';
import GuidePage from './features/guide/GuidePage';
import StatsPage from './features/stats/StatsPage';
import SchedulePage from './features/schedule/SchedulePage';
import SettingsPage from './features/settings/SettingsPage';
import HomePage from './features/home/HomePage';
import WorkoutHome from './features/workout/WorkoutHome';
import WorkoutPage from './features/workout/WorkoutPage';
import { Banners } from './ui/Banners';
import { RestTimerBar, TimerProvider } from './ui/timer';

// 설정은 홈 오른쪽 위 버튼으로 들어간다.
const tabs = [
  { to: '/', label: '홈', match: ['/'] },
  { to: '/workout', label: '운동', match: ['/workout', '/schedule'] },
  { to: '/diet', label: '식단', match: ['/diet'] },
  { to: '/body', label: '몸 상태', match: ['/body'] },
  { to: '/stats', label: '기록', match: ['/stats'] },
];

function TabBar() {
  const { pathname } = useLocation();
  const isActive = (match: string[]) => match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)));
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} className={isActive(t.match) ? 'active' : ''} aria-current={isActive(t.match) ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <TimerProvider>
        <Banners />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutHome />} />
          <Route path="/workout/:planWeek/:dayNo" element={<WorkoutPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <RestTimerBar />
        <TabBar />
      </TimerProvider>
    </HashRouter>
  );
}
