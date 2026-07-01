'use client'

import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { WEEKDAY_KEYS, DEFAULT_AGENT_TIMEZONE } from '@/constants/support-agents'
import { validateAgentInput } from '@/lib/utils/support-agents-validation'
import {
	useCreateSupportAgent,
	useUpdateSupportAgent,
} from '@/lib/queries/support-agents-queries'
import type { AgentSchedule, SupportAgent, Weekday } from '@/lib/db/types'

type FormDay = { off: boolean; start: string; end: string }
type FormSchedule = Record<Weekday, FormDay>

function emptyForm(): FormSchedule {
	return WEEKDAY_KEYS.reduce((acc, day) => {
		acc[day] = { off: true, start: '09:00', end: '17:00' }
		return acc
	}, {} as FormSchedule)
}

function scheduleToForm(schedule: AgentSchedule): FormSchedule {
	return WEEKDAY_KEYS.reduce((acc, day) => {
		const slot = schedule[day]
		acc[day] = slot
			? { off: false, start: slot.start, end: slot.end }
			: { off: true, start: '09:00', end: '17:00' }
		return acc
	}, {} as FormSchedule)
}

function formToSchedule(form: FormSchedule): AgentSchedule {
	const out: AgentSchedule = {}
	for (const day of WEEKDAY_KEYS) {
		const d = form[day]
		out[day] = d.off ? null : { start: d.start, end: d.end }
	}
	return out
}

export function AgentFormDialog({
	mode,
	agent,
	open,
	onOpenChange,
}: {
	mode: 'add' | 'edit'
	agent?: SupportAgent
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const t = useTranslations('supportAgents')
	const createMutation = useCreateSupportAgent()
	const updateMutation = useUpdateSupportAgent()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [zohoAgentId, setZohoAgentId] = useState('')
	const [enabled, setEnabled] = useState(true)
	const [schedule, setSchedule] = useState<FormSchedule>(emptyForm())

	// Reset the form whenever the dialog opens.
	useEffect(() => {
		if (!open) return
		if (mode === 'edit' && agent) {
			setName(agent.name)
			setEmail(agent.email)
			setZohoAgentId(agent.zohoAgentId)
			setEnabled(agent.enabled)
			setSchedule(scheduleToForm(agent.schedule))
		} else {
			setName('')
			setEmail('')
			setZohoAgentId('')
			setEnabled(true)
			setSchedule(emptyForm())
		}
	}, [open, mode, agent])

	const isPending = createMutation.isPending || updateMutation.isPending

	function updateDay(day: Weekday, patch: Partial<FormDay>) {
		setSchedule(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }))
	}

	async function handleSave() {
		const scheduleObj = formToSchedule(schedule)
		const payload = { name, email, zohoAgentId, schedule: scheduleObj }
		const validationError = validateAgentInput(payload)
		if (validationError) {
			toast.error(validationError)
			return
		}

		try {
			if (mode === 'add') {
				await createMutation.mutateAsync({
					...payload,
					enabled,
					timezone: DEFAULT_AGENT_TIMEZONE,
				})
				toast.success(t('toastCreated'))
			} else if (agent) {
				await updateMutation.mutateAsync({
					id: agent.id,
					input: { ...payload, enabled },
				})
				toast.success(t('toastUpdated'))
			}
			onOpenChange(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('toastError'))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>{mode === 'add' ? t('addTitle') : t('editTitle')}</DialogTitle>
					<DialogDescription>{t('overnightHint')}</DialogDescription>
				</DialogHeader>

				<div className='grid gap-4 py-2'>
					<div className='grid gap-2'>
						<Label htmlFor='agent-name'>{t('name')}</Label>
						<Input id='agent-name' value={name} onChange={e => setName(e.target.value)} />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='agent-email'>{t('email')}</Label>
						<Input id='agent-email' type='email' value={email} onChange={e => setEmail(e.target.value)} />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='agent-zoho'>{t('zohoAgentId')}</Label>
						<Input id='agent-zoho' value={zohoAgentId} onChange={e => setZohoAgentId(e.target.value)} />
						<p className='text-muted-foreground text-xs'>{t('zohoHint')}</p>
					</div>

					<div className='grid gap-2'>
						<Label>{t('schedule')}</Label>
						<div className='flex flex-col gap-2'>
							{WEEKDAY_KEYS.map(day => {
								const d = schedule[day]
								return (
									<div key={day} className='flex items-center gap-2'>
										<span className='w-10 text-sm font-medium'>{t(`weekdays.${day}`)}</span>
										<label className='flex items-center gap-1 text-xs'>
											<Checkbox
												checked={d.off}
												onCheckedChange={checked => updateDay(day, { off: checked === true })}
											/>
											{t('off')}
										</label>
										<Input
											type='time'
											className='w-28'
											value={d.start}
											disabled={d.off}
											onChange={e => updateDay(day, { start: e.target.value })}
										/>
										<span className='text-muted-foreground'>–</span>
										<Input
											type='time'
											className='w-28'
											value={d.end}
											disabled={d.off}
											onChange={e => updateDay(day, { end: e.target.value })}
										/>
									</div>
								)
							})}
						</div>
					</div>

					<div className='flex items-center gap-2'>
						<Switch id='agent-enabled' checked={enabled} onCheckedChange={setEnabled} />
						<Label htmlFor='agent-enabled'>{t('enabled')}</Label>
					</div>
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
						{t('cancel')}
					</Button>
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ? t('saving') : t('save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
