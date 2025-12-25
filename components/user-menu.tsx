'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/auth-provider'
import { getUserInitials, getDisplayName } from '@/lib/auth/utils'
import { IconLogout, IconSettings } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function UserMenu() {
  const { user, isLoading, signOut } = useAuth()
  const t = useTranslations('auth')

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
  }

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">{t('login.button')}</Link>
      </Button>
    )
  }

  const displayName = getDisplayName(user.user_metadata?.full_name, user.email)
  const initials = getUserInitials(user.user_metadata?.full_name, user.email)
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <IconSettings className="mr-2 h-4 w-4" />
            {t('menu.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <IconLogout className="mr-2 h-4 w-4" />
          {t('menu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
