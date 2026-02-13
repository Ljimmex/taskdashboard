// =============================================================================
// SECURE KEY STORAGE (IndexedDB)
// =============================================================================
// Stores workspace encryption keys securely in the browser.
// Uses IndexedDB because LocalStorage is synchronous, limited in size, 
// and vulnerable to XSS (CryptoKey objects cannot be stored in LocalStorage anyway).

const DB_NAME = 'zadano_secure_storage'
const STORE_NAME = 'workspace_keys'
const HISTORY_STORE_NAME = 'workspace_keys_history'
const DB_VERSION = 2

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
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                const historyStore = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id', autoIncrement: true })
                historyStore.createIndex('workspaceId', 'workspaceId', { unique: false })
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

        // Check existing key first
        const currentCheckTransaction = db.transaction([STORE_NAME], 'readonly')
        const currentStore = currentCheckTransaction.objectStore(STORE_NAME)
        const currentKeyRequest = currentStore.get(workspaceId)

        const currentKey: StoredKeyPair | undefined = await new Promise((resolve, reject) => {
            currentKeyRequest.onsuccess = () => resolve(currentKeyRequest.result)
            currentKeyRequest.onerror = () => reject(currentKeyRequest.error)
        })

        if (currentKey) {
            // Compare keys to avoid duplicates in history
            try {
                // We export to compare (simplified comparison)
                // Note: This is expensive but happens rarely (only on page load/key rotation)
                const currentSpki = await window.crypto.subtle.exportKey('spki', currentKey.publicKey)
                const newSpki = await window.crypto.subtle.exportKey('spki', publicKey)

                const currentBuffer = new Uint8Array(currentSpki)
                const newBuffer = new Uint8Array(newSpki)

                let isSame = true
                if (currentBuffer.length !== newBuffer.length) {
                    isSame = false
                } else {
                    for (let i = 0; i < currentBuffer.length; i++) {
                        if (currentBuffer[i] !== newBuffer[i]) {
                            isSame = false; break;
                        }
                    }
                }

                if (isSame) {
                    // Keys are identical, no need to archive or update (unless we want to update savedAt)
                    // But we'll overwrite anyway to be safe, just don't add to history
                } else {
                    // Keys are different! Archive the OLD one
                    const histTransaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
                    const histStore = histTransaction.objectStore(HISTORY_STORE_NAME)
                    histStore.put({
                        workspaceId: currentKey.workspaceId,
                        publicKey: currentKey.publicKey,
                        privateKey: currentKey.privateKey,
                        archivedAt: Date.now()
                    })
                    // Wait for history save? technically ideally yes, but indexeddb is robust
                }
            } catch (e) {
                console.warn('Error comparing keys, skipping history check', e)
            }
        }

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
    },

    /**
     * Get key history for workspace
     */
    async getKeyHistory(workspaceId: string): Promise<StoredKeyPair[]> {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                resolve([])
                return
            }

            const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly')
            const store = transaction.objectStore(HISTORY_STORE_NAME)
            const index = store.index('workspaceId')
            const request = index.getAll(workspaceId)

            request.onsuccess = () => {
                const results = request.result
                resolve(results ? (results as unknown as StoredKeyPair[]) : [])
            }
            request.onerror = () => reject(request.error)
        })
    }
}
