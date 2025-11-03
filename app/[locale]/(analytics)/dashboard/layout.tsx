/**
 * Dashboard Layout with Parallel Routes
 *
 * Renders both the main page and the @modal slot
 * Modal appears on top when intercepted route is active
 */

export default function DashboardLayout({
	children,
	modal,
}: {
	children: React.ReactNode
	modal: React.ReactNode
}) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
