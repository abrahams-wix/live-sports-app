/**
 * Minimal in-memory TTL cache.
 *
 * Generic and dependency-free so it can be swapped for a shared store
 * (e.g. Redis) behind the same interface without touching callers.
 */
class TtlCache {
    constructor() {
        this.entries = new Map();
    }

    /**
     * Return the cached value for `key` while fresh; otherwise produce,
     * store and return a new one.
     *
     * @param {string} key
     * @param {number} ttlMs
     * @param {() => Promise<any>} producer
     * @returns {Promise<any>}
     */
    async fetch(key, ttlMs, producer) {
        const entry = this.entries.get(key);
        if (entry && Date.now() < entry.expiresAt) {
            return entry.data;
        }
        const data = await producer();
        this.entries.set(key, { data, expiresAt: Date.now() + ttlMs });
        return data;
    }
}

module.exports = { TtlCache };
