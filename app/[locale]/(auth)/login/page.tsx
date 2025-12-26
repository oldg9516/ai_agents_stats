'use client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useParams, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const isDev = process.env.NODE_ENV === 'development'
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_LOGIN || ''
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD || ''

function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox='0 0 24 24'>
			<path
				fill='#4285F4'
				d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
			/>
			<path
				fill='#34A853'
				d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
			/>
			<path
				fill='#FBBC05'
				d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
			/>
			<path
				fill='#EA4335'
				d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
			/>
		</svg>
	)
}

export default function LoginPage() {
	const t = useTranslations('auth')
	const params = useParams()
	const searchParams = useSearchParams()
	const locale = params.locale as string
	const redirectTo = searchParams.get('redirect')
	const error = searchParams.get('error')

	// Dev mode state - pre-fill from env vars
	const [devEmail, setDevEmail] = useState(DEV_EMAIL)
	const [devPassword, setDevPassword] = useState(DEV_PASSWORD)
	const [devLoading, setDevLoading] = useState(false)
	const [devError, setDevError] = useState<string | null>(null)

	const handleDevSignIn = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!devEmail || !devPassword) {
			setDevError('Email and password required')
			return
		}

		setDevLoading(true)
		setDevError(null)

		const { error } = await supabase.auth.signInWithPassword({
			email: devEmail,
			password: devPassword,
		})

		if (error) {
			setDevLoading(false)
			setDevError(error.message)
		} else {
			// Redirect on success
			const destination = redirectTo || `/${locale}/dashboard`
			window.location.href = destination
		}
	}

	const handleGoogleSignIn = async () => {
		const origin = window.location.origin
		const redirectUrl = `${origin}/api/auth/callback?locale=${locale}&next=${
			redirectTo || `/${locale}/dashboard`
		}`

		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: redirectUrl,
				queryParams: {
					access_type: 'offline',
					prompt: 'consent',
				},
			},
		})
	}

	return (
		<Card className='w-full max-w-md mx-4'>
			<CardHeader className='text-center'>
				<CardTitle className='text-2xl'>{t('login.title')}</CardTitle>
				<CardDescription>{t('login.description')}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{error && (
					<div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
						{t(`login.errors.${error}`)}
					</div>
				)}

				{/* Dev mode: email/password login */}
				{isDev && (
					<form onSubmit={handleDevSignIn} className='space-y-4'>
						<div className='p-2 text-xs text-center bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md'>
							DEV MODE
						</div>

						{devError && (
							<div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>
								{devError}
							</div>
						)}

						<div className='space-y-2'>
							<Label htmlFor='email'>Email</Label>
							<Input
								id='email'
								type='email'
								placeholder='@levhaolam.com'
								value={devEmail}
								onChange={e => setDevEmail(e.target.value)}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='password'>Password</Label>
							<Input
								id='password'
								type='password'
								value={devPassword}
								onChange={e => setDevPassword(e.target.value)}
							/>
						</div>

						<Button type='submit' className='w-full' disabled={devLoading}>
							{devLoading ? 'Signing in...' : 'Sign in (Dev)'}
						</Button>

						<div className='relative'>
							<div className='absolute inset-0 flex items-center'>
								<span className='w-full border-t' />
							</div>
							<div className='relative flex justify-center text-xs uppercase'>
								<span className='bg-background px-2 text-muted-foreground'>
									Or
								</span>
							</div>
						</div>
					</form>
				)}

				<Button
					onClick={handleGoogleSignIn}
					variant='outline'
					className='w-full gap-2'
				>
					<GoogleIcon className='h-5 w-5' />
					{t('login.googleButton')}
				</Button>

				<p className='text-center text-sm text-muted-foreground'>
					{t('login.domainRestriction', { domain: 'levhaolam.com' })}
				</p>
			</CardContent>
		</Card>
	)
}
