# Telehealth Reporting System — System Design Document

**System:** SSNIT–Trust Hospital Telemedicine Reporting Platform  
**Version:** 1.0  
**Date:** July 2026  

---

## 1. Architecture Overview

The application is a React SPA integrated as a module within the existing SSNIT SBS (Strategic Business Support) system. It shares the same Supabase PostgreSQL backend, authentication stack, and UI component library.

```
React (Vite + TypeScript)
  ├── Auth: Supabase Auth (JWT-based)
  ├── State: TanStack React Query
  ├── UI: shadcn/ui + Tailwind CSS
  ├── Charts: Recharts
  ├── Forms: React Hook Form + Zod
  └── Export: jsPDF + xlsx
      │
      ▼
Supabase (PostgreSQL)
  ├── telehealth_entries (main data table)
  ├── Reference tables (engagement_types, regions, etc.)
  ├── Row Level Security policies
  └── Triggers (entry_id sequence, computed fields)
```

---

## 2. Database Schema

### 2.1 Core Table: `telehealth_entries`

```sql
telehealth_entries (
  id                          uuid PK
  entry_id                    text UNIQUE   -- TTH-0001 format (trigger-generated)
  reporting_period            text NOT NULL -- Jan 2026, Feb 2026, etc.
  weekly_cycle                text NOT NULL -- Week 1 ... Week 5
  date_of_interaction         date NOT NULL
  cro_name                    text NOT NULL
  patient_full_name           text NOT NULL
  telephone_number            text
  alternative_contact_number  text
  email_address               text
  physical_location           text
  region                      text NOT NULL
  engagement_type             text NOT NULL
  digital_channel_used        text
  feedback_category           text NOT NULL
  -- computed
  positive_feedback           text          -- Yes/No (trigger)
  complaint                   text          -- Yes/No (trigger)
  suggestion                  text          -- Yes/No (trigger)
  detailed_feedback_narrative text
  successful_contact          text          -- Yes/No
  issue_resolved              text          -- Yes/No
  escalation_required         text          -- Yes/No
  key_observation             text
  root_cause                  text
  emerging_trend              text
  recommendation              text
  priority_level              text
  responsible_unit            text
  status                      text NOT NULL DEFAULT 'Open'
  -- computed
  quarter                     text          -- Q1/Q2/Q3/Q4 (trigger)
  duplicate_flag              text          -- DUPLICATE (trigger)
  contact_missing             text          -- MISSING CONTACT (trigger)
  phone_check                 text          -- CHECK NUMBER (trigger)
  recommendation_sort_key     integer       -- 0–3 (trigger)
  observation_sort_key        integer       -- 0/1 (trigger)
  risk_sort_key               integer       -- 0/1 (trigger)
  opportunity_sort_key        integer       -- 0/1 (trigger)
  created_by                  uuid FK → profiles(id)
  updated_by                  uuid FK → profiles(id)
  created_at                  timestamptz
  updated_at                  timestamptz
)
```

### 2.2 Reference Tables

| Table | Purpose |
|---|---|
| `tele_reporting_periods` | Jan 2026 – Dec 2026 |
| `tele_weekly_cycles` | Week 1 – Week 5 |
| `tele_engagement_types` | 8 engagement types |
| `tele_digital_channels` | Phone Call, SMS |
| `tele_feedback_categories` | Positive, Complaint, Suggestion, Neutral |
| `tele_priority_levels` | High, Medium, Low |
| `tele_statuses` | Open, In Progress, Closed |
| `tele_regions` | 15 Ghana regions |
| `tele_responsible_units` | 7 responsible units |

All reference tables follow: `id uuid PK, value text UNIQUE NOT NULL, sort_order int`.

### 2.3 Database Triggers

**Trigger: `set_telehealth_entry_id`** (BEFORE INSERT)
- Generates `entry_id` as `TTH-` + zero-padded sequence number.
- Uses a dedicated PostgreSQL sequence `telehealth_entry_seq`.

**Trigger: `compute_telehealth_fields`** (BEFORE INSERT OR UPDATE)
- Derives `quarter` from month of `date_of_interaction`.
- Derives `positive_feedback`, `complaint`, `suggestion` from `feedback_category`.
- Derives `contact_missing` when all three contact fields are empty.
- Derives `phone_check` when cleaned phone < 10 digits.
- Derives `duplicate_flag` by checking existing records.
- Computes `recommendation_sort_key` (High=3, Medium=2, Low=1, else 0).
- Computes `risk_sort_key` (1 if escalation=Yes or priority=High).
- Computes `opportunity_sort_key` (1 if suggestion=Yes or emerging_trend not null).
- Computes `observation_sort_key` (1 if key_observation not null).

### 2.4 Row Level Security

| Table | Authenticated Users |
|---|---|
| `telehealth_entries` | Full access (RLS delegates role logic to application layer) |
| Reference tables | Read-only for all; write for admin roles only |

