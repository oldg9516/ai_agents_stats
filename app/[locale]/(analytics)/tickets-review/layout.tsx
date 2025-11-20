/**
 * Tickets Review Layout
 *
 * Supports parallel routes for modal display
 * @modal slot will be rendered when intercepting routes are active
 */
export default function TicketsReviewLayout({
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
