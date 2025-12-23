import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
	// Image optimization
	images: {
		formats: ['image/webp', 'image/avif'],
	},
	// Enable compression
	compress: true,
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
}

export default withNextIntl(nextConfig)
