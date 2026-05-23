-- ============================================================
-- SBS System — Full Supabase Migration
-- Generated from localhost MySQL sbs_system
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ── Drop existing tables (clean slate) ───────────────────────────────────────
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS ddg_feedback CASCADE;
DROP TABLE IF EXISTS meeting_attachments CASCADE;
DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS internal_meeting_subjects CASCADE;
DROP TABLE IF EXISTS internal_meetings CASCADE;
DROP TABLE IF EXISTS external_meetings CASCADE;
DROP TABLE IF EXISTS partnership_external_stakeholders CASCADE;
DROP TABLE IF EXISTS partnership_internal_stakeholders CASCADE;
DROP TABLE IF EXISTS partnerships CASCADE;
DROP TABLE IF EXISTS internal_stakeholders CASCADE;
DROP TABLE IF EXISTS external_stakeholders CASCADE;
DROP TABLE IF EXISTS status_lookup CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── Profiles (extends Supabase auth.users) ────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  avatar_url TEXT,
  role       TEXT NOT NULL DEFAULT 'standard' CHECK (role IN ('admin','standard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Status Lookup ─────────────────────────────────────────────────────────────
CREATE TABLE status_lookup (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6c757d',
  sort_order INT  NOT NULL DEFAULT 0
);

-- ── External Stakeholders ─────────────────────────────────────────────────────
CREATE TABLE external_stakeholders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  title        TEXT,
  organization TEXT,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Internal Stakeholders ─────────────────────────────────────────────────────
CREATE TABLE internal_stakeholders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  title      TEXT,
  department TEXT,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Partnerships ──────────────────────────────────────────────────────────────
CREATE TABLE partnerships (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  organization   TEXT,
  description    TEXT,
  status_id      UUID REFERENCES status_lookup(id) ON DELETE SET NULL,
  proposed_value NUMERIC,
  start_date     DATE,
  end_date       DATE,
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Partnership ↔ External Stakeholders ──────────────────────────────────────
CREATE TABLE partnership_external_stakeholders (
  partnership_id  UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  stakeholder_id  UUID NOT NULL REFERENCES external_stakeholders(id) ON DELETE CASCADE,
  PRIMARY KEY (partnership_id, stakeholder_id)
);

-- ── Partnership ↔ Internal Stakeholders ──────────────────────────────────────
CREATE TABLE partnership_internal_stakeholders (
  partnership_id          UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  internal_stakeholder_id UUID NOT NULL REFERENCES internal_stakeholders(id) ON DELETE CASCADE,
  PRIMARY KEY (partnership_id, internal_stakeholder_id)
);

-- ── External Meetings ─────────────────────────────────────────────────────────
CREATE TABLE external_meetings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  partnership_id     UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  meeting_date       DATE,
  location           TEXT,
  attendees_external TEXT,
  agenda             TEXT,
  minutes            TEXT,
  action_points      TEXT,
  status_id          UUID REFERENCES status_lookup(id) ON DELETE SET NULL,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Internal Meetings ─────────────────────────────────────────────────────────
CREATE TABLE internal_meetings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  meeting_date   DATE,
  location       TEXT,
  agenda         TEXT,
  minutes        TEXT,
  action_points  TEXT,
  status_id      UUID REFERENCES status_lookup(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Internal Meeting Subjects ─────────────────────────────────────────────────
CREATE TABLE internal_meeting_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES internal_meetings(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  outcome    TEXT
);

-- ── Meeting Attendees ─────────────────────────────────────────────────────────
CREATE TABLE meeting_attendees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('external','internal')),
  profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meeting Attachments ───────────────────────────────────────────────────────
CREATE TABLE meeting_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('external','internal')),
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_size    BIGINT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DDG Feedback ──────────────────────────────────────────────────────────────
CREATE TABLE ddg_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type  TEXT NOT NULL DEFAULT 'General',
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES external_stakeholders(id) ON DELETE SET NULL,
  received_date  DATE,
  summary        TEXT NOT NULL,
  details        TEXT,
  action_taken   TEXT,
  is_actioned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  file_path      TEXT NOT NULL,
  file_size      BIGINT,
  file_type      TEXT,
  uploaded_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── System Settings ───────────────────────────────────────────────────────────
CREATE TABLE system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Log ─────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  UUID,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE profiles                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_lookup                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_stakeholders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_stakeholders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_external_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_internal_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_meetings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_meetings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_meeting_subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attachments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ddg_feedback                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','status_lookup','external_stakeholders','internal_stakeholders',
    'partnerships','partnership_external_stakeholders','partnership_internal_stakeholders',
    'external_meetings','internal_meetings','internal_meeting_subjects',
    'meeting_attendees','meeting_attachments','ddg_feedback','documents',
    'system_settings','audit_log'
  ] LOOP
    EXECUTE format('CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ── Supabase Storage Buckets ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents',false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments','attachments',false) ON CONFLICT DO NOTHING;

-- ============================================================
-- DATA — migrated from MySQL sbs_system
-- ============================================================

-- ── Temp ID mapping tables ────────────────────────────────────────────────────
CREATE TEMP TABLE _status_map  (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));
CREATE TEMP TABLE _ext_map     (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));
CREATE TEMP TABLE _int_map     (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));
CREATE TEMP TABLE _partner_map (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));
CREATE TEMP TABLE _extmtg_map  (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));
CREATE TEMP TABLE _intmtg_map  (old_id INT, new_id UUID DEFAULT gen_random_uuid(), PRIMARY KEY (old_id));

