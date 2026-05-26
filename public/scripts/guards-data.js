/**
 * Guardians page: load games from MLB API and map summary to boxscore.
 * Uses GET /mlb/teams/5/schedule and GET /mlb/summary/:id (via Express proxy).
 */

const GUARDIANS_TEAM_ID = "5";
const MLB_API_BASE = "/mlb";

/**
 * Find a stat value in a team's statistics array (e.g. "runs" in batting, "errors" in fielding)
 */
function getStatValue(teamEntry, statName, category) {
    var stats = teamEntry.statistics || [];
    var group = category ? stats.find(function (s) { return s.name === category; }) : stats[0];
    if (!group || !group.stats) return undefined;
    var stat = group.stats.find(function (s) { return s.name === statName; });
    return stat != null && stat.value !== undefined ? stat.value : undefined;
}

/**
 * Adapter: map ESPN MLB summary to our boxscore array (team, logo, homeAway, scoreboard, runs, hits, errors).
 */
function mapSummaryToBoxscore(summary) {
    var box = summary && summary.boxscore && summary.boxscore.teams;
    if (!Array.isArray(box) || box.length < 2) return null;
    var periods = 9;
    var competition = summary.header && summary.header.competitions && summary.header.competitions[0];
    var competitors = (competition && competition.competitors) || [];
    var statusType = (competition && competition.status && competition.status.type) || {};
    var gameState = (statusType.state || "pre").toLowerCase();
    var gameStarted = gameState === "in" || gameState === "post";
    var linescore = summary.linescore;
    var innings = (linescore && linescore.innings) ? linescore.innings : null;

    return box.map(function (teamEntry) {
        var t = teamEntry.team || {};
        var runs = getStatValue(teamEntry, "runs", "batting");
        var hits = getStatValue(teamEntry, "hits", "batting");
        var errors = getStatValue(teamEntry, "errors", "fielding");
        if (runs === undefined) runs = getStatValue(teamEntry, "runs", "pitching");
        var scoreboard = [];
        if (gameStarted) {
            var ha = (teamEntry.homeAway || "").toLowerCase();
            var comp = competitors.find(function (c) { return (c.homeAway || "").toLowerCase() === ha; });
            var inProgress = gameState === "in";
            if (comp && Array.isArray(comp.linescores) && comp.linescores.length > 0) {
                var count = inProgress ? comp.linescores.length : periods;
                for (var i = 0; i < periods; i++) {
                    if (i < count) {
                        var ls = comp.linescores[i];
                        var v = ls && (ls.value !== undefined ? ls.value : parseInt(ls.displayValue, 10));
                        scoreboard.push(typeof v === "number" && !isNaN(v) ? v : 0);
                    } else {
                        scoreboard.push(inProgress ? undefined : 0);
                    }
                }
            }
            if (scoreboard.length === 0 && innings && Array.isArray(innings)) {
                for (var i = 0; i < periods; i++) {
                    var inn = innings[i];
                    if (!inn) { scoreboard.push(inProgress ? undefined : 0); continue; }
                    var awayRuns = (inn.away !== undefined) ? inn.away : (inn.homeAway === "away" ? inn.runs : 0);
                    var homeRuns = (inn.home !== undefined) ? inn.home : (inn.homeAway === "home" ? inn.runs : 0);
                    if (teamEntry.homeAway === "away") scoreboard.push(typeof awayRuns === "number" ? awayRuns : 0);
                    else scoreboard.push(typeof homeRuns === "number" ? homeRuns : 0);
                }
                if (inProgress) {
                    while (scoreboard.length < periods) scoreboard.push(undefined);
                } else {
                    while (scoreboard.length < periods) scoreboard.push(0);
                }
            }
            if (scoreboard.length === 0 && linescore && Array.isArray(linescore.teams) && linescore.teams.length > 0) {
                var lsTeam = linescore.teams.find(function (lt) { return (lt.homeAway || "").toLowerCase() === ha; });
                if (lsTeam && Array.isArray(lsTeam.linescores) && lsTeam.linescores.length > 0) {
                    var lsCount = inProgress ? lsTeam.linescores.length : periods;
                    for (var j = 0; j < periods; j++) {
                        if (j < lsCount) {
                            var lsVal = lsTeam.linescores[j];
                            var n = lsVal && (lsVal.value !== undefined ? lsVal.value : parseInt(lsVal.displayValue, 10));
                            scoreboard.push(typeof n === "number" && !isNaN(n) ? n : 0);
                        } else {
                            scoreboard.push(inProgress ? undefined : 0);
                        }
                    }
                }
            }
            if (!inProgress) {
                while (scoreboard.length < periods) scoreboard.push(0);
            } else if (scoreboard.length < periods) {
                while (scoreboard.length < periods) scoreboard.push(undefined);
            }
        } else {
            while (scoreboard.length < periods) scoreboard.push(undefined);
        }
        return {
            team: t.displayName || "Team",
            logo: t.logo || "",
            homeAway: teamEntry.homeAway || (box.indexOf(teamEntry) === 1 ? "home" : "away"),
            scoreboard: scoreboard,
            runs: gameStarted && runs !== undefined ? Number(runs) : undefined,
            hits: gameStarted && hits !== undefined ? Number(hits) : undefined,
            errors: gameStarted && errors !== undefined ? Number(errors) : undefined
        };
    });
}

function loadGuardiansSchedule() {
    return ScheduleData.loadSchedule(MLB_API_BASE, GUARDIANS_TEAM_ID, ScheduleData.getRecordMLB);
}

var computeDefaultIndex = ScheduleData.computeDefaultIndex;

var fetchBoxscoreForGame = ScheduleData.createFetchBoxscore(MLB_API_BASE, mapSummaryToBoxscore);
