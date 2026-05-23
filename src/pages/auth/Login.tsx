import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
    const { error: authError } = await supabase.auth.signInWithPassword(values)
    if (authError) { setError(authError.message); return }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0c0c0e] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,.3) 40px,rgba(255,255,255,.3) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,.3) 40px,rgba(255,255,255,.3) 41px)`,
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <Building2 className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-semibold text-[0.9375rem] tracking-tight">SBS System</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Strategic Business<br />Solutions Management
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            Track partnerships, manage stakeholder meetings, and monitor DDG feedback — all in one place.
          </p>
        </div>
        <p className="relative z-10 text-xs text-zinc-600">
          © {new Date().getFullYear()} SBS System. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-[#f4f4f5]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0c0c0e]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">SBS System</span>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-[1.0625rem] font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : (
                  <>Sign in <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