INSERT INTO _status_map  (old_id) VALUES (1),(2),(3),(4),(5),(6);
INSERT INTO _ext_map     (old_id) VALUES (1),(2),(3),(4),(5),(6),(7),(8);
INSERT INTO _int_map     (old_id) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);
INSERT INTO _partner_map (old_id) VALUES (1),(2),(3),(4),(5),(6);
INSERT INTO _extmtg_map  (old_id) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9);
INSERT INTO _intmtg_map  (old_id) VALUES (1);

-- ── status_lookup ─────────────────────────────────────────────────────────────
INSERT INTO status_lookup (id, name, color, sort_order)
SELECT m.new_id, d.name, d.color, d.sort_order
FROM _status_map m
JOIN (VALUES
  (1,'In Progress','#fd7e14',1),
  (2,'Active',     '#28a745',2),
  (3,'On Hold',    '#ffc107',3),
  (4,'Completed',  '#0d6efd',4),
  (5,'Cancelled',  '#dc3545',5),
  (6,'Pending',    '#6f42c1',6)
) AS d(old_id,name,color,sort_order) ON d.old_id = m.old_id;

-- ── external_stakeholders ─────────────────────────────────────────────────────
INSERT INTO external_stakeholders (id, name, title, organization, email, phone)
SELECT m.new_id, d.name, d.title, d.org, d.email, d.phone
FROM _ext_map m
JOIN (VALUES
  (1,'Ghana Highways Authority','GHA Representative','Infrastructure','',''),
  (2,'BOSAG (BPO/ITES/GBS Sector)','CEO / Board Chair','Business Process Outsourcing','',''),
  (3,'NEIP (Adwumaruwa Programme)','Deputy CEO','Entrepreneurship','',''),
  (4,'Mobex Africa','Director','Informal Sector / Fintech','',''),
  (5,'Youth Employment Agency (YEA)','Executive Director','Employment','',''),
  (6,'24 Hour Secretariat','Abdul-Nasser Alidu','Government Initiative','','0542150450'),
  (7,'Ghana Digital Centres Limited (GDCL)','Christine Ansong','Private','',''),
  (8,'Commercial Motorbike and Tricycle Operators Association','Hamza','Private','','0556444276')
) AS d(old_id,name,title,org,email,phone) ON d.old_id = m.old_id;

