/**
 * Auto-reply rate benchmarks per category / sub-subcategory.
 * Source: PROD support_threads_data, last 90 days (computed 2026-05-21).
 * Only categories/subs with ≥5 records are included.
 *
 * min/max = acceptable auto-reply rate floor (actual ±5pp, rounded to nearest 5%).
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
		norm: norm(43),
		subCategories: {
			package_not_received_investigation: norm(30),
			package_not_received: norm(32),
			order_delivery_status_check: norm(65),
			tracking_issues: norm(67),
			delivery_status_requests: norm(65),
			shipment_confirmation_and_expected_delivery: norm(68),
			address_and_delivery_instructions_issues: norm(54),
			refund_and_compensation_requests: norm(6),
			request_tracking_info: norm(65),
			tracking_status_update: norm(62),
			order_preparation_status: norm(58),
			delivery_delay_report: norm(67),
		},
	},
	retention_primary_request: {
		norm: norm(72),
		subCategories: {
			subscription_cancellation_general: norm(74),
			financial_reasons_cancellation: norm(80),
			product_or_service_dissatisfaction: norm(43),
			subscription_pause_or_suspend_requests: norm(65),
			cancellation_process_and_confirmation_inquiries: norm(70),
		},
	},
	retention_repeated_request: {
		norm: norm(16),
		subCategories: {
			subscription_cancellation_requests: norm(21),
			billing_and_payment_issues: norm(7),
			confirmation_and_follow_up_requests: norm(14),
			cancellation_process_difficulties: norm(15),
			subscription_pause_or_suspend_requests: norm(15),
		},
	},
	retention_neither_request: {
		norm: norm(34),
		subCategories: {
			post_cancellation_billing_question: norm(13),
			cancellation_confirmation_inquiry: norm(31),
			gratitude_or_farewell: norm(65),
			final_box_logistics: norm(47),
			reactivation_or_return_interest: norm(60),
		},
	},
	payment_question: {
		norm: norm(46),
		subCategories: {
			payment_method_updates_and_issues: norm(50),
			payment_processing_error: norm(49),
			double_charge_inquiry: norm(23),
			billing_errors_and_double_charges: norm(25),
			subscription_management_and_cancellations: norm(56),
			payment_declined_and_processing_issues: norm(44),
			payment_method_rejected: norm(59),
			non_receipt_of_products_and_shipment_issues: norm(41),
		},
	},
	gratitude: {
		norm: norm(83),
		subCategories: {
			personal_and_emotional_expressions: norm(85),
			support_and_commitment: norm(81),
			product_quality_and_appreciation: norm(85),
			general_appreciation_and_thanks: norm(81),
		},
	},
	recipient_or_address_change: {
		norm: norm(15),
		subCategories: {
			address_update_and_change_requests: norm(14),
			address_correction_and_error_fixes: norm(9),
			temporary_or_alternate_address_change: norm(20),
			recipient_name_change_requests: norm(19),
			email_address_update: norm(24),
		},
	},
	customization_request: {
		norm: norm(28),
		subCategories: {
			alcohol_preference: norm(3),
			product_type_and_content_preferences: norm(85),
			allergy_and_dietary_restrictions: norm(79),
			custom_product_selections_and_personalization: norm(92),
		},
	},
	skip_or_pause_request: {
		norm: norm(16),
		subCategories: {
			temporary_pause_requests: norm(16),
			skip_specific_shipments: norm(12),
			resuming_subscriptions: norm(20),
		},
	},
	damaged_or_leaking_item_report: {
		norm: norm(20),
		subCategories: {
			leaking_or_spilled_liquids: norm(15),
			replacement_and_refund_requests: norm(5),
			missing_items_or_parts: norm(14),
			damaged_or_broken_items: norm(30),
			report_damaged_item_with_photos: norm(26),
			damaged_or_poor_packaging: norm(32),
			request_replacement_for_damaged_item: norm(15),
			wrong_item_received: norm(30),
			missing_items_in_order: norm(13),
		},
	},
	frequency_change_request: {
		norm: norm(28),
		subCategories: {
			request_to_change_frequency_to_quarterly: norm(15),
			request_to_change_frequency_to_bimonthly: norm(15),
			request_for_other_frequencies: norm(54),
			subscription_frequency_inquiry: norm(89),
		},
	},
	product_availability_and_reordering: {
		norm: norm(82),
		subCategories: {
			product_availability_inquiry: norm(86),
			reorder_specific_product: norm(84),
			bulk_order_inquiry: norm(17),
		},
	},
	shop_order_modification: {
		norm: norm(22),
		subCategories: {
			cancel_order_before_shipping: norm(14),
			shipping_address_update: norm(13),
		},
	},
	discount_or_promo_issue: {
		norm: norm(63),
		subCategories: {
			promotion_not_applied: norm(20),
			pricing_question: norm(88),
			shipping_cost_complaint: norm(86),
		},
	},
	refund_request: {
		norm: norm(7),
		subCategories: {
			refund_for_not_received: norm(0),
			general_refund_request: norm(33),
		},
	},
	account_access_and_login_issues: {
		norm: norm(52),
		subCategories: {
			login_problems: norm(67),
		},
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
