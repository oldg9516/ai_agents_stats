import { QueryProvider } from '@/lib/providers/query-provider'
import { NextIntlClientProvider } from 'next-intl'

const Provider = ({
	children,
	messages,
}: {
	children: React.ReactNode
	messages: Record<string, string>
}) => {
	return (
		<NextIntlClientProvider messages={messages}>
			<QueryProvider>{children}</QueryProvider>
		</NextIntlClientProvider>
	)
}
export default Provider
