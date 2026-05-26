/**
 * Game Carousel (3-slot layout)
 *
 * Fixed left / middle / right slots. Left and right show compact view (logos + date/time) or empty at ends.
 * Middle shows the selected game with full details. Boxscore reflects the middle-slot game.
 */

let currentIndex = 0;
let carouselGames = [];
let sportConfig = null;
let getBoxscoreForGame = null;

/**
 * Initialize the carousel
 * @param {Array} gameData - Array of game objects
 * @param {Object} config - Sport configuration for boxscore
 * @param {Object} [options] - Optional: { getBoxscore(game), getDefaultIndex(games) }
 */
function initCarousel(gameData, config, options) {
    carouselGames = gameData || [];
    sportConfig = config;
    getBoxscoreForGame = (options && options.getBoxscore) || null;

    if (carouselGames.length === 0) {
        var track = document.querySelector(".carousel-track");
        if (track) track.innerHTML = "";
        return;
    }

    var getDefaultIndex = (options && options.getDefaultIndex) || (typeof computeDefaultIndex === "function" ? computeDefaultIndex : null);
    currentIndex = getDefaultIndex ? getDefaultIndex(carouselGames) : 0;
    currentIndex = Math.max(0, Math.min(currentIndex, carouselGames.length - 1));

    renderCarousel();
    updateArrowDisabledState();
    updateCarouselLiveRegion();
    ensureBoxscoreAndUpdate();
    setupEventListeners();
}

function updateCarouselLiveRegion() {
    var el = document.getElementById("carousel-live-region");
    if (!el || !carouselGames.length) return;
    el.textContent = "Game " + (currentIndex + 1) + " of " + carouselGames.length;
}

function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

/**
 * Compact slot: away logo | date + time | home logo (no team names, no VS)
 */
function getCompactCardHtml(game) {
    if (!game) return "";
    var awayLogo = game.awayTeam && game.awayTeam.logo ? game.awayTeam.logo : "";
    var homeLogo = game.homeTeam && game.homeTeam.logo ? game.homeTeam.logo : "";
    var date = escapeHtml(game.date || "");
    var time = escapeHtml(game.time || "");
    return (
        '<div class="game-card game-card--compact">' +
        '<div class="game-card-compact-inner">' +
        (awayLogo ? '<img class="game-card-compact-logo" src="' + escapeHtml(awayLogo) + '" alt="">' : "") +
        '<div class="game-card-compact-datetime">' +
        "<span class=\"game-card-compact-date\">" + date + "</span>" +
        "<span class=\"game-card-compact-time\">" + time + "</span>" +
        "</div>" +
        (homeLogo ? '<img class="game-card-compact-logo" src="' + escapeHtml(homeLogo) + '" alt="">' : "") +
        "</div>" +
        "</div>"
    );
}

/**
 * Middle slot: three-column layout — away logo + score | matchup, venue, time | score + home logo.
 * Score appears to the right of the away logo and to the left of the home logo.
 */
