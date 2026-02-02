import { createHmac } from 'crypto'

/**
 * Signs a webhook payload using a secret.
 * Follows a standard format: t=timestamp,v1=signature
 * to prevent replay attacks and ensure authenticity.
 */
export function signWebhookPayload(payload: any, secret: string, timestamp: number): string {
    const jsonPayload = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const signaturePayload = `${timestamp}.${jsonPayload}`

    const hmac = createHmac('sha256', secret)
    hmac.update(signaturePayload)
    const signature = hmac.digest('hex')

    return `t=${timestamp},v1=${signature}`
}

/**
 * Verifies a webhook signature (helper for clients or internal testing)
 */
export function verifyWebhookSignature(payload: any, secret: string, headerValue: string): boolean {
    try {
        const parts = headerValue.split(',')
        const tPart = parts.find(p => p.startsWith('t='))
        const vPart = parts.find(p => p.startsWith('v1='))

        if (!tPart || !vPart) return false

        const timestamp = parseInt(tPart.split('=')[1], 10)
        const signature = vPart.split('=')[1]

        // Re-generate signature
        const expectedHeader = signWebhookPayload(payload, secret, timestamp)
        const expectedSignature = expectedHeader.split(',v1=')[1]

        // Check if signature matches
        // Check if within 5 minutes (300,000 ms) for replay protection
        const now = Date.now()
        if (Math.abs(now - timestamp) > 300000) return false

        return signature === expectedSignature
    } catch (e) {
        return false
    }
}
