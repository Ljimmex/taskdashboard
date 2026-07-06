import { db } from '@/db'

const PLATFORM_OWNER_CACHE = new Map<string, CacheEntry>()

const CACHE_TTL_MS = 60_000

interface CacheEntry {
    value: boolean
    expiresAt: number
}

export async function isPlatformOwner(userId: string): Promise<boolean> {
    const cached = PLATFORM_OWNER_CACHE.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value
    }

    const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
        columns: { internalFlags: true },
    })

    const value = user?.internalFlags?.platformOwner === true
    PLATFORM_OWNER_CACHE.set(userId, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
}

export function clearPlatformOwnerCache(userId?: string) {
    if (userId) {
        PLATFORM_OWNER_CACHE.delete(userId)
    } else {
        PLATFORM_OWNER_CACHE.clear()
    }
}
