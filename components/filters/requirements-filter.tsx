'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
	REQUIREMENT_TYPES,
	getAllRequirementKeys,
	type RequirementType,
} from '@/constants/requirement-types'
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface RequirementsFilterProps {
	selected: string[]
	onChange: (selected: string[]) => void
}

/**
 * Requirements Filter - Multi-select for requirement flags
 *
 * Features:
 * - Checkbox for each requirement type
 * - Shows short labels with colored badges
 * - Select all / Clear all
 */
export function RequirementsFilter({
	selected,
	onChange,
}: RequirementsFilterProps) {
	const t = useTranslations()
	const [isOpen, setIsOpen] = useState(false)

	const allRequirements = getAllRequirementKeys()
	const allSelected = selected.length === allRequirements.length

	// Handle select all / deselect all
	const handleSelectAll = () => {
		if (allSelected) {
			onChange([])
		} else {
			onChange(allRequirements)
		}
	}

	// Handle individual checkbox toggle
	const handleToggle = (requirement: RequirementType) => {
		if (selected.includes(requirement)) {
			onChange(selected.filter(item => item !== requirement))
		} else {
			onChange([...selected, requirement])
		}
	}

	// Clear all selections
	const handleClear = () => {
		onChange([])
	}

	return (
		<div className='space-y-2'>
			<Label className='text-sm font-medium'>{t('filters.requirements')}</Label>

			{/* Dropdown Trigger */}
			<Button
				variant='outline'
				className='w-full justify-between'
				onClick={() => setIsOpen(!isOpen)}
				type='button'
			>
				<span className='truncate'>
					{selected.length === 0
						? `${t('common.all')} ${t('filters.requirements')}`
						: selected.length === allRequirements.length
						? `${t('common.all')} ${t('filters.requirements')} (${allRequirements.length})`
						: `${selected.length} ${t('common.selected')}`}
				</span>
				{isOpen ? (
					<IconChevronUp className='ml-2 h-4 w-4 shrink-0' />
				) : (
					<IconChevronDown className='ml-2 h-4 w-4 shrink-0' />
				)}
			</Button>

			{/* Dropdown Content */}
			{isOpen && (
				<div className='border rounded-md bg-background shadow-lg'>
					<div className='max-h-60 overflow-y-auto p-2'>
						{/* Select All */}
						<div className='flex items-center space-x-2 p-2 hover:bg-muted rounded-sm'>
							<Checkbox
								id='select-all-requirements'
								checked={allSelected}
								onCheckedChange={handleSelectAll}
							/>
							<Label
								htmlFor='select-all-requirements'
								className='flex-1 cursor-pointer font-medium'
							>
								{allSelected ? t('filters.deselectAll') : t('filters.selectAll')}
							</Label>
							{selected.length > 0 && (
								<Button
									variant='ghost'
									size='sm'
									onClick={handleClear}
									className='h-6 w-6 p-0'
								>
									<IconX className='h-3 w-3' />
								</Button>
							)}
						</div>

						{/* Individual Requirements */}
						{allRequirements.map(req => {
							const requirement = REQUIREMENT_TYPES[req]
							return (
								<div
									key={req}
									className='flex items-center space-x-2 p-2 hover:bg-muted rounded-sm'
								>
									<Checkbox
										id={`requirement-${req}`}
										checked={selected.includes(req)}
										onCheckedChange={() => handleToggle(req)}
									/>
									<Label
										htmlFor={`requirement-${req}`}
										className='flex-1 cursor-pointer text-sm'
									>
										<div className='flex items-center gap-2'>
											<span
												className={`px-2 py-0.5 rounded text-xs font-medium ${requirement.bgColor} ${requirement.textColor}`}
											>
												{requirement.shortLabel}
											</span>
											<span className='text-muted-foreground text-xs'>
												{requirement.description}
											</span>
										</div>
									</Label>
								</div>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
