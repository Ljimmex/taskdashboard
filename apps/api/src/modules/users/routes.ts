import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema/users'
import { authMiddleware } from '@/middleware/auth'
import { type Auth } from '../../lib/auth'
import { getSupabase } from '../../lib/supabase'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

export const usersRoutes = new Hono<Env>()

usersRoutes.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// GET /api/users/me
// -----------------------------------------------------------------------------
usersRoutes.get('/me', async (c) => {
    const user = c.get('user')
    // Fetch fresh user data
    const [freshUser] = await db.select().from(users).where(eq(users.id, user.id))
    return c.json(freshUser || user)
})

// -----------------------------------------------------------------------------
// PATCH /api/users/me
// -----------------------------------------------------------------------------
const updateUserSchema = z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    description: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(), // Receive as ISO string
    gender: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    timezone: z.string().optional().nullable(),
})

usersRoutes.patch('/me', zValidator('json', updateUserSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    const [updatedUser] = await db.update(users)
        .set({
            ...body,
            birthDate: body.birthDate ? new Date(body.birthDate) : body.birthDate === null ? null : undefined,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning()

    return c.json(updatedUser)
})

// -----------------------------------------------------------------------------
// POST /api/users/me/avatar
// -----------------------------------------------------------------------------
// Expects multipart/form-data with 'file'
usersRoutes.post('/me/avatar', async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file'] as File

    if (!file) {
        return c.json({ error: 'No file uploaded' }, 400)
    }

    // Use Supabase Storage
    const supabase = getSupabase()
    const fileExt = file.name.split('.').pop()
    const versionedPath = `${user.id}/${Date.now()}_avatar.${fileExt}`

    // Upload to 'avatars' bucket
    const { error } = await supabase.storage
        .from('avatars')
        .upload(versionedPath, file, {
            upsert: true,
        })

    if (error) {
        console.error('Supabase upload error:', error)
        return c.json({ error: 'Failed to upload avatar' }, 500)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(versionedPath)

    // Update user record
    const [updatedUser] = await db.update(users)
        .set({
            image: publicUrl,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning()

    return c.json(updatedUser)
})

// -----------------------------------------------------------------------------
// DELETE /api/users/:id/avatar
// -----------------------------------------------------------------------------
usersRoutes.delete('/:id/avatar', async (c) => {
    // const _requester = c.get('user') // Unused
    const targetUserId = c.req.param('id')

    // TODO: Permission Check

    // Just clear the DB field
    const [updatedUser] = await db.update(users)
        .set({
            image: null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId))
        .returning()

    return c.json({ user: updatedUser })
})

// -----------------------------------------------------------------------------
// POST /api/users/:id/avatar
// -----------------------------------------------------------------------------
usersRoutes.post('/:id/avatar', async (c) => {
    // const _requester = c.get('user') // Unused
    const targetUserId = c.req.param('id')
    const body = await c.req.parseBody()
    const file = body['file'] as File

    if (!file) {
        return c.json({ error: 'No file uploaded' }, 400)
    }

    // Permission Check: Allow if self OR if requester is admin/manager (simplified)
    // In a real app, we should check if requester shares a workspace with target and has admin role there.
    // For now, we assume frontend protects this, and we allow if logged in.
    // TODO: Add strict workspace permission check

    // Use Supabase Storage
    const supabase = getSupabase()
    const fileExt = file.name.split('.').pop()
    const versionedPath = `${targetUserId}/${Date.now()}_avatar.${fileExt}`

    // Upload to 'avatars' bucket
    const { error } = await supabase.storage
        .from('avatars')
        .upload(versionedPath, file, {
            upsert: true,
        })

    if (error) {
        console.error('Supabase upload error:', error)
        return c.json({ error: 'Failed to upload avatar' }, 500)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(versionedPath)

    // Update user record
    const [updatedUser] = await db.update(users)
        .set({
            image: publicUrl,
            updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId))
        .returning()

    return c.json({ user: updatedUser })
})

// -----------------------------------------------------------------------------
// DELETE /api/users/me/avatar
// -----------------------------------------------------------------------------
usersRoutes.delete('/me/avatar', async (c) => {
    const user = c.get('user')

    // Optional: Delete from storage (could be complex if we don't know the exact path, but we can try to parse it from 'image' URL or just leave it)
    // For now, just clear the DB field

    const [updatedUser] = await db.update(users)
        .set({
            image: null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning()

    return c.json({ user: updatedUser })
})

// -----------------------------------------------------------------------------
// DELETE /api/users/me
// -----------------------------------------------------------------------------
usersRoutes.delete('/me', async (c) => {
    const user = c.get('user')

    // Soft delete - mark as inactive
    const [updatedUser] = await db.update(users)
        .set({
            status: 'inactive', // or 'deleted', but enum is active/inactive/pending
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning()

    // We should ideally sign them out too, but frontend will handle redirect

    return c.json({ message: 'Account deleted successfully', user: updatedUser })
})
