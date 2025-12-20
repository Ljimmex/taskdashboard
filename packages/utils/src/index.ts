import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

// =============================================================================
// STRING UTILS
// =============================================================================

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength - 3) + '...'
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate slug from string
 */
export function slugify(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// =============================================================================
// DATE UTILS
// =============================================================================

/**
 * Format date to display string
 */
export function formatDate(date: Date | string, pattern = 'MMM d, yyyy'): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return format(d, pattern)
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format date for datetime input
 */
export function formatDateTimeInput(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return ''
    return format(d, "yyyy-MM-dd'T'HH:mm")
}

// =============================================================================
// VALIDATION UTILS
// =============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
export function isStrongPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return passwordRegex.test(password)
}

// =============================================================================
// NUMBER UTILS
// =============================================================================

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num)
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max)
}

// =============================================================================
// ARRAY UTILS
// =============================================================================

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
    return array.reduce(
        (result, item) => {
            const groupKey = String(item[key])
            if (!result[groupKey]) {
                result[groupKey] = []
            }
            result[groupKey].push(item)
            return result
        },
        {} as Record<string, T[]>
    )
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)]
}

/**
 * Move item in array from one index to another
 */
export function moveItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array]
    const [item] = newArray.splice(fromIndex, 1)
    newArray.splice(toIndex, 0, item)
    return newArray
}

// =============================================================================
// ASYNC UTILS
// =============================================================================

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

// =============================================================================
// COLOR UTILS
// =============================================================================

/**
 * Get color for task priority
 */
export function getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
    const colors = {
        low: '#22C55E',
        medium: '#3B82F6',
        high: '#F59E0B',
        urgent: '#EF4444',
    }
    return colors[priority]
}

/**
 * Get color for task status
 */
export function getStatusColor(status: 'todo' | 'in_progress' | 'review' | 'done'): string {
    const colors = {
        todo: '#6B7280',
        in_progress: '#3B82F6',
        review: '#F59E0B',
        done: '#22C55E',
    }
    return colors[status]
}