function getMiddleCardHtml(game) {
    if (!game) return "";
    var away = game.awayTeam || {};
    var home = game.homeTeam || {};
    var awayLogo = away.logo ? "<img class=\"game-card-middle-logo\" src=\"" + escapeHtml(away.logo) + "\" alt=\"\">" : "";
    var homeLogo = home.logo ? "<img class=\"game-card-middle-logo\" src=\"" + escapeHtml(home.logo) + "\" alt=\"\">" : "";
    var awayRecord = "Record: " + escapeHtml(away.record != null ? away.record : "0-0");
    var homeRecord = "Record: " + escapeHtml(home.record != null ? home.record : "0-0");
    var awayScoreVal = game.awayScore;
    var homeScoreVal = game.homeScore;
    if ((awayScoreVal == null || homeScoreVal == null) && game.boxscore && Array.isArray(game.boxscore) && game.boxscore.length >= 2) {
        var awayRow = game.boxscore.find(function (r) { return (r.homeAway || "").toLowerCase() === "away"; });
        var homeRow = game.boxscore.find(function (r) { return (r.homeAway || "").toLowerCase() === "home"; });
        if (awayRow && awayScoreVal == null) awayScoreVal = awayRow.total != null ? awayRow.total : awayRow.runs;
        if (homeRow && homeScoreVal == null) homeScoreVal = homeRow.total != null ? homeRow.total : homeRow.runs;
    }
    var awayScore = awayScoreVal != null && awayScoreVal !== "" ? String(awayScoreVal) : "–";
    var homeScore = homeScoreVal != null && homeScoreVal !== "" ? String(homeScoreVal) : "–";
    var isLive = (game.state || "").toLowerCase() === "in";
    var liveTickerHtml = isLive
        ? "<div class=\"live-ticker\" aria-live=\"polite\"><span class=\"live-ticker-badge\">LIVE</span></div>"
        : "";
    var center =
        "<div class=\"game-card-middle-center\">" +
        liveTickerHtml +
        "<div class=\"game-matchup-title\">" + escapeHtml(away.name) + " vs. " + escapeHtml(home.name) + "</div>" +
        "<div class=\"game-venue\">" + escapeHtml(game.venue) + "</div>" +
        "<div class=\"game-time\">" + escapeHtml(game.time) + "</div>" +
        "</div>";
    var leftCol =
        "<div class=\"game-card-middle-col game-card-middle-left\">" +
        "<div class=\"game-card-middle-logo-score\">" +
        "<div class=\"game-card-middle-logo-wrap\">" + awayLogo + "</div>" +
        "<span class=\"game-card-middle-score game-card-middle-score--right\">" + escapeHtml(awayScore) + "</span>" +
        "</div>" +
        "<div class=\"game-card-middle-record\">" + awayRecord + "</div>" +
        "</div>";
    var rightCol =
        "<div class=\"game-card-middle-col game-card-middle-right\">" +
        "<div class=\"game-card-middle-logo-score\">" +
        "<span class=\"game-card-middle-score game-card-middle-score--left\">" + escapeHtml(homeScore) + "</span>" +
        "<div class=\"game-card-middle-logo-wrap\">" + homeLogo + "</div>" +
        "</div>" +
        "<div class=\"game-card-middle-record\">" + homeRecord + "</div>" +
        "</div>";
    return (
        '<div class="game-card game-card--middle">' +
        '<div class="game-card-body game-card-expanded">' +
        leftCol + center + rightCol +
        "</div>" +
        "</div>"
    );
}

/**
 * Render exactly 3 slots: left (prev game or empty), middle (selected), right (next game or empty)
 */
function renderCarousel() {
    var track = document.querySelector(".carousel-track");
    if (!track) return;

    track.innerHTML = "";
    var leftGame = currentIndex > 0 ? carouselGames[currentIndex - 1] : null;
    var middleGame = carouselGames[currentIndex] || null;
    var rightGame = currentIndex < carouselGames.length - 1 ? carouselGames[currentIndex + 1] : null;

    var leftSlide = document.createElement("div");
    leftSlide.className = "carousel-slide carousel-slide--left" + (leftGame ? "" : " carousel-slide--empty");
    leftSlide.innerHTML = leftGame ? getCompactCardHtml(leftGame) : "";

    var middleSlide = document.createElement("div");
    middleSlide.className = "carousel-slide carousel-slide--middle active";
    middleSlide.innerHTML = middleGame ? getMiddleCardHtml(middleGame) : "";

    var rightSlide = document.createElement("div");
    rightSlide.className = "carousel-slide carousel-slide--right" + (rightGame ? "" : " carousel-slide--empty");
    rightSlide.innerHTML = rightGame ? getCompactCardHtml(rightGame) : "";

    track.appendChild(leftSlide);
    track.appendChild(middleSlide);
    track.appendChild(rightSlide);
}

/**
 * Refresh only the middle slot content (for example when boxscore has loaded).
 */
function refreshMiddleSlotContent() {
    var middleSlide = document.querySelector(".carousel-slide--middle");
    var game = carouselGames[currentIndex];
    if (middleSlide && game) middleSlide.innerHTML = getMiddleCardHtml(game);
}

