import { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}
