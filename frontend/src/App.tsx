import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AgentListPage from './pages/AgentListPage';
import AgentDetailPage from './pages/AgentDetailPage';
import UploadPage from './pages/UploadPage';
import ContextGeneratePage from './pages/ContextGeneratePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/agents" replace />} />
          <Route path="/agents" element={<AgentListPage />} />
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/context-pipeline" element={<ContextGeneratePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}