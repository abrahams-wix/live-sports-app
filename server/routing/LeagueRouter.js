/**
 * Generic HTTP router for a league, built on top of a data source.
 *
 * Knows nothing about ESPN — it maps routes to data-source methods and
 * translates errors into HTTP responses. Any object implementing the same
 * method contract (scoreboard/teams/roster/schedule/standings/news/
 * summary/leaders) can be injected in place of EspnDataSource.
 */

const express = require('express');

class LeagueRouter {
    /**
     * @param {object} source - the league data source (e.g. EspnDataSource)
     */
    constructor(source) {
        if (!source || typeof source.request !== 'function') {
            throw new Error('LeagueRouter requires a data source');
        }
        this.source = source;
    }

    /** @returns {express.Router} */
    build() {
        const router = express.Router();
        const s = this.source;

        router.get('/', (req, res) => {
            res.send(`${s.label}!`);
        });

        router.get('/scoreboard', (req, res) => {
            this.send(res, () => s.scoreboard({ dates: req.query.dates, limit: req.query.limit }));
        });

        router.get('/teams', (req, res) => {
            this.send(res, () => s.teams());
        });

        router.get('/teams/:id', (req, res) => {
            this.send(res, () => s.team(req.params.id));
        });

        router.get('/teams/:id/roster', (req, res) => {
            this.send(res, () => s.roster(req.params.id));
        });

        router.get('/teams/:id/schedule', (req, res) => {
            this.send(res, () => s.schedule(req.params.id));
        });

        router.get('/standings', (req, res) => {
            this.send(res, () => s.standings());
        });

        router.get('/news', (req, res) => {
            this.send(res, () => s.news());
        });

        router.get('/summary/:id', (req, res) => {
            this.send(res, () => s.summary(req.params.id));
        });

        router.get('/leaders', (req, res) => {
            this.send(res, () => s.leaders());
        });

        return router;
    }

    /**
     * Run a data-source call and render it; map any failure to a 500.
     *
     * @param {express.Response} res
     * @param {() => Promise<any>} action
     */
    async send(res, action) {
        try {
            res.send(await action());
        } catch (error) {
            console.error(`[${this.source.key}] Fetch error:`, error.message);
            res.status(500).send({ error: 'Failed to fetch data' });
        }
    }
}

module.exports = { LeagueRouter };
