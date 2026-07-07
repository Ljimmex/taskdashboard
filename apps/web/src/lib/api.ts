// API client helper for making authenticated requests
const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || ''
}

export const apiUrl = getApiUrl()

// Helper to make fetch calls to the API with credentials
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

    const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
    }

    const token = localStorage.getItem('bearer_token')
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    // Automatically set Content-Type to JSON if not already set and body is not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
    }

    return fetch(url, {
        ...options,
        credentials: 'include',
        headers,
    })
}

import { toast } from '@/hooks/useToast'

// Typed wrapper for JSON responses
export async function apiFetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await apiFetch(endpoint, options)

    const data = await response.json().catch(() => null)

    if (response.status === 402) {
        // Workspace/plan limit errors are surfaced as 402 Payment Required.
        // Show a toast so users understand why the action was blocked.
        const message = data?.error || 'Plan limit reached'
        toast.error(message)
        throw new Error(message)
    }

    return data as T
}
