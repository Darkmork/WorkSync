import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { PollsPage } from "./pages/PollsPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SessionDetailPage } from "./pages/SessionDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/horario" element={<SchedulePage />} />
          <Route path="/grupos" element={<GroupsPage />} />
          <Route path="/recomendaciones" element={<RecommendationsPage />} />
          <Route path="/votaciones" element={<PollsPage />} />
          <Route path="/sesiones/:sessionId" element={<SessionDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
