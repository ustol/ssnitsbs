import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/hooks/useUsers'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
})
type FormValues = z.infer<typeof schema>

const passwordSchema = z.object({
  password: z.string().min(8, 'Must be at least 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type PasswordValues = z.infer<typeof passwordSchema>

export function Profile() {
  const { user, profile } = useAuth()
  const updateMutation = useUpdateProfile()
  const [pwLoading, setPwLoading] = useState(false)

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (profile) form.reset({ full_name: profile.full_name ?? '' })
  }, [profile, form])

  const onSaveProfile = async (values: FormValues) => {
    if (!user) return
    await updateMutation.mutateAsync({ id: user.id, values })
  }

  const onChangePassword = async (values: PasswordValues) => {
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setPwLoading(false)
    if (!error) pwForm.reset()
  }

  const handleSignOut = () => supabase.auth.signOut()

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <PageHeader title="My Profile" />

      {/* Profile info */}
      <Card>
        <CardHeader className="py-3 px-5"><CardTitle className="text-sm font-semibold">Account</CardTitle></CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-base">{getInitials(profile?.full_name ?? user?.email ?? '')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile?.full_name ?? 'No name set'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{profile?.role ?? 'viewer'}</Badge>
            </div>
          </div>
          <Separator className="mb-5" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSaveProfile)} className="space-y-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-1.5">
                <FormLabel>Email</FormLabel>
                <Input value={user?.email ?? ''} disabled className="text-muted-foreground" />
              </div>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="py-3 px-5"><CardTitle className="text-sm font-semibold">Change Password</CardTitle></CardHeader>
        <CardContent className="px-5 pb-5">
          <Form {...pwForm}>
            <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField control={pwForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pwForm.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" size="sm" variant="outline" disabled={pwLoading}>
                {pwLoading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="destructive" size="sm" onClick={handleSignOut}>
        <LogOut className="h-3.5 w-3.5 mr-1.5" />Sign Out
      </Button>
    </div>
  )
}
