import Link from 'next/link'

export default function Home() {
	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
			<main className='flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start'>
				<div className='flex flex-col items-center gap-6 text-center sm:items-start sm:text-left'>
					<h1 className='text-4xl font-bold'>Welcome to the Homepage</h1>

					<Link href='/dashboard' className='text-blue-500 hover:text-blue-600'>
						Go to Dashboard
					</Link>
				</div>
			</main>
		</div>
	)
}
