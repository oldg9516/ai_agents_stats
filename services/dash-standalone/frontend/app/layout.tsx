import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'Dash AI — Analytics Chat',
	description: 'Self-learning SQL analytics agent',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='en'>
			<body>{children}</body>
		</html>
	)
}
