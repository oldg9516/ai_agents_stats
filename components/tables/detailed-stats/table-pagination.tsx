'use client'

import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { IconChevronLeft, IconChevronRight, IconLoader2 } from '@tabler/icons-react'

// Available page size options
export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

interface TablePaginationProps {
	t: (key: string) => string
	currentPage: number
	pageSize: number
	totalCount: number
	totalPages: number
	hasNextPage: boolean
	hasPreviousPage: boolean
	isFetching: boolean
	isLoading: boolean
	globalFilter: string
	filteredRowsCount: number
	onPreviousPage: () => void
	onNextPage: () => void
	onPageClick: (page: number) => void
	onPageSizeChange?: (size: number) => void
}

/**
 * Pagination component for the detailed stats table
 * Shows either filtered results count or pagination controls
 */
export function TablePagination({
	t,
	currentPage,
	pageSize,
	totalCount,
	totalPages,
	hasNextPage,
	hasPreviousPage,
	isFetching,
	isLoading,
	globalFilter,
	filteredRowsCount,
	onPreviousPage,
	onNextPage,
	onPageClick,
	onPageSizeChange,
}: TablePaginationProps) {
	// Show filtered results message when search filter is active
	if (globalFilter) {
		return (
			<div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
				{t('table.showing')} {filteredRowsCount} {t('table.of')} {totalCount} (
				{t('table.filtered')})
			</div>
		)
	}

	// Show pagination controls
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
				{/* Page size selector */}
				{onPageSizeChange && (
					<div className="flex items-center gap-2">
						<span className="text-xs sm:text-sm text-muted-foreground">
							{t('table.rowsPerPage')}:
						</span>
						<Select
							value={String(pageSize)}
							onValueChange={value => onPageSizeChange(Number(value))}
							disabled={isFetching}
						>
							<SelectTrigger className="w-[80px] h-8 text-xs sm:text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_SIZE_OPTIONS.map(size => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{/* Results count */}
				<div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
					{t('table.showing')} {currentPage * pageSize + 1} {t('table.to')}{' '}
					{Math.min((currentPage + 1) * pageSize, totalCount)} {t('table.of')}{' '}
					{totalCount}
					{isFetching && !isLoading && (
						<span className="ml-2 inline-flex items-center gap-1">
							<IconLoader2 className="h-3 w-3 animate-spin" />
							<span className="text-xs">Loading...</span>
						</span>
					)}
				</div>
			</div>
			<div className="flex flex-col sm:flex-row items-center gap-2">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onPreviousPage}
						disabled={!hasPreviousPage || isFetching}
						className="text-xs sm:text-sm"
					>
						<IconChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
						<span className="hidden sm:inline">{t('table.previous')}</span>
					</Button>
					<div className="flex items-center gap-1">
						{Array.from({ length: totalPages }, (_, i) => i)
							.filter(page => {
								return (
									page === 0 ||
									page === totalPages - 1 ||
									Math.abs(page - currentPage) <= 1
								)
							})
							.map((page, idx, arr) => {
								const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
								return (
									<div key={page} className="flex items-center">
										{showEllipsis && (
											<span className="px-1 text-xs">...</span>
										)}
										<Button
											variant={currentPage === page ? 'default' : 'outline'}
											size="sm"
											onClick={() => onPageClick(page)}
											disabled={isFetching}
											className="w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm"
										>
											{page + 1}
										</Button>
									</div>
								)
							})}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onNextPage}
						disabled={!hasNextPage || isFetching}
						className="text-xs sm:text-sm"
					>
						<span className="hidden sm:inline">{t('table.next')}</span>
						<IconChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
