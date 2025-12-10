import { z } from 'zod'

/**
 * Schema for data table row
 */
export const schema = z.object({
	id: z.number(),
	header: z.string(),
	type: z.string(),
	status: z.string(),
	target: z.string(),
	limit: z.string(),
	reviewer: z.string(),
})

/**
 * Type for data table row inferred from schema
 */
export type DataTableRow = z.infer<typeof schema>

/**
 * Chart data type for TableCellViewer
 */
export type ChartDataItem = {
	month: string
	desktop: number
	mobile: number
}

/**
 * Chart data for the area chart in TableCellViewer
 */
export const chartData: ChartDataItem[] = [
	{ month: 'January', desktop: 186, mobile: 80 },
	{ month: 'February', desktop: 305, mobile: 200 },
	{ month: 'March', desktop: 237, mobile: 120 },
	{ month: 'April', desktop: 73, mobile: 190 },
	{ month: 'May', desktop: 209, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
]
