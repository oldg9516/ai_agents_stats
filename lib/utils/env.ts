/**
 * Resolves environment-specific N8N variables based on VERCEL_ENV.
 * - production → PROD_* prefix
 * - preview/development/local → UAT_* prefix
 */

function getPrefix(): 'PROD' | 'UAT' {
	return process.env.VERCEL_ENV === 'production' ? 'PROD' : 'UAT'
}

export function getN8nWebhookUrl(): string | undefined {
	const prefix = getPrefix()
	return process.env[`${prefix}_N8N_WEBHOOK_URL`]
}

export function getN8nApiKey(): string | undefined {
	const prefix = getPrefix()
	return process.env[`${prefix}_N8N_X_API_KEY`]
}

export function getChatWebhookUrl(): string | undefined {
	const prefix = getPrefix()
	return process.env[`${prefix}_CHAT_WEBHOOK_URL`]
}
