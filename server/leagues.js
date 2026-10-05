/**
 * Registry of supported leagues — the single place to add, remove or
 * re-point a league. Each entry configures an EspnDataSource and the
 * mount path used by server/app.js.
 *
 * To add a league: append an entry (e.g. hockey/nhl). To change the
 * upstream provider or URLs, see server/data/EspnDataSource.js.
 */
module.exports = [
    {
        mount: '/nba',
        key: 'nba',
        label: 'Basketball',
        sport: 'basketball/nba',
    },
    {
        mount: '/nfl',
        key: 'nfl',
        label: 'Football',
        sport: 'football/nfl',
    },
    {
        mount: '/mlb',
        key: 'mlb',
        label: 'Baseball',
        sport: 'baseball/mlb',
        scoreboard: { defaultDates: true }, // MLB defaults to today
    },
];
