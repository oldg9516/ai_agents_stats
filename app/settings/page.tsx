import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { IconSettings } from '@tabler/icons-react'

/**
 * Settings Page - Placeholder for future settings functionality
 *
 * Future features:
 * - Manage qualified agents list
 * - Configure email notifications
 * - Set quality thresholds
 * - Database connection settings
 */
export default function SettingsPage() {
	return (
		<SidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)',
				} as React.CSSProperties
			}
		>
			<AppSidebar variant='inset' />
			<SidebarInset>
				<SiteHeader />
				<div className='flex flex-1 flex-col'>
					<div className='@container/main flex flex-1 flex-col gap-2'>
						<div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6'>
							<Card>
								<CardHeader>
									<div className='flex items-center gap-3'>
										<div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
											<IconSettings className='h-6 w-6 text-primary' />
										</div>
										<div>
											<CardTitle>Settings</CardTitle>
											<CardDescription>
												Configure dashboard preferences and settings
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className='space-y-6'>
									<div className='rounded-lg border border-dashed p-8 text-center'>
										<IconSettings className='mx-auto h-12 w-12 text-muted-foreground/50 mb-4' />
										<h3 className='text-lg font-semibold mb-2'>Coming Soon</h3>
										<p className='text-sm text-muted-foreground max-w-md mx-auto'>
											Settings functionality will be available in a future
											update. Features will include:
										</p>
										<ul className='text-sm text-muted-foreground mt-4 space-y-2 max-w-md mx-auto text-left list-disc list-inside'>
											<li>Manage qualified agents list</li>
											<li>Configure email notifications</li>
											<li>Set quality thresholds and alerts</li>
											<li>Database connection settings</li>
											<li>Export preferences</li>
											<li>Theme customization</li>
										</ul>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
