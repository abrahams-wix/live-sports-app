const express = require('express');
const app = express();
const port = 3000;

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




