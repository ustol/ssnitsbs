export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ---- Entity types ----

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
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
  proposed_value: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PartnershipWithRelations extends Partnership {
  status: StatusLookup | null
  external_stakeholders?: { stakeholder: ExternalStakeholder }[]
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
  uploaded_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  details: Json | null
  created_at: string
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
    }
  }
}
