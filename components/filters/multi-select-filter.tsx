'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
	IconChevronDown,
	IconChevronUp,
	IconSearch,
	IconX,
} from '@tabler/icons-react'

interface MultiSelectFilterProps {
	label: string
	options: string[]
	selected: string[]
	onChange: (selected: string[]) => void
	placeholder?: string
	searchable?: boolean
	allowEmpty?: boolean
	formatLabel?: (value: string) => string
}

/**
 * Multi-Select Filter - Generic multi-select with checkboxes
 *
 * Features:
 * - Select all / Deselect all
 * - Optional search
 * - Collapsible dropdown
 */
export function MultiSelectFilter({
	label,
	options,
	selected,
	onChange,
	placeholder = 'Search...',
	searchable = true,
	allowEmpty = true,
	formatLabel,
}: MultiSelectFilterProps) {
	const t = useTranslations()
	const [isOpen, setIsOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	// Filter options based on search
	const filteredOptions = searchable
		? options.filter((option) => option.toLowerCase().includes(searchQuery.toLowerCase()))
		: options

	// Check if all options are selected
	const allSelected = selected.length === options.length

	// Handle select all / deselect all
	const handleSelectAll = () => {
		if (allSelected) {
			if (allowEmpty) {
				onChange([])
			}
		} else {
			onChange(options)
		}
	}

	// Handle individual checkbox toggle
	const handleToggle = (option: string) => {
		if (selected.includes(option)) {
			// Don't allow deselecting if it's the last one and allowEmpty is false
			if (!allowEmpty && selected.length === 1) return

			onChange(selected.filter((item) => item !== option))
		} else {
			onChange([...selected, option])
		}
	}

	// Clear all selections
	const handleClear = () => {
		if (allowEmpty) {
			onChange([])
		}
	}

	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">{label}</Label>

			{/* Dropdown Trigger */}
			<Button
				variant="outline"
				className="w-full justify-between"
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<span className="truncate">
					{selected.length === 0
						? `${t('common.all')} ${label}`
						: selected.length === options.length
							? `${t('common.all')} ${label} (${options.length})`
							: `${selected.length} ${t('common.selected')}`}
				</span>
				{isOpen ? (
					<IconChevronUp className="ml-2 h-4 w-4 shrink-0" />
				) : (
					<IconChevronDown className="ml-2 h-4 w-4 shrink-0" />
				)}
			</Button>

			{/* Dropdown Content */}
			{isOpen && (
				<div className="border rounded-md bg-background shadow-lg">
					{/* Search */}
					{searchable && (
						<div className="p-2 border-b">
							<div className="relative">
								<IconSearch className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder={placeholder}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-8 h-8"
								/>
							</div>
						</div>
					)}

					{/* Options */}
					<div className="max-h-60 overflow-y-auto p-2">
						{/* Select All */}
						<div className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm">
							<Checkbox
								id="select-all"
								checked={allSelected}
								onCheckedChange={handleSelectAll}
							/>
							<Label htmlFor="select-all" className="flex-1 cursor-pointer font-medium">
								{allSelected ? t('filters.deselectAll') : t('filters.selectAll')}
							</Label>
							{selected.length > 0 && allowEmpty && (
								<Button
									variant="ghost"
									size="sm"
									onClick={handleClear}
									className="h-6 w-6 p-0"
								>
									<IconX className="h-3 w-3" />
								</Button>
							)}
						</div>

						{/* Individual Options */}
						{filteredOptions.length === 0 ? (
							<div className="p-4 text-center text-sm text-muted-foreground">
								{t('common.noOptionsFound')}
							</div>
						) : (
							filteredOptions.map((option) => (
								<div
									key={option}
									className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm"
								>
									<Checkbox
										id={`option-${option}`}
										checked={selected.includes(option)}
										onCheckedChange={() => handleToggle(option)}
									/>
									<Label
										htmlFor={`option-${option}`}
										className="flex-1 cursor-pointer text-sm"
									>
										{formatLabel ? formatLabel(option) : option}
									</Label>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}
