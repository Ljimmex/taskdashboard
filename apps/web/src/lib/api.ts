// API client helper for making authenticated requests
const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || ''
}

export const apiUrl = getApiUrl()

// Helper to make fetch calls to the API with credentials
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })
}

// Typed wrapper for JSON responses
export async function apiFetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await apiFetch(endpoint, options)

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}