-- ── internal_stakeholders ─────────────────────────────────────────────────────
INSERT INTO internal_stakeholders (id, name, department)
SELECT m.new_id, d.name, d.dept
FROM _int_map m
JOIN (VALUES
  (1, 'Office of the Director-General','Executive'),
  (2, 'Office of the DDG, Operations & Benefits','Operations & Benefits'),
  (3, 'Office of the DDG, Finance & Investments','Finance & Investments'),
  (4, 'Special Business Support Office','Operations & Benefits'),
  (5, 'Corporate Affairs Department','Corporate Affairs'),
  (6, 'Legal Department','Legal'),
  (7, 'MIS / ICT Department','MIS / ICT'),
  (8, 'Human Resource Department','Human Resources'),
  (9, 'Benefits Department','Benefits'),
  (10,'Contributions & Compliance Department','Contributions & Compliance'),
  (11,'Finance Department','Finance'),
  (12,'Investments Department','Investments')
) AS d(old_id,name,dept) ON d.old_id = m.old_id;

-- ── partnerships ──────────────────────────────────────────────────────────────
INSERT INTO partnerships (id, title, description, status_id, proposed_value, start_date, notes)
SELECT
  pm.new_id,
  d.title,
  d.description,
  sm.new_id,
  d.proposed_value,
  d.start_date::DATE,
  d.notes
FROM _partner_map pm
JOIN (VALUES
  (1,'SSNIT-BOSAG',
   E'Goal: To partner with each other in achieving mutually beneficial results.\n\nSSNIT Interest: BOSAG launched a 5-year strategic plan on this day and in it was a target of 100,000 jobs within the next five years. The interest of the Trust in this is the numbers. how best to we optimize our relationship with BOSAG in tapping into those numbers.',
   1,100000,'2025-11-13',NULL),
  (2,'SSNIT-24Hour Economy',
   E'Goal: Basically, the Trust seeks a partnership with the 24hr Secretariat to give us an eagle-eyes view of the jobs being created under the 24hr Economy initiative.\n\nSSNIT Interest: To establish a structured framework for information sharing on job creation initiatives under the 24-Hour Economy, Design joint registration and sensitisation mechanisms to secure social protection for all new employees and Explore sustainable partnership models that align with the Secretariat\'s programme timelines and targets.',
   6,1700000,'2025-10-03',NULL),
  (3,'SSNIT-Ghana Digital Centres Ltd',
   E'Goal: SBS was approached by the Deputy CEO concerning a program they intend organizing at the centre dubbed Click to Cargo. The said program is meant to educate ladies on some key digital skills like drop shipping and importation.\n\nSSNIT Interest: She mentioned 500 as the maximum number of participants they will be hosting. SBS finds this a good business case and would like to be part of the program.',
   4,500,'2026-04-03',NULL),
  (4,'SSNIT-Commercial Motorbike and Tricycle Operators Association',
   E'Goal: To see how best the two groups can collaborate to secure some social protection for members of the association.\n\nSSNIT Interest: The numbers. providing coverage for members of the association.',
   2,10000,'2026-05-04',NULL),
  (5,'SSNIT-Ghana Highways Authority',
   E'Goal: To get list of contractors awarded contracts under BIG PUSH.\n\nSSNIT Interest: To ensure that all workers engaged under the Big Push are covered under SSNIT',
   2,1700000,'2026-02-05',NULL),
  (6,'SSNIT - NEIP (Adwumawura Programme)',
   E'Goal: To establish a strong working relationship with the NEIP in order to have access to beneficiaries of the Adwumawura Programme\n\nSSNIT Interest: As the beneficiaries of the various NEIP led programmes are trained and given seed capital to start business, each is supposed to employ a number of people to mop-up unemployment numbers. SSNIT is interested in covering both beneficiaries and their respective employees.',
   1,80000,'2025-11-10',NULL)
) AS d(old_id,title,description,status_old_id,proposed_value,start_date,notes) ON d.old_id = pm.old_id
JOIN _status_map sm ON sm.old_id = d.status_old_id;

-- ── partnership_external_stakeholders ─────────────────────────────────────────
INSERT INTO partnership_external_stakeholders (partnership_id, stakeholder_id)
SELECT pm.new_id, em.new_id
FROM (VALUES (1,2),(2,6),(3,7),(4,8),(5,1),(6,3)) AS d(p_old, e_old)
JOIN _partner_map pm ON pm.old_id = d.p_old
JOIN _ext_map     em ON em.old_id = d.e_old;

