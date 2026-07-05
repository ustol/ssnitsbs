export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ---- Entity types ----

export interface Profile {
  id: string
  full_name: string | null
  surname: string | null
  first_name: string | null
  other_names: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: string | null
  created_at: string
  updated_at: string
}

export interface StatusLookup {
  id: string
  name: string
  color: string | null
  sort_order: number
}

export interface ExternalStakeholder {
  id: string
  name: string
  title: string | null
  organization: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InternalStakeholder {
  id: string
  name: string
  title: string | null
  department: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Partnership {
  id: string
  title: string
  organization: string | null
  description: string | null
  status_id: string | null
  status_date: string | null
  proposed_value: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PartnershipInternalStakeholder {
  partnership_id: string
  stakeholder_id: string
}

export interface PartnershipWithRelations extends Partnership {
  status: StatusLookup | null
  external_stakeholders?: { stakeholder: ExternalStakeholder }[]
  internal_stakeholders?: { stakeholder: InternalStakeholder }[]
  external_meetings?: ExternalMeeting[]
  internal_meetings?: InternalMeeting[]
}

export interface ExternalMeeting {
  id: string
  title: string
  partnership_id: string | null
  meeting_date: string | null
  location: string | null
  attendees_external: string | null
  agenda: string | null
  minutes: string | null
  action_points: string | null
  status_id: string | null
  status_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExternalMeetingWithRelations extends ExternalMeeting {
  partnership: Pick<Partnership, 'id' | 'title'> | null
  status: StatusLookup | null
  attachments?: MeetingAttachment[]
}

export interface InternalMeeting {
  id: string
  title: string
  partnership_id: string | null
  meeting_date: string | null
  location: string | null
  agenda: string | null
  minutes: string | null
  action_points: string | null
  status_id: string | null
  status_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InternalMeetingWithRelations extends InternalMeeting {
  partnership: Pick<Partnership, 'id' | 'title'> | null
  status: StatusLookup | null
  subjects?: InternalMeetingSubject[]
  attendees?: (MeetingAttendee & { profile: Pick<Profile, 'full_name' | 'email'> | null })[]
}

export interface DDGFeedback {
  id: string
  feedback_type: string
  partnership_id: string | null
  meeting_id: string | null
  meeting_type: 'external' | 'internal' | null
  stakeholder_id: string | null
  received_date: string | null
  summary: string
  details: string | null
  action_taken: string | null
  is_actioned: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DDGFeedbackWithRelations extends DDGFeedback {
  partnership: Pick<Partnership, 'id' | 'title'> | null
  stakeholder: Pick<ExternalStakeholder, 'id' | 'name' | 'organization'> | null
}

export interface Document {
  id: string
  title: string
  partnership_id: string | null
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface SystemSetting {
  key: string
  value: string
  updated_at: string
}

export interface PartnershipExternalStakeholder {
  partnership_id: string
  stakeholder_id: string
}

export interface InternalMeetingSubject {
  id: string
  meeting_id: string
  subject: string
  outcome: string | null
}

export interface MeetingAttendee {
  id: string
  meeting_id: string
  meeting_type: 'external' | 'internal'
  profile_id: string | null
  name: string | null
  created_at: string
}

export interface MeetingAttachment {
  id: string
  meeting_id: string
  meeting_type: 'external' | 'internal'
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  file_type: 'image' | 'audio' | 'document'
  is_display_picture: boolean
  uploaded_by: string | null
  created_at: string
}

export interface MeetingAttachmentWithUrl extends MeetingAttachment {
  url: string
}

export interface StatusHistory {
  id: string
  entity_type: 'partnership' | 'external_meeting' | 'internal_meeting'
  entity_id: string
  from_status_id: string | null
  to_status_id: string | null
  status_date: string | null
  changed_by: string | null
  created_at: string
}

export interface StatusHistoryWithRelations extends StatusHistory {
  from_status: Pick<StatusLookup, 'id' | 'name' | 'color'> | null
  to_status: Pick<StatusLookup, 'id' | 'name' | 'color'> | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  changes: Json | null
  created_at: string
}

// ============================================================
// TELEHEALTH MODULE TYPES
// ============================================================

export interface TelehealthEntry {
  id: string
  entry_id: string | null
  reporting_period: string
  weekly_cycle: string
  date_of_interaction: string
  cro_name: string
  patient_full_name: string
  telephone_number: string | null
  alternative_contact_number: string | null
  email_address: string | null
  physical_location: string | null
  region: string
  engagement_type: string
  digital_channel_used: string | null
  feedback_category: string
  positive_feedback: string | null
  complaint: string | null
  suggestion: string | null
  detailed_feedback_narrative: string | null
  successful_contact: string | null
  issue_resolved: string | null
  escalation_required: string | null
  key_observation: string | null
  root_cause: string | null
  emerging_trend: string | null
  recommendation: string | null
  priority_level: string | null
  responsible_unit: string | null
  status: string
  quarter: string | null
  duplicate_flag: string | null
  contact_missing: string | null
  phone_check: string | null
  recommendation_sort_key: number | null
  observation_sort_key: number | null
  risk_sort_key: number | null
  opportunity_sort_key: number | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TeleRefItem {
  id: string
  value: string
  sort_order: number
}

export interface TelehealthFilters {
  reporting_period?: string
  weekly_cycle?: string
  region?: string
  status?: string
  feedback_category?: string
  priority_level?: string
  responsible_unit?: string
  quarter?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface WeeklySummaryStats {
  total_patients: number
  total_followups: number
  total_feedback: number
  total_complaints: number
  issues_resolved: number
  positive_count: number
  complaint_count: number
  suggestion_count: number
  neutral_count: number
  top_observations: TelehealthEntry[]
  top_recommendations: TelehealthEntry[]
}

export interface MonthlyTotals {
  month: string
  month_num: number
  total_patients: number
  total_followups: number
  total_feedback: number
  total_complaints: number
  issues_resolved: number
  escalations: number
}

export interface MonthlyConsolidationData {
  months: MonthlyTotals[]
  year_total: MonthlyTotals
  top_observations: TelehealthEntry[]
  top_recommendations: TelehealthEntry[]
  top_risks: TelehealthEntry[]
  top_opportunities: TelehealthEntry[]
}

export interface QuarterTotals {
  quarter: string
  months: string[]
  total_patients: number
  total_followups: number
  total_feedback: number
  total_complaints: number
  issues_resolved: number
  escalations: number
}

export interface QuarterlyConsolidationData {
  quarters: QuarterTotals[]
  year_total: MonthlyTotals
  busiest_month: string
  busiest_quarter: string
  months_with_activity: number
  emerging_trends: TelehealthEntry[]
  top_risks: TelehealthEntry[]
  top_recommendations: TelehealthEntry[]
}

export interface DashboardMetrics {
  total_patients: number
  total_followups: number
  total_complaints: number
  issues_resolved: number
  open_issues: number
  closed_issues: number
  monthly_trend: { month: string; patients: number; followups: number; complaints: number }[]
  by_engagement_type: { name: string; value: number }[]
  by_feedback_category: { name: string; value: number }[]
  by_region: { region: string; count: number }[]
  top_observations: TelehealthEntry[]
  top_risks: TelehealthEntry[]
  top_recommendations: TelehealthEntry[]
  top_opportunities: TelehealthEntry[]
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      status_lookup: {
        Row: StatusLookup
        Insert: Omit<StatusLookup, 'id'>
        Update: Partial<Omit<StatusLookup, 'id'>>
      }
      external_stakeholders: {
        Row: ExternalStakeholder
        Insert: Omit<ExternalStakeholder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ExternalStakeholder, 'id'>>
      }
      internal_stakeholders: {
        Row: InternalStakeholder
        Insert: Omit<InternalStakeholder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InternalStakeholder, 'id'>>
      }
      partnerships: {
        Row: Partnership
        Insert: Omit<Partnership, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Partnership, 'id'>>
      }
      partnership_external_stakeholders: {
        Row: PartnershipExternalStakeholder
        Insert: PartnershipExternalStakeholder
        Update: PartnershipExternalStakeholder
      }
      external_meetings: {
        Row: ExternalMeeting
        Insert: Omit<ExternalMeeting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ExternalMeeting, 'id'>>
      }
      internal_meetings: {
        Row: InternalMeeting
        Insert: Omit<InternalMeeting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InternalMeeting, 'id'>>
      }
      internal_meeting_subjects: {
        Row: InternalMeetingSubject
        Insert: Omit<InternalMeetingSubject, 'id'>
        Update: Partial<Omit<InternalMeetingSubject, 'id'>>
      }
      meeting_attendees: {
        Row: MeetingAttendee
        Insert: Omit<MeetingAttendee, 'id' | 'created_at'>
        Update: Partial<Omit<MeetingAttendee, 'id'>>
      }
      meeting_attachments: {
        Row: MeetingAttachment
        Insert: Omit<MeetingAttachment, 'id' | 'created_at'>
        Update: Partial<Omit<MeetingAttachment, 'id'>>
      }
      ddg_feedback: {
        Row: DDGFeedback
        Insert: Omit<DDGFeedback, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DDGFeedback, 'id'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Document, 'id'>>
      }
      system_settings: {
        Row: SystemSetting
        Insert: SystemSetting
        Update: Partial<SystemSetting>
      }
      audit_log: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
      status_history: {
        Row: StatusHistory
        Insert: Omit<StatusHistory, 'id' | 'created_at'>
        Update: never
      }
    }
  }
}
