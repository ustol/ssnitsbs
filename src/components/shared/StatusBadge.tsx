import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  color?: string | null
}

const colorMap: Record<string, string> = {
  'Active': 'bg-green-50 text-green-700 border-green-200',
  'Inactive': 'bg-zinc-100 text-zinc-600 border-zinc-200',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-blue-50 text-blue-700 border-blue-200',
  'Terminated': 'bg-red-50 text-red-700 border-red-200',
  'Suspended': 'bg-orange-50 text-orange-700 border-orange-200',
}

export function StatusBadge({ status, color }: StatusBadgeProps) {
  const classes = color
    ? `border`
    : colorMap[status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${classes}`}
      style={color ? { backgroundColor: `${color}15`, color, borderColor: `${color}40` } : undefined}
    >
      {status}
    </span>
  )
}