-- ── partnership_internal_stakeholders ─────────────────────────────────────────
INSERT INTO partnership_internal_stakeholders (partnership_id, internal_stakeholder_id)
SELECT pm.new_id, im.new_id
FROM (VALUES (1,4),(2,4),(3,4),(4,2),(4,4),(5,4),(6,4)) AS d(p_old, i_old)
JOIN _partner_map pm ON pm.old_id = d.p_old
JOIN _int_map     im ON im.old_id = d.i_old;

-- ── external_meetings ─────────────────────────────────────────────────────────
INSERT INTO external_meetings (id, title, partnership_id, meeting_date, location, agenda, minutes, action_points)
SELECT mm.new_id, d.title, pm.new_id, d.meeting_date::DATE, d.location, d.agenda, d.minutes, d.action_points
FROM _extmtg_map mm
JOIN (VALUES
  (1,1,'First Meeting with BOSAG','2025-11-19','Virtual on Microsoft Teams',
   'Both parties expressed strong interest in collaboration through data-sharing agreements, public education initiatives, and joint participation in industry events. Category C companies pose significant challenges for social security coverage.',
   'This meeting was convened in response to a formal request from the Office of the Deputy Director-General, Operations and Benefits, seeking to explore collaboration opportunities with BOSAG. The meeting established that while Category A and B companies generally comply with statutory requirements, Category C companies often engage workers on short-term contracts, posing significant challenges for social security coverage.',
   'Brief DDG O&B on the outcome of the meeting for advice on next steps.'),
  (2,2,'First Meeting with 24Hour Economy','2025-11-11','24Hour Secretariat',
   'The Secretariat apologized for the delay and promised sending the response the following week.',
   'The SSNIT team stated their mission and referenced a letter written through the office of the DDG O&B, which had not been responded to yet.',
   'Await response from the Secretariat'),
  (3,1,'Second Meeting with BOSAG','2026-04-08',E'DDG\'s Conference Room',
   'Meeting was successful',
   'BOSAG requested this meeting to seek clarifications to help them with their concept note. One big challenge confronting most BPO companies is office accommodation/space. They are basically interested in SSNIT repurposing some unoccupied office spaces.',
   'BOSAG to submit concept note, now that clarification has been given.'),
  (4,3,'First Meeting with Ghana Digital Centres Ltd.','2026-04-08','Office of DDG O&B',
   E'DDG O&B welcomed the idea and asked SBS to coordinate preparation from the side of SSNIT',
   'This was an introductory meeting. The Deputy CEO of GDCL came to officially invite SSNIT to the Click to Cargo program and submit a sponsorship request letter. The program is being organized for ladies to equip them with digital skills including dropshipping and importation.',
   'DDG O&B to forward the sponsorship request to Corporate Affairs'),
  (5,4,'Second meeting with Commercial Motorbike and Tricycle Operators Association','2026-05-11',E'DDG\'s Conference Room',
   'The meeting concluded with a strong sense of strategic alignment. Both SSNIT and Union leadership reaffirmed their commitment to formalizing proposals to protect the livelihoods of informal transport workers.',
   'The meeting was convened to address challenges and opportunities in bringing the informal transport sector under the national social security umbrella. All parties reached a consensus that while the sector is fluid, its integration is vital for national economic stability.',
   'The trust to draft a document for both parties to align with as a working document.'),
  (6,1,'High-Level Government-Industry Roundtable on Ghana''s BPO/GBS Sector','2026-05-13','SU Towers',
   'The Communications Minister applauded BOSAG for leading the charge. He assured them of the Ministry''s support in addressing gaps in five thematic areas that were presented.',
   'Key industry players delivered presentations on the BPO sector. The team was given an initial tour of the SU towers to appreciate the current capacity of Concentrix, a BPO company rendering services to various multi-nationals.',
   E'SBS to be part of future High-Level Government-Industry Roundtable meetings.\nSBS to ensure that the SSNIT-BOSAG partnership proposition materializes.'),
  (7,5,'First Meeting with Ghana Highways Authority','2026-04-07','Ghana Highways Authority, Office of Director for Contracts',
   'The document was handed over to the team from SSNIT.',
   'The meeting was a follow-up based on the initial letter sent to the Ghana Highways Authority.',
   'Stay in touch and get first hand information as soon as new contractors are added to the list.'),
  (8,6,'First Meeting With NEIP','2025-12-17',E'NEIP CEO\'s Office',
   NULL,
   'The meeting was convened to discuss the strategic integration of social protection (SSNIT enrollment) into the Adwumaruwa Programme. The primary goal is to ensure that beneficiaries of government-funded training and grants are captured under the national pension scheme.',
   E'1. Principle Agreement: NEIP agreed to integrate social protection education as a core module in their training curriculum.\n2. Pilot Group Identification: The 2,000 funded beneficiaries were identified as the primary pilot group.\n3. MoU Commitment: Both institutions expressed mutual interest in formalizing this partnership through a legal framework.'),
  (9,6,'Second Meeting with NEIP','2026-02-10',E'NEIP Deputy CEO\'s Office',
   NULL,
   'This was a follow-up meeting — an unannounced visit to the Deputy CEO after a period of inactivity following the last meeting. Discussions were focused mainly on the way forward, since the first cohort was done-with already.',
   'It was agreed that SSNIT presents a 3-member team to team up with the NEIP staff for them to draft an MOU.')
) AS d(old_id,partner_old_id,title,meeting_date,location,agenda,minutes,action_points) ON d.old_id = mm.old_id
JOIN _partner_map pm ON pm.old_id = d.partner_old_id;

