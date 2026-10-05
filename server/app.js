const express = require('express');

const leagues = require('./leagues.js');
const { EspnDataSource } = require('./data/EspnDataSource.js');
const { LeagueRouter } = require('./routing/LeagueRouter.js');

const cors = require('cors');
const app = express();
const port = 3002;

if (process.env.NODE_ENV === 'production') {
    const origin = process.env.ALLOWED_ORIGIN || 'https://your-front-origin.com';
    app.use(cors({ origin }));
} else {
    app.use(cors());
}

// Serve static files (HTML, CSS, JS, images)
app.use(express.static('public'));             // /home.html, /guards.html, etc.
app.use('/pages', express.static('public'));   // /pages/home.html (same files)
app.use('/styles', express.static('public/styles'));
app.use('/scripts', express.static('public/scripts'));
app.use('/images', express.static('public/images'));

// Mount one router per league from the registry — adding a league is a
// one-line entry in server/leagues.js.
for (const league of leagues) {
    app.use(league.mount, new LeagueRouter(new EspnDataSource(league)).build());
}

app.set('json spaces', 2);

app.get('/', (req, res) => {
    res.redirect('/home.html');
});

// 404 must be registered before listen so it runs for unmatched routes
app.use((req, res) => {
    res.status(404).send({
        error: "404: Page Not Found",
        message: "Like a Browns Super Bowl, this page does not exist.",
        advice: "There's always next season."
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

module.exports = app; 