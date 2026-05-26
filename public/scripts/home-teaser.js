/**
 * Home page teaser: fetch next or last game per team; show [away logo] [date / time / tz] [home logo] + View link.
 */
(function () {
    "use strict";

    var TEAMS = [
        { id: "guards", apiBase: "/mlb", teamId: "5", label: "Guardians", page: "guards.html" },
        { id: "browns", apiBase: "/nfl", teamId: "5", label: "Browns", page: "browns.html" },
        { id: "cavs", apiBase: "/nba", teamId: "5", label: "Cavaliers", page: "cavs.html" }
    ];

    function getLogo(comp) {
        if (!comp) return "";
        var t = comp.team || comp;
        if (t.logo) return t.logo;
        var logos = t.logos;
        if (Array.isArray(logos) && logos.length > 0) {
            var def = logos.find(function (l) { return l.rel && l.rel.indexOf("default") !== -1; });
            var sb = logos.find(function (l) { return l.rel && l.rel.indexOf("scoreboard") !== -1; });
            return (def || sb || logos[0]).href || "";
        }
        return "";
    }

    function pickGame(events) {
        if (!Array.isArray(events) || events.length === 0) return null;
        var currentIn = null;
        var nextPre = null;
        var lastPost = null;
        var lastPostDate = null;
        for (var i = 0; i < events.length; i++) {
            var e = events[i];
            var comp = e.competitions && e.competitions[0];
            if (!comp || !comp.status || !comp.status.type) continue;
            var state = comp.status.type.state || "pre";
            if (state === "in") {
                currentIn = e;
            } else if (state === "pre") {
                if (!nextPre) nextPre = e;
            } else if (state === "post") {
                var d = comp.date || e.date;
                if (!lastPostDate || (d && d > lastPostDate)) {
                    lastPostDate = d;
                    lastPost = e;
                }
            }
        }
        return currentIn || nextPre || lastPost || events[0];
    }

    function formatDate(d) {
        var m = (d.getMonth() + 1).toString().padStart(2, "0");
        var day = d.getDate().toString().padStart(2, "0");
        var y = d.getFullYear().toString().slice(-2);
        return m + "/" + day + "/" + y;
    }

    function formatTime(d) {
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }

    function formatTz(d) {
        return d.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() || "";
    }

    function renderGame(teamId, game) {
        var awayEl = document.getElementById("teaser-" + teamId + "-away");
        var homeEl = document.getElementById("teaser-" + teamId + "-home");
        var dateEl = document.getElementById("teaser-" + teamId + "-date");
        var timeEl = document.getElementById("teaser-" + teamId + "-time");
        var tzEl = document.getElementById("teaser-" + teamId + "-tz");
        var innerEl = document.getElementById("teaser-" + teamId + "-inner");
        if (!innerEl) return;

        if (!game || !game.competitions || !game.competitions[0]) {
            dateEl.textContent = "No upcoming games.";
            if (timeEl) timeEl.textContent = "";
            if (tzEl) tzEl.textContent = "";
            if (awayEl) { awayEl.removeAttribute("src"); awayEl.style.display = "none"; }
            if (homeEl) { homeEl.removeAttribute("src"); homeEl.style.display = "none"; }
            return;
        }

        var comp = game.competitions[0];
        var home = comp.competitors && comp.competitors.find(function (c) { return c.homeAway === "home"; });
        var away = comp.competitors && comp.competitors.find(function (c) { return c.homeAway === "away"; });
        if (!home || !away) return;

        var awayLogo = getLogo(away);
        var homeLogo = getLogo(home);
        if (awayEl) {
            if (awayLogo) {
                awayEl.src = awayLogo;
                awayEl.alt = (away.team && away.team.displayName) || "Away";
                awayEl.style.display = "";
            } else {
                awayEl.style.display = "none";
            }
        }
        if (homeEl) {
            if (homeLogo) {
                homeEl.src = homeLogo;
                homeEl.alt = (home.team && home.team.displayName) || "Home";
                homeEl.style.display = "";
            } else {
                homeEl.style.display = "none";
            }
        }

        var d = comp.date || game.date ? new Date(comp.date || game.date) : null;
        if (d) {
            dateEl.textContent = formatDate(d);
            timeEl.textContent = formatTime(d);
            tzEl.textContent = formatTz(d);
        } else {
            var shortDetail = (comp.status && comp.status.shortDetail) ? comp.status.shortDetail : "";
            dateEl.textContent = shortDetail || "TBD";
            timeEl.textContent = "";
            tzEl.textContent = "";
        }
    }

    function run() {
        TEAMS.forEach(function (team) {
            var dateEl = document.getElementById("teaser-" + team.id + "-date");
            var awayEl = document.getElementById("teaser-" + team.id + "-away");
            var homeEl = document.getElementById("teaser-" + team.id + "-home");
            if (dateEl) dateEl.textContent = "Loading…";
            if (awayEl) awayEl.style.display = "none";
            if (homeEl) homeEl.style.display = "none";
            fetch(team.apiBase + "/teams/" + team.teamId + "/schedule")
                .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("Schedule failed")); })
                .then(function (data) {
                    var events = data.events || [];
                    var game = pickGame(events);
                    renderGame(team.id, game);
                })
                .catch(function () {
                    renderGame(team.id, null);
                });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();
