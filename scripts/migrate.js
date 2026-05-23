/**
 * Migration script: MySQL (sbs_system) → Supabase
 *
 * Run:  node scripts/migrate.js
 * Needs: npm install mysql2   (one-off install)
 */

require('dotenv').config()
const mysql = require('mysql2/promise')
const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')

// ── Config ───────────────────────────────────────────────────────────────────

const MYSQL = {
  host: 'localhost',
  user: 'root',
  password: '',          // change if your MySQL root has a password
  database: 'sbs_system',
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() { return randomUUID() }

async function insert(table, rows) {
  if (!rows.length) { console.log(`  ⤷ ${table}: nothing to insert`); return }
  const { error } = await supabase.from(table).insert(rows)
  if (error) {
    console.error(`  ✗ ${table}:`, error.message)
    throw error
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const db = await mysql.createConnection(MYSQL)
  console.log('Connected to MySQL\n')

  // ── 1. status_lookup ──────────────────────────────────────────────────────
  console.log('Migrating status_lookup…')
  const [statuses] = await db.query('SELECT * FROM status_lookup')
  const statusMap = {} // old INT id → new UUID
  const statusRows = statuses.map(s => {
    const id = uuid()
    statusMap[s.id] = id
    return { id, name: s.status_name, color: s.color_hex, sort_order: s.sort_order }
  })
  await insert('status_lookup', statusRows)

  // ── 2. external_stakeholders ──────────────────────────────────────────────
  console.log('Migrating external_stakeholders…')
  const [extStake] = await db.query('SELECT * FROM external_stakeholders WHERE deleted_at IS NULL')
  const extStakeMap = {}
  const extStakeRows = extStake.map(s => {
    const id = uuid()
    extStakeMap[s.id] = id
    return {
      id,
      name: s.name,
      title: s.contact_person || null,
      organization: s.sector || null,
      email: s.email || null,
      phone: s.phone || null,
      notes: null,
    }
  })
  await insert('external_stakeholders', extStakeRows)

  // ── 3. internal_stakeholders ──────────────────────────────────────────────
  console.log('Migrating internal_stakeholders…')
  const [intStake] = await db.query('SELECT * FROM internal_stakeholders WHERE is_active = 1')
  const intStakeMap = {}
  const intStakeRows = intStake.map(s => {
    const id = uuid()
    intStakeMap[s.id] = id
    return {
      id,
      name: s.office_name,
      title: null,
      department: s.department || null,
      email: null,
      phone: null,
      notes: null,
    }
  })
  await insert('internal_stakeholders', intStakeRows)

  // ── 4. partnerships ───────────────────────────────────────────────────────
  console.log('Migrating partnerships…')
  const [partnerships] = await db.query('SELECT * FROM partnerships WHERE deleted_at IS NULL')
  const partnershipMap = {}
  const partnershipRows = partnerships.map(p => {
    const id = uuid()
    partnershipMap[p.id] = id

    // Combine goal + interest into description
    const descParts = []
    if (p.goal_of_engagement) descParts.push(`Goal: ${p.goal_of_engagement}`)
    if (p.interest_of_ssnit)  descParts.push(`SSNIT Interest: ${p.interest_of_ssnit}`)

    // Add follow-up and nature to notes
    const noteParts = []
    if (p.nature_of_engagement)  noteParts.push(`Nature: ${p.nature_of_engagement}`)
    if (p.next_followup_date)    noteParts.push(`Next follow-up: ${p.next_followup_date}`)

    return {
      id,
      title: p.partnership_name,
      organization: null,
      description: descParts.join('\n\n') || null,
      status_id: statusMap[p.status_id] || null,
      proposed_value: p.proposed_numbers || null,
      start_date: p.engagement_date || null,
      end_date: null,
      notes: noteParts.join('\n') || null,
      created_by: null,
    }
  })
  await insert('partnerships', partnershipRows)

  // ── 5. partnership_external_stakeholders ──────────────────────────────────
  console.log('Migrating partnership_external_stakeholders…')
  const [pes] = await db.query('SELECT * FROM partnership_external_stakeholders')
  const pesRows = pes
    .filter(r => partnershipMap[r.partnership_id] && extStakeMap[r.external_stakeholder_id])
    .map(r => ({
      partnership_id: partnershipMap[r.partnership_id],
      stakeholder_id: extStakeMap[r.external_stakeholder_id],
    }))
  await insert('partnership_external_stakeholders', pesRows)

  // ── 6. external_meetings ──────────────────────────────────────────────────
  console.log('Migrating external_meetings…')
  const [extMeetings] = await db.query('SELECT * FROM external_meetings WHERE deleted_at IS NULL')
  const extMeetingMap = {}
  const extMeetingRows = extMeetings.map(m => {
    const id = uuid()
    extMeetingMap[m.id] = id
    return {
      id,
      title: m.meeting_title,
      partnership_id: partnershipMap[m.partnership_id] || null,
      meeting_date: m.meeting_date || null,
      location: m.venue || null,
      attendees_external: null,
      agenda: m.outcome || null,
      minutes: m.meeting_minutes || null,
      action_points: m.action_points || null,
      status_id: null,
      created_by: null,
    }
  })
  await insert('external_meetings', extMeetingRows)

  // ── 7. internal_meetings ──────────────────────────────────────────────────
  console.log('Migrating internal_meetings…')
  const [intMeetings] = await db.query('SELECT * FROM internal_meetings WHERE deleted_at IS NULL')
  const intMeetingMap = {}
  const intMeetingRows = intMeetings.map(m => {
    const id = uuid()
    intMeetingMap[m.id] = id
    return {
      id,
      title: m.meeting_name,
      partnership_id: partnershipMap[m.partnership_id] || null,
      meeting_date: m.meeting_date || null,
      location: null,
      agenda: m.background || null,
      minutes: null,
      action_points: m.action_points || null,
      status_id: null,
      created_by: null,
    }
  })
  await insert('internal_meetings', intMeetingRows)

  // ── 8. ddg_feedback ───────────────────────────────────────────────────────
  console.log('Migrating ddg_feedback…')
  const [ddg] = await db.query('SELECT * FROM ddg_feedback')
  const ddgRows = ddg
    .filter(f => partnershipMap[f.partnership_id])
    .map(f => ({
      id: uuid(),
      feedback_type: f.feedback_status || 'General',
      partnership_id: partnershipMap[f.partnership_id] || null,
      stakeholder_id: null,
      received_date: f.feedback_date || null,
      summary: f.feedback_text
        ? f.feedback_text.substring(0, 250)
        : '(no summary)',
      details: f.feedback_text && f.feedback_text.length > 250
        ? f.feedback_text
        : null,
      action_taken: f.follow_up_instruction || null,
      is_actioned: f.is_actioned === 1,
      created_by: null,
    }))
  await insert('ddg_feedback', ddgRows)

  // ── 9. documents (metadata only — files stay local) ───────────────────────
  console.log('Migrating document_library…')
  const [docs] = await db.query('SELECT * FROM document_library WHERE deleted_at IS NULL AND doc_type = "file"')
  const docRows = docs.map(d => ({
    id: uuid(),
    title: d.title,
    partnership_id: null,
    file_path: d.stored_name || d.file_name || '',
    file_size: d.file_size_kb ? d.file_size_kb * 1024 : null,
    file_type: d.file_type || null,
    uploaded_by: null,
  }))
  await insert('documents', docRows)

  // ── 10. system_settings ───────────────────────────────────────────────────
  console.log('Migrating system_settings…')
  const [settings] = await db.query('SELECT * FROM system_settings')
  const settingRows = settings.map(s => ({
    key: s.setting_key,
    value: s.setting_value,
    updated_at: new Date().toISOString(),
  }))
  // upsert to avoid duplicates from the migration SQL seed
  if (settingRows.length) {
    const { error } = await supabase.from('system_settings').upsert(settingRows, { onConflict: 'key' })
    if (error) console.error('  ✗ system_settings:', error.message)
    else console.log(`  ✓ system_settings: ${settingRows.length} rows`)
  }

  await db.end()
  console.log('\n✅ Migration complete!')
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message)
  process.exit(1)
})
