'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentScheduleCell } from '@/components/support-agents/agent-schedule-cell'
import { AgentFormDialog } from '@/components/support-agents/agent-form-dialog'
import { DeleteAgentDialog } from '@/components/support-agents/delete-agent-dialog'
import { WEEKDAY_KEYS } from '@/constants/support-agents'
import {
	useSupportAgents,
	useToggleSupportAgent,
} from '@/lib/queries/support-agents-queries'
import type { SupportAgent } from '@/lib/db/types'

export function SupportAgentsContent() {
	const t = useTranslations('supportAgents')
	const { agents, isLoading, error } = useSupportAgents()
	const toggleMutation = useToggleSupportAgent()

	const [formOpen, setFormOpen] = useState(false)
	const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
	const [editing, setEditing] = useState<SupportAgent | undefined>(undefined)
	const [deleteTarget, setDeleteTarget] = useState<SupportAgent | null>(null)
	const [deleteOpen, setDeleteOpen] = useState(false)

	function openAdd() {
		setFormMode('add')
		setEditing(undefined)
		setFormOpen(true)
	}

	function openEdit(agent: SupportAgent) {
		setFormMode('edit')
		setEditing(agent)
		setFormOpen(true)
	}

	function openDelete(agent: SupportAgent) {
		setDeleteTarget(agent)
		setDeleteOpen(true)
	}

	async function handleToggle(agent: SupportAgent, enabled: boolean) {
		try {
			await toggleMutation.mutateAsync({ id: agent.id, enabled })
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('toastError'))
		}
	}

	return (
		<div className='flex flex-col gap-4 p-4 md:p-6'>
			<div className='flex items-center justify-between gap-2'>
				<div>
					<h1 className='text-2xl font-semibold'>{t('title')}</h1>
					<p className='text-muted-foreground text-sm'>{t('subtitle')}</p>
				</div>
				<Button onClick={openAdd}>
					<IconPlus className='mr-1 size-4' />
					{t('addAgent')}
				</Button>
			</div>

			<p className='text-muted-foreground text-xs'>{t('overnightHint')}</p>

			{error ? (
				<div className='text-destructive text-sm'>{error.message}</div>
			) : isLoading ? (
				<Skeleton className='h-64 w-full' />
			) : (
				<div className='overflow-x-auto rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('name')}</TableHead>
								<TableHead>{t('email')}</TableHead>
								{WEEKDAY_KEYS.map(day => (
									<TableHead key={day} className='text-center'>
										{t(`weekdays.${day}`)}
									</TableHead>
								))}
								<TableHead className='text-center'>{t('enabled')}</TableHead>
								<TableHead className='text-right'>{t('actions')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{agents.length === 0 ? (
								<TableRow>
									<TableCell colSpan={WEEKDAY_KEYS.length + 4} className='text-muted-foreground text-center'>
										{t('empty')}
									</TableCell>
								</TableRow>
							) : (
								agents.map(agent => (
									<TableRow key={agent.id}>
										<TableCell className='font-medium'>{agent.name}</TableCell>
										<TableCell className='text-muted-foreground text-sm'>{agent.email}</TableCell>
										{WEEKDAY_KEYS.map(day => (
											<TableCell key={day} className='text-center'>
												<AgentScheduleCell slot={agent.schedule[day]} offLabel={t('off')} />
											</TableCell>
										))}
										<TableCell className='text-center'>
											<Switch
												checked={agent.enabled}
												onCheckedChange={checked => handleToggle(agent, checked)}
											/>
										</TableCell>
										<TableCell className='text-right'>
											<div className='flex justify-end gap-1'>
												<Button variant='ghost' size='icon' onClick={() => openEdit(agent)} aria-label={t('edit')}>
													<IconPencil className='size-4' />
												</Button>
												<Button variant='ghost' size='icon' onClick={() => openDelete(agent)} aria-label={t('delete')}>
													<IconTrash className='size-4' />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			<AgentFormDialog mode={formMode} agent={editing} open={formOpen} onOpenChange={setFormOpen} />
			<DeleteAgentDialog agent={deleteTarget} open={deleteOpen} onOpenChange={setDeleteOpen} />
		</div>
	)
}
