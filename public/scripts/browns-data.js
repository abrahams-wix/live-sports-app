/**
 * Browns page: load games from NFL API and map summary to boxscore.
 * Uses GET /nfl/teams/5/schedule and GET /nfl/summary/:eventId (via Express proxy).
 */

const BROWNS_TEAM_ID = "5";
const NFL_API_BASE = "/nfl";

/**
 * Adapter: map NFL summary to our boxscore format (team, logo, quarters, total).
 * Uses scoreboard competitors' linescores when provided (from scoreboard?dates=); else summary linescore.periods; else totals from game.
 */
function mapSummaryToBoxscore(summary, game, scoreboardCompetitors) {
    var box = summary && summary.boxscore && summary.boxscore.teams;
    if (!Array.isArray(box) || box.length < 2) return null;
    var inProgress = (game && (game.state || "").toLowerCase() === "in");

    return box.map(function (teamEntry) {
        var t = teamEntry.team || {};
        var homeAway = teamEntry.homeAway || "away";
        var quarters = ScheduleData.buildQuarters(homeAway, scoreboardCompetitors, summary, inProgress);
        var total = Array.isArray(quarters)
            ? quarters.reduce(function (a, b) { return a + (typeof b === "number" ? b : 0); }, 0)
            : 0;
        if (total === 0 && game) {
            total = homeAway === "home" ? (game.homeScore || 0) : (game.awayScore || 0);
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

function loadBrownsSchedule() {
    return ScheduleData.loadSchedule(NFL_API_BASE, BROWNS_TEAM_ID, ScheduleData.getRecordNFLNBA);
}

var computeDefaultIndex = ScheduleData.computeDefaultIndex;

var fetchBoxscoreForGame = ScheduleData.createFetchBoxscore(NFL_API_BASE, mapSummaryToBoxscore);
