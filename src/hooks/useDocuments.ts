import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types/database'

const QUERY_KEY = 'documents'

export function useDocuments() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`*, partnership:partnerships(title), uploaded_by_profile:profiles(full_name)`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: Partial<Document> }) => {
      const path = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('documents')
        .insert({ ...meta, file_path: path, file_size: file.size, file_type: file.type })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['library-data'] })
      toast.success('Document uploaded')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from('documents').remove([filePath])
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['library-data'] })
      toast.success('Document deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDocumentUrl(filePath: string | null) {
  return useQuery({
    queryKey: ['document-url', filePath],
    queryFn: async () => {
      if (!filePath) return null
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600)
      if (error) throw error
      return data.signedUrl
    },
    enabled: !!filePath,
    staleTime: 3_300_000,
  })
}
