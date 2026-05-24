import { useState, useCallback } from 'react'

export function useAISummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (prompt: string) => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const json = (await res.json()) as { summary?: string; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `Server error ${res.status}`)
      setSummary(json.summary ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate summary'
      setError(msg.includes('ANTHROPIC_API_KEY')
        ? 'Add ANTHROPIC_API_KEY to your Vercel project environment variables to enable AI summaries.'
        : msg)
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
