import { Suspense } from 'react'
import { SupportAgentsContent } from '@/components/support-agents-content'
import SpinnerComponent from '@/components/SpinnerComponent'

/**
 * Support Agents & Schedule page — CRUD for the `support_agents` table that
 * drives the Off-Shift Unassign n8n automation.
 */
export default function SupportAgentsPage() {
	return (
		<Suspense fallback={<SpinnerComponent />}>
			<SupportAgentsContent />
		</Suspense>
	)
}
