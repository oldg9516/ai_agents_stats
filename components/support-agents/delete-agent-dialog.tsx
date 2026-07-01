'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteSupportAgent } from '@/lib/queries/support-agents-queries'
import type { SupportAgent } from '@/lib/db/types'

export function DeleteAgentDialog({
	agent,
	open,
	onOpenChange,
}: {
	agent: SupportAgent | null
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const t = useTranslations('supportAgents')
	const deleteMutation = useDeleteSupportAgent()

	async function handleDelete() {
		if (!agent) return
		try {
			await deleteMutation.mutateAsync(agent.id)
			toast.success(t('toastDeleted'))
			onOpenChange(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('toastError'))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t('deleteTitle')}</DialogTitle>
					<DialogDescription>
						{t('deleteConfirm', { name: agent?.name ?? '' })}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
						{t('cancel')}
					</Button>
					<Button variant='destructive' onClick={handleDelete} disabled={deleteMutation.isPending}>
						{deleteMutation.isPending ? t('deleting') : t('delete')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
