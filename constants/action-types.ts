export const ACTION_TYPES = [
	'none',
	'update_subscription_preference',
	'update_shipping_address',
	'update_payment_method',
	'skip_or_pause_subscription',
	'change_frequency',
	'process_refund',
	'update_recipient',
	'other_system_action',
] as const

export type ActionTypeKey = (typeof ACTION_TYPES)[number]
