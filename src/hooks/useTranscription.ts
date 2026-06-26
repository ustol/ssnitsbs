import { useCallback, useState } from 'react'

export function useTranscribeAudio() {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribe = useCallback(async (file: File): Promise<string | null> => {
    setIsTranscribing(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('audio', file)
      const res = await fetch('/api/transcribe', { method: 'POST', body })
      const json = (await res.json()) as { text?: string; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `Server error ${res.status}`)
      return json.text ?? ''
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to transcribe audio'
      setError(msg.includes('OPENAI_API_KEY')
        ? 'Add OPENAI_API_KEY to your Vercel project environment variables to enable transcription.'
        : msg)
      return null
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  return { transcribe, isTranscribing, error }
}
