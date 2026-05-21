/**
 * Auto-reply rate benchmarks per category / sub-subcategory.
 * Source: "AI auto-reply benchmarks" spreadsheet (May 2026).
 *
 * min/max = acceptable auto-reply rate range (inclusive, 0–100).
 * For single-value norms (e.g. 75%) a ±5pp tolerance is applied.
 * For explicit ranges (e.g. 45–50%) the range is used as-is.
 */

export interface BenchmarkNorm {
	min: number
	max: number
	label: string
}

function single(value: number): BenchmarkNorm {
	return { min: Math.max(0, value - 5), max: Math.min(100, value + 5), label: `${value}%` }
}

function range(min: number, max: number): BenchmarkNorm {
	return { min, max, label: `${min}–${max}%` }
}

export interface CategoryBenchmark {
	norm: BenchmarkNorm
	subCategories: Record<string, BenchmarkNorm>
}

export const AUTOMATION_BENCHMARKS: Record<string, CategoryBenchmark> = {
	shipping_or_delivery_question: {
		norm: range(45, 50),
		subCategories: {
			package_not_received_investigation: range(20, 30),
			package_not_received: single(50),
			order_delivery_status_check: single(80),
			tracking_issues: single(55),
			delivery_status_requests: single(70),
			shipment_confirmation_and_expected_delivery: single(70),
			address_and_delivery_instructions_issues: single(55),
			refund_and_compensation_requests: single(5),
			request_tracking_info: single(75),
			tracking_status_update: single(70),
			order_preparation_status: single(50),
			delivery_delay_report: single(50),
			non_receipt_of_products_and_shipment_issues: single(5),
		},
	},
	retention_primary_request: {
		norm: single(75),
		subCategories: {
			subscription_cancellation_general: single(75),
			financial_reasons_cancellation: single(80),
			product_or_service_dissatisfaction: single(40),
			subscription_pause_or_suspend_requests: single(65),
			cancellation_process_and_confirmation_inquiries: single(80),
		},
	},
	retention_repeated_request: {
		norm: single(25),
		subCategories: {
			subscription_cancellation_requests: single(50),
			billing_and_payment_issues: single(10),
			confirmation_and_follow_up_requests: single(50),
			cancellation_process_difficulties: single(5),
			subscription_pause_or_suspend_requests: single(10),
		},
	},
	retention_neither_request: {
		norm: single(50),
		subCategories: {
			post_cancellation_billing_question: single(40),
			cancellation_confirmation_inquiry: single(50),
			gratitude_or_farewell: single(80),
			final_box_logistics: single(50),
			reactivation_or_return_interest: single(60),
		},
	},
	payment_question: {
		norm: single(40),
		subCategories: {
			payment_method_updates_and_issues: single(50),
			payment_processing_error: single(50),
			double_charge_inquiry: single(20),
			billing_errors_and_double_charges: single(20),
			subscription_management_and_cancellations: single(60),
			payment_declined_and_processing_issues: single(40),
			payment_method_rejected: single(60),
			non_receipt_of_products_and_shipment_issues: single(30),
			charge_explanation_request: single(40),
			pricing_question: single(80),
			tariff_or_tax_question: single(90),
		},
	},
	gratitude: {
		norm: single(90),
		subCategories: {
			personal_and_emotional_expressions: single(90),
			support_and_commitment: single(90),
			product_quality_and_appreciation: single(80),
			general_appreciation_and_thanks: single(100),
			service_and_delivery_feedback: single(80),
		},
	},
	recipient_or_address_change: {
		norm: single(10),
		subCategories: {
			address_update_and_change_requests: single(10),
			address_correction_and_error_fixes: single(5),
			temporary_or_alternate_address_change: single(5),
			recipient_name_change_requests: single(10),
			email_address_update: single(10),
		},
	},
	customization_request: {
		norm: single(20),
		subCategories: {
			alcohol_preference: single(5),
			product_type_and_content_preferences: single(85),
			allergy_and_dietary_restrictions: single(85),
			custom_product_selections_and_personalization: single(90),
			subscription_frequency_and_management: single(5),
		},
	},
	skip_or_pause_request: {
		norm: single(10),
		subCategories: {
			temporary_pause_requests: single(10),
			skip_specific_shipments: single(10),
			resuming_subscriptions: single(10),
			payment_and_billing_issues: single(5),
			subscription_frequency_and_modification: single(5),
		},
	},
	damaged_or_leaking_item_report: {
		norm: single(20),
		subCategories: {
			leaking_or_spilled_liquids: single(15),
			replacement_and_refund_requests: single(5),
			missing_items_or_parts: single(10),
			damaged_or_broken_items: single(30),
			report_damaged_item_with_photos: single(30),
			damaged_or_poor_packaging: single(20),
			request_replacement_for_damaged_item: single(15),
			wrong_item_received: single(30),
			missing_items_in_order: single(10),
		},
	},
	frequency_change_request: {
		norm: single(25),
		subCategories: {
			request_to_change_frequency_to_quarterly: single(15),
			request_to_change_frequency_to_bimonthly: single(15),
			request_for_other_frequencies: single(50),
			subscription_frequency_inquiry: single(90),
			subscription_frequency_change_assistance: single(0),
		},
	},
	product_availability_and_reordering: {
		norm: single(80),
		subCategories: {
			product_availability_inquiry: single(85),
			reorder_specific_product: single(85),
			bulk_order_inquiry: single(10),
			alcohol_availability_question: single(50),
			shipping_to_country_question: single(100),
		},
	},
	shop_order_modification: {
		norm: single(20),
		subCategories: {
			cancel_order_before_shipping: single(15),
			shipping_address_update: single(15),
			add_items_to_existing_order: single(100),
			order_item_quantity_correction: single(50),
		},
	},
	discount_or_promo_issue: {
		norm: single(65),
		subCategories: {
			other: single(75),
			promotion_not_applied: single(25),
			pricing_question: single(90),
			shipping_cost_complaint: single(90),
			discount_code_invalid_or_expired: single(70),
			coupon_request: single(20),
		},
	},
	refund_request: {
		norm: single(5),
		subCategories: {
			refund_for_not_received: single(0),
			general_refund_request: single(15),
			refund_for_damaged_or_missing_items: single(0),
			refund_status_inquiry: single(15),
		},
	},
	account_access_and_login_issues: {
		norm: single(40),
		subCategories: {
			login_problems: single(70),
			shop_access_question: single(100),
			password_reset_request: single(20),
			email_update_request: single(0),
			unsubscribe_from_emails: single(0),
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

export function isWithinNorm(rate: number, norm: BenchmarkNorm): boolean {
	return rate >= norm.min && rate <= norm.max
}
