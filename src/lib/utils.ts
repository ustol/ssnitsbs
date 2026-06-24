import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, fmt) : '—'
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `≈ ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function truncate(str: string | null | undefined, max = 50): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calcProjection(proposed: number, pct: number): number {
  return Math.round(proposed * (pct / 100))
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()]/g, '')
  return /^\+?\d{7,15}$/.test(digits)
}
