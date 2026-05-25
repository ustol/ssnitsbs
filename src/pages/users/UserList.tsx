import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { useUsers, useUpdateProfile, useCreateUser, useDeleteUser } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getInitials, formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

const editSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'viewer']),
})
type EditValues = z.infer<typeof editSchema>

const createSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  first_name: z.string().min(1, 'First name is required'),
  other_names: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'viewer']),
})
type CreateValues = z.infer<typeof createSchema>

export function UserList() {
  const { data = [], isLoading } = useUsers()
  const { profile: currentProfile } = useAuth()
  const updateMutation = useUpdateProfile()
  const createMutation = useCreateUser()
  const deleteMutation = useDeleteUser()

  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'viewer' },
  })

  const openEdit = (p: Profile) => {
    setEditTarget(p)
    editForm.reset({ full_name: p.full_name ?? '', role: (p.role as 'admin' | 'manager' | 'viewer') ?? 'viewer' })
  }

  const openCreate = () => {
    createForm.reset({ role: 'viewer', surname: '', first_name: '', other_names: '', phone: '', email: '', password: '' })
    setShowPassword(false)
    setCreateOpen(true)
  }

  const onEdit = async (values: EditValues) => {
    if (!editTarget) return
    await updateMutation.mutateAsync({ id: editTarget.id, values })
    setEditTarget(null)
  }

  const onCreate = async (values: CreateValues) => {
    await createMutation.mutateAsync(values)
    setCreateOpen(false)
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
      key: 'phone',
      header: 'Phone',
      cell: row => <span className="text-sm text-muted-foreground">{row.phone ?? '—'}</span>,
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
          <div className="flex justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(row) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {row.id !== currentProfile?.id && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={e => { e.stopPropagation(); setDeleteTarget(row) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : null
      ),
      className: 'w-[90px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Users"
        subtitle={`${data.length} members`}
        actions={
          currentProfile?.role === 'admin' ? (
            <Button size="sm" onClick={openCreate}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />New User
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

      {/* ── Edit dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)}>
              <div className="px-6 py-5 space-y-4">
                <FormField control={editForm.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="role" render={({ field }) => (
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

      {/* ── Delete confirmation ── */}
      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
        loading={deleteMutation.isPending}
        description={deleteTarget ? `This will permanently delete ${deleteTarget.full_name ?? deleteTarget.email ?? 'this user'} and cannot be undone.` : undefined}
      />

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={open => !open && setCreateOpen(false)}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>New User</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreate)}>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={createForm.control} name="first_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Kwame" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="surname" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Mensah" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={createForm.control} name="other_names" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Names <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="Middle name(s)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={createForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="024 000 0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
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

                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="email" placeholder="user@ssnit.org.gh" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          className="pr-9"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
