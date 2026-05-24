import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
          .select(`*, partnerships:partnership_internal_stakeholders(partnership:partnerships(id,title,status:status_lookup(name)))`)
          .order('name'),
        supabase
          .from('internal_meetings')
          .select('id, title, meeting_date, partnership_id, action_points')
          .order('meeting_date', { ascending: false })
          .limit(20),
      ])

      const { data, error } = stakeholderRes
      if (error) throw error

      const recentMeetings = meetingRes.data ?? []

      const rows = (data ?? []).map(s => ({
        ...s,
        partnershipCount: (s as Record<string, unknown>).partnerships ? ((s as Record<string, unknown>).partnerships as unknown[]).length : 0,
        partnershipNames: ((s as Record<string, unknown>).partnerships as Array<{ partnership?: { title: string } }> ?? [])
          .map(p => p.partnership?.title).filter(Boolean).join(', '),
      }))

      const byDepartment = Object.entries(
        rows.reduce((acc, s) => {
          const k = s.department ?? 'Unknown'
          acc[k] = (acc[k] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

      return { rows, byDepartment, total: rows.length, departments: byDepartment.length, recentMeetings }
    },
  })
}

// ─── User Performance Report ──────────────────────────────────────────────────
export function useUserPerformanceReport() {
  return useQuery({
    queryKey: ['report-user-performance'],
    queryFn: async () => {
      const [profiles, partnerships, extMeetings, intMeetings, feedback] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role'),
        supabase.from('partnerships').select('id, created_by'),
        supabase.from('external_meetings').select('id, created_by'),
        supabase.from('internal_meetings').select('id, created_by'),
        supabase.from('ddg_feedback').select('id, created_by'),
      ])

      if (profiles.error) throw profiles.error

      const allPartnerships = partnerships.data ?? []
      const allExt = extMeetings.data ?? []
      const allInt = intMeetings.data ?? []
      const allDdg = feedback.data ?? []

      const users = (profiles.data ?? []).map(p => {
        const partnerships_n = allPartnerships.filter(x => x.created_by === p.id).length
        const ext_n = allExt.filter(x => x.created_by === p.id).length
        const int_n = allInt.filter(x => x.created_by === p.id).length
        const ddg_n = allDdg.filter(x => x.created_by === p.id).length
        return { ...p, partnerships_n, ext_n, int_n, ddg_n, total: partnerships_n + ext_n + int_n + ddg_n }
      }).sort((a, b) => b.total - a.total)

      const chartData = users
        .filter(u => u.total > 0)
        .map(u => ({
          name: (u.full_name ?? u.email ?? 'Unknown').split(' ')[0],
          Partnerships: u.partnerships_n,
          'Ext Meetings': u.ext_n,
          'Int Meetings': u.int_n,
          DDG: u.ddg_n,
        }))

      // Totals across all records — attributed and unattributed
      const totals = {
        partnerships: allPartnerships.length,
        ext: allExt.length,
        int: allInt.length,
        ddg: allDdg.length,
      }
      const attributed = {
        partnerships: allPartnerships.filter(x => x.created_by).length,
        ext: allExt.filter(x => x.created_by).length,
        int: allInt.filter(x => x.created_by).length,
        ddg: allDdg.filter(x => x.created_by).length,
      }
      const unattributed =
        (totals.partnerships - attributed.partnerships) +
        (totals.ext - attributed.ext) +
        (totals.int - attributed.int) +
        (totals.ddg - attributed.ddg)

      return { users, chartData, totals, attributed, unattributed }
    },
  })
}

// ─── Executive Overview Report ────────────────────────────────────────────────
export function useExecutiveReport() {
  return useQuery({
    queryKey: ['report-executive'],
    queryFn: async () => {
      const [partnerships, extMeetings, intMeetings, ddgFeedback, settings] = await Promise.all([
        supabase.from('partnerships').select('*, status:status_lookup(name, color)').order('created_at', { ascending: false }),
        supabase.from('external_meetings').select('id, partnership_id, meeting_date, title, location, action_points').order('meeting_date', { ascending: false }),
        supabase.from('internal_meetings').select('id, partnership_id, meeting_date, title, action_points').order('meeting_date', { ascending: false }),
        supabase.from('ddg_feedback').select('id, summary, feedback_type, is_actioned, received_date').order('received_date', { ascending: false }).limit(10),
        supabase.from('system_settings').select('key, value'),
      ])

      const settingsMap: Record<string, string> = {}
      for (const s of settings.data ?? []) settingsMap[s.key] = s.value
      const bestPct = Number(settingsMap.best_case_pct ?? 60)
      const worstPct = Number(settingsMap.worst_case_pct ?? 30)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (partnerships.data ?? []).map((p: any) => {
        const ext = (extMeetings.data ?? []).filter(m => m.partnership_id === p.id).length
        const int = (intMeetings.data ?? []).filter(m => m.partnership_id === p.id).length
        return { ...p, extCount: ext, intCount: int, totalMeetings: ext + int }
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

      const ddgItems = (ddgFeedback.data ?? []).map(f => ({
        summary: f.summary as string,
        type: f.feedback_type as string,
        actioned: f.is_actioned as boolean,
        date: f.received_date as string,
      }))

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

      return { rows, byStatus, valueByStatus, topByMeetings, monthlyMeetings, projections, totalProposed, bestPct, worstPct, ddgItems, extMeetingDetails, intMeetingDetails }
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
