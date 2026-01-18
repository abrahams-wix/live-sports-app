
async function init(sport) {
    try {
        const response = await fetch(`http://localhost:3000/${sport}/schedule`);
        const data = await response.json();

        // Transform the raw data into a flat, readable format
        const cleanData = data.events.map(event => {
            const competition = event.competitions[0];
            const venue = competition?.venue?.fullName || 'N/A';
            const date = new Date(event.date).toLocaleString();

            return {
                ID: event.id,
                Date: date,
                Matchup: event.name,
                Venue: venue,
            };
        });

        createDynamicTable(cleanData);
    } catch (error) {
        console.error("Error fetching schedule data:", error);
    }
}


function createDynamicTable(dataArray) {
    const tableBody = document.querySelector('#dynamic-table tbody');
    const tableHeadRow = document.querySelector('#dynamic-table thead tr');

    // Clear existing table content
    tableBody.innerHTML = '';
    tableHeadRow.innerHTML = '';

    if (!dataArray || dataArray.length === 0) return;

    // 1. Create table headers from the keys of the first processed object
    const headers = Object.keys(dataArray[0]);
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText; // Keys are already readable (Date, Matchup, etc.)
        tableHeadRow.appendChild(th);
    });

    // 2. Iterate over the data array to create rows and cells
    dataArray.forEach(item => {
        const row = tableBody.insertRow();

        headers.forEach(key => {
            const cell = row.insertCell();
            cell.textContent = item[key];
        });
    });
}

