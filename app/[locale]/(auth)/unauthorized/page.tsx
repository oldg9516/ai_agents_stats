'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Link } from '@/i18n/routing'
import { IconShieldX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

export default function UnauthorizedPage() {
  const t = useTranslations('auth')

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <IconShieldX className="h-16 w-16 text-destructive" />
        </div>
        <CardTitle className="text-2xl">{t('unauthorized.title')}</CardTitle>
        <CardDescription>{t('unauthorized.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          {t('unauthorized.message')}
        </p>

        <Button asChild className="w-full">
          <Link href="/">{t('unauthorized.backToHome')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
