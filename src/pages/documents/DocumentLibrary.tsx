import { useRef, useState } from 'react'
import { Upload, Trash2, Download, FileText, File, CloudUpload, X } from 'lucide-react'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useDocuments'
import { usePartnerships } from '@/hooks/usePartnerships'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { PartnershipWithRelations } from '@/types/database'

type Row = Record<string, unknown>

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-zinc-400" />
}

export function DocumentLibrary() {
  const { data = [], isLoading } = useDocuments()
  const { data: partnerships = [] } = usePartnerships()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMeta, setUploadMeta] = useState({ title: '', partnership_id: '' })
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setSelectedFile(f)
      setUploadMeta(m => ({ ...m, title: f.name.replace(/\.[^.]+$/, '') }))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    await uploadMutation.mutateAsync({
      file: selectedFile,
      meta: {
        title: uploadMeta.title || selectedFile.name,
        partnership_id: uploadMeta.partnership_id || null,
      },
    })
    setUploadOpen(false)
    setSelectedFile(null)
    setUploadMeta({ title: '', partnership_id: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (row: Row) => {
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(row.file_path as string, 60)
    if (urlData?.signedUrl) window.open(urlData.signedUrl, '_blank')
  }

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Name',
      cell: row => (
        <div className="flex items-center gap-2">
          <FileIcon type={(row.file_type as string) || ''} />
          <span className="font-medium">{row.title as string}</span>
        </div>
      ),
    },
    {
      key: 'partnership',
      header: 'Partnership',
      cell: row => (row.partnership as { title: string } | null)?.title ?? '—',
    },
    {
      key: 'file_size',
      header: 'Size',
      cell: row => row.file_size ? formatBytes(row.file_size as number) : '—',
    },
    {
      key: 'created_at',
      header: 'Uploaded',
      cell: row => formatDate(row.created_at as string),
    },
    {
      key: 'uploaded_by',
      header: 'By',
      cell: row => (row.uploaded_by_profile as { full_name: string } | null)?.full_name ?? '—',
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(row)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      className: 'w-[80px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Document Library"
        subtitle={`${data.length} documents`}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Document
          </Button>
        }
      />

      <DataTable
        data={data as Row[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['title'] as (keyof Row)[]}
        searchPlaceholder="Search documents…"
        emptyTitle="No documents yet"
        emptyDescription="Upload files to keep them organised by partnership"
        emptyAction={<Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5 mr-1.5" />Upload Document</Button>}
      />

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <CloudUpload className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <DialogTitle className="text-base">Upload Document</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Attach a file to the document library</p>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* File drop zone */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File</Label>
              <div
                className="mt-2 relative rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 hover:border-brand/40 hover:bg-brand/5 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="h-9 w-9 rounded-lg bg-white border flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="h-6 w-6 rounded-full hover:bg-zinc-200 flex items-center justify-center shrink-0"
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        setUploadMeta(m => ({ ...m, title: '' }))
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center mb-3">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to choose a file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, images and more</p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</Label>
              <Input
                value={uploadMeta.title}
                onChange={e => setUploadMeta(m => ({ ...m, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>

            {/* Partnership */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Partnership <span className="normal-case">(optional)</span>
              </Label>
              <Select
                value={uploadMeta.partnership_id}
                onValueChange={v => setUploadMeta(m => ({ ...m, partnership_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select partnership" /></SelectTrigger>
                <SelectContent>
                  {(partnerships as PartnershipWithRelations[]).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(
              { id: deleteTarget.id as string, filePath: deleteTarget.file_path as string },
              { onSuccess: () => setDeleteTarget(null) },
            )
          }
        }}
        loading={deleteMutation.isPending}
        description="The file will be permanently removed from storage."
      />
    </div>
  )
}
