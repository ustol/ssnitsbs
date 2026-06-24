import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type VitalInfoItem = { date: string; subject: string; details: string | null }

async function fetchVitalInfoByPartnership(): Promise<Record<string, VitalInfoItem[]>> {
  const { data } = await supabase
    .from('vital_information')
    .select('partnership_id, date, subject, details')
    .order('date', { ascending: false })
  const map: Record<string, VitalInfoItem[]> = {}
  for (const v of data ?? []) {
    (map[v.partnership_id] ??= []).push({ date: v.date, subject: v.subject, details: v.details })
  }
  return map
}

// ─── External Stakeholder Report ──────────────────────────────────────────────
export function useExtStakeholderReport() {
  return useQuery({
    queryKey: ['report-ext-stakeholders'],
    queryFn: async () => {
      const [stakeholderRes, meetingRes] = await Promise.all([
        supabase
          .from('external_stakeholders')
          .select(`*, partnerships:partnership_external_stakeholders(partnership:partnerships(id,title,description,status:status_lookup(name)))`)
          .order('name'),
        supabase
          .from('external_meetings')
          .select('id, title, meeting_date, partnership_id, location, action_points')
          .order('meeting_date', { ascending: false })
          .limit(20),
      ])

      const { data, error } = stakeholderRes
      if (error) throw error

      const recentMeetings = meetingRes.data ?? []

      const rows = (data ?? []).map(s => ({
        ...s,
        partnershipCount: s.partnerships?.length ?? 0,
        partnershipNames: (s.partnerships ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.partnership?.title).filter(Boolean).join(', '),
      }))

      const byOrg = Object.entries(
        rows.reduce((acc, s) => {
          const k = s.organization ?? 'Unknown'
          acc[k] = (acc[k] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)

      const topByPartnerships = [...rows]
        .sort((a, b) => b.partnershipCount - a.partnershipCount)
        .slice(0, 10)
        .map(s => ({ name: s.name.split(' ').slice(0, 2).join(' '), value: s.partnershipCount }))

      return { rows, byOrg, topByPartnerships, total: rows.length, recentMeetings }
    },
  })
}

// ─── Internal Stakeholder Report ─────────────────────────────────────────────
export function useIntStakeholderReport() {
  return useQuery({
    queryKey: ['report-int-stakeholders'],
    queryFn: async () => {
      const [stakeholderRes, meetingRes] = await Promise.all([
        supabase
          .from('internal_stakeholders')
          .select(`id, name, title, department, email, phone, partnerships:partnership_internal_stakeholders(partnership:partnerships(id, title, status:status_lookup(name, color)))`)
          .order('name'),
        supabase
          .from('internal_meetings')
          .select('id, title, meeting_date, partnership_id')
          .order('meeting_date', { ascending: false }),
      ])

      const { data, error } = stakeholderRes
      if (error) throw error

      // Index meetings by partnership_id for fast lookup
      type MeetingRow = { id: string; title: string; meeting_date: string | null; partnership_id: string | null }
      const meetingsByPartnership: Record<string, MeetingRow[]> = {}
      for (const m of (meetingRes.data ?? []) as MeetingRow[]) {
        if (!m.partnership_id) continue
        ;(meetingsByPartnership[m.partnership_id] ??= []).push(m)
      }

      type LinkedPartnership = { id: string; title: string; status: { name: string; color: string } | null }

      const rows = (data ?? []).map(s => {
        const linked = ((s.partnerships ?? []) as Array<{ partnership: LinkedPartnership | null }>)
          .map(p => p.partnership)
          .filter((p): p is LinkedPartnership => p !== null)

        const meetingsAcrossPartnerships = linked.flatMap(p => meetingsByPartnership[p.id] ?? [])
        const meetingCount = meetingsAcrossPartnerships.length
        const lastMeetingDate = meetingsAcrossPartnerships.reduce((latest: string | null, m) => {
          if (!m.meeting_date) return latest
          return !latest || m.meeting_date > latest ? m.meeting_date : latest
        }, null)

        return {
          ...s,
          linkedPartnerships: linked,
          partnershipCount: linked.length,
          partnershipNames: linked.map(p => p.title).join(', '),
          meetingCount,
          lastMeetingDate,
        }
      })

      // Department rollup: stakeholder count, total partnership links, total meeting coverage
      const deptMap: Record<string, { stakeholders: number; partnerships: number; meetings: number }> = {}
      for (const s of rows) {
        const dept = s.department ?? 'Unassigned'
        deptMap[dept] ??= { stakeholders: 0, partnerships: 0, meetings: 0 }
        deptMap[dept].stakeholders++
        deptMap[dept].partnerships += s.partnershipCount
        deptMap[dept].meetings += s.meetingCount
      }
      const byDepartment = Object.entries(deptMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.partnerships - a.partnerships)

      // Top stakeholders by partnership involvement
      const topByPartnerships = [...rows]
        .sort((a, b) => b.partnershipCount - a.partnershipCount)
        .slice(0, 10)
        .map(s => ({
          name: s.name.split(' ').slice(0, 2).join(' '),
          Partnerships: s.partnershipCount,
          Meetings: s.meetingCount,
        }))

      // Unique partnerships covered across all stakeholders
      const coveredPartnershipIds = new Set(rows.flatMap(s => s.linkedPartnerships.map(p => p.id)))

      const avgPartnerships = rows.length > 0
        ? Math.round((rows.reduce((s, r) => s + r.partnershipCount, 0) / rows.length) * 10) / 10
        : 0

      return {
        rows,
        byDepartment,
        topByPartnerships,
        total: rows.length,
        departments: byDepartment.length,
        coveredPartnerships: coveredPartnershipIds.size,
        avgPartnerships,
      }
    },
  })
}

// ─── User Performance Report ──────────────────────────────────────────────────
export function useUserPerformanceReport() {
  return useQuery({
    queryKey: ['report-user-performance'],
    queryFn: async () => {
      const [profiles, partnerships, extMeetings, intMeetings] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role'),
        supabase.from('partnerships').select('id, created_by'),
        supabase.from('external_meetings').select('id, created_by'),
        supabase.from('internal_meetings').select('id, created_by'),
      ])

      if (profiles.error) throw profiles.error

      const allPartnerships = partnerships.data ?? []
      const allExt = extMeetings.data ?? []
      const allInt = intMeetings.data ?? []

      const users = (profiles.data ?? []).map(p => {
        const partnerships_n = allPartnerships.filter(x => x.created_by === p.id).length
        const ext_n = allExt.filter(x => x.created_by === p.id).length
        const int_n = allInt.filter(x => x.created_by === p.id).length
        return { ...p, partnerships_n, ext_n, int_n, total: partnerships_n + ext_n + int_n }
      }).sort((a, b) => b.total - a.total)

      const chartData = users
        .filter(u => u.total > 0)
        .map(u => ({
          name: (u.full_name ?? u.email ?? 'Unknown').split(' ')[0],
          Partnerships: u.partnerships_n,
          'Ext Meetings': u.ext_n,
          'Int Meetings': u.int_n,
        }))

      // Totals across all records — attributed and unattributed
      const totals = {
        partnerships: allPartnerships.length,
        ext: allExt.length,
        int: allInt.length,
      }
      const attributed = {
        partnerships: allPartnerships.filter(x => x.created_by).length,
        ext: allExt.filter(x => x.created_by).length,
        int: allInt.filter(x => x.created_by).length,
      }
      const unattributed =
        (totals.partnerships - attributed.partnerships) +
        (totals.ext - attributed.ext) +
        (totals.int - attributed.int)

      return { users, chartData, totals, attributed, unattributed }
    },
  })
}

// ─── Executive Overview Report ────────────────────────────────────────────────
export function useExecutiveReport() {
  return useQuery({
    queryKey: ['report-executive'],
    queryFn: async () => {
      const [partnerships, extMeetings, intMeetings, settings, vitalInfoMap] = await Promise.all([
        supabase.from('partnerships').select('*, status:status_lookup(name, color)').order('created_at', { ascending: false }),
        supabase.from('external_meetings').select('id, partnership_id, meeting_date, title, location, action_points').order('meeting_date', { ascending: false }),
        supabase.from('internal_meetings').select('id, partnership_id, meeting_date, title, action_points').order('meeting_date', { ascending: false }),
        supabase.from('system_settings').select('key, value'),
        fetchVitalInfoByPartnership(),
      ])

      const settingsMap: Record<string, string> = {}
      for (const s of settings.data ?? []) settingsMap[s.key] = s.value
      const bestPct = Number(settingsMap.best_case_pct ?? 60)
      const worstPct = Number(settingsMap.worst_case_pct ?? 30)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (partnerships.data ?? []).map((p: any) => {
        const ext = (extMeetings.data ?? []).filter(m => m.partnership_id === p.id).length
        const int = (intMeetings.data ?? []).filter(m => m.partnership_id === p.id).length
        return { ...p, extCount: ext, intCount: int, totalMeetings: ext + int, vitalInfo: vitalInfoMap[p.id] ?? [] }
      })

      // Status distribution
      const byStatus = Object.entries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows.reduce((acc, p: any) => {
          const name = p.status?.name ?? 'No Status'
          acc[name] = (acc[name] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value }))

      // Proposed value by status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueByStatus = Object.entries(rows.reduce((acc, p: any) => {
        const name = p.status?.name ?? 'No Status'
        acc[name] = (acc[name] ?? 0) + (p.proposed_value ?? 0)
        return acc
      }, {} as Record<string, number>))
        .map(([name, value]) => ({ name, value }))
        .filter(x => x.value > 0)

      const totalProposed = rows.reduce((s, p) => s + ((p as { proposed_value?: number }).proposed_value ?? 0), 0)

      // Top partnerships by meeting count
      const topByMeetings = [...rows]
        .sort((a, b) => b.totalMeetings - a.totalMeetings)
        .slice(0, 8)
        .map(p => ({ name: (p as { title: string }).title.substring(0, 22), ext: p.extCount, int: p.intCount }))

      // Meetings by month (last 12)
      const meetingsByMonth: Record<string, number> = {}
      for (const m of [...(extMeetings.data ?? []), ...(intMeetings.data ?? [])]) {
        if (!m.meeting_date) continue
        const key = m.meeting_date.slice(0, 7)
        meetingsByMonth[key] = (meetingsByMonth[key] ?? 0) + 1
      }
      const monthlyMeetings = Object.entries(meetingsByMonth)
        .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
        .map(([k, count]) => ({
          month: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count,
        }))

      const projections = [
        { label: 'Full Pipeline (100%)', value: totalProposed },
        { label: `Best Case (${bestPct}%)`, value: Math.round(totalProposed * bestPct / 100) },
        { label: `Worst Case (${worstPct}%)`, value: Math.round(totalProposed * worstPct / 100) },
      ]

      const extMeetingDetails = (extMeetings.data ?? []).slice(0, 15).map(m => ({
        title: m.title as string,
        date: m.meeting_date as string,
        location: m.location as string,
        action_points: m.action_points as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partnership: rows.find((p: any) => p.id === m.partnership_id)?.title ?? null,
      }))

      const intMeetingDetails = (intMeetings.data ?? []).slice(0, 15).map(m => ({
        title: m.title as string,
        date: m.meeting_date as string,
        action_points: m.action_points as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partnership: rows.find((p: any) => p.id === m.partnership_id)?.title ?? null,
      }))

      return { rows, byStatus, valueByStatus, topByMeetings, monthlyMeetings, projections, totalProposed, bestPct, worstPct, extMeetingDetails, intMeetingDetails }
    },
  })
}

