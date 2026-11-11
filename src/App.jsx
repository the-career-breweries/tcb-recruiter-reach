import { Routes, Route, Navigate } from 'react-router-dom';
import HunterPage from './pages/HunterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HunterPage />} />
      <Route path="/founder" element={<HunterPage />} />
      <Route path="/mindler-user-:code" element={<HunterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
