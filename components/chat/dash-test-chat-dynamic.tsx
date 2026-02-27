import { Spinner } from '@/components/ui/spinner'
import dynamic from 'next/dynamic'

export const DashTestChatLazy = dynamic(
	() => import('./dash-test-chat').then((mod) => ({ default: mod.DashTestChat })),
	{
		loading: () => (
			<div className='flex h-full items-center justify-center'>
				<Spinner className='size-8 text-orange-500' />
			</div>
		),
		ssr: false,
	}
)
