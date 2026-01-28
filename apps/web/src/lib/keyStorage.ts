// =============================================================================
// SECURE KEY STORAGE (IndexedDB)
// =============================================================================
// Stores workspace encryption keys securely in the browser.
// Uses IndexedDB because LocalStorage is synchronous, limited in size, 
// and vulnerable to XSS (CryptoKey objects cannot be stored in LocalStorage anyway).

const DB_NAME = 'zadano_secure_storage'
const STORE_NAME = 'workspace_keys'
const DB_VERSION = 1

interface StoredKeyPair {
    workspaceId: string
    publicKey: CryptoKey
    privateKey: CryptoKey
    savedAt: number
}

// Initialize DB
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'workspaceId' })
            }
        }

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result)
        }

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error)
        }
    })
}

export const keyStorage = {
    /**
     * Save workspace keys to IndexedDB
     */
    async saveKeys(workspaceId: string, publicKey: CryptoKey, privateKey: CryptoKey): Promise<void> {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)

            const record: StoredKeyPair = {
                workspaceId,
                publicKey,
                privateKey, // Structured Clone Algorithm handles CryptoKey
                savedAt: Date.now()
            }

            const request = store.put(record)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    },

    /**
     * Get workspace keys from IndexedDB
     */
    async getKeys(workspaceId: string): Promise<StoredKeyPair | null> {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.get(workspaceId)

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? (result as StoredKeyPair) : null)
            }
            request.onerror = () => reject(request.error)
        })
    },

    /**
     * Delete keys (on logout or key rotation)
     */
    async deleteKeys(workspaceId: string): Promise<void> {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.delete(workspaceId)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    },

    /**
     * Check if keys exist for workspace (fast check)
     */
    async hasKeys(workspaceId: string): Promise<boolean> {
        const keys = await this.getKeys(workspaceId)
        return !!keys
    }
}