// ─── Status Time Analysis Report ─────────────────────────────────────────────
export function useStatusTimeReport() {
  return useQuery({
    queryKey: ['report-status-time'],
    queryFn: async () => {
      const [history, partnerships, extMeetings, intMeetings] = await Promise.all([
        supabase.from('status_history')
          .select('*, from_status:from_status_id(id,name,color), to_status:to_status_id(id,name,color)')
          .order('entity_id').order('created_at'),
        supabase.from('partnerships').select('id, title'),
        supabase.from('external_meetings').select('id, title'),
        supabase.from('internal_meetings').select('id, title'),
      ])

      const records = history.data ?? []

      // Build entity name lookup
      const nameMap: Record<string, string> = {}
      for (const p of partnerships.data ?? []) nameMap[p.id] = p.title
      for (const m of extMeetings.data ?? []) nameMap[m.id] = m.title
      for (const m of intMeetings.data ?? []) nameMap[m.id] = m.title

      // Group by entity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byEntity: Record<string, any[]> = {}
      for (const r of records) {
        const k = `${r.entity_type}::${r.entity_id}`
        ;(byEntity[k] ??= []).push(r)
      }

      // Average days per status
      const statusDays: Record<string, { total: number; count: number; name: string; color: string }> = {}
      for (const entries of Object.values(byEntity)) {
        for (let i = 0; i < entries.length - 1; i++) {
          const curr = entries[i], next = entries[i + 1]
          if (!curr.status_date || !next.status_date || !curr.to_status_id) continue
          const days = Math.round(
            (new Date(next.status_date + 'T00:00:00').getTime() - new Date(curr.status_date + 'T00:00:00').getTime()) / 86400000
          )
          if (days < 0) continue
          const sid = curr.to_status_id
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sName = (curr.to_status as any)?.name ?? 'Unknown'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sColor = (curr.to_status as any)?.color ?? '#6b7280'
          statusDays[sid] ??= { total: 0, count: 0, name: sName, color: sColor }
          statusDays[sid].total += days
          statusDays[sid].count++
        }
      }

      const avgByStatus = Object.values(statusDays)
        .map(s => ({ name: s.name, color: s.color, avgDays: s.count > 0 ? Math.round(s.total / s.count) : 0, transitions: s.count }))
        .sort((a, b) => b.avgDays - a.avgDays)

      // Transition frequency
      const transMap: Record<string, { from: string; to: string; count: number }> = {}
      for (const r of records) {
        if (!r.from_status_id || !r.to_status_id) continue
        const k = `${r.from_status_id}→${r.to_status_id}`
        transMap[k] ??= {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          from: (r.from_status as any)?.name ?? '?',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to: (r.to_status as any)?.name ?? '?',
          count: 0,
        }
        transMap[k].count++
      }
      const topTransitions = Object.values(transMap)
        .sort((a, b) => b.count - a.count).slice(0, 8)
        .map(t => ({ name: `${t.from.substring(0, 12)} → ${t.to.substring(0, 12)}`, value: t.count }))

      // Monthly change volume
      const monthlyChanges: Record<string, number> = {}
      for (const r of records) {
        const k = r.created_at.slice(0, 7)
        monthlyChanges[k] = (monthlyChanges[k] ?? 0) + 1
      }
      const activityByMonth = Object.entries(monthlyChanges)
        .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
        .map(([k, count]) => ({
          month: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count,
        }))

      // Recent history rows (last 50)
      const recentHistory = [...records].reverse().slice(0, 50).map(r => ({
        entity: nameMap[r.entity_id] ?? r.entity_id.substring(0, 8) + '…',
        type: r.entity_type.replace('_', ' '),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: (r.from_status as any)?.name ?? '—',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: (r.to_status as any)?.name ?? '—',
        date: r.status_date ?? '—',
        changedAt: r.created_at.slice(0, 10),
      }))

      return {
        avgByStatus,
        topTransitions,
        activityByMonth,
        recentHistory,
        totalChanges: records.length,
        entitiesTracked: Object.keys(byEntity).length,
        avgDaysOverall: avgByStatus.length > 0 ? Math.round(avgByStatus.reduce((s, x) => s + x.avgDays, 0) / avgByStatus.length) : 0,
      }
    },
  })
}

