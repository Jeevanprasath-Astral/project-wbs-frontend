import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
// All non-shell pages are code-split via React.lazy so their JS is only
// fetched when the route is first visited — keeps the initial bundle small.
// AppLayout and GlobalLayout are eagerly loaded because they are the shells
// that wrap everything and must be available before any route resolves.
import AppLayout          from './layouts/AppLayout'
import GlobalLayout       from './layouts/GlobalLayout'
// Auth pages are lazy too — LoginPage is 600 lines and includes animation
// code that authenticated users never need in their session bundle.
const LoginPage       = lazy(() => import('./pages/LoginPage'))
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword   = lazy(() => import('./pages/ResetPassword'))
const HomePage        = lazy(() => import('./pages/HomePage'))

const ProjectsPage          = lazy(() => import('./pages/ProjectsPage'))
const ProjectSetup          = lazy(() => import('./pages/ProjectSetup'))
const AdminDashboard        = lazy(() => import('./pages/admin/AdminDashboard'))
const MilestonePage         = lazy(() => import('./pages/milestone/MilestonePage'))
const TeamPage              = lazy(() => import('./pages/admin/TeamPage'))
const NotificationsPage     = lazy(() => import('./pages/admin/NotificationsPage'))
const AuditPage             = lazy(() => import('./pages/admin/AuditPage'))
const ExportPage            = lazy(() => import('./pages/ExportPage'))
const AssignmentsPage       = lazy(() => import('./pages/admin/AssignmentsPage'))
const CustomMilestonesPage  = lazy(() => import('./pages/milestone/CustomMilestonesPage'))
const WorkingHoursPage      = lazy(() => import('./pages/admin/WorkingHours'))
const CostManagementPage    = lazy(() => import('./pages/admin/CostManagementPage'))
const GlobalAssignments     = lazy(() => import('./pages/global/GlobalAssignments'))
const GlobalDeadlines       = lazy(() => import('./pages/global/GlobalDeadlines'))
const GlobalWorkload        = lazy(() => import('./pages/global/GlobalWorkload'))
const GlobalDashboard       = lazy(() => import('./pages/global/GlobalDashboard'))
const GlobalTeam            = lazy(() => import('./pages/global/GlobalTeam'))
const WorkHours             = lazy(() => import('./pages/global/WorkHours'))
const TimesheetCalendarPage   = lazy(() => import('./pages/global/TimesheetCalendarPage'))
const ProjectReportsPage      = lazy(() => import('./pages/global/ProjectReportsPage'))
const ProfitabilityReportPage = lazy(() => import('./pages/global/ProfitabilityReportPage'))
const FinancialSettingsPage   = lazy(() => import('./pages/global/FinancialSettingsPage'))
const TeamUtilizationPage     = lazy(() => import('./pages/global/TeamUtilizationPage'))
const CostBreakdownPage       = lazy(() => import('./pages/global/CostBreakdownPage'))
const BillingStatementPage    = lazy(() => import('./pages/global/BillingStatementPage'))
const AuditLogPage            = lazy(() => import('./pages/global/AuditLogPage'))

function ProtectedRoute({ children }) {
  const token = useAppStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-violet-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3 animate-float">⏳</div>
        <div className="text-sm font-medium">Loading...</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><ProjectSetup /></ProtectedRoute>} />

        {/* Global Hub */}
        <Route path="/global" element={<ProtectedRoute><GlobalLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/global/dashboard" replace />} />
          <Route path="dashboard"   element={<GlobalDashboard />} />
          <Route path="assignments" element={<GlobalAssignments />} />
          <Route path="deadlines"   element={<GlobalDeadlines />} />
          <Route path="workload"    element={<GlobalWorkload />} />
          <Route path="hours"       element={<WorkHours />} />
          <Route path="timesheet"   element={<TimesheetCalendarPage />} />
          <Route path="team"        element={<GlobalTeam />} />
          <Route path="reports"             element={<ProjectReportsPage />} />
          <Route path="profitability"       element={<ProfitabilityReportPage />} />
          <Route path="team-utilization"    element={<TeamUtilizationPage />} />
          <Route path="cost-breakdown"      element={<CostBreakdownPage />} />
          <Route path="billing-statement"   element={<BillingStatementPage />} />
          <Route path="financial-settings"  element={<FinancialSettingsPage />} />
          <Route path="audit-log"           element={<AuditLogPage />} />
        </Route>

        {/* Project-specific */}
        <Route path="/projects/:id" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"      element={<AdminDashboard />} />
          <Route path="milestone/:num" element={<MilestonePage />} />
          <Route path="milestones"     element={<Navigate to="milestone/1" replace />} />
          <Route path="team"           element={<TeamPage />} />
          <Route path="notifications"  element={<NotificationsPage />} />
          <Route path="audit"          element={<AuditPage />} />
          <Route path="export"         element={<ExportPage />} />
          <Route path="assignments"    element={<AssignmentsPage />} />
          <Route path="working-hours"  element={<WorkingHoursPage />} />
          <Route path="cost-management" element={<CostManagementPage />} />
          <Route path="configure-milestones" element={<CustomMilestonesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
