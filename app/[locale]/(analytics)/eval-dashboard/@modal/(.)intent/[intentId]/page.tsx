/**
 * Eval Intent Diagnostics Modal - Parallel Route
 *
 * Intercepts /eval-dashboard/intent/:intentId
 * Shows diagnostics in a modal overlay
 */

import { EvalIntentDiagnosticsModal } from '@/components/eval-intent-diagnostics'

interface EvalIntentModalPageProps {
	params: Promise<{
		intentId: string
	}>
}

export default async function EvalIntentModalPage({
	params,
}: EvalIntentModalPageProps) {
	const { intentId } = await params
	const decodedIntentId = decodeURIComponent(intentId)

	return <EvalIntentDiagnosticsModal intentId={decodedIntentId} />
}
