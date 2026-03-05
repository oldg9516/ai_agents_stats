import { Metadata } from 'next'
import { EvalIntentDiagnosticsFullPage } from '@/components/eval-intent-diagnostics'

interface EvalIntentPageProps {
	params: Promise<{
		intentId: string
	}>
}

export async function generateMetadata({
	params,
}: EvalIntentPageProps): Promise<Metadata> {
	const { intentId } = await params
	const decoded = decodeURIComponent(intentId)
	return {
		title: `Intent ${decoded} | Eval Dashboard`,
		description: `Diagnostics for intent ${decoded}`,
	}
}

/**
 * Full-page fallback for eval intent diagnostics
 * Shown when accessing /eval-dashboard/intent/:intentId directly
 */
export default async function EvalIntentPage({
	params,
}: EvalIntentPageProps) {
	const { intentId } = await params
	const decodedIntentId = decodeURIComponent(intentId)

	return (
		<div className='flex flex-1 flex-col'>
			<div className='@container/main flex flex-1 flex-col gap-2'>
				<EvalIntentDiagnosticsFullPage intentId={decodedIntentId} />
			</div>
		</div>
	)
}
