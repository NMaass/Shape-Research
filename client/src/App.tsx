import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import DrawPage from './pages/DrawPage';
import AboutPage from './pages/AboutPage';
import StatsPage from './pages/StatsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MyShapesPage from './pages/MyShapesPage';

export default function App() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, position: 'relative' }}>
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/my-shapes" element={<MyShapesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
