let allFlights = [];
let airports = {};

let routeLayers = [];
let airportLayers = [];
let airportLabels = [];

const map = L.map("flight-map", {
    worldCopyJump: true,
    minZoom: 2
}).setView([10, 20], 2);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }
).addTo(map);


async function loadFlightMap() {
    try {

        const [flightResponse, airportResponse] = await Promise.all([
            fetch("data/flights.json"),
            fetch("data/airports.json")
        ]);

        allFlights = await flightResponse.json();
        airports = await airportResponse.json();

        populateMapFilters(allFlights);

        redrawMap(allFlights);

    } catch (error) {

        console.error("Flight map could not be loaded:", error);

    }
}


function populateMapFilters(flights) {

    const yearFilter =
        document.getElementById("map-year-filter");

    const airlineFilter =
        document.getElementById("map-airline-filter");

    const aircraftFilter =
        document.getElementById("map-aircraft-filter");


    const years = [...new Set(
        flights
            .map(flight => new Date(flight.date).getFullYear())
            .filter(Boolean)
    )].sort((a, b) => b - a);


    const airlines = [...new Set(
        flights
            .map(flight => flight.airline)
            .filter(Boolean)
    )].sort();


    const aircraft = [...new Set(
        flights
            .map(flight => flight.aircraft)
            .filter(Boolean)
    )].sort();


    years.forEach(year => {

        const option = document.createElement("option");

        option.value = year;
        option.textContent = year;

        yearFilter.appendChild(option);

    });


    airlines.forEach(airline => {

        const option = document.createElement("option");

        option.value = airline;
        option.textContent = airline;

        airlineFilter.appendChild(option);

    });


    aircraft.forEach(type => {

        const option = document.createElement("option");

        option.value = type;
        option.textContent = type;

        aircraftFilter.appendChild(option);

    });

}


function filterMapFlights() {

    const yearValue =
        document.getElementById("map-year-filter").value;

    const airlineValue =
        document.getElementById("map-airline-filter").value;

    const aircraftValue =
        document.getElementById("map-aircraft-filter").value;


    const filteredFlights = allFlights.filter(flight => {

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
            matchesYear &&
            matchesAirline &&
            matchesAircraft
        );

    });


    redrawMap(filteredFlights);

}


function redrawMap(flights) {

    clearMapLayers();

    const airportStats =
        calculateAirportStats(flights);

    const routeStats =
        calculateRouteStats(flights);


    document.getElementById("map-flight-count").textContent =
        flights.length;

    document.getElementById("map-airport-count").textContent =
        Object.keys(airportStats).length;

    document.getElementById("map-route-count").textContent =
        Object.keys(routeStats).length;


    drawRoutes(routeStats);

    drawAirports(airportStats);

    updateAirportLabels();

}


function clearMapLayers() {

    routeLayers.forEach(routeData => {
    map.removeLayer(routeData.layer);
    });

    airportLayers.forEach(airportData => {
    map.removeLayer(airportData.marker);
    });

    airportLabels.forEach(labelData => {

        if (map.hasLayer(labelData.marker)) {
            map.removeLayer(labelData.marker);
        }

    });

    routeLayers = [];
    airportLayers = [];
    airportLabels = [];

}


function calculateAirportStats(flights) {

    const stats = {};

    flights.forEach(flight => {

        const departure = flight.departure.iata;
        const arrival = flight.arrival.iata;

        if (!stats[departure]) {
            stats[departure] = {
                flights: 0,
                departures: 0,
                arrivals: 0
            };
        }

        if (!stats[arrival]) {
            stats[arrival] = {
                flights: 0,
                departures: 0,
                arrivals: 0
            };
        }

        stats[departure].flights++;
        stats[departure].departures++;

        stats[arrival].flights++;
        stats[arrival].arrivals++;

    });

    return stats;

}


function calculateRouteStats(flights) {

    const routes = {};

    flights.forEach(flight => {

        const departure = flight.departure.iata;
        const arrival = flight.arrival.iata;

        // This means CHC → AKL and AKL → CHC
        // are treated as one overall route.
        const sortedAirports = [departure, arrival].sort();
        const routeKey = sortedAirports.join("-");

        if (!routes[routeKey]) {

            routes[routeKey] = {
                airportA: sortedAirports[0],
                airportB: sortedAirports[1],

                flights: 0,
                totalDistanceKm: 0,

                dates: [],
                airlines: {},
                aircraft: {},
                directions: {}
            };

        }

        const route = routes[routeKey];

        route.flights++;

        if (flight.distanceKm) {
            route.totalDistanceKm += flight.distanceKm;
        }

        if (flight.date) {
            route.dates.push(flight.date);
        }

        if (flight.airline) {

            if (!route.airlines[flight.airline]) {
                route.airlines[flight.airline] = 0;
            }

            route.airlines[flight.airline]++;

        }

        if (flight.aircraft) {

            if (!route.aircraft[flight.aircraft]) {
                route.aircraft[flight.aircraft] = 0;
            }

            route.aircraft[flight.aircraft]++;

        }

        const direction =
            `${departure} → ${arrival}`;

        if (!route.directions[direction]) {
            route.directions[direction] = 0;
        }

        route.directions[direction]++;

    });


    Object.values(routes).forEach(route => {

        route.dates.sort(
            (a, b) => new Date(a) - new Date(b)
        );

        route.firstFlight =
            route.dates[0];

        route.lastFlight =
            route.dates[route.dates.length - 1];

    });


    return routes;

}


