import { useRef, useState } from 'react'
import { Upload, CloudUpload, FileText, File, FolderOpen, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useLibraryData, type LibraryItem } from '@/hooks/useLibraryData'
import { usePartnerships } from '@/hooks/usePartnerships'
import { useUploadDocument, useDeleteDocument } from '@/hooks/useDocuments'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/storage'
import { PartnershipFolder, type FileFilter } from './PartnershipFolder'
import { ImageLightbox } from './ImageLightbox'
import type { PartnershipWithRelations } from '@/types/database'

const TYPE_FILTERS: { value: FileFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'document', label: 'Documents' },
  { value: 'audio', label: 'Audio' },
]

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="h-8 w-80" />
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(j => <Skeleton key={j} className="aspect-square rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DocumentLibrary() {
  const { data, isLoading } = useLibraryData()
  const { data: partnerships = [] } = usePartnerships()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMeta, setUploadMeta] = useState({ title: '', partnership_id: '' })
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null)
  const [lightboxItem, setLightboxItem] = useState<LibraryItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<FileFilter>('all')
  const [unlinkedOpen, setUnlinkedOpen] = useState(true)

  const groups = data?.groups ?? []
  const unlinked = data?.unlinked ?? []
  const totalFiles =
    groups.reduce((sum, g) => sum + g.items.length, 0) + unlinked.length

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

  const filteredUnlinked = unlinked.filter(item => {
    if (typeFilter !== 'all' && item.file_type !== typeFilter) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const hasVisibleGroups = groups.some(g =>
    g.items.some(item => {
      if (typeFilter !== 'all' && item.file_type !== typeFilter) return false
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    }),
  )
  const hasAnyContent = hasVisibleGroups || filteredUnlinked.length > 0

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Document Library"
        subtitle={
          totalFiles === 0
            ? 'No files yet'
            : `${totalFiles} file${totalFiles !== 1 ? 's' : ''} across ${groups.length} partnership${groups.length !== 1 ? 's' : ''}`
        }
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Document
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search files…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                typeFilter === f.value
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {groups.length === 0 && unlinked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium">No files yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload documents, or add attachments to meetings and they will appear here
          </p>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Document
          </Button>
        </div>
      ) : !hasAnyContent ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No files match your search
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <PartnershipFolder
              key={group.partnership_id}
              group={group}
              typeFilter={typeFilter}
              searchQuery={searchQuery}
              onDeleteLibraryItem={setDeleteTarget}
              onImageClick={setLightboxItem}
            />
          ))}

          {filteredUnlinked.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden opacity-80">
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setUnlinkedOpen(o => !o)}
              >
                {unlinkedOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-semibold text-sm flex-1 text-muted-foreground">
                  Unlinked Documents
                </span>
                <span className="text-xs text-muted-foreground mr-1">
                  {filteredUnlinked.length} file{filteredUnlinked.length !== 1 ? 's' : ''}
                </span>
              </button>

              {unlinkedOpen && (
                <div className="border-t px-4 pb-2 divide-y">
                  {filteredUnlinked.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2.5">
                      {item.mime_type?.includes('pdf') ? (
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.file_size ? formatBytes(item.file_size) : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => item.getUrl().then(u => window.open(u, '_blank'))}
                        >
                          <Upload className="h-3.5 w-3.5 rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <CloudUpload className="h-[1.125rem] w-[1.125rem] text-brand" />
              </div>
              <div>
                <DialogTitle className="text-base">Upload Document</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach a file to the document library
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                File
              </Label>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Word, Excel, images and more
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Title
              </Label>
              <Input
                value={uploadMeta.title}
                onChange={e => setUploadMeta(m => ({ ...m, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Partnership <span className="normal-case">(optional)</span>
              </Label>
              <Select
                value={uploadMeta.partnership_id}
                onValueChange={v => setUploadMeta(m => ({ ...m, partnership_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partnership" />
                </SelectTrigger>
                <SelectContent>
                  {(partnerships as PartnershipWithRelations[]).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setUploadOpen(false)}
            >
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

      <ImageLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(
              { id: deleteTarget.id, filePath: deleteTarget.file_path },
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
