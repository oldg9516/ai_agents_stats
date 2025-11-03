import { Spinner } from '@/components/ui/spinner'

export default function SpinnerComponent() {
	return (
		<div className='flex justify-center items-center w-full min-h-[calc(100vh-100px)]'>
			<Spinner className='size-8 text-orange-500' />
		</div>
	)
}
