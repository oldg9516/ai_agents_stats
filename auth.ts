import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID,
			clientSecret: process.env.AUTH_GOOGLE_SECRET,
		}),
	],
	pages: {
		signIn: '/login',
	},
	callbacks: {
		signIn({ profile }) {
			// Domain restriction — replaces Supabase 3-layer validation
			return profile?.email?.endsWith('@levhaolam.com') ?? false
		},
		authorized({ auth }) {
			return !!auth
		},
		jwt({ token, profile }) {
			if (profile) {
				token.name = profile.name
				token.picture = profile.picture
			}
			return token
		},
		session({ session, token }) {
			if (token.picture) session.user.image = token.picture as string
			return session
		},
	},
})
