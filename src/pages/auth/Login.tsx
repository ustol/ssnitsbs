import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { writeAudit } from '@/hooks/useAuditLog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormValues = z.infer<typeof schema>

export function Login() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(values)
    if (authError) { setError(authError.message); return }
    writeAudit({
      action:      'login',
      entity_type: 'auth',
      entity_id:   authData.user?.id ?? null,
      entity_name: authData.user?.email ?? null,
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-[#f5f4f2]">
      {/* Left panel — dark with SSNIT orange accents */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#0f0f11' }}>

        {/* Orange glow blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #E8621A 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #E8621A 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,.4) 40px,rgba(255,255,255,.4) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,.4) 40px,rgba(255,255,255,.4) 41px)`,
          }} />

        {/* Top orange accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, #E8621A 0%, rgba(232,98,26,0.3) 100%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-extrabold text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8621A 0%, #C84E10 100%)', boxShadow: '0 0 20px rgba(232,98,26,0.4)' }}
          >
            S
          </div>
          <div>
            <p className="text-[0.875rem] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>SSNIT SBS</p>
            <p className="text-[0.65rem] leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Strategic Business Support</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-5">
          <div className="w-10 h-[3px] rounded-full bg-brand" />
          <h1 className="text-[2rem] font-bold leading-[1.2] tracking-tight text-white">
            Partnerships.<br />Meetings.<br />Progress.
          </h1>
          <p className="text-[0.875rem] leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Track strategic partnerships, manage stakeholder meetings, and monitor DDG feedback — all in one place.
          </p>

          <div className="flex gap-6 pt-2">
            {[
              { label: 'Partnerships', desc: 'Tracked' },
              { label: 'Meetings', desc: 'Managed' },
              { label: 'Real-time', desc: 'Insights' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[0.8rem] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</p>
                <p className="text-[0.7rem]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[0.7rem]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} SSNIT. All rights reserved.
        </p>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-extrabold text-sm"
              style={{ background: 'linear-gradient(135deg, #E8621A 0%, #C84E10 100%)' }}
            >
              S
            </div>
            <div>
              <p className="text-[0.8125rem] font-bold leading-tight">SSNIT SBS</p>
              <p className="text-[0.65rem] text-muted-foreground leading-none mt-0.5">Strategic Business Support</p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Orange top stripe */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #E8621A 0%, #f59b5e 100%)' }} />

            <div className="p-7 sm:p-8">
              <div className="mb-7">
                <h2 className="text-[1.125rem] font-bold tracking-tight">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@ssnit.com.gh"
                    {...register('email')}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-9"
                      {...register('password')}
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="w-full h-10 text-sm font-semibold mt-2" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : (
                    <span className="flex items-center gap-1.5">Sign in <ArrowRight className="h-3.5 w-3.5" /></span>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            SSNIT Special Business Support System
          </p>
        </div>
      </div>
    </div>
  )
}