function drawAirports(stats) {

    Object.entries(stats).forEach(([iata, stat]) => {

        const airport = airports[iata];

        if (!airport) {
            console.warn(`Airport missing from database: ${iata}`);
            return;
        }

        const radius = Math.min(
            3 + Math.sqrt(stat.flights) * 0.8,
            9
        );

        const marker = L.circleMarker(
            [airport.latitude, airport.longitude],
            {
                radius: radius,
                weight: 2,
                fillOpacity: 0.9
            }
        );


        marker.bindTooltip(
            `
            <strong>${iata}</strong><br>
            ${airport.city}<br>
            ${stat.flights} flight${stat.flights === 1 ? "" : "s"}
            `,
            {
                direction: "top"
            }
        );


        marker.bindPopup(
            `
            <div class="airport-popup">

                <strong>${iata} — ${airport.city}</strong>

                <br><br>

                ${airport.name}

                <br><br>

                <strong>${stat.flights}</strong> total flights<br>
                ${stat.departures} departures<br>
                ${stat.arrivals} arrivals

            </div>
            `
        );


        marker.addTo(map);

        airportLayers.push({
        marker: marker,
        iata: iata,
        normalRadius: radius
        });


        const label = L.marker(
            [airport.latitude, airport.longitude],
            {
                interactive: false,
                icon: L.divIcon({
                    className: "airport-label",
                    html: iata,
                    iconSize: null
                })
            }
        );


        airportLabels.push({
            marker: label,
            flights: stat.flights
        });

    });

}


function updateAirportLabels() {

    const zoom = map.getZoom();

    airportLabels.forEach(labelData => {

        const marker = labelData.marker;
        const flights = labelData.flights;

        let shouldShow = false;

        if (zoom <= 2) {
            shouldShow = flights >= 8;
        }

        else if (zoom === 3) {
            shouldShow = flights >= 4;
        }

        else if (zoom === 4) {
            shouldShow = flights >= 2;
        }

        else {
            shouldShow = true;
        }


        if (shouldShow) {

            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }

        } else {

            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }

        }

    });

}

