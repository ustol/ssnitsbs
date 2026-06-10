import { Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export function LabourMinistry() {
  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Compliance Activities"
        subtitle="Compliance engagement and activity tracker"
      />
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-16 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center shadow-sm">
          <Briefcase size={22} className="text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700">Compliance Activities</p>
          <p className="text-xs text-zinc-400 mt-1">This section is under development</p>
        </div>
      </div>
    </div>
  )
}
