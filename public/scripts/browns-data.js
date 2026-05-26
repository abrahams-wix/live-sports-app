/**
 * Browns page: load games from NFL API and map summary to boxscore.
 * Uses GET /nfl/teams/5/schedule and GET /nfl/summary/:eventId (via Express proxy).
 */

const BROWNS_TEAM_ID = "5";
const NFL_API_BASE = "/nfl";

/**
 * Build quarters array from scoreboard competitor linescores (period 1..4).
 * @param {Array} linescores - e.g. [{ period: 1, value: 7 }, ...]
 * @param {boolean} inProgress - if true, unplayed quarters are undefined (display as "-")
 * @returns {Array<number|undefined>} length 4
 */
function quartersFromScoreboardLinescores(linescores, inProgress) {
    if (!Array.isArray(linescores) || linescores.length === 0) return null;
    var byPeriod = linescores.slice().sort(function (a, b) { return (a.period || 0) - (b.period || 0); });
    var quarters = byPeriod.slice(0, 4).map(function (p) {
        var v = p.value;
        if (v === undefined && p.displayValue != null) v = parseInt(p.displayValue, 10);
        return typeof v === "number" && !isNaN(v) ? v : (inProgress ? undefined : 0);
    });
    var pad = inProgress ? undefined : 0;
    while (quarters.length < 4) quarters.push(pad);
    return quarters;
}

/**
 * Adapter: map NFL summary to our boxscore format (team, logo, quarters, total).
 * Uses scoreboard competitors' linescores when provided (from scoreboard?dates=); else summary linescore.periods; else totals from game.
 */
function mapSummaryToBoxscore(summary, game, scoreboardCompetitors) {
    var box = summary && summary.boxscore && summary.boxscore.teams;
    if (!Array.isArray(box) || box.length < 2) return null;
    var linescore = summary.linescore;
    var periods = (linescore && linescore.periods) ? linescore.periods : null;
    var noPeriodData = "-";
    var inProgress = (game && (game.state || "").toLowerCase() === "in");

    return box.map(function (teamEntry) {
        var t = teamEntry.team || {};
        var homeAway = teamEntry.homeAway || "away";
        var quarters;
        var fromScoreboard = Array.isArray(scoreboardCompetitors) && scoreboardCompetitors.length >= 2;
        var comp = fromScoreboard ? scoreboardCompetitors.find(function (c) { return (c.homeAway || "") === homeAway; }) : null;
        if (comp && comp.linescores && comp.linescores.length > 0) {
            quarters = quartersFromScoreboardLinescores(comp.linescores, inProgress);
        }
        if (!quarters && Array.isArray(periods) && periods.length > 0) {
            quarters = periods.map(function (p) {
                var val = p[homeAway];
                if (val === undefined && (p.homeScore !== undefined || p.awayScore !== undefined)) {
                    val = homeAway === "home" ? p.homeScore : p.awayScore;
                }
                if (val === undefined) val = p.homeAway === homeAway ? p.score : 0;
                return typeof val === "number" ? val : parseInt(val, 10) || 0;
            });
            while (quarters.length < 4) quarters.push(inProgress ? undefined : 0);
        }
        if (!quarters && linescore && Array.isArray(linescore.teams) && linescore.teams.length > 0) {
            var lsTeam = linescore.teams.find(function (lt) { return (lt.homeAway || "") === homeAway; });
            if (lsTeam && Array.isArray(lsTeam.linescores) && lsTeam.linescores.length > 0) {
                var pad = inProgress ? undefined : 0;
                quarters = lsTeam.linescores.slice(0, 4).map(function (ls) {
                    var v = ls.value !== undefined ? ls.value : parseInt(ls.displayValue, 10);
                    return typeof v === "number" && !isNaN(v) ? v : pad;
                });
                while (quarters.length < 4) quarters.push(pad);
            }
        }
        if (!quarters) {
            quarters = [noPeriodData, noPeriodData, noPeriodData, noPeriodData];
        }
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
