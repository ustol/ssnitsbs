# Telehealth Reporting System — System Requirements Document

**System:** SSNIT–Trust Hospital Telemedicine Reporting Platform  
**Version:** 1.0  
**Date:** July 2026  
**Status:** Approved  

---

## 1. Background and Purpose

The Trust Hospital operates a telemedicine outreach programme for SSNIT pensioners. Customer Relations Officers (CROs) conduct digital interactions — phone calls, SMS, and follow-ups — to engage, remind, and support pensioners with their healthcare needs.

This system provides a secure web application that:

- Allows Trust Hospital staff to capture telemedicine interaction records for SSNIT pensioners.
- Automatically computes derived fields (quarter, duplicate flags, contact validation, sort keys) from workbook logic.
- Aggregates data through weekly summaries, monthly consolidations, quarterly consolidations, and an executive dashboard.
- Allows SSNIT to view reports, dashboards, and exports — without editing hospital data.

The reporting hierarchy mirrors the *Telehealth REPORT Approved.xlsx* workbook exactly, including all formula logic, dropdowns, summaries, and dashboard layouts.

---

## 2. System Users and Roles

| Role | Institution | Permissions |
|---|---|---|
| **System Admin** | Both | Manage users, roles, configuration lists, audit log |
| **Trust Hospital Admin** | Trust Hospital | All hospital functions + configuration |
| **Trust Hospital Data Entry Officer** | Trust Hospital | Create and edit telemedicine entries |
| **Trust Hospital Reviewer** | Trust Hospital | Read-only + review + export |
| **SSNIT Viewer** | SSNIT | View reports and dashboards; no editing |
| **SSNIT Executive Viewer** | SSNIT | View executive dashboard and export |

---

## 3. Core Workflow

1. Trust Hospital staff log in with their credentials.
2. A Data Entry Officer selects the reporting period and weekly cycle.
3. The officer records each telemedicine interaction — patient details, contact info, engagement type, feedback, outcomes, and observations.
4. The system automatically computes: quarter, duplicate flag, contact missing warning, phone check, and ranking sort keys.
5. A Reviewer reviews and approves weekly entries before period close.
6. Summaries and consolidations aggregate upward: weekly → monthly → quarterly → executive.
7. SSNIT Viewers log in separately and access read-only dashboards and reports.
8. Exports can be generated at any level as PDF, Excel, or CSV.

---

## 4. Functional Requirements

### 4.1 Data Entry

**FR-001** The system shall provide a multi-section data entry form for telemedicine interaction records.

**FR-002** Every entry shall capture these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| Reporting Period | Dropdown | Yes | Jan 2026 – Dec 2026 |
| Weekly Cycle | Dropdown | Yes | Week 1 – Week 5 |
| Date of Interaction | Date | Yes | |
| CRO Name | Text | Yes | |
| Patient Full Name | Text | Yes | |
| Telephone Number | Text | Conditional | One contact required |
| Alternative Contact | Text | Conditional | |
| Email Address | Email | Conditional | |
| Physical Location | Text | No | |
| Region | Dropdown | Yes | 15 Ghana regions |
| Engagement Type | Dropdown | Yes | 8 types |
| Digital Channel Used | Dropdown | No | Phone Call, SMS |
| Feedback Category | Dropdown | Yes | Positive, Complaint, Suggestion, Neutral |
| Detailed Feedback Narrative | Long text | No | |
| Successful Contact | Yes/No | No | |
| Issue Resolved | Yes/No | No | |
| Escalation Required | Yes/No | No | |
| Key Observation | Long text | No | |
| Root Cause | Long text | No | |
| Emerging Trend | Long text | No | |
| Recommendation | Long text | No | |
| Priority Level | Dropdown | Conditional | High, Medium, Low |
| Responsible Unit | Dropdown | No | 7 units |
| Status | Dropdown | Yes | Open, In Progress, Closed |

**FR-003** The system shall auto-generate an `entry_id` in the format `TTH-0001`, `TTH-0002`, etc., sequentially and uniquely.

**FR-004** The following fields shall be automatically computed and stored:

| Computed Field | Formula |
|---|---|
| Positive Feedback | "Yes" if feedback_category = Positive, else "No" |
| Complaint | "Yes" if feedback_category = Complaint, else "No" |
| Suggestion | "Yes" if feedback_category = Suggestion, else "No" |
| Quarter | Q1 for Jan–Mar; Q2 for Apr–Jun; Q3 for Jul–Sep; Q4 for Oct–Dec |
| Duplicate Flag | "DUPLICATE" if same patient name + telephone in another record |
| Contact Missing | "MISSING CONTACT" if all three contact fields are empty |
| Phone Check | "CHECK NUMBER" if cleaned phone number has fewer than 10 digits |
| Recommendation Sort Key | High=3, Medium=2, Low=1, None=0 |
| Observation Sort Key | Rank of unique observations ordered by interaction date |
| Risk Sort Key | 1 if escalation_required=Yes or priority=High, else 0 |
| Opportunity Sort Key | 1 if suggestion=Yes or emerging_trend is not null, else 0 |

**FR-005** Duplicate warnings shall display before saving but shall not automatically block submission.

**FR-006** The system shall validate:
- Patient full name is required.
- At least one of telephone, alternative contact, or email is required (unless all are intentionally empty).
- Region, engagement type, feedback category, and status are required.
- Phone numbers must pass a 10-digit minimum check.

### 4.2 Weekly Summary

**FR-007** The Weekly Summary page shall:
- Filter entries by reporting period and weekly cycle.
- Show: Total Patients Contacted, Total Follow-Up Activities, Total Feedback Collected, Total Complaints, Total Issues Resolved.
- Break down feedback into: Positive, Complaints, Suggestions, Neutral / Other.
- Show Top 3 Key Observations (by observation_sort_key).
- Show Top 3 Recommendations (by recommendation_sort_key).

### 4.3 Monthly Consolidation

**FR-008** The Monthly Consolidation page shall:
- Show a full Jan–Dec monthly totals table for the selected year.
- Include columns: Total Patients, Follow-Ups, Feedback, Complaints, Issues Resolved, Escalations, Year Total.
- Show Top 5 Key Observations (by observation_sort_key).
- Show Top 5 Recommendations (by recommendation_sort_key).
- Show Top 5 Risk Areas (by risk_sort_key).
- Show Top 5 Opportunities (by opportunity_sort_key).

### 4.4 Quarterly Consolidation

**FR-009** The Quarterly Consolidation page shall:
- Aggregate monthly data into Q1 (Jan–Mar), Q2 (Apr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dec).
- Show the same metrics as monthly consolidation per quarter and for the year.
- Identify and display: Busiest Month, Busiest Quarter, Months with Activity.
- Provide narrative sections for: Emerging Trends, Major Service Concerns, Key Recommendations for Management.

### 4.5 Executive Dashboard

**FR-010** The Executive Dashboard shall:
- Display KPI cards: Total Patients Contacted, Total Follow-Up Activities, Total Complaints, Issues Resolved, Open Issues, Closed Issues.
- Include charts:
  - Monthly patient engagement trend (line/bar chart).
  - Follow-up activities by month.
  - Complaints by month.
  - Engagement type breakdown (pie/donut chart).
  - Feedback category breakdown (pie/donut chart).
  - Patient engagement by region (bar chart / heatmap).
- Show executive insight panels: Top 5 Observations, Top 5 Risks, Top 5 Recommendations, Top 5 Opportunities.

### 4.6 Reports and Export

**FR-011** Reports shall support filtering by:
- Date range, reporting period, week, month, quarter, region, status, responsible unit, feedback category, priority.

**FR-012** The system shall support export to:
- PDF (branded with SSNIT / Trust Hospital joint header).
- Excel (.xlsx) with formatted worksheets.
- CSV (raw data).

### 4.7 Configuration Lists

**FR-013** A System Admin shall be able to manage all dropdown reference lists via a configuration page.

### 4.8 Audit Logging

**FR-014** Every create, update, delete, login, logout, export, and report view action shall be written to the audit log with user, timestamp, entity type, entity ID, and change details.

---

## 5. Non-Functional Requirements

**NFR-001** All routes shall be protected; unauthenticated users are redirected to login.

**NFR-002** SSNIT users shall not be able to create, update, or delete telemedicine entries.

**NFR-003** Patient records shall not be publicly accessible.

**NFR-004** Supabase credentials shall be stored only in environment variables — never hard-coded.

**NFR-005** The application shall be responsive and usable on desktop (primary) and tablet.

**NFR-006** The system shall use Row Level Security (RLS) in Supabase PostgreSQL for all tables.

---

## 6. Out of Scope

- Public patient portal.
- Payment processing.
- Clinical diagnosis or medical records.
- Features not supported by the Telehealth REPORT Approved.xlsx workbook.
