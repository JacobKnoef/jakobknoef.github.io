let allFlights = [];

async function loadFlightLog() {
    try {
        const response = await fetch("data/flights.json");

        if (!response.ok) {
            throw new Error(`Could not load flight data: ${response.status}`);
        }

        allFlights = await response.json();

    allFlights.sort((a, b) => {
     return new Date(b.date) - new Date(a.date);
});

    populateYearFilter(allFlights);
    populateAirlineFilter(allFlights);
    populateAircraftFilter(allFlights);

    displayFlights(allFlights);

        document.getElementById("flight-count").textContent =
            `${allFlights.length} flights`;

    } catch (error) {
        console.error("Flight log could not be loaded:", error);
    }
}

function displayFlights(flights) {
    const tableBody = document.getElementById("flight-table-body");

    tableBody.innerHTML = "";

    flights.forEach(flight => {

        const row = document.createElement("tr");
        row.classList.add("flight-row");

        row.innerHTML = `
            <td>${formatDate(flight.date)}</td>

            <td class="flight-number">
                ${flight.flightNumber || "—"}
            </td>

            <td class="flight-route">
                ${flight.departure.iata} → ${flight.arrival.iata}
            </td>

            <td>
                ${flight.airline || "—"}
            </td>

            <td class="flight-aircraft">
                ${flight.aircraft || "—"}
            </td>

            <td class="flight-distance">
                ${flight.distanceKm
                    ? flight.distanceKm.toLocaleString() + " km"
                    : "—"}
            </td>
        `;

        const detailsRow = document.createElement("tr");
        detailsRow.classList.add("flight-details-row");

        detailsRow.innerHTML = `
            <td colspan="6">
                <div class="flight-details">

                    <div>
                        <span class="detail-label">From</span>
                        <strong>
                            ${flight.departure.airport || flight.departure.iata}
                            (${flight.departure.iata})
                        </strong>
                    </div>

                    <div>
                        <span class="detail-label">To</span>
                        <strong>
                            ${flight.arrival.airport || flight.arrival.iata}
                            (${flight.arrival.iata})
                        </strong>
                    </div>

                    <div>
                        <span class="detail-label">Aircraft</span>
                        <strong>
                            ${flight.aircraft || "Unknown"}
                        </strong>
                    </div>

                    <div>
                        <span class="detail-label">Registration</span>
                        <strong>
                            ${flight.registration || "Unknown"}
                        </strong>
                    </div>

                    <div>
                        <span class="detail-label">Distance</span>
                        <strong>
                            ${flight.distanceKm
                                ? flight.distanceKm.toLocaleString() + " km"
                                : "Unknown"}
                        </strong>
                    </div>

                    <div>
                        <span class="detail-label">Estimated flight time</span>
                        <strong>
                            ${formatFlightTime(flight.flightTimeHours)}
                        </strong>
                    </div>

                </div>
            </td>
        `;

        row.addEventListener("click", () => {
            detailsRow.classList.toggle("open");
        });

        tableBody.appendChild(row);
        tableBody.appendChild(detailsRow);
    });
}

function formatFlightTime(hours) {
    if (!hours) {
        return "Unknown";
    }

    const totalMinutes = Math.round(hours * 60);

    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hrs === 0) {
        return `${mins} min`;
    }

    if (mins === 0) {
        return `${hrs} hr`;
    }

    return `${hrs} hr ${mins} min`;
}

function populateAirlineFilter(flights) {
    const airlineFilter = document.getElementById("airline-filter");

    const airlines = [...new Set(
        flights
            .map(flight => flight.airline)
            .filter(Boolean)
    )].sort();

    airlines.forEach(airline => {
        const option = document.createElement("option");

        option.value = airline;
        option.textContent = airline;

        airlineFilter.appendChild(option);
    });
}

function populateYearFilter(flights) {
    const yearFilter = document.getElementById("year-filter");

    const years = [...new Set(
        flights
            .map(flight => new Date(flight.date).getFullYear())
            .filter(Boolean)
    )].sort((a, b) => b - a);

    years.forEach(year => {
        const option = document.createElement("option");

        option.value = year;
        option.textContent = year;

        yearFilter.appendChild(option);
    });
}


function populateAircraftFilter(flights) {
    const aircraftFilter = document.getElementById("aircraft-filter");

    const aircraft = [...new Set(
        flights
            .map(flight => flight.aircraft)
            .filter(Boolean)
    )].sort();

    aircraft.forEach(type => {
        const option = document.createElement("option");

        option.value = type;
        option.textContent = type;

        aircraftFilter.appendChild(option);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-NZ", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function filterFlights() {
    const searchValue =
        document.getElementById("flight-search").value.toLowerCase();

    const yearValue =
        document.getElementById("year-filter").value;

    const airlineValue =
        document.getElementById("airline-filter").value;

    const aircraftValue =
        document.getElementById("aircraft-filter").value;

    const filteredFlights = allFlights.filter(flight => {

        const searchableText = `
            ${flight.flightNumber || ""}
            ${flight.airline || ""}
            ${flight.departure.iata || ""}
            ${flight.departure.airport || ""}
            ${flight.arrival.iata || ""}
            ${flight.arrival.airport || ""}
            ${flight.aircraft || ""}
            ${flight.registration || ""}
        `.toLowerCase();

        const matchesSearch =
            searchableText.includes(searchValue);

        const flightYear =
            new Date(flight.date).getFullYear().toString();

        const matchesYear =
            yearValue === "all" ||
            flightYear === yearValue;

        const matchesAirline =
            airlineValue === "all" ||
            flight.airline === airlineValue;

        const matchesAircraft =
            aircraftValue === "all" ||
            flight.aircraft === aircraftValue;

        return (
            matchesSearch &&
            matchesYear &&
            matchesAirline &&
            matchesAircraft
        );
    });

    displayFlights(filteredFlights);

    document.getElementById("flight-count").textContent =
        `${filteredFlights.length} flights`;
}

document
    .getElementById("flight-search")
    .addEventListener("input", filterFlights);

document
    .getElementById("airline-filter")
    .addEventListener("change", filterFlights);

document
    .getElementById("year-filter")
    .addEventListener("change", filterFlights);

document
    .getElementById("aircraft-filter")
    .addEventListener("change", filterFlights);    

loadFlightLog();
