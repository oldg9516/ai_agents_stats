export default function SubscriptionLayout({
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
