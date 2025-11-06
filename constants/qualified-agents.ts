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
	'yakov@levhaolam.com',
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
		'yakov@levhaolam.com': 'Yakov',
	}
	return names[email] || email
}
