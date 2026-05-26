/**
 * In-memory cache for ESPN proxy responses.
 * TTLs: schedule 5 min; scoreboard/summary 120 s.
 */

const cache = new Map();

/**
 * @param {string} key - Cache key (e.g. full URL or route identifier)
 * @param {number} ttlMs - Time to live in milliseconds
 * @param {() => Promise<any>} fetchFn - Async function that returns the value
 * @returns {Promise<any>}
 */
async function getCached(key, ttlMs, fetchFn) {
    const entry = cache.get(key);
    const now = Date.now();
    if (entry && now < entry.expiresAt) {
        return entry.data;
    }
    const data = await fetchFn();
    cache.set(key, { data, expiresAt: now + ttlMs });
    return data;
}

module.exports = { getCached };
