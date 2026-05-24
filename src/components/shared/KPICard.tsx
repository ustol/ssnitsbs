import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger'
  loading?: boolean
  className?: string
}

const variantStyles = {
  default: {
    border: 'border-l-zinc-300',
    icon: 'bg-zinc-100 text-zinc-500',
    value: '',
  },
  brand: {
    border: 'border-l-brand',
    icon: 'text-white',
    iconBg: 'linear-gradient(135deg, #E8621A 0%, #C84E10 100%)',
    value: 'text-brand',
  },
  success: {
    border: 'border-l-green-500',
    icon: 'bg-green-50 text-green-600',
    value: '',
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'bg-amber-50 text-amber-600',
    value: '',
  },
  danger: {
    border: 'border-l-red-500',
    icon: 'bg-red-50 text-red-600',
    value: '',
  },
}

export function KPICard({ title, value, subtitle, icon, trend, variant = 'default', loading, className }: KPICardProps) {
  const styles = variantStyles[variant]

  if (loading) {
    return (
      <Card className={cn('border-l-4', styles.border, className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-l-4', styles.border, className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', styles.value)}>{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn('shrink-0 flex h-9 w-9 items-center justify-center rounded-lg', styles.icon)}
              style={'iconBg' in styles ? { background: styles.iconBg } : undefined}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
