import { Spinner } from '@/components/ui/spinner'
import dynamic from 'next/dynamic'

export const DashChatLazy = dynamic(
	() => import('./dash-chat').then((mod) => ({ default: mod.DashChat })),
	{
		loading: () => (
			<div className='flex h-full items-center justify-center'>
				<Spinner className='size-8 text-orange-500' />
			</div>
		),
		ssr: false,
	}
)