function updateArrowDisabledState() {
    var prevBtn = document.querySelector(".carousel-btn.prev");
    var nextBtn = document.querySelector(".carousel-btn.next");
    if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
        prevBtn.setAttribute("aria-disabled", currentIndex === 0 ? "true" : "false");
    }
    if (nextBtn) {
        nextBtn.disabled = currentIndex === carouselGames.length - 1;
        nextBtn.setAttribute("aria-disabled", currentIndex === carouselGames.length - 1 ? "true" : "false");
    }
}

function showBoxscoreLoader(show) {
    var el = document.getElementById("boxscore-loader");
    if (!el) return;
    if (show) {
        el.classList.add("is-visible");
        el.setAttribute("aria-hidden", "false");
    } else {
        el.classList.remove("is-visible");
        el.setAttribute("aria-hidden", "true");
    }
}

function showBoxscoreError(show) {
    var el = document.getElementById("boxscore-error");
    if (!el) return;
    el.hidden = !show;
}

function ensureBoxscoreAndUpdate() {
    var game = carouselGames[currentIndex];
    if (!game) return;
    if (game.boxscore) {
        showBoxscoreLoader(false);
        showBoxscoreError(false);
        updateBoxscore();
        refreshMiddleSlotContent();
        return;
    }
    if (getBoxscoreForGame) {
        showBoxscoreLoader(true);
        showBoxscoreError(false);
        getBoxscoreForGame(game).then(function (boxscore) {
            game.boxscore = boxscore;
            showBoxscoreLoader(false);
            showBoxscoreError(false);
            updateBoxscore();
            refreshMiddleSlotContent();
        }).catch(function () {
            showBoxscoreLoader(false);
            showBoxscoreError(true);
            var table = document.getElementById("boxscore");
            if (table) table.innerHTML = "";
        });
    } else {
        showBoxscoreLoader(false);
        showBoxscoreError(false);
        refreshMiddleSlotContent();
    }
}

function updateBoxscore() {
    var game = carouselGames[currentIndex];
    if (!game || !sportConfig) return;
    if (!game.boxscore) return;
    if (typeof generateTable !== "function") return;
    generateTable(game.boxscore, sportConfig);
}

// Guard against clicking while a transition is already running
var isAnimating = false;

/**
 * Navigate prev (-1) or next (1) with a FLIP slide transition.
 *
 * Direction semantics (matching the user's description):
 *   next (+1): everything shifts LEFT  — right slot slides to center, center slides to left
 *   prev (-1): everything shifts RIGHT — left slot slides to center, center slides to right
 */
