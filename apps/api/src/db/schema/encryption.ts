import { pgTable, uuid, text, timestamp, pgPolicy, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'

// =============================================================================
// ENCRYPTION KEYS TABLE
// =============================================================================

/**
 * Stores encryption keys for workspace-level end-to-end encryption
 * Each workspace has one active key pair for encrypting conversation messages
 */
export const encryptionKeys = pgTable('encryption_keys', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }).unique(),

    // Public key for encryption (stored in plain text)
    publicKey: text('public_key').notNull(),

    // Private key encrypted with workspace master key
    encryptedPrivateKey: text('encrypted_private_key').notNull(),

    // Historical keys for message recovery (JSONB array of {publicKey, encryptedPrivateKey, rotatedAt})
    history: jsonb('history').default([]).$type<Array<{
        publicKey: string
        encryptedPrivateKey: string
        rotatedAt: string
    }>>(),

    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    rotatedAt: timestamp('rotated_at'), // When key was last rotated
    expiresAt: timestamp('expires_at'), // Optional expiration for security
}, (_table) => [
    // Policy: Workspace members can view encryption keys (to encrypt/decrypt messages)
    pgPolicy("Workspace members can view encryption keys", {
        for: "select",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    // Policy: Workspace admins can manage keys (handled by backend mostly, but for completeness)
    pgPolicy("Workspace owners can manage encryption keys", {
        for: "all",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()::text AND role = 'owner'
        )`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const encryptionKeysRelations = relations(encryptionKeys, ({ one }) => ({
    workspace: one(workspaces, { fields: [encryptionKeys.workspaceId], references: [workspaces.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type EncryptionKey = typeof encryptionKeys.$inferSelect
export type NewEncryptionKey = typeof encryptionKeys.$inferInsert