---

## 3. Application Architecture

### 3.1 Route Structure

```
/telehealth                          → TelehealthList (entry list)
/telehealth/new                      → TelehealthDataEntry (create)
/telehealth/:id/edit                 → TelehealthDataEntry (edit)
/telehealth/weekly-summary           → WeeklySummary
/telehealth/monthly-consolidation    → MonthlyConsolidation
/telehealth/quarterly-consolidation  → QuarterlyConsolidation
/telehealth/dashboard                → TelehealthDashboard (executive)
/telehealth/export                   → TelehealthExport
/telehealth/config                   → TelehealthConfig
```

### 3.2 Component Hierarchy

```
App.tsx
└── Layout
    ├── Sidebar (Telehealth section added)
    └── Pages:
        ├── TelehealthList
        ├── TelehealthDataEntry (multi-section form)
        │   ├── Section 1: Reporting Period + CRO
        │   ├── Section 2: Patient Details
        │   ├── Section 3: Contact Information
        │   ├── Section 4: Engagement Details
        │   ├── Section 5: Feedback
        │   ├── Section 6: Outcomes
        │   └── Section 7: Observations & Recommendations
        ├── WeeklySummary
        ├── MonthlyConsolidation
        ├── QuarterlyConsolidation
        ├── TelehealthDashboard
        ├── TelehealthExport
        └── TelehealthConfig
```

### 3.3 Data Layer

All data operations use TanStack React Query with `supabase-js` client calls in `src/hooks/useTelehealth.ts`:

| Hook | Purpose |
|---|---|
| `useTelehealthEntries(filters)` | Paginated entry list with filtering |
| `useTelehealthEntry(id)` | Single entry by ID |
| `useWeeklySummary(period, cycle)` | Aggregated weekly stats |
| `useMonthlyConsolidation(year)` | Monthly aggregation Jan–Dec |
| `useQuarterlyConsolidation(year)` | Quarterly aggregation |
| `useTelehealthDashboard()` | Full executive dashboard metrics |
| `useTelehealthConfig()` | Reference lists for dropdowns |

### 3.4 Formula Logic (Application Layer)

The following logic is implemented in the Supabase trigger but also referenced in the application for display and validation:

```typescript
// Quarter calculation
function getQuarter(date: Date): string {
  const month = date.getMonth() + 1
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

// Derived flags
const positive_feedback = feedback_category === 'Positive' ? 'Yes' : 'No'
const complaint = feedback_category === 'Complaint' ? 'Yes' : 'No'
const suggestion = feedback_category === 'Suggestion' ? 'Yes' : 'No'

// Contact missing check
const contact_missing =
  !telephone && !alternative_contact && !email
    ? 'MISSING CONTACT' : null

// Phone validation
const cleaned = telephone?.replace(/\D/g, '') ?? ''
const phone_check = cleaned.length > 0 && cleaned.length < 10
  ? 'CHECK NUMBER' : null

// Sort keys
const recommendation_sort_key =
  priority === 'High' ? 3 : priority === 'Medium' ? 2 : priority === 'Low' ? 1 : 0

const risk_sort_key =
  escalation_required === 'Yes' || priority === 'High' ? 1 : 0

const opportunity_sort_key =
  suggestion === 'Yes' || !!emerging_trend ? 1 : 0
```

---

## 4. Reporting Hierarchy

```
Weekly Data (telehealth_entries filtered by period + cycle)
    │
    ▼
Weekly Summary (aggregated totals + top observations/recommendations)
    │
    ▼
Monthly Consolidation (Jan–Dec totals + top 5 insights)
    │
    ▼
Quarterly Consolidation (Q1–Q4 + narrative sections)
    │
    ▼
Executive Dashboard (KPIs + charts + insight panels)
```

---

## 5. Export Design

### PDF Export
- Branded header: SSNIT + The Trust Hospital joint logo bar.
- Orange accent line (consistent with existing system theme).
- Tabular report data with auto-table.
- Summary statistics and insight panels.

### Excel Export
- Sheet 1: Raw data (all filtered entries).
- Sheet 2: Summary statistics.
- Sheet 3: Observations and recommendations.
- Uses `xlsx` library.

### CSV Export
- Raw filtered entries in comma-separated format.

---

## 6. Security Model

| Concern | Approach |
|---|---|
| Authentication | Supabase Auth (email + password, JWT sessions) |
| Authorization | Role field on `profiles` table; checked at route and query level |
| RLS | Enabled on all telehealth tables; authenticated users only |
| SSNIT read-only | Enforced in application routing and form disabling |
| Audit trail | All writes and exports logged to `audit_log` |
| Secrets | Supabase URL and anon key in `.env` only |
| Patient data | No clinical data beyond interaction metadata |

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Tables | Custom DataTable component |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Hosting | Vercel / Netlify (static) + Supabase (backend) |
