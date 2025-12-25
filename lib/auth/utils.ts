/**
 * Validates if an email belongs to the allowed domain
 */
export function isEmailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) return false

  const allowedDomain =
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com'
  return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)
}

/**
 * Extracts user initials from name or email
 */
export function getUserInitials(
  name?: string | null,
  email?: string | null
): string {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  if (email) {
    return email.slice(0, 2).toUpperCase()
  }

  return 'U'
}

/**
 * Gets display name from user metadata
 */
export function getDisplayName(
  fullName?: string | null,
  email?: string | null
): string {
  if (fullName) return fullName
  if (email) return email.split('@')[0]
  return 'User'
}