function formatMapDate(dateString) {

    if (!dateString) {
        return "Unknown";
    }

    const date = new Date(dateString);

    return date.toLocaleDateString(
        "en-NZ",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


function makeBreakdownList(items) {

    const sortedItems =
        Object.entries(items)
            .sort((a, b) => b[1] - a[1]);

    if (sortedItems.length === 0) {
        return "Unknown";
    }

    return sortedItems
        .map(([name, count]) =>
            `${name} <strong>${count}</strong>`
        )
        .join("<br>");

}

function highlightRoute(selectedRoute) {

    let selectedAirports = [];

    routeLayers.forEach(routeData => {

        const line = routeData.layer;

        if (line === selectedRoute) {

            line.setStyle({
                opacity: 1,
                weight: routeData.normalWeight + 2
            });

            line.bringToFront();

            selectedAirports = [
                routeData.airportA,
                routeData.airportB
            ];

        } else {

            line.setStyle({
                opacity: 0.1
            });

        }

    });


    airportLayers.forEach(airportData => {

        if (
            selectedAirports.includes(
                airportData.iata
            )
        ) {

            airportData.marker.setStyle({
                fillOpacity: 1,
                opacity: 1,
                weight: 3,
                radius:
                    airportData.normalRadius + 2
            });

            airportData.marker.bringToFront();

        } else {

            airportData.marker.setStyle({
                fillOpacity: 0.25,
                opacity: 0.25
            });

        }

    });

}


function resetRouteHighlight() {

    routeLayers.forEach(routeData => {

        routeData.layer.setStyle({
            opacity: 0.55,
            weight: routeData.normalWeight
        });

    });


    airportLayers.forEach(airportData => {

        airportData.marker.setStyle({
            fillOpacity: 0.9,
            opacity: 1,
            weight: 2,
            radius: airportData.normalRadius
        });

    });

}

function drawRoutes(routes) {

    Object.values(routes).forEach(route => {

        const airportA =
            airports[route.airportA];

        const airportB =
            airports[route.airportB];

        if (!airportA || !airportB) {
            return;
        }


        const weight = Math.min(
            1 + Math.sqrt(route.flights) * 1.2,
            8
        );


        const line = createGreatCircleRoute(
            airportA,
            airportB,
            weight
        );


        // SHORT INFORMATION WHEN HOVERING

        line.bindTooltip(
            `
            <div class="route-tooltip">

                <strong>
                    ${route.airportA} ↔ ${route.airportB}
                </strong>

                <br>

                ${airportA.city} ↔ ${airportB.city}

                <br><br>

                ${route.flights}
                flight${route.flights === 1 ? "" : "s"}

                <br>

                ${Math.round(route.totalDistanceKm).toLocaleString()}
                km total

            </div>
            `,
            {
                sticky: false,
                permanent: false,
                interactive: false,
                direction: "top",
                opacity: 0.95
                offset: [0, -8]
            }
        );


                <div class="route-popup-main-stat">

                    <strong>
                        ${route.flights}
                    </strong>

                    <span>
                        flight${route.flights === 1 ? "" : "s"}
                    </span>

                </div>


                <div class="route-popup-grid">

                    <div>
                        <span>FIRST FLOWN</span>

                        <strong>
                            ${formatMapDate(route.firstFlight)}
                        </strong>
                    </div>

                    <div>
                        <span>MOST RECENT</span>

                        <strong>
                            ${formatMapDate(route.lastFlight)}
                        </strong>
                    </div>

                    <div>
                        <span>TOTAL DISTANCE</span>

                        <strong>
                            ${Math.round(route.totalDistanceKm).toLocaleString()}
                            km
                        </strong>
                    </div>

                </div>


                <div class="route-popup-section">

                    <span class="route-popup-label">
                        DIRECTION
                    </span>

                    <div>
                        ${makeBreakdownList(route.directions)}
                    </div>

                </div>


                <div class="route-popup-section">

                    <span class="route-popup-label">
                        AIRLINES
                    </span>

                    <div>
                        ${makeBreakdownList(route.airlines)}
                    </div>

                </div>


                <div class="route-popup-section">

                    <span class="route-popup-label">
                        AIRCRAFT
                    </span>

                    <div>
                        ${makeBreakdownList(route.aircraft)}
                    </div>

                </div>

            </div>
            `,
            {
                maxWidth: 340
            }
        );

        line.on("mouseover", function () {

    // Close any tooltip that may already be open
    routeLayers.forEach(routeData => {
        routeData.layer.closeTooltip();
    });

    highlightRoute(line);

    line.openTooltip();

});


line.on("mouseout", function () {

    line.closeTooltip();

    resetRouteHighlight();

});

        line.addTo(map);

    routeLayers.push({
        layer: line,
        airportA: route.airportA,
        airportB: route.airportB,
        normalWeight: weight
});

    });

}


function createGreatCircleRoute(
    startAirport,
    endAirport,
    weight
) {

    const points = [];

    const lat1 =
        toRadians(startAirport.latitude);

    const lon1 =
        toRadians(startAirport.longitude);

    const lat2 =
        toRadians(endAirport.latitude);

    const lon2 =
        toRadians(endAirport.longitude);


    const distance = 2 * Math.asin(
        Math.sqrt(
            Math.pow(
                Math.sin((lat2 - lat1) / 2),
                2
            ) +
            Math.cos(lat1) *
            Math.cos(lat2) *
            Math.pow(
                Math.sin((lon2 - lon1) / 2),
                2
            )
        )
    );


    const segments = 100;


    for (let i = 0; i <= segments; i++) {

        const fraction =
            i / segments;


        const A =
            Math.sin(
                (1 - fraction) * distance
            ) /
            Math.sin(distance);


        const B =
            Math.sin(
                fraction * distance
            ) /
            Math.sin(distance);


        const x =
            A * Math.cos(lat1) * Math.cos(lon1) +
            B * Math.cos(lat2) * Math.cos(lon2);


        const y =
            A * Math.cos(lat1) * Math.sin(lon1) +
            B * Math.cos(lat2) * Math.sin(lon2);


        const z =
            A * Math.sin(lat1) +
            B * Math.sin(lat2);


        const lat =
            Math.atan2(
                z,
                Math.sqrt(x * x + y * y)
            );


        const lon =
            Math.atan2(y, x);


        points.push([
            toDegrees(lat),
            toDegrees(lon)
        ]);

    }


    const routeSections = [];

    let currentSection =
        [points[0]];


    for (let i = 1; i < points.length; i++) {

        const previous =
            points[i - 1];

        const current =
            points[i];


        if (
            Math.abs(
                current[1] - previous[1]
            ) > 180
        ) {

            routeSections.push(
                currentSection
            );

            currentSection =
                [current];

        } else {

            currentSection.push(
                current
            );

        }

    }


    routeSections.push(
        currentSection
    );


    return L.polyline(
        routeSections,
        {
            weight: weight,
            opacity: 0.55,
            smoothFactor: 1
        }
    );

}


function toRadians(degrees) {
    return degrees * Math.PI / 180;
}


function toDegrees(radians) {
    return radians * 180 / Math.PI;
}


document
    .getElementById("map-year-filter")
    .addEventListener(
        "change",
        filterMapFlights
    );


document
    .getElementById("map-airline-filter")
    .addEventListener(
        "change",
        filterMapFlights
    );


document
    .getElementById("map-aircraft-filter")
    .addEventListener(
        "change",
        filterMapFlights
    );


map.on(
    "zoomend",
    updateAirportLabels
);


loadFlightMap();