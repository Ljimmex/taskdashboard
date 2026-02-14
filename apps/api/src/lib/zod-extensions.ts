import { z } from 'zod'

/**
 * A Zod string schema that forbids HTML tags to prevent stored XSS.
 * Trims whitespace.
 */
export const zSanitizedString = () =>
    z.string()
        .trim()
        .refine((val) => !/<[^>]*>/g.test(val), {
            message: "String must not contain HTML tags (XSS protection)."
        })

/**
 * Same as zSanitizedString but optional/nullable
 */
export const zSanitizedStringOptional = () => zSanitizedString().optional().nullable()
