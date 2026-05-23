import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useAISummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (prompt: string) => {
    setIsGenerating(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke<{ summary: string; error?: string }>(
        'generate-summary',
        { body: { prompt } },
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setSummary(data?.summary ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setSummary(null)
    setError(null)
  }, [])

  return { summary, isGenerating, error, generate, reset }
}
