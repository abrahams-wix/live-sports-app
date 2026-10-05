/**
 * Shared schedule and boxscore data layer (Revealing Module pattern).
 * Single global ScheduleData; no sport-specific logic.
 *
 * Rejects on network errors, non-ok responses, malformed JSON, or when the API returns
 * data that cannot be mapped; UI can show "Couldn't load schedule" / "Couldn't load boxscore".
 *
 * Contract for boxscore mappers: (summary, game?) => Array<teamRow> | null.
 * Each row must include at least team, logo, and keys expected by generateTable(..., sportConfig).
 */
var ScheduleData = (function () {
    "use strict";

    function formatDate(isoDate) {
        if (!isoDate) return "";
        var d = new Date(isoDate);
        var m = (d.getMonth() + 1).toString().padStart(2, "0");
        var day = d.getDate().toString().padStart(2, "0");
        var y = d.getFullYear().toString().slice(-2);
        return m + "/" + day + "/" + y;
    }

    function getTeamLogo(compOrTeam) {
        var t = compOrTeam && compOrTeam.team ? compOrTeam.team : compOrTeam;
        if (!t) return "";
        if (t.logo) return t.logo;
        var logos = t.logos;
        if (Array.isArray(logos) && logos.length > 0) {
            var def = logos.find(function (l) { return l.rel && l.rel.indexOf("default") !== -1; });
            var scoreboard = logos.find(function (l) { return l.rel && l.rel.indexOf("scoreboard") !== -1; });
            return (def || scoreboard || logos[0]).href || "";
        }
        return "";
    }

    function getRecordMLB(comp) {
        if (!comp || !comp.records) return "0-0";
        var rec = comp.records.find(function (r) { return r.type === "total" || r.name === "overall"; });
        return (rec && rec.summary) ? rec.summary : "0-0";
    }

    function getRecordNFLNBA(comp) {
        if (!comp || !comp.record) return "0-0";
        var total = comp.record.find(function (r) { return r.type === "total"; });
        return (total && total.displayValue) ? total.displayValue : "0-0";
    }

    /**
     * ESPN schedule returns score as object { value, displayValue }; parse to number or null.
     */
    function parseScore(comp) {
        if (!comp) return null;
        var s = comp.score;
        if (s == null) return null;
        if (typeof s === "number" && !isNaN(s)) return s;
        if (typeof s === "object") {
            if (typeof s.value === "number" && !isNaN(s.value)) return s.value;
            if (s.displayValue != null) { var n = parseInt(s.displayValue, 10); return isNaN(n) ? null : n; }
        }
        if (typeof s === "string") { var n = parseInt(s, 10); return isNaN(n) ? null : n; }
        return null;
    }

    /**
     * Build quarters array from competitor linescores (period 1..4).
     * @param {Array} linescores - e.g. [{ period: 1, value: 7 }, ...]
     * @param {boolean} inProgress - if true, unplayed periods are undefined (display as "-")
     * @returns {Array<number|undefined>} length 4
     */
    function quartersFromLinescores(linescores, inProgress) {
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

    function computeDefaultIndex(games) {
        if (!Array.isArray(games) || games.length === 0) return 0;
        var inProgressIdx = -1;
        var lastCompletedIdx = -1;
        var lastCompletedDate = null;
        for (var i = 0; i < games.length; i++) {
            var state = games[i].state || "pre";
            if (state === "in") {
                inProgressIdx = i;
                break;
            }
            if (state === "post") {
                var d = games[i].dateISO;
                if (!lastCompletedDate || (d && d > lastCompletedDate)) {
                    lastCompletedDate = d;
                    lastCompletedIdx = i;
                }
            }
        }
        if (inProgressIdx >= 0) return inProgressIdx;
        if (lastCompletedIdx >= 0) return lastCompletedIdx;
        return 0;
    }

    /**
     * Load schedule and map events to game shape (Template Method: fixed skeleton, getRecordFn is the variable step).
     * @param {string} apiBase - e.g. "/mlb", "/nfl", "/nba"
     * @param {string} teamId - ESPN team ID
     * @param {function(object): string} getRecordFn - Strategy: extract record string from competitor (e.g. getRecordMLB, getRecordNFLNBA)
     * @returns {Promise<Array>} Promise of game objects
     */
    function loadSchedule(apiBase, teamId, getRecordFn) {
        return fetch(apiBase + "/teams/" + teamId + "/schedule")
            .then(function (res) {
                if (!res.ok) return Promise.reject(new Error("Schedule failed"));
                return res.json().catch(function () { return Promise.reject(new Error("Invalid schedule response")); });
            })
            .then(function (data) {
                if (!data) return Promise.reject(new Error("Invalid schedule response"));
                var events = data.events || [];
                return events.map(function (event) {
                    var comp = event.competitions && event.competitions[0];
                    if (!comp) return null;
                    var home = comp.competitors && comp.competitors.find(function (c) { return c.homeAway === "home"; });
                    var away = comp.competitors && comp.competitors.find(function (c) { return c.homeAway === "away"; });
                    if (!home || !away) return null;
                    var homeTeam = home.team || {};
                    var awayTeam = away.team || {};
                    var statusType = comp.status && comp.status.type ? comp.status.type : {};
                    var status = statusType.description || statusType.shortDetail || "Scheduled";
                    var state = (statusType.state === "in" || statusType.state === "post" || statusType.state === "pre") ? statusType.state : "pre";
                    var timeStr = (comp.status && comp.status.shortDetail) ? comp.status.shortDetail : (event.date ? new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "");
                    var gameDate = comp.date || event.date;
                    return {
                        id: event.id,
                        date: formatDate(gameDate),
                        dateISO: gameDate,
                        time: timeStr,
                        venue: (comp.venue && comp.venue.fullName) ? comp.venue.fullName : "",
                        homeTeam: {
                            name: homeTeam.displayName || "Home",
                            logo: getTeamLogo(home) || homeTeam.logo || "",
                            record: getRecordFn(home)
                        },
                        awayTeam: {
                            name: awayTeam.displayName || "Away",
                            logo: getTeamLogo(away) || awayTeam.logo || "",
                            record: getRecordFn(away)
                        },
                        status: status,
                        state: state,
                        homeScore: parseScore(home),
                        awayScore: parseScore(away),
                        boxscore: null
                    };
                }).filter(Boolean);
            })
            .catch(function (err) {
                return Promise.reject(err);
            });
    }

    /**
     * Format ISO date as YYYYMMDD for scoreboard API.
     * Applies a UTC-5 offset so the result always matches the US Eastern game date,
     * regardless of the browser's local timezone (e.g. a 7 PM ET tip-off is stored
     * as midnight UTC the next calendar day, but the scoreboard uses the ET date).
     */
    function formatDateForScoreboard(isoDate) {
        if (!isoDate) return "";
        var d = new Date(new Date(isoDate).getTime() - 5 * 60 * 60 * 1000);
        var y = d.getUTCFullYear();
        var m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
        var day = d.getUTCDate().toString().padStart(2, "0");
        return "" + y + m + day;
    }

    /**
     * Fetch scoreboard for a date and return competitors for the given event id (for quarter/period scores).
     * @param {string} apiBase - e.g. "/nfl", "/nba"
     * @param {string} eventId - game id
     * @param {string} dateStr - YYYYMMDD
     * @returns {Promise<Array|null>} competitors array or null
     */
    function fetchScoreboardCompetitors(apiBase, eventId, dateStr) {
        if (!dateStr || !eventId) return Promise.resolve(null);
        return fetch(apiBase + "/scoreboard?dates=" + dateStr + "&limit=50")
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data || !Array.isArray(data.events)) return null;
                var event = data.events.find(function (e) { return String(e.id) === String(eventId); });
                if (!event || !event.competitions || !event.competitions[0]) return null;
                return event.competitions[0].competitors || null;
            })
            .catch(function () { return null; });
    }

    /**
     * Factory: returns a configured fetchBoxscoreForGame function for the given apiBase and mapper.
     * For NFL/NBA also fetches scoreboard by date so mappers can show quarter scores.
     * @param {string} apiBase - e.g. "/mlb", "/nfl", "/nba"
     * @param {function(object, object?, Array?): Array|null} mapSummaryToBoxscore - Adapter: (summary, game, scoreboardCompetitors?) -> boxscore array
     * @returns {function(object): Promise<Array>}
     */
    function createFetchBoxscore(apiBase, mapSummaryToBoxscore) {
        return function (game) {
            var id = game && game.id;
            if (!id) return Promise.reject(new Error("No game id"));
            var g = game;
            var dateStr = formatDateForScoreboard(g.dateISO);
            var summaryPromise = fetch(apiBase + "/summary/" + id)
                .then(function (res) {
                    if (!res.ok) return Promise.reject(new Error("Summary failed"));
                    return res.json().catch(function () { return Promise.reject(new Error("Invalid summary response")); });
                });
            var scoreboardPromise = (apiBase === "/nfl" || apiBase === "/nba") && dateStr
                ? fetchScoreboardCompetitors(apiBase, id, dateStr)
                : Promise.resolve(null);
            return Promise.all([summaryPromise, scoreboardPromise])
                .then(function (arr) {
                    var summary = arr[0];
                    var scoreboardCompetitors = arr[1];
                    var box = mapSummaryToBoxscore(summary, g, scoreboardCompetitors);
                    if (!box) return Promise.reject(new Error("No boxscore"));
                    return box;
                });
        };
    }

    /**
     * Shared NFL/NBA quarter-building chain (fallback order):
     *   1. scoreboard competitors' linescores (from scoreboard?dates=)
     *   2. summary.linescore.periods
     *   3. summary.linescore.teams
     *   4. dashes when no period data exists at all
     * @param {string} homeAway - "home" | "away"
     * @param {Array|null} scoreboardCompetitors - competitors from scoreboard?dates=
     * @param {object} summary - ESPN summary payload
     * @param {boolean} inProgress - unplayed periods become undefined instead of 0
     * @returns {Array} length-4 array of numbers or "-" placeholders
     */
    function buildQuarters(homeAway, scoreboardCompetitors, summary, inProgress) {
        var linescore = summary && summary.linescore ? summary.linescore : null;
        var periods = linescore && Array.isArray(linescore.periods) ? linescore.periods : null;
        var pad = inProgress ? undefined : 0;
        var quarters = null;

        var fromScoreboard = Array.isArray(scoreboardCompetitors) && scoreboardCompetitors.length >= 2;
        var comp = fromScoreboard ? scoreboardCompetitors.find(function (c) { return (c.homeAway || "") === homeAway; }) : null;
        if (comp && comp.linescores && comp.linescores.length > 0) {
            quarters = quartersFromLinescores(comp.linescores, inProgress);
        }

        if (!quarters && periods && periods.length > 0) {
            quarters = periods.map(function (p) {
                var val = p[homeAway];
                if (val === undefined && (p.homeScore !== undefined || p.awayScore !== undefined)) {
                    val = homeAway === "home" ? p.homeScore : p.awayScore;
                }
                if (val === undefined) val = p.homeAway === homeAway ? p.score : 0;
                return typeof val === "number" ? val : parseInt(val, 10) || 0;
            });
            while (quarters.length < 4) quarters.push(pad);
        }

        if (!quarters && linescore && Array.isArray(linescore.teams) && linescore.teams.length > 0) {
            var lsTeam = linescore.teams.find(function (lt) { return (lt.homeAway || "") === homeAway; });
            if (lsTeam && lsTeam.linescores && lsTeam.linescores.length > 0) {
                quarters = lsTeam.linescores.slice(0, 4).map(function (ls) {
                    var v = ls.value !== undefined ? ls.value : parseInt(ls.displayValue, 10);
                    return typeof v === "number" && !isNaN(v) ? v : pad;
                });
                while (quarters.length < 4) quarters.push(pad);
            }
        }

        if (!quarters) quarters = ["-", "-", "-", "-"];
        return quarters;
    }

    return {
        formatDate: formatDate,
        getTeamLogo: getTeamLogo,
        getRecordMLB: getRecordMLB,
        getRecordNFLNBA: getRecordNFLNBA,
        quartersFromLinescores: quartersFromLinescores,
        buildQuarters: buildQuarters,
        computeDefaultIndex: computeDefaultIndex,
        loadSchedule: loadSchedule,
        createFetchBoxscore: createFetchBoxscore
    };
})();
