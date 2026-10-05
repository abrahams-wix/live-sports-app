/**
 * Data source for ESPN's public REST API.
 *
 * This class owns EVERYTHING provider-specific: base URLs, API versions,
 * per-endpoint cache keys/TTLs and the fetch/retry policy. The rest of the
 * server only talks to the methods below, so changing provider (or ESPN
 * moving its endpoints) means editing this file alone — or passing in a
 * different object that exposes the same method contract.
 */

const { TtlCache } = require('../core/TtlCache');

const SCHEDULE_TTL_MS = 5 * 60 * 1000;       // 5 min — schedules change rarely
const SCOREBOARD_SUMMARY_TTL_MS = 120 * 1000; // 2 min — live-ish data
const BASE_URL = process.env.ESPN_API_BASE_URL || 'https://site.api.espn.com/apis/site';

class EspnDataSource {
    /**
     * @param {object} config - one entry from server/leagues.js
     * @param {string} config.key - short league key used in cache keys
     * @param {string} config.sport - ESPN sport path, e.g. "football/nfl"
     * @param {string} config.label - human-readable league label
     * @param {object} [config.scoreboard] - per-league scoreboard behavior
     * @param {boolean} [config.scoreboard.defaultDates] - default to today when no date given
     */
    constructor({ key, sport, label, scoreboard = {} } = {}) {
        if (!key || !sport) {
            throw new Error('EspnDataSource requires { key, sport }');
        }
        this.key = key;
        this.label = label || key;
        this.baseUrl = `${BASE_URL}/v2/sports/${sport}`;
        this.leadersUrl = `${BASE_URL}/v3/sports/${sport}/leaders`;
        this.scoreboardDefaultDates = scoreboard.defaultDates === true;
        this.cache = new TtlCache();
    }

    /**
     * Fetch a URL as JSON, going through the cache when configured.
     * On failure, retries once directly (bypassing the cache) before giving up.
     *
     * @param {string} url
     * @param {{ cacheKey?: string, ttlMs?: number }} [options]
     * @returns {Promise<any>}
     */
    async request(url, { cacheKey, ttlMs } = {}) {
        const fetchJson = async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error('ESPN API error');
            return response.json();
        };
        try {
            if (cacheKey && ttlMs) {
                return await this.cache.fetch(cacheKey, ttlMs, fetchJson);
            }
            return await fetchJson();
        } catch {
            return fetchJson(); // one uncached retry
        }
    }

    /** Daily scoreboard. Optional: dates=YYYYMMDD, limit=N. */
    async scoreboard({ dates, limit } = {}) {
        const effectiveDates = dates || (this.scoreboardDefaultDates ? this.today() : undefined);
        const params = new URLSearchParams();
        if (effectiveDates) params.set('dates', effectiveDates);
        if (limit) params.set('limit', limit);
        const qs = params.toString();
        return this.request(
            `${this.baseUrl}/scoreboard${qs ? `?${qs}` : ''}`,
            { cacheKey: `${this.key}:scoreboard:${effectiveDates || ''}`, ttlMs: SCOREBOARD_SUMMARY_TTL_MS }
        );
    }

    async teams() {
        return this.request(`${this.baseUrl}/teams`);
    }

    async team(id) {
        return this.request(`${this.baseUrl}/teams/${id}`);
    }

    async roster(id) {
        return this.request(`${this.baseUrl}/teams/${id}/roster`);
    }

    async schedule(id) {
        return this.request(`${this.baseUrl}/teams/${id}/schedule`, {
            cacheKey: `${this.key}:schedule:${id}`,
            ttlMs: SCHEDULE_TTL_MS,
        });
    }

    async standings() {
        return this.request(`${this.baseUrl}/standings`);
    }

    async news() {
        return this.request(`${this.baseUrl}/news`);
    }

    async summary(id) {
        return this.request(`${this.baseUrl}/summary?event=${id}`, {
            cacheKey: `${this.key}:summary:${id}`,
            ttlMs: SCOREBOARD_SUMMARY_TTL_MS,
        });
    }

    async leaders() {
        return this.request(this.leadersUrl);
    }

    today() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
}

module.exports = { EspnDataSource };
