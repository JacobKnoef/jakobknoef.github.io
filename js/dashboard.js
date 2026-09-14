async function loadDashboardStats() {
    try {
        const response = await fetch("data/flights.json");

        if (!response.ok) {
            throw new Error(`Could not load flight data: ${response.status}`);
        }

        const flights = await response.json();

        const totalFlights = flights.length;

        const totalDistance = flights.reduce(
            (sum, flight) => sum + (flight.distanceKm || 0),
            0
        );

        const airlines = new Set(
            flights
                .map(flight => flight.airline)
                .filter(Boolean)
        );

        const airports = new Set();

        flights.forEach(flight => {
            if (flight.departure?.iata) {
                airports.add(flight.departure.iata);
            }

            if (flight.arrival?.iata) {
                airports.add(flight.arrival.iata);
            }
        });

        document.getElementById("total-flights").textContent =
            totalFlights.toLocaleString();

        document.getElementById("total-airports").textContent =
            airports.size.toLocaleString();

        document.getElementById("total-distance").textContent =
            `${totalDistance.toLocaleString()} km`;

        document.getElementById("total-airlines").textContent =
            airlines.size.toLocaleString();

    } catch (error) {
        console.error("Dashboard statistics could not be loaded:", error);
    }
}

loadDashboardStats();
