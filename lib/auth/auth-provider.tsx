'use client'

import { createContext, useContext } from 'react'
import { SessionProvider, useSession, signOut as nextAuthSignOut } from 'next-auth/react'

interface AuthUser {
	email: string | null | undefined
	name?: string | null
	image?: string | null
	user_metadata: {
		full_name?: string | null
		avatar_url?: string | null
	}
}

interface AuthContextType {
	user: AuthUser | null
	session: { user: AuthUser } | null
	isLoading: boolean
	signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	session: null,
	isLoading: true,
	signOut: async () => {},
})

function AuthInner({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession()
	const isLoading = status === 'loading'

	const user: AuthUser | null = session?.user
		? {
				email: session.user.email,
				name: session.user.name,
				image: session.user.image,
				user_metadata: {
					full_name: session.user.name,
					avatar_url: session.user.image,
				},
			}
		: null

	const signOut = async () => {
		await nextAuthSignOut({ redirectTo: '/' })
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				session: user ? { user } : null,
				isLoading,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<AuthInner>{children}</AuthInner>
		</SessionProvider>
	)
}

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}
