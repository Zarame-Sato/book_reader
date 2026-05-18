import { Navigate, Route, Routes } from 'react-router-dom';
import LibraryRoute from './routes/LibraryRoute';
import ReaderRoute from './routes/ReaderRoute';
import SettingsRoute from './routes/SettingsRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryRoute />} />
      <Route path="/read/:fileId" element={<ReaderRoute />} />
      <Route path="/settings" element={<SettingsRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
