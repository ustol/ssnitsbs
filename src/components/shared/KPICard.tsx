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

const variantClasses = {
  default: 'border-l-zinc-300',
  brand: 'border-l-brand',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  danger: 'border-l-red-500',
}

const iconVariantClasses = {
  default: 'bg-zinc-100 text-zinc-600',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
}

export function KPICard({ title, value, subtitle, icon, trend, variant = 'default', loading, className }: KPICardProps) {
  if (loading) {
    return (
      <Card className={cn('border-l-4', variantClasses[variant], className)}>
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
    <Card className={cn('border-l-4', variantClasses[variant], className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn('shrink-0 flex h-9 w-9 items-center justify-center rounded-lg', iconVariantClasses[variant])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
