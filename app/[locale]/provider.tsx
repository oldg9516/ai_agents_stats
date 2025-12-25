'use client'

import { QueryProvider } from '@/lib/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { AuthProvider } from '@/lib/auth/auth-provider'

const Provider = ({
	children,
	messages,
	locale,
}: {
	children: React.ReactNode
	messages: Record<string, string>
	locale: string
}) => {
	return (
		<NextIntlClientProvider messages={messages} locale={locale}>
			<ThemeProvider
				attribute='class'
				defaultTheme='light'
				enableSystem={false}
				disableTransitionOnChange
			>
				<AuthProvider>
					<QueryProvider>{children}</QueryProvider>
				</AuthProvider>
				<Toaster />
			</ThemeProvider>
		</NextIntlClientProvider>
	)
}
export default Provider
