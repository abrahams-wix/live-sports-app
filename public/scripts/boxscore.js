/** Last rendered data/config per tableId to skip redundant re-renders */
var lastRendered = {};

/**
 * Sport-agnostic table generator
 *
 * @param {Array} data - Array of team objects
 * @param {Object} config - Configuration object describing the table structure
 * @param {string} config.tableId - ID of the table element to populate
 * @param {string} config.periodKey - Key in data for period scores (e.g., "scoreboard", "quarters")
 * @param {string} config.periodLabel - Label for period columns (e.g., "Inning", "Qtr", "Period")
 * @param {Array} config.summaryColumns - Array of {header, key} for summary stats
 * @param {Function} [config.getTeamName] - Optional function to extract team name from data
 */
function generateTable(data, config) {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    if (!config) return;

    const {
        tableId = "boxscore",
        periodKey = "scoreboard",
        periodLabel = "",
        summaryColumns = [],
        getTeamName = (team) => team.homeTeam || team.awayTeam || team.team
    } = config;

    // Get max periods from the data
    const periods = Math.max(0, ...data.map(team => (team[periodKey] || []).length));
    if (periods <= 0) return;

    const table = document.getElementById(tableId);
    if (!table) {
        console.warn("generateTable: element #" + tableId + " not found");
        return;
    }

    var last = lastRendered[tableId];
    if (last && last.data === data && last.config === config) return;

    table.setAttribute("aria-labelledby", "boxscore-title");

    // Clear existing content
    table.innerHTML = "";
    
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // 1. Team header
    const teamHeader = document.createElement("th");
    teamHeader.setAttribute("scope", "col");
    teamHeader.textContent = "Team";
    headerRow.appendChild(teamHeader);

    // 2. Period headers (1, 2, 3, ... or Q1, Q2, etc.)
    for (let i = 1; i <= periods; i++) {
        const th = document.createElement("th");
        th.setAttribute("scope", "col");
        th.textContent = periodLabel ? `${periodLabel}${i}` : i;
        headerRow.appendChild(th);
    }

    // 3. Summary column headers (R, H, E for baseball; PTS for basketball, etc.)
    summaryColumns.forEach(col => {
        const th = document.createElement("th");
        th.setAttribute("scope", "col");
        th.textContent = col.header;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Build body
    const tbody = document.createElement("tbody");

    const getTeamLogo = config.getTeamLogo || (() => null);

    data.forEach(team => {
        const row = document.createElement("tr");
        
        // Team name cell (logo left of name when available)
        const nameCell = document.createElement("td");
        const name = getTeamName(team);
        const logoUrl = team.logo !== undefined ? team.logo : getTeamLogo(team);
        if (logoUrl) {
            nameCell.classList.add("team-cell-with-logo");
            const img = document.createElement("img");
            img.src = logoUrl;
            img.alt = "";
            img.className = "boxscore-team-logo";
            const span = document.createElement("span");
            span.textContent = name;
            nameCell.appendChild(img);
            nameCell.appendChild(span);
        } else {
            nameCell.textContent = name;
        }
        row.appendChild(nameCell);

        // Period score cells
        const periodScores = team[periodKey] || [];
        for (let i = 0; i < periods; i++) {
            const cell = document.createElement("td");
            cell.textContent = periodScores[i] !== undefined ? periodScores[i] : "-";
            row.appendChild(cell);
        }

        // Summary stat cells
        summaryColumns.forEach(col => {
            const cell = document.createElement("td");
            cell.textContent = team[col.key] !== undefined ? team[col.key] : "-";
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    lastRendered[tableId] = { data: data, config: config };
}


// ============================================
// SPORT CONFIGURATIONS
// ============================================

const sportConfigs = {
    baseball: {
        periodKey: "scoreboard",
        summaryColumns: [
            { header: "R", key: "runs" },
            { header: "H", key: "hits" },
            { header: "E", key: "errors" }
        ]
    },
    
    basketball: {
        periodKey: "quarters",
        periodLabel: "Q",
        summaryColumns: [
            { header: "Total", key: "total" }
        ]
    },
    
    football: {
        periodKey: "quarters",
        periodLabel: "Q",
        summaryColumns: [
            { header: "Total", key: "total" }
        ]
    }
};
