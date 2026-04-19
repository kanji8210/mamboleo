import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'recently'
  }
}

/** Strip HTML tags from a string (for safe plain-text rendering) */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
