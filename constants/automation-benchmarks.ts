/**
 * Auto-reply rate benchmarks per category / sub-subcategory.
 *
 * Source: PROD ai_agent_tasks GROUND TRUTH (what the agent actually did:
 * send_reply vs send_draft), last 90 days, computed 2026-06-15.
 * Only categories/subs with a meaningful sample (≥15–20 records) are included.
 *
 * This replaces the earlier reconstruction-based norms (is_outstanding /
 * requires_system_action), which over-counted auto-replies for retention
 * categories by up to ~45pp.
 *
 * min/max = acceptable auto-reply rate band (actual ±5pp, rounded to 5%).
 * Green when actual >= min (at or above norm), red when below.
 */

export interface BenchmarkNorm {
	min: number
	max: number
	label: string
}

function norm(actual: number): BenchmarkNorm {
	const rounded = Math.round(actual / 5) * 5
	return {
		min: Math.max(0, rounded - 5),
		max: Math.min(100, rounded + 5),
		label: `~${rounded}%`,
	}
}

export interface CategoryBenchmark {
	norm: BenchmarkNorm
	subCategories: Record<string, BenchmarkNorm>
}

export const AUTOMATION_BENCHMARKS: Record<string, CategoryBenchmark> = {
	shipping_or_delivery_question: {
		norm: norm(46),
		subCategories: {
			package_not_received: norm(32),
			package_not_received_investigation: norm(35),
			delivery_status_requests: norm(62),
			order_delivery_status_check: norm(68),
			tracking_issues: norm(68),
			shipment_confirmation_and_expected_delivery: norm(59),
			address_and_delivery_instructions_issues: norm(49),
			refund_and_compensation_requests: norm(7),
			request_tracking_info: norm(63),
			tracking_status_update: norm(50),
		},
	},
	retention_primary_request: {
		norm: norm(59),
		subCategories: {
			subscription_cancellation_general: norm(61),
			financial_reasons_cancellation: norm(65),
			product_or_service_dissatisfaction: norm(38),
			subscription_pause_or_suspend_requests: norm(45),
			cancellation_process_and_confirmation_inquiries: norm(61),
		},
	},
	retention_repeated_request: {
		norm: norm(3),
		subCategories: {
			subscription_cancellation_requests: norm(5),
			billing_and_payment_issues: norm(0),
			confirmation_and_follow_up_requests: norm(2),
			cancellation_process_difficulties: norm(0),
			subscription_pause_or_suspend_requests: norm(2),
		},
	},
	retention_neither_request: {
		norm: norm(16),
		subCategories: {
			post_cancellation_billing_question: norm(6),
			cancellation_confirmation_inquiry: norm(15),
			gratitude_or_farewell: norm(28),
			final_box_logistics: norm(28),
		},
	},
	retention_after_cancellation_request: {
		norm: norm(20),
		subCategories: {
			re_cancellation_request: norm(41),
		},
	},
	payment_question: {
		norm: norm(44),
		subCategories: {
			payment_method_updates_and_issues: norm(47),
			payment_declined_and_processing_issues: norm(39),
			billing_errors_and_double_charges: norm(23),
			payment_processing_error: norm(48),
			subscription_management_and_cancellations: norm(58),
			double_charge_inquiry: norm(26),
			payment_method_rejected: norm(49),
			non_receipt_of_products_and_shipment_issues: norm(43),
		},
	},
	gratitude: {
		norm: norm(76),
		subCategories: {
			personal_and_emotional_expressions: norm(77),
			support_and_commitment: norm(66),
			product_quality_and_appreciation: norm(84),
			general_appreciation_and_thanks: norm(79),
		},
	},
	recipient_or_address_change: {
		norm: norm(11),
		subCategories: {
			address_update_and_change_requests: norm(11),
			address_correction_and_error_fixes: norm(4),
			temporary_or_alternate_address_change: norm(20),
			recipient_name_change_requests: norm(17),
			email_address_update: norm(22),
		},
	},
	customization_request: {
		norm: norm(35),
		subCategories: {
			alcohol_preference: norm(7),
			product_type_and_content_preferences: norm(83),
			allergy_and_dietary_restrictions: norm(79),
			custom_product_selections_and_personalization: norm(82),
		},
	},
	skip_or_pause_request: {
		norm: norm(15),
		subCategories: {
			temporary_pause_requests: norm(15),
			skip_specific_shipments: norm(10),
			resuming_subscriptions: norm(21),
		},
	},
	damaged_or_leaking_item_report: {
		norm: norm(21),
		subCategories: {
			leaking_or_spilled_liquids: norm(20),
			replacement_and_refund_requests: norm(6),
			damaged_or_broken_items: norm(29),
			report_damaged_item_with_photos: norm(21),
			missing_items_or_parts: norm(11),
			damaged_or_poor_packaging: norm(42),
			wrong_item_received: norm(20),
			request_replacement_for_damaged_item: norm(6),
		},
	},
	frequency_change_request: {
		norm: norm(27),
		subCategories: {
			request_to_change_frequency_to_quarterly: norm(14),
			request_to_change_frequency_to_bimonthly: norm(13),
			request_for_other_frequencies: norm(55),
			subscription_frequency_inquiry: norm(87),
		},
	},
	product_availability_and_reordering: {
		norm: norm(78),
		subCategories: {
			product_availability_inquiry: norm(82),
			reorder_specific_product: norm(73),
		},
	},
	shop_order_modification: {
		norm: norm(16),
		subCategories: {
			shipping_address_update: norm(3),
			cancel_order_before_shipping: norm(19),
		},
	},
	discount_or_promo_issue: {
		norm: norm(56),
		subCategories: {
			promotion_not_applied: norm(23),
			shipping_cost_complaint: norm(93),
		},
	},
	refund_request: {
		norm: norm(6),
		subCategories: {},
	},
	account_access_and_login_issues: {
		norm: norm(57),
		subCategories: {},
	},
}

export function getCategoryNorm(category: string): BenchmarkNorm | null {
	return AUTOMATION_BENCHMARKS[category]?.norm ?? null
}

export function getSubCategoryNorm(
	category: string,
	subSubCategory: string,
): BenchmarkNorm | null {
	return AUTOMATION_BENCHMARKS[category]?.subCategories[subSubCategory] ?? null
}
