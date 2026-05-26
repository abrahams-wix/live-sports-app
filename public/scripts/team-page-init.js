/**
 * Shared team page init: runs schedule load and carousel (or empty/error state)
 * when window.TEAM_PAGE_CONFIG is set by the page (after team data script).
 * Expects: TEAM_PAGE_CONFIG = { sport: 'baseball'|'football'|'basketball', loadSchedule: function }
 */
(function () {
    "use strict";

    function run() {
        var pageLoader = document.getElementById("page-loader");
        var config = window.TEAM_PAGE_CONFIG;
        if (!config || !config.sport || typeof config.loadSchedule !== "function") {
            if (pageLoader) pageLoader.classList.add("is-hidden");
            return;
        }
        var sportConfig = typeof sportConfigs !== "undefined" ? sportConfigs[config.sport] : null;
        if (!sportConfig || typeof initCarousel !== "function") {
            if (pageLoader) pageLoader.classList.add("is-hidden");
            return;
        }

        config.loadSchedule().then(function (games) {
            if (pageLoader) pageLoader.classList.add("is-hidden");
            if (games && games.length > 0) {
                var defaultIdx = typeof computeDefaultIndex === "function" ? computeDefaultIndex(games) : 0;
                defaultIdx = Math.max(0, Math.min(defaultIdx, games.length - 1));
                var defaultGame = games[defaultIdx];
                if (typeof fetchBoxscoreForGame === "function" && defaultGame) {
                    fetchBoxscoreForGame(defaultGame).then(function (box) {
                        defaultGame.boxscore = box;
                    }).catch(function () {});
                }
                initCarousel(games, sportConfig, {
                    getBoxscore: typeof fetchBoxscoreForGame === "function" ? fetchBoxscoreForGame : null,
                    getDefaultIndex: typeof computeDefaultIndex === "function" ? computeDefaultIndex : null
                });
            } else {
                var statusMsg = document.getElementById("carousel-status-msg");
                var container = document.querySelector(".carousel-container");
                if (statusMsg) {
                    statusMsg.textContent = "No upcoming games.";
                    statusMsg.hidden = false;
                }
                if (container) container.classList.add("is-hidden");
            }
        }).catch(function () {
            if (pageLoader) pageLoader.classList.add("is-hidden");
            var track = document.querySelector(".carousel-track");
            if (track) track.innerHTML = "";
            var statusMsg = document.getElementById("carousel-status-msg");
            var container = document.querySelector(".carousel-container");
            if (statusMsg) {
                statusMsg.textContent = "Couldn't load schedule. Try again later.";
                statusMsg.hidden = false;
            }
            if (container) container.classList.add("is-hidden");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();
