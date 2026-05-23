import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil } from 'lucide-react'
import { useUsers, useUpdateProfile } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getInitials, formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'viewer']),
})
type FormValues = z.infer<typeof schema>

export function UserList() {
  const { data = [], isLoading } = useUsers()
  const { profile: currentProfile } = useAuth()
  const updateMutation = useUpdateProfile()
  const [editTarget, setEditTarget] = useState<Profile | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const openEdit = (p: Profile) => {
    setEditTarget(p)
    form.reset({ full_name: p.full_name ?? '', role: (p.role as 'admin' | 'manager' | 'viewer') ?? 'viewer' })
  }

  const onSubmit = async (values: FormValues) => {
    if (!editTarget) return
    await updateMutation.mutateAsync({ id: editTarget.id, values })
    setEditTarget(null)
  }

  const columns: Column<Profile>[] = [
    {
      key: 'name',
      header: 'User',
      cell: row => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{getInitials(row.full_name ?? row.email ?? '')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-[0.8125rem]">{row.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: row => (
        <Badge variant={row.role === 'admin' ? 'brand' : row.role === 'manager' ? 'secondary' : 'outline'}>
          {row.role ?? 'viewer'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      cell: row => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        currentProfile?.role === 'admin' ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(row) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null
      ),
      className: 'w-[60px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Users"
        subtitle={`${data.length} members`}
        actions={
          currentProfile?.role === 'admin' ? (
            <Button size="sm" variant="outline" disabled>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />Invite User
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        searchKeys={['full_name', 'email'] as (keyof Profile)[]}
        searchPlaceholder="Search users…"
        emptyTitle="No users found"
      />

      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
