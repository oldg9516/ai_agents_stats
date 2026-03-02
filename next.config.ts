import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{ key: 'X-XSS-Protection', value: '1; mode=block' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{
		key: 'Strict-Transport-Security',
		value: 'max-age=31536000; includeSubDomains',
	},
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=()',
	},
]

const nextConfig: NextConfig = {
	// Image optimization
	images: {
		formats: ['image/webp', 'image/avif'],
	},
	// Enable compression
	compress: true,
	// CopilotKit runtime uses pino which has Node.js-only deps
	serverExternalPackages: ['@copilotkit/runtime', 'pino', 'thread-stream'],
	// Optimize package imports to reduce bundle size
	experimental: {
		optimizePackageImports: [
			'@radix-ui/react-dialog',
			'@radix-ui/react-select',
			'@radix-ui/react-popover',
			'@radix-ui/react-dropdown-menu',
			'@nivo/sankey',
			'@nivo/heatmap',
			'@tabler/icons-react',
			'recharts',
			'date-fns',
		],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		]
	},
}

export default withNextIntl(nextConfig)
