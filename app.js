const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.set('json spaces', 2);


app.get('/', (req, res) => {
    res.send('Sports!');
})
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

app.get(`/mlb/teams`, async (req, res) => {
    const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/5")
    const data = await response.json()
    res.send(data);
});

app.get('/mlb/schedule', async (req, res) => {
    const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/5/schedule")
    const data = await response.json()
    res.send(data);
})

app.get('/nba/schedule', async (req, res) => {
    const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/5/schedule")
    const data = await response.json()
    res.send(data);
})

app.get('/nfl/schedule', async (req, res) => {
    const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/5/schedule?season=2025&seasontype=2")
    const data = await response.json()
    res.send(data);
})

