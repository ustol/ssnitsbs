import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(user: User) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setState({ user, profile: data ?? null, loading: false })
  }

  return state
}
