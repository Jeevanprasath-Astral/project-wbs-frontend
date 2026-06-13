import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'

import LoginPage        from './pages/LoginPage'
import ProjectsPage     from './pages/ProjectsPage'
import ProjectSetup     from './pages/ProjectSetup'
import AppLayout        from './layouts/AppLayout'
import AdminDashboard   from './pages/admin/AdminDashboard'
import MilestonePage    from './pages/milestone/MilestonePage'
import TeamPage         from './pages/admin/TeamPage'
import TimelinePage     from './pages/admin/TimelinePage'
import NotificationsPage from './pages/admin/NotificationsPage'
import AuditPage        from './pages/admin/AuditPage'
import ExportPage       from './pages/ExportPage'
import AssignmentsPage  from './pages/admin/AssignmentsPage'

function RequireAuth({ children }) {
  const user = useAppStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const user = useAppStore((s) => s.user)
  return user?.role === 'Admin' ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<ProjectSetup />} />
          <Route path="projects/:id">
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<AdminDashboard />} />
            <Route path="milestone/:num" element={<MilestonePage />} />
            <Route path="team"          element={<RequireAdmin><TeamPage /></RequireAdmin>} />
            <Route path="timeline"      element={<RequireAdmin><TimelinePage /></RequireAdmin>} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit"         element={<RequireAdmin><AuditPage /></RequireAdmin>} />
            <Route path="export"        element={<ExportPage />} />
            <Route path="assignments"   element={<AssignmentsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
