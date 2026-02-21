/**
 * Automation Rules Configuration
 *
 * Extensible rule system to determine whether a ticket was sent as
 * auto-reply or draft, based on the ticket's subcategory.
 *
 * Rules are checked top-down; the first matching rule wins.
 * If no rule matches, the default logic applies (requires_system_action from action_analysis).
 *
 * To add a new rule: add an entry to AUTOMATION_RULES with:
 *   - categories: array of request_subtype values
 *   - isDraft: function that returns true if the ticket was sent as draft
 *   - ruleSource: human-readable label for UI display
 */

export interface AutomationRuleRecord {
	is_outstanding: boolean | null
	action_analysis: {
		requires_system_action: boolean | null
	} | null
}

export interface AutomationRule {
	/** request_subtype values this rule applies to */
	categories: string[]
	/** Returns true if the record should be classified as "draft" */
	isDraft: (record: AutomationRuleRecord) => boolean
	/** Label for UI — which field determined the status */
	ruleSource: string
}

/**
 * Ordered list of automation rules.
 * First match wins. Default fallback uses requires_system_action.
 */
export const AUTOMATION_RULES: AutomationRule[] = [
	{
		categories: ['retention_primary_request', 'retention_repeated_request'],
		isDraft: (r) => r.is_outstanding === true,
		ruleSource: 'is_outstanding',
	},
	// Add new rules here as needed:
	// {
	//   categories: ['some_other_subtype'],
	//   isDraft: (r) => r.some_field === true,
	//   ruleSource: 'some_field',
	// },
]

export type AutomationStatus = 'auto_reply' | 'draft'

/**
 * Determine whether a ticket was auto-reply or draft.
 *
 * Checks AUTOMATION_RULES in order; if none match, falls back to
 * requires_system_action from action_analysis.
 */
export function resolveAutomationStatus(
	record: AutomationRuleRecord & { request_subtype: string | null }
): { status: AutomationStatus; ruleSource: string } {
	for (const rule of AUTOMATION_RULES) {
		if (record.request_subtype && rule.categories.includes(record.request_subtype)) {
			return {
				status: rule.isDraft(record) ? 'draft' : 'auto_reply',
				ruleSource: rule.ruleSource,
			}
		}
	}

	// Default: requires_system_action from action_analysis
	const isDraft = record.action_analysis?.requires_system_action === true
	return {
		status: isDraft ? 'draft' : 'auto_reply',
		ruleSource: 'requires_system_action',
	}
}

/**
 * Get the rule source for a given subcategory (without needing a full record).
 * Useful for displaying which field determines the status in UI.
 */
export function getRuleSourceForCategory(requestSubtype: string | null): string {
	if (!requestSubtype) return 'requires_system_action'
	for (const rule of AUTOMATION_RULES) {
		if (rule.categories.includes(requestSubtype)) {
			return rule.ruleSource
		}
	}
	return 'requires_system_action'
}
