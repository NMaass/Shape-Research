import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import DrawPage from './pages/DrawPage';
import AboutPage from './pages/AboutPage';
import StatsPage from './pages/StatsPage';
import MyShapesPage from './pages/MyShapesPage';

export default function App() {
  return (
    <div style={{
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      padding: '0 24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Nav />
      <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/my-shapes" element={<MyShapesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
