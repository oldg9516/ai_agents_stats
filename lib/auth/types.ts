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
	user: {
		email: string | null | undefined
		name?: string | null
		image?: string | null
		user_metadata: {
			full_name?: string | null
			avatar_url?: string | null
		}
	} | null
	session: unknown
	profile: Profile | null
	isLoading: boolean
}

export interface AuthContextType extends AuthState {
	signOut: () => Promise<void>
	refreshSession: () => Promise<void>
}