// ─── Partnership Health Scorecard ─────────────────────────────────────────────
export function useHealthScorecardReport() {
  return useQuery({
    queryKey: ['report-health-scorecard'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [partnerships, extMeetings, intMeetings, vitalInfoMap] = await Promise.all([
        supabase
          .from('partnerships')
          .select('id, title, organization, status_id, status_date, status:status_lookup(name, color)')
          .order('title'),
        supabase.from('external_meetings').select('id, partnership_id, meeting_date'),
        supabase.from('internal_meetings').select('id, partnership_id, meeting_date'),
        fetchVitalInfoByPartnership(),
      ])

      if (partnerships.error) throw partnerships.error

      const dayDiff = (dateStr: string) =>
        Math.floor((today.getTime() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)

      // Last meeting date per partnership (max across ext + int)
      const lastMeetingMap: Record<string, string> = {}
      for (const m of [...(extMeetings.data ?? []), ...(intMeetings.data ?? [])]) {
        if (!m.partnership_id || !m.meeting_date) continue
        const existing = lastMeetingMap[m.partnership_id]
        if (!existing || m.meeting_date > existing) lastMeetingMap[m.partnership_id] = m.meeting_date
      }

      const rows = (partnerships.data ?? []).map(p => {
        const lastMeeting = lastMeetingMap[p.id] ?? null
        const daysSinceLastMeeting = lastMeeting ? dayDiff(lastMeeting) : null
        const daysInCurrentStatus = p.status_date ? dayDiff(p.status_date) : null

        let rag: 'red' | 'amber' | 'green' = 'green'
        if (
          (daysSinceLastMeeting !== null && daysSinceLastMeeting >= 60) ||
          (daysInCurrentStatus !== null && daysInCurrentStatus >= 90)
        ) {
          rag = 'red'
        } else if (
          daysSinceLastMeeting === null ||
          daysSinceLastMeeting >= 30 ||
          (daysInCurrentStatus !== null && daysInCurrentStatus >= 60)
        ) {
          rag = 'amber'
        }

        return {
          id: p.id,
          title: p.title,
          organization: p.organization ?? null,
          status: (p.status as { name: string; color: string } | null),
          lastMeetingDate: lastMeeting,
          daysSinceLastMeeting,
          daysInCurrentStatus,
          vitalInfo: vitalInfoMap[p.id] ?? [],
          rag,
        }
      })

      // Sort: red → amber → green, then alphabetical within each group
      rows.sort((a, b) => {
        const order = { red: 0, amber: 1, green: 2 }
        const diff = order[a.rag] - order[b.rag]
        return diff !== 0 ? diff : a.title.localeCompare(b.title)
      })

      return {
        rows,
        redCount: rows.filter(r => r.rag === 'red').length,
        amberCount: rows.filter(r => r.rag === 'amber').length,
        greenCount: rows.filter(r => r.rag === 'green').length,
        total: rows.length,
      }
    },
  })
}

// ─── Pipeline & Progression Report ───────────────────────────────────────────
export function usePipelineReport() {
  return useQuery({
    queryKey: ['report-pipeline'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [partnerships, statusHistory, settings, vitalInfoMap] = await Promise.all([
        supabase
          .from('partnerships')
          .select('id, title, organization, proposed_value, status_id, status_date, start_date, end_date, status:status_lookup(name, color)')
          .order('title'),
        supabase
          .from('status_history')
          .select('entity_id, to_status_id, to_status:to_status_id(name, color), status_date')
          .eq('entity_type', 'partnership')
          .order('created_at'),
        supabase.from('system_settings').select('key, value'),
        fetchVitalInfoByPartnership(),
      ])

      if (partnerships.error) throw partnerships.error

      const settingsMap: Record<string, string> = {}
      for (const s of settings.data ?? []) settingsMap[s.key] = s.value
      const bestPct = Number(settingsMap.best_case_pct ?? 60)
      const worstPct = Number(settingsMap.worst_case_pct ?? 30)

      const allPartnerships = partnerships.data ?? []

      // Funnel: count and proposed value per status
      const funnelMap: Record<string, { name: string; color: string; count: number; value: number }> = {}
      for (const p of allPartnerships) {
        const s = p.status as { name: string; color: string } | null
        const key = s?.name ?? 'No Status'
        funnelMap[key] ??= { name: key, color: s?.color ?? '#6b7280', count: 0, value: 0 }
        funnelMap[key].count++
        funnelMap[key].value += p.proposed_value ?? 0
      }
      const funnel = Object.values(funnelMap).sort((a, b) => b.count - a.count)

      // Dwell time per status from history
      type HistoryEntry = { to_status_id: string; to_status: { name: string; color: string } | null; status_date: string | null }
      const historyByEntity: Record<string, HistoryEntry[]> = {}
      for (const r of statusHistory.data ?? []) {
        ;(historyByEntity[r.entity_id] ??= []).push(r as HistoryEntry)
      }

      const dwellMap: Record<string, { name: string; color: string; total: number; count: number }> = {}
      for (const entries of Object.values(historyByEntity)) {
        for (let i = 0; i < entries.length - 1; i++) {
          const curr = entries[i], next = entries[i + 1]
          if (!curr.status_date || !next.status_date || !curr.to_status_id) continue
          const days = Math.floor(
            (new Date(next.status_date + 'T00:00:00').getTime() - new Date(curr.status_date + 'T00:00:00').getTime()) / 86400000
          )
          if (days < 0) continue
          const sid = curr.to_status_id
          const sName = curr.to_status?.name ?? 'Unknown'
          const sColor = curr.to_status?.color ?? '#6b7280'
          dwellMap[sid] ??= { name: sName, color: sColor, total: 0, count: 0 }
          dwellMap[sid].total += days
          dwellMap[sid].count++
        }
      }
      const dwellByStatus = Object.values(dwellMap)
        .map(s => ({ name: s.name, color: s.color, avgDays: s.count > 0 ? Math.round(s.total / s.count) : 0, transitions: s.count }))
        .filter(s => s.avgDays > 0)
        .sort((a, b) => b.avgDays - a.avgDays)

      // Open pipeline: partnerships with no end_date, sorted by longest open
      const dayDiff = (dateStr: string) =>
        Math.floor((today.getTime() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)

      const openPartnerships = allPartnerships
        .filter(p => !p.end_date)
        .map(p => ({
          id: p.id,
          title: p.title,
          organization: p.organization ?? null,
          status: p.status as { name: string; color: string } | null,
          startDate: p.start_date,
          daysOpen: p.start_date ? dayDiff(p.start_date) : null,
          proposedValue: p.proposed_value ?? 0,
          vitalInfo: vitalInfoMap[p.id] ?? [],
        }))
        .sort((a, b) => (b.daysOpen ?? -1) - (a.daysOpen ?? -1))

      const totalProposed = allPartnerships.reduce((s, p) => s + (p.proposed_value ?? 0), 0)

      return {
        funnel,
        dwellByStatus,
        openPartnerships,
        totalPartnerships: allPartnerships.length,
        openCount: openPartnerships.length,
        totalProposed,
        bestPct,
        worstPct,
      }
    },
  })
}

// ─── Meeting Analytics Report ─────────────────────────────────────────────────
export function useMeetingAnalyticsReport() {
  return useQuery({
    queryKey: ['report-meeting-analytics'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const cutoff90 = new Date(today)
      cutoff90.setDate(cutoff90.getDate() - 90)
      const cutoff90Str = cutoff90.toISOString().slice(0, 10)

      const [extMeetings, intMeetings, partnerships, vitalInfoMap] = await Promise.all([
        supabase.from('external_meetings').select('id, partnership_id, meeting_date').order('meeting_date', { ascending: false }),
        supabase.from('internal_meetings').select('id, partnership_id, meeting_date').order('meeting_date', { ascending: false }),
        supabase.from('partnerships').select('id, title').order('title'),
        fetchVitalInfoByPartnership(),
      ])

      if (partnerships.error) throw partnerships.error

      const partnershipNameMap: Record<string, string> = {}
      for (const p of partnerships.data ?? []) partnershipNameMap[p.id] = p.title

      const allExt = extMeetings.data ?? []
      const allInt = intMeetings.data ?? []

      // Monthly trend — last 12 months, split ext/int
      const monthlyMap: Record<string, { ext: number; int: number }> = {}
      for (const m of allExt) {
        if (!m.meeting_date) continue
        const k = m.meeting_date.slice(0, 7)
        monthlyMap[k] ??= { ext: 0, int: 0 }
        monthlyMap[k].ext++
      }
      for (const m of allInt) {
        if (!m.meeting_date) continue
        const k = m.meeting_date.slice(0, 7)
        monthlyMap[k] ??= { ext: 0, int: 0 }
        monthlyMap[k].int++
      }
      const monthlyTrend = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([k, v]) => ({
          month: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          External: v.ext,
          Internal: v.int,
          Total: v.ext + v.int,
        }))

      // Per-partnership stats
      const dayDiff = (dateStr: string) =>
        Math.floor((today.getTime() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)

      const statsMap: Record<string, { extCount: number; intCount: number; lastDate: string | null }> = {}
      for (const p of partnerships.data ?? []) statsMap[p.id] = { extCount: 0, intCount: 0, lastDate: null }

      for (const m of allExt) {
        if (!m.partnership_id) continue
        const s = statsMap[m.partnership_id]
        if (!s) continue
        s.extCount++
        if (m.meeting_date && (!s.lastDate || m.meeting_date > s.lastDate)) s.lastDate = m.meeting_date
      }
      for (const m of allInt) {
        if (!m.partnership_id) continue
        const s = statsMap[m.partnership_id]
        if (!s) continue
        s.intCount++
        if (m.meeting_date && (!s.lastDate || m.meeting_date > s.lastDate)) s.lastDate = m.meeting_date
      }

      const partnershipStats = Object.entries(statsMap)
        .map(([id, s]) => ({
          id,
          title: partnershipNameMap[id] ?? 'Unknown',
          extCount: s.extCount,
          intCount: s.intCount,
          total: s.extCount + s.intCount,
          lastMeetingDate: s.lastDate,
          daysSinceLastMeeting: s.lastDate ? dayDiff(s.lastDate) : null,
          vitalInfo: vitalInfoMap[id] ?? [],
        }))
        .sort((a, b) => b.total - a.total)

      // Cadence gap buckets
      const cadenceBuckets = [
        { label: '0–14 days', count: partnershipStats.filter(p => p.daysSinceLastMeeting !== null && p.daysSinceLastMeeting <= 14).length },
        { label: '15–30 days', count: partnershipStats.filter(p => p.daysSinceLastMeeting !== null && p.daysSinceLastMeeting > 14 && p.daysSinceLastMeeting <= 30).length },
        { label: '31–60 days', count: partnershipStats.filter(p => p.daysSinceLastMeeting !== null && p.daysSinceLastMeeting > 30 && p.daysSinceLastMeeting <= 60).length },
        { label: '60+ days', count: partnershipStats.filter(p => p.daysSinceLastMeeting !== null && p.daysSinceLastMeeting > 60).length },
        { label: 'No meetings', count: partnershipStats.filter(p => p.daysSinceLastMeeting === null).length },
      ]

      // Top partnerships — last 90 days
      const recent90Map: Record<string, { ext: number; int: number }> = {}
      for (const m of allExt) {
        if (!m.partnership_id || !m.meeting_date || m.meeting_date < cutoff90Str) continue
        recent90Map[m.partnership_id] ??= { ext: 0, int: 0 }
        recent90Map[m.partnership_id].ext++
      }
      for (const m of allInt) {
        if (!m.partnership_id || !m.meeting_date || m.meeting_date < cutoff90Str) continue
        recent90Map[m.partnership_id] ??= { ext: 0, int: 0 }
        recent90Map[m.partnership_id].int++
      }
      const topRecent90 = Object.entries(recent90Map)
        .map(([id, v]) => ({
          name: (partnershipNameMap[id] ?? 'Unknown').substring(0, 24),
          External: v.ext,
          Internal: v.int,
          total: v.ext + v.int,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      const totalMeetings = allExt.length + allInt.length
      const totalPartnerships = partnerships.data?.length ?? 0
      const avgMeetingsPerPartnership = totalPartnerships > 0
        ? Math.round((totalMeetings / totalPartnerships) * 10) / 10
        : 0
      const pctNoMeeting30d = totalPartnerships > 0
        ? Math.round(
            (partnershipStats.filter(p => p.daysSinceLastMeeting === null || p.daysSinceLastMeeting > 30).length / totalPartnerships) * 100
          )
        : 0

      return {
        monthlyTrend,
        partnershipStats,
        cadenceBuckets,
        topRecent90,
        totalMeetings,
        totalExt: allExt.length,
        totalInt: allInt.length,
        avgMeetingsPerPartnership,
        pctNoMeeting30d,
      }
    },
  })
}
