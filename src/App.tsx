import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import { Login } from '@/pages/auth/Login'
import { Dashboard } from '@/pages/Dashboard'
import { PartnershipList } from '@/pages/partnerships/PartnershipList'
import { PartnershipForm } from '@/pages/partnerships/PartnershipForm'
import { PartnershipView } from '@/pages/partnerships/PartnershipView'
import { ExternalMeetingList } from '@/pages/meetings/ExternalMeetingList'
import { ExternalMeetingForm } from '@/pages/meetings/ExternalMeetingForm'
import { ExternalMeetingView } from '@/pages/meetings/ExternalMeetingView'
import { InternalMeetingList } from '@/pages/meetings/InternalMeetingList'
import { InternalMeetingForm } from '@/pages/meetings/InternalMeetingForm'
import { InternalMeetingView } from '@/pages/meetings/InternalMeetingView'
import { ExternalStakeholders } from '@/pages/stakeholders/ExternalStakeholders'
import { InternalStakeholders } from '@/pages/stakeholders/InternalStakeholders'
import { DDGFeedbackList } from '@/pages/feedback/DDGFeedbackList'
import { DDGFeedbackForm } from '@/pages/feedback/DDGFeedbackForm'
import { DDGFeedbackView } from '@/pages/feedback/DDGFeedbackView'
import { DocumentLibrary } from '@/pages/documents/DocumentLibrary'
import { Reports } from '@/pages/reports/Reports'
import { ExternalStakeholderReport } from '@/pages/reports/ExternalStakeholderReport'
import { InternalStakeholderReport } from '@/pages/reports/InternalStakeholderReport'
import { UserPerformanceReport } from '@/pages/reports/UserPerformanceReport'
import { ExecutiveOverviewReport } from '@/pages/reports/ExecutiveOverviewReport'
import { PipelineReport } from '@/pages/reports/PipelineReport'
import { MeetingAnalyticsReport } from '@/pages/reports/MeetingAnalyticsReport'
import { DDGIntelligenceReport } from '@/pages/reports/DDGIntelligenceReport'
import { StatusTimeReport } from '@/pages/reports/StatusTimeReport'
import { Settings } from '@/pages/settings/Settings'
import { UserList } from '@/pages/users/UserList'
import { Profile } from '@/pages/users/Profile'
import { StatusTracker } from '@/pages/status/StatusTracker'
import { PerformanceTracker } from '@/pages/partnerships/PerformanceTracker'
import { AuditLog } from '@/pages/audit/AuditLog'
import { DataWarehouse } from '@/pages/datawarehouse/DataWarehouse'
import { Colocation } from '@/pages/colocation/Colocation'
import { VirtualBranch } from '@/pages/virtualbranch/VirtualBranch'
import { ActionPointTracker } from '@/pages/meetings/ActionPointTracker'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f4f4f5]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">S</div>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Partnerships */}
          <Route path="partnerships" element={<PartnershipList />} />
          <Route path="partnerships/new" element={<PartnershipForm />} />
          <Route path="partnerships/:id" element={<PartnershipView />} />
          <Route path="partnerships/:id/edit" element={<PartnershipForm />} />
          {/* External Meetings */}
          <Route path="meetings/external" element={<ExternalMeetingList />} />
          <Route path="meetings/external/new" element={<ExternalMeetingForm />} />
          <Route path="meetings/external/:id" element={<ExternalMeetingView />} />
          <Route path="meetings/external/:id/edit" element={<ExternalMeetingForm />} />
          {/* Internal Meetings */}
          <Route path="meetings/internal" element={<InternalMeetingList />} />
          <Route path="meetings/internal/new" element={<InternalMeetingForm />} />
          <Route path="meetings/internal/:id" element={<InternalMeetingView />} />
          <Route path="meetings/internal/:id/edit" element={<InternalMeetingForm />} />
          {/* Action Point Tracker */}
          <Route path="action-points" element={<ActionPointTracker />} />
          {/* Stakeholders */}
          <Route path="stakeholders/external" element={<ExternalStakeholders />} />
          <Route path="stakeholders/internal" element={<InternalStakeholders />} />
          {/* DDG Feedback */}
          <Route path="feedback/ddg" element={<DDGFeedbackList />} />
          <Route path="feedback/ddg/new" element={<DDGFeedbackForm />} />
          <Route path="feedback/ddg/:id" element={<DDGFeedbackView />} />
          <Route path="feedback/ddg/:id/edit" element={<DDGFeedbackForm />} />
          {/* Documents */}
          <Route path="documents" element={<DocumentLibrary />} />
          {/* Status Tracker */}
          <Route path="status-tracker" element={<StatusTracker />} />
          {/* Performance Tracker */}
          <Route path="performance-tracker" element={<PerformanceTracker />} />
          {/* Reports */}
          <Route path="reports" element={<Reports />} />
          <Route path="reports/external-stakeholder" element={<ExternalStakeholderReport />} />
          <Route path="reports/internal-stakeholder" element={<InternalStakeholderReport />} />
          <Route path="reports/user-performance" element={<UserPerformanceReport />} />
          <Route path="reports/executive" element={<ExecutiveOverviewReport />} />
          <Route path="reports/pipeline" element={<PipelineReport />} />
          <Route path="reports/meeting-analytics" element={<MeetingAnalyticsReport />} />
          <Route path="reports/ddg-intelligence" element={<DDGIntelligenceReport />} />
          <Route path="reports/status-time" element={<StatusTimeReport />} />
          {/* Data Warehouse */}
          <Route path="data-warehouse" element={<DataWarehouse />} />
          {/* Colocation */}
          <Route path="colocation" element={<Colocation />} />
          {/* Virtual Branch */}
          <Route path="virtual-branch" element={<VirtualBranch />} />
          {/* Audit Trail */}
          <Route path="audit" element={<AuditLog />} />
          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          {/* Users */}
          <Route path="users" element={<UserList />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