function navigate(direction) {
    var newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= carouselGames.length) return;
    if (isAnimating) return;

    var DURATION = 420; // ms
    var EASING   = 'cubic-bezier(0.4, 0, 0.25, 1)';
    isAnimating = true;

    var track = document.querySelector('.carousel-track');
    if (!track) {
        currentIndex = newIndex;
        renderCarousel();
        updateArrowDisabledState();
        ensureBoxscoreAndUpdate();
        isAnimating = false;
        return;
    }

    // ── 1. Snapshot old slot elements + their viewport rects ──────────────────
    var oldLeftEl   = track.children[0];
    var oldMiddleEl = track.children[1];
    var oldRightEl  = track.children[2];

    var oldLeftRect   = oldLeftEl   ? oldLeftEl.getBoundingClientRect()   : null;
    var oldMiddleRect = oldMiddleEl ? oldMiddleEl.getBoundingClientRect() : null;
    var oldRightRect  = oldRightEl  ? oldRightEl.getBoundingClientRect()  : null;
    var trackRect     = track.getBoundingClientRect();

    // ── 2. Clone the slot that is about to disappear and animate it out ───────
    //   next (+1): old LEFT exits to the left
    //   prev (-1): old RIGHT exits to the right
    var exitingEl   = direction > 0 ? oldLeftEl   : oldRightEl;
    var exitingRect = direction > 0 ? oldLeftRect : oldRightRect;
    var exitClone   = null;

    if (exitingEl && exitingRect && !exitingEl.classList.contains('carousel-slide--empty')) {
        exitClone = exitingEl.cloneNode(true);
        exitClone.style.cssText =
            'position:fixed;' +
            'left:'   + exitingRect.left   + 'px;' +
            'top:'    + exitingRect.top    + 'px;' +
            'width:'  + exitingRect.width  + 'px;' +
            'height:' + exitingRect.height + 'px;' +
            'margin:0;padding:0 0.25rem;box-sizing:border-box;' +
            'z-index:999;pointer-events:none;' +
            'opacity:0.6;transition:none;';
        document.body.appendChild(exitClone);
    }

    // ── 3. Update index and rebuild DOM ───────────────────────────────────────
    currentIndex = newIndex;
    renderCarousel();
    updateArrowDisabledState();

    // ── 4. Snapshot new slot rects (after DOM rebuild) ────────────────────────
    var newLeftEl   = track.children[0];
    var newMiddleEl = track.children[1];
    var newRightEl  = track.children[2];

    var newLeftRect   = newLeftEl   ? newLeftEl.getBoundingClientRect()   : null;
    var newMiddleRect = newMiddleEl ? newMiddleEl.getBoundingClientRect() : null;
    var newRightRect  = newRightEl  ? newRightEl.getBoundingClientRect()  : null;

    // ── 5. Build animation specs for surviving + entering slots ───────────────
    //
    //  navigate next (+1):
    //    old middle  →  new left    (shrinks, slides left,   opacity 1 → 0.6)
    //    old right   →  new middle  (grows,   slides left,   opacity 0.6 → 1)
    //    [new right]                (enters from right,      opacity 0 → 0.6)
    //
    //  navigate prev (-1):
    //    old middle  →  new right   (shrinks, slides right,  opacity 1 → 0.6)
    //    old left    →  new middle  (grows,   slides right,  opacity 0.6 → 1)
    //    [new left]                 (enters from left,       opacity 0 → 0.6)
    //
    var animations = [];

    if (direction > 0) {
        // old middle → new left
        if (newLeftEl && newLeftRect && oldMiddleRect && !newLeftEl.classList.contains('carousel-slide--empty')) {
            animations.push({
                el: newLeftEl,
                dx: oldMiddleRect.left - newLeftRect.left,
                fromOpacity: 1,
                toOpacity: 0.6
            });
        }
        // old right → new middle
        if (newMiddleEl && newMiddleRect && oldRightRect && !newMiddleEl.classList.contains('carousel-slide--empty')) {
            animations.push({
                el: newMiddleEl,
                dx: oldRightRect.left - newMiddleRect.left,
                fromOpacity: 0.6,
                toOpacity: 1
            });
        }
        // new right enters from off-screen right
        if (newRightEl && newRightRect && !newRightEl.classList.contains('carousel-slide--empty')) {
            var enterDxRight = trackRect.right - newRightRect.left + newRightRect.width;
            animations.push({ el: newRightEl, dx: enterDxRight, fromOpacity: 0, toOpacity: 0.6 });
        }
    } else {
        // new middle enters from off-screen left — mirrors next's formula exactly:
        //   next:  dx = oldRightRect.left  - newMiddleRect.left   → left  edge at old-right's left  (~860px, 140px visible at right)
        //   prev:  dx = oldLeftRect.right  - newMiddleRect.right  → right edge at old-left's right  (~140px, 140px visible at left)
        // Both place ~140px of the card at the near container edge so it slides cleanly into view.
        // The old formula (oldLeftRect.left - newMiddleRect.left ≈ -253) placed the full 700px card
        // inside the container at x=0, making the entire card visible before it slid right — that's the "flying."
        if (newMiddleEl && newMiddleRect && oldLeftRect && !newMiddleEl.classList.contains('carousel-slide--empty')) {
            animations.push({
                el: newMiddleEl,
                dx: oldLeftRect.right - newMiddleRect.right,
                fromOpacity: 0.6,
                toOpacity: 1
            });
        }
        // old middle → new right compact: FLIP from center position.
        // Starts opacity:0 (invisible at center) with a 150ms delay before fading in,
        // so the card is invisible where it "shouldn't be" (center) and materialises
        // as it reaches the right side — gives "coming from center" feel without a
        // fully-visible card flying 600px across the screen.
        if (newRightEl && newRightRect && oldMiddleRect && !newRightEl.classList.contains('carousel-slide--empty')) {
            animations.push({
                el: newRightEl,
                dx: oldMiddleRect.left - newRightRect.left,
                fromOpacity: 0,
                toOpacity: 0.6,
                opacityDelay: 150
            });
        }
        // new left enters from off-screen left
        if (newLeftEl && newLeftRect && !newLeftEl.classList.contains('carousel-slide--empty')) {
            var enterDxLeft = trackRect.left - newLeftRect.right - newLeftRect.width;
            animations.push({ el: newLeftEl, dx: enterDxLeft, fromOpacity: 0, toOpacity: 0.6 });
        }
    }

    // ── 6. Snap all new elements to their "old" visual positions instantly ────
    animations.forEach(function(a) {
        a.el.style.transition = 'none';
        a.el.style.transform  = 'translateX(' + a.dx + 'px)';
        a.el.style.opacity    = String(a.fromOpacity);
    });

    // Force reflow so the browser registers the start positions before we add transitions
    void track.offsetWidth;

    // ── 7. Animate each element to its true (destination) position ────────────
    var transStr = 'transform ' + DURATION + 'ms ' + EASING + ', opacity ' + DURATION + 'ms ease';
    animations.forEach(function(a) {
        // If opacityDelay is set, shrink the opacity duration so it still finishes
        // at the same time as the transform, but starts later.
        var tStr = a.opacityDelay
            ? 'transform ' + DURATION + 'ms ' + EASING +
              ', opacity ' + (DURATION - a.opacityDelay) + 'ms ease ' + a.opacityDelay + 'ms'
            : transStr;
        a.el.style.transition = tStr;
        a.el.style.transform  = 'translateX(0)';
        a.el.style.opacity    = String(a.toOpacity);
    });

    // ── 8. Animate the exit clone off-screen ──────────────────────────────────
    if (exitClone) {
        void exitClone.offsetWidth;
        // Move far enough that the card is fully outside the container edge
        var exitDx = direction > 0
            ? -(exitingRect.left - trackRect.left + exitingRect.width + 40)  // exit left
            : (trackRect.right - exitingRect.right + exitingRect.width + 40); // exit right
        exitClone.style.transition = 'transform ' + DURATION + 'ms ' + EASING + ', opacity ' + DURATION + 'ms ease';
        exitClone.style.transform  = 'translateX(' + exitDx + 'px)';
        exitClone.style.opacity    = '0';
        setTimeout(function() {
            if (exitClone && exitClone.parentNode) exitClone.parentNode.removeChild(exitClone);
        }, DURATION + 120);
    }

    // ── 9. Clean up inline styles after the animation completes ───────────────
    setTimeout(function() {
        animations.forEach(function(a) {
            a.el.style.transition = '';
            a.el.style.transform  = '';
            a.el.style.opacity    = '';
        });
        isAnimating = false;
        updateCarouselLiveRegion();
        ensureBoxscoreAndUpdate();
    }, DURATION + 120);
}

function setupEventListeners() {
    var prevBtn = document.querySelector(".carousel-btn.prev");
    var nextBtn = document.querySelector(".carousel-btn.next");
    var container = document.querySelector(".carousel-container");
    if (prevBtn) prevBtn.addEventListener("click", function () { navigate(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { navigate(1); });
    if (container && !container.hasAttribute("tabindex")) container.setAttribute("tabindex", "0");
    document.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var active = document.activeElement;
        var tag = active && active.tagName ? active.tagName.toUpperCase() : "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (active && active.isContentEditable) return;
        if (!container || !container.contains(active)) return;
        if (e.key === "ArrowLeft") navigate(-1);
        else if (e.key === "ArrowRight") navigate(1);
    });
}
