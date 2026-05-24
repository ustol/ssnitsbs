import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  if (!title) return actions ? (
    <div className={cn('flex items-center justify-end mb-4', className)}>
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </div>
  ) : null

  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6', className)}>
      <div className="flex items-start gap-3">
        <div className="w-[3px] self-stretch rounded-full bg-brand shrink-0 mt-0.5" />
        <div>
          <h1 className="text-[1.0625rem] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
