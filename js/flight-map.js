const airportLabels = [];

const map = L.map("flight-map", {
    worldCopyJump: true,
    minZoom: 2
}).setView([10, 20], 2);


// Base map
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

        const flights = await flightResponse.json();
        const airports = await airportResponse.json();

        const airportStats = calculateAirportStats(flights);

        const routeStats = calculateRouteStats(flights);

        document.getElementById("map-flight-count").textContent =
        flights.length;

        document.getElementById("map-airport-count").textContent =
        Object.keys(airportStats).length;

        document.getElementById("map-route-count").textContent =
        Object.keys(routeStats).length;

        drawRoutes(routeStats, airports);

        drawAirports(airportStats, airports);

        updateAirportLabels();

    } catch (error) {

        console.error("Flight map could not be loaded:", error);

    }
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

        const a = flight.departure.iata;
        const b = flight.arrival.iata;

        // Treat CHC → AKL and AKL → CHC as the same route
        const routeKey = [a, b].sort().join("-");

        if (!routes[routeKey]) {

            routes[routeKey] = {
                airportA: a,
                airportB: b,
                flights: 0
            };

        }

        routes[routeKey].flights++;

    });

    return routes;
}


function drawAirports(stats, airports) {

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
    iata: iata,
    flights: stat.flights
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

function drawRoutes(routes, airports) {

    Object.values(routes).forEach(route => {

        const airportA = airports[route.airportA];
        const airportB = airports[route.airportB];

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

        line.bindTooltip(
            `
            <strong>${route.airportA} ↔ ${route.airportB}</strong><br>
            ${route.flights} flight${route.flights === 1 ? "" : "s"}
            `
        );

        line.addTo(map);

    });
}


function createGreatCircleRoute(startAirport, endAirport, weight) {

    const points = [];

    const lat1 = toRadians(startAirport.latitude);
    const lon1 = toRadians(startAirport.longitude);

    const lat2 = toRadians(endAirport.latitude);
    const lon2 = toRadians(endAirport.longitude);

    const distance = 2 * Math.asin(
        Math.sqrt(
            Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
            Math.cos(lat1) *
            Math.cos(lat2) *
            Math.pow(Math.sin((lon2 - lon1) / 2), 2)
        )
    );

    const segments = 100;

    for (let i = 0; i <= segments; i++) {

        const fraction = i / segments;

        const A =
            Math.sin((1 - fraction) * distance) /
            Math.sin(distance);

        const B =
            Math.sin(fraction * distance) /
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


    // Prevent ugly lines crossing the entire world
    // when the route crosses the International Date Line.

    const routeSections = [];

    let currentSection = [points[0]];

    for (let i = 1; i < points.length; i++) {

        const previous = points[i - 1];
        const current = points[i];

        if (
            Math.abs(current[1] - previous[1]) > 180
        ) {

            routeSections.push(currentSection);
            currentSection = [current];

        } else {

            currentSection.push(current);

        }

    }

    routeSections.push(currentSection);


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

map.on("zoomend", updateAirportLabels);

loadFlightMap();
