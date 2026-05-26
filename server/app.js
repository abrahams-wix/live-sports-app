const express = require('express');

const basketballRoutes = require("./routers/basketball.js"); 
const baseballRoutes = require("./routers/baseball.js"); 
const footballRoutes = require("./routers/football.js"); 

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
app.use(express.static('pages'));            // /home.html, /guards.html, etc.
app.use('/pages', express.static('pages'));   // /pages/home.html (same files)
app.use('/styles', express.static('styles'));
app.use('/scripts', express.static('scripts'));
app.use('/images', express.static('images'));

app.use("/nba", basketballRoutes);
app.use("/nfl", footballRoutes) ; 
app.use("/mlb", baseballRoutes); 

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