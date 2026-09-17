import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
import ErrorBoundary from './components/common/ErrorBoundary'
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
const BillingStatementPage         = lazy(() => import('./pages/global/BillingStatementPage'))
const MonthlyBillingTrackerPage    = lazy(() => import('./pages/global/MonthlyBillingTrackerPage'))
const BillingStatusReportPage      = lazy(() => import('./pages/global/BillingStatusReportPage'))
const AuditLogPage                 = lazy(() => import('./pages/global/AuditLogPage'))
const ProposalEstimatesPage        = lazy(() => import('./pages/global/ProposalEstimatesPage'))
const ProposalEstimateDetailPage   = lazy(() => import('./pages/global/ProposalEstimateDetailPage'))
// Demo entry — public route (no login required)
const DemoEntry = lazy(() => import('./pages/DemoEntry'))

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
        {/* Public demo entry — no token required */}
        <Route path="/demo"            element={<DemoEntry />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><ProjectSetup /></ProtectedRoute>} />

        {/* Global Hub */}
        <Route path="/global" element={<ProtectedRoute><GlobalLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/global/dashboard" replace />} />
          <Route path="dashboard"   element={<ErrorBoundary><GlobalDashboard /></ErrorBoundary>} />
          <Route path="assignments" element={<ErrorBoundary><GlobalAssignments /></ErrorBoundary>} />
          <Route path="deadlines"   element={<ErrorBoundary><GlobalDeadlines /></ErrorBoundary>} />
          <Route path="workload"    element={<ErrorBoundary><GlobalWorkload /></ErrorBoundary>} />
          <Route path="hours"       element={<ErrorBoundary><WorkHours /></ErrorBoundary>} />
          <Route path="timesheet"   element={<ErrorBoundary><TimesheetCalendarPage /></ErrorBoundary>} />
          <Route path="team"        element={<ErrorBoundary><GlobalTeam /></ErrorBoundary>} />
          <Route path="reports"             element={<ErrorBoundary><ProjectReportsPage /></ErrorBoundary>} />
          <Route path="profitability"       element={<ErrorBoundary><ProfitabilityReportPage /></ErrorBoundary>} />
          <Route path="team-utilization"    element={<ErrorBoundary><TeamUtilizationPage /></ErrorBoundary>} />
          <Route path="cost-breakdown"      element={<ErrorBoundary><CostBreakdownPage /></ErrorBoundary>} />
          <Route path="billing-statement"        element={<ErrorBoundary><BillingStatementPage /></ErrorBoundary>} />
          <Route path="monthly-billing-tracker"  element={<ErrorBoundary><MonthlyBillingTrackerPage /></ErrorBoundary>} />
          <Route path="billing-status"           element={<ErrorBoundary><BillingStatusReportPage /></ErrorBoundary>} />
          <Route path="financial-settings"       element={<ErrorBoundary><FinancialSettingsPage /></ErrorBoundary>} />
          <Route path="audit-log"           element={<ErrorBoundary><AuditLogPage /></ErrorBoundary>} />
          <Route path="proposal-estimates"           element={<ErrorBoundary><ProposalEstimatesPage /></ErrorBoundary>} />
          <Route path="proposal-estimates/:id"       element={<ErrorBoundary><ProposalEstimateDetailPage /></ErrorBoundary>} />
        </Route>

        {/* Project-specific */}
        <Route path="/projects/:id" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"      element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
          <Route path="milestone/:num" element={<ErrorBoundary><MilestonePage /></ErrorBoundary>} />
          <Route path="milestones"     element={<Navigate to="milestone/1" replace />} />
          <Route path="team"           element={<ErrorBoundary><TeamPage /></ErrorBoundary>} />
          <Route path="notifications"  element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
          <Route path="audit"          element={<ErrorBoundary><AuditPage /></ErrorBoundary>} />
          <Route path="export"         element={<ErrorBoundary><ExportPage /></ErrorBoundary>} />
          <Route path="assignments"    element={<ErrorBoundary><AssignmentsPage /></ErrorBoundary>} />
          <Route path="working-hours"  element={<ErrorBoundary><WorkingHoursPage /></ErrorBoundary>} />
          <Route path="cost-management" element={<ErrorBoundary><CostManagementPage /></ErrorBoundary>} />
          <Route path="configure-milestones" element={<ErrorBoundary><CustomMilestonesPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
