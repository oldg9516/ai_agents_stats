/**
 * Qualified Agents
 *
 * List of email addresses for agents who are qualified to review AI-generated content.
 * These agents are used in quality metrics calculations across the dashboard.
 *
 * When a record is processed by one of these agents, it's included in quality statistics.
 * Records where changed = false by these agents count as "good quality" AI outputs.
 */

export const QUALIFIED_AGENTS = [
	// 'lucy@levhaolam.com',
	'marianna@levhaolam.com',
	'laure@levhaolam.com',
	'sofia@levhaolam.com',
] as const

export type QualifiedAgent = (typeof QUALIFIED_AGENTS)[number]

/**
 * Helper function to check if an email is a qualified agent
 */
export function isQualifiedAgent(email: string): email is QualifiedAgent {
	return QUALIFIED_AGENTS.includes(email as QualifiedAgent)
}

/**
 * Get display name from email (optional - for future use)
 */
export function getAgentName(email: QualifiedAgent): string {
	const names: Record<QualifiedAgent, string> = {
		// 'lucy@levhaolam.com': 'Lucy',
		'marianna@levhaolam.com': 'Marianna',
		'laure@levhaolam.com': 'Laure',
		'sofia@levhaolam.com': 'Sofia',
	}
	return names[email] || email
}

/**
 * Reviewer Agents - agents who can leave review comments
 * Each agent has a unique color from our chart palette
 */
export const REVIEWER_AGENTS = [
	{ id: 'sofia', name: 'Sofia', color: 'bg-[oklch(0.65_0.25_270)] text-white' }, // Blue (chart-1)
	{ id: 'irina', name: 'Irina', color: 'bg-[oklch(0.65_0.25_150)] text-white' }, // Green (chart-2)
	{ id: 'gleb', name: 'Gleb', color: 'bg-[oklch(0.70_0.25_50)] text-white' }, // Orange (chart-3)
	{ id: 'denis', name: 'Denis', color: 'bg-[oklch(0.65_0.25_330)] text-white' }, // Pink (chart-4)
] as const

export type ReviewerAgent = (typeof REVIEWER_AGENTS)[number]

/**
 * Excluded Emails - emails that should be excluded from all statistics
 * These are system/API accounts that shouldn't appear in agent statistics
 */
export const EXCLUDED_EMAILS = ['api@levhaolam.com'] as const

export type ExcludedEmail = (typeof EXCLUDED_EMAILS)[number]

/**
 * Helper function to check if an email should be excluded
 */
export function isExcludedEmail(email: string | null): boolean {
	if (!email) return false
	return EXCLUDED_EMAILS.includes(email as ExcludedEmail)
}
