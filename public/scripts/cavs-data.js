/**
 * Cavaliers page: load games from NBA API and map summary to boxscore.
 * Uses GET /nba/teams/5/schedule and GET /nba/summary/:eventId (via Express proxy).
 */

const CAVS_TEAM_ID = "5";
const NBA_API_BASE = "/nba";

/**
 * Adapter: map NBA summary to our boxscore format (team, logo, quarters, total).
 * Uses scoreboard competitors' linescores when provided (from scoreboard?dates=); else summary linescore.periods; else totals from game or players.
 */
function mapSummaryToBoxscore(summary, game, scoreboardCompetitors) {
    var box = summary && summary.boxscore && summary.boxscore.teams;
    if (!Array.isArray(box) || box.length < 2) return null;
    var players = (summary.boxscore && summary.boxscore.players) ? summary.boxscore.players : [];
    var inProgress = (game && (game.state || "").toLowerCase() === "in");

    return box.map(function (teamEntry, idx) {
        var t = teamEntry.team || {};
        var homeAway = teamEntry.homeAway || "away";
        var quarters = ScheduleData.buildQuarters(homeAway, scoreboardCompetitors, summary, inProgress);
        var total = Array.isArray(quarters)
            ? quarters.reduce(function (a, b) { return a + (typeof b === "number" ? b : 0); }, 0)
            : 0;
        if (total === 0 && game) {
            total = homeAway === "home" ? (game.homeScore || 0) : (game.awayScore || 0);
        }
        if (total === 0 && Array.isArray(players) && players[idx]) {
            var teamPlayers = players[idx];
            var statGroup = teamPlayers.statistics && teamPlayers.statistics.find(function (s) { return s.keys && s.keys.indexOf("points") !== -1; });
            if (statGroup && statGroup.totals && statGroup.totals.length > 1) {
                var pts = parseInt(statGroup.totals[1], 10);
                if (!isNaN(pts)) total = pts;
            }
        }
        return {
            team: t.displayName || "Team",
            logo: t.logo || "",
            homeAway: homeAway,
            quarters: (quarters || []).slice(0, 4),
            total: total
        };
    });
}

function loadCavsSchedule() {
    return ScheduleData.loadSchedule(NBA_API_BASE, CAVS_TEAM_ID, ScheduleData.getRecordNFLNBA);
}

var computeDefaultIndex = ScheduleData.computeDefaultIndex;

var fetchBoxscoreForGame = ScheduleData.createFetchBoxscore(NBA_API_BASE, mapSummaryToBoxscore);