-- ── internal_meetings ─────────────────────────────────────────────────────────
INSERT INTO internal_meetings (id, title, partnership_id, meeting_date, agenda, action_points)
SELECT mm.new_id, d.title, pm.new_id, d.meeting_date::DATE, d.agenda, d.action_points
FROM _intmtg_map mm
JOIN (VALUES
  (1,4,
   'Meeting with DDG O&B on Okada research and proposal',
   '2026-05-19',
   E'The meeting was held in the DDG''s conference room.\nFocus was on the proposal sent to DDG earlier and the need for research within the space of the commercial motorbike and tricycle operations. It is the position of Business that even as we proceed with engagements with the respective associations, it is critical we do our own research within the space and be guided by same in the implementation. Notably, the research needs to focus on operators within the country. It is also important we visit Rwanda, Kenya and Nigeria to understand their approach to this. The purpose is to understand how to manage the associated risk.',
   E'1. An internal stakeholder meeting should be held to sort out the draft proposal this week\n2. It is important we proceed with development of the proposal/concept document, however this should not be subject to the research.\n3. DDG stressed on the importance to look at numbers with contributions in focus.')
) AS d(old_id,partner_old_id,title,meeting_date,agenda,action_points) ON d.old_id = mm.old_id
JOIN _partner_map pm ON pm.old_id = d.partner_old_id;

-- ── system_settings ───────────────────────────────────────────────────────────
INSERT INTO system_settings (key, value) VALUES
  ('best_case_pct',       '60'),
  ('worst_case_pct',      '30'),
  ('ddg_name',            'DDG, Operations & Benefits'),
  ('ddg_phone',           '0243810507'),
  ('mnotify_sender_id',   'HOGA'),
  ('sms_notifications',   '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── documents (metadata only — re-upload files via the app) ───────────────────
INSERT INTO documents (title, file_path, file_size, file_type)
VALUES ('First Document', 'doc_6a0b3baa73f283.78352843.pdf', 228352, 'pdf');

-- ── Cleanup temp tables ───────────────────────────────────────────────────────
DROP TABLE _status_map;
DROP TABLE _ext_map;
DROP TABLE _int_map;
DROP TABLE _partner_map;
DROP TABLE _extmtg_map;
DROP TABLE _intmtg_map;

-- ── Done ──────────────────────────────────────────────────────────────────────
SELECT 'Migration complete ✓' AS result;
