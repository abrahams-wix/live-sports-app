const express = require('express');
const router = express.Router();
const { getCached } = require('./cache');

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const SCOREBOARD_SUMMARY_TTL_MS = 120 * 1000;

async function fetchESPN(url, res, options = {}) {
    const { cacheKey, ttlMs } = options;
    const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const fetchFn = async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('ESPN API error');
        return response.json();
    };
    try {
        const data = cacheKey && ttlMs
            ? await getCached(cacheKey, ttlMs, fetchFn)
            : await fetchFn();
        res.send(data);
    } catch (error) {
        try {
            const data = await fetchFn();
            res.send(data);
        } catch (retryErr) {
            console.error('[%s] Fetch error:', reqId, retryErr.message);
            res.status(500).send({ error: 'Failed to fetch data' });
        }
    }
}

router.get('/', (req, res) => {
    res.send("Basketball!");
});

// Scoreboard (optional query: dates=YYYYMMDD for quarter scores on completed games)
router.get('/scoreboard', async (req, res) => {
    const q = req.query.dates ? `?dates=${req.query.dates}${req.query.limit ? '&limit=' + req.query.limit : ''}` : '';
    const url = `${BASE_URL}/scoreboard${q}`;
    const key = 'nba:scoreboard:' + (req.query.dates || '');
    await fetchESPN(url, res, { cacheKey: key, ttlMs: SCOREBOARD_SUMMARY_TTL_MS });
});

// All Teams
router.get('/teams', async (req, res) => {
    await fetchESPN(`${BASE_URL}/teams`, res);
});

// Team Detail
router.get('/teams/:id', async (req, res) => {
    const { id } = req.params;
    await fetchESPN(`${BASE_URL}/teams/${id}`, res);
});

// Team Roster
router.get('/teams/:id/roster', async (req, res) => {
    const { id } = req.params;
    await fetchESPN(`${BASE_URL}/teams/${id}/roster`, res);
});

// Team Schedule
router.get('/teams/:id/schedule', async (req, res) => {
    const { id } = req.params;
    const url = `${BASE_URL}/teams/${id}/schedule`;
    await fetchESPN(url, res, { cacheKey: 'nba:schedule:' + id, ttlMs: SCHEDULE_TTL_MS });
});

// Standings
router.get('/standings', async (req, res) => {
    await fetchESPN(`${BASE_URL}/standings`, res);
});

// News
router.get('/news', async (req, res) => {
    await fetchESPN(`${BASE_URL}/news`, res);
});

// Game Summary
router.get('/summary/:id', async (req, res) => {
    const { id } = req.params;
    const url = `${BASE_URL}/summary?event=${id}`;
    await fetchESPN(url, res, { cacheKey: 'nba:summary:' + id, ttlMs: SCOREBOARD_SUMMARY_TTL_MS });
});

// Leaders
router.get('/leaders', async (req, res) => {
    await fetchESPN('https://site.api.espn.com/apis/site/v3/sports/basketball/nba/leaders', res);
});

module.exports = router;
