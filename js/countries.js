// -----------------------------------------
// BASE MAP
// -----------------------------------------

const map = L.map("country-map", {
    minZoom: 2,
    maxZoom: 7,
    worldCopyJump: true
}).setView([15, 10], 2);


// -----------------------------------------
// LOAD DATA
// -----------------------------------------

async function loadCountries() {

    try {

        const [
            travelResponse,
            geoResponse,
            flightsResponse,
            airportsResponse
        ] = await Promise.all([

            fetch("data/countries.json"),

            fetch(
                "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
            ),

            fetch("data/flights.json"),

            fetch("data/airports.json")

        ]);


        if (!travelResponse.ok) {
            throw new Error(
                `countries.json failed: ${travelResponse.status}`
            );
        }


        if (!geoResponse.ok) {
            throw new Error(
                `Country boundaries failed: ${geoResponse.status}`
            );
        }


        if (!flightsResponse.ok) {
            throw new Error(
                `flights.json failed: ${flightsResponse.status}`
            );
        }


        if (!airportsResponse.ok) {
            throw new Error(
                `airports.json failed: ${airportsResponse.status}`
            );
        }


        const travelData =
            await travelResponse.json();

        const worldData =
            await geoResponse.json();

        const flightsData =
            await flightsResponse.json();

        const airportsData =
            await airportsResponse.json();


        updateCountryStats(
            travelData
        );


        drawCountries(
            worldData,
            travelData,
            flightsData,
            airportsData
        );


    } catch (error) {

        console.error(
            "Countries map could not be loaded:",
            error
        );

    }

}

// -----------------------------------------
// UPDATE PAGE STATISTICS
// -----------------------------------------

function updateCountryStats(data) {

    document
        .getElementById("visited-count")
        .textContent =
        data.visited.length;


    document
        .getElementById("flown-count")
        .textContent =
        data["flown-through"].length;


    document
        .getElementById("wishlist-count")
        .textContent =
        data.wishlist.length;

}


// -----------------------------------------
// WORK OUT COUNTRY STATUS
// -----------------------------------------

function getCountryStatus(
    countryName,
    data
) {

    const visited =
        data.visited.includes(countryName);

    const flown =
        data["flown-through"].includes(
            countryName
        );

    const wishlist =
        data.wishlist.includes(countryName);


    return {
        visited,
        flown,
        wishlist
    };

}


// -----------------------------------------
// COUNTRY STYLING
// -----------------------------------------

function getCountryStyle(countryName, data) {

    const status = getCountryStatus(
        countryName,
        data
    );


    // -----------------------------------------
    // DEFAULT COUNTRY
    // -----------------------------------------

    let fillColor = "#e8ecef";
    let fillOpacity = 1;

    let borderColor = "#b8c0c7";
    let borderWeight = 0.7;


    // -----------------------------------------
    // FILL
    // -----------------------------------------

    // Wishlist = blue fill

    if (status.wishlist) {

        fillColor = "#3789e8";
        fillOpacity = 0.78;

    }


    // Visited = green fill
    // This overrides wishlist if a country
    // somehow appears in both.

    if (status.visited) {

        fillColor = "#35a76f";
        fillOpacity = 0.85;

    }


    // -----------------------------------------
    // BORDER
    // -----------------------------------------

    // Flown through = green border,
    // regardless of its fill status.

    if (status.flown) {

        borderColor = "#20b875";
        borderWeight = 3;

    }

    // Visited countries get the normal
    // darker green border unless they are
    // also marked flown-through.

    else if (status.visited) {

        borderColor = "#23764e";
        borderWeight = 1.2;

    }

    // Wishlist-only countries get blue border.

    else if (status.wishlist) {

        borderColor = "#2565ad";
        borderWeight = 1.1;

    }


    // -----------------------------------------
    // FINAL STYLE
    // -----------------------------------------

    return {

        fillColor: fillColor,
        fillOpacity: fillOpacity,

        color: borderColor,
        weight: borderWeight,

        opacity: 1

    };

}


// -----------------------------------------
// CREATE STATUS TEXT
// -----------------------------------------

function getStatusText(
    countryName,
    data
) {

    const status =
        getCountryStatus(
            countryName,
            data
        );


    const statuses = [];


    if (status.visited) {
        statuses.push("Visited");
    }


    if (status.flown) {
        statuses.push("Flown through");
    }


    if (status.wishlist) {
        statuses.push("Wishlist");
    }


    if (statuses.length === 0) {
        return "Nah not interested yet";
    }


    return statuses.join(" • ");

}

// -----------------------------------------
// COUNTRY FLIGHT ACTIVITY
// -----------------------------------------

function getCountryFlightActivity(
    countryName,
    flightsData,
    airportsData
) {

    const airportCodes = new Set();

    let flightCount = 0;


    flightsData.forEach(flight => {

        const departureCode =
            flight.departure;

        const arrivalCode =
            flight.arrival;


        const departureAirport =
            airportsData[departureCode];

        const arrivalAirport =
            airportsData[arrivalCode];


        const departureMatches =
            departureAirport &&
            departureAirport.country === countryName;


        const arrivalMatches =
            arrivalAirport &&
            arrivalAirport.country === countryName;


        // Count the flight once if either end
        // involves this country.

        if (
            departureMatches ||
            arrivalMatches
        ) {

            flightCount++;

        }


        // Record airports used in this country.

        if (departureMatches) {

            airportCodes.add(
                departureCode
            );

        }


        if (arrivalMatches) {

            airportCodes.add(
                arrivalCode
            );

        }

    });


    return {

        flights: flightCount,

        airports:
            Array.from(
                airportCodes
            ).sort()

    };

}

// -----------------------------------------
// COUNTRY DETAIL PANEL
// -----------------------------------------

function showCountryDetails(
    countryName,
    travelData,
    flightsData,
    airportsData
) {

    const status =
        getCountryStatus(
            countryName,
            travelData
        );

    const flightActivity =
    getCountryFlightActivity(
        countryName,
        flightsData,
        airportsData
    );    

    const emptyPanel =
        document.getElementById(
            "country-detail-empty"
        );


    const contentPanel =
        document.getElementById(
            "country-detail-content"
        );


    const nameElement =
        document.getElementById(
            "country-detail-name"
        );


    const badgeElement =
        document.getElementById(
            "country-detail-status"
        );


    const travelElement =
        document.getElementById(
            "country-detail-travel"
        );


    const flightElement =
        document.getElementById(
            "country-detail-flight"
        );


    const noteElement =
        document.getElementById(
            "country-detail-note"
        );

    const flightCountElement =
    document.getElementById(
        "country-flight-count"
    );


    const airportCountElement =
    document.getElementById(
        "country-airport-count"
    );


    const airportListElement =
    document.getElementById(
        "country-airports-list"
    );    

    // Show detail view

    emptyPanel.style.display = "none";
    contentPanel.style.display = "block";


    // Country name

    nameElement.textContent =
        countryName;


    // Remove previous badge styles

    badgeElement.className =
        "country-status-badge";



    flightCountElement.textContent =
    flightActivity.flights;


airportCountElement.textContent =
    flightActivity.airports.length;


if (flightActivity.airports.length > 0) {

    airportListElement.innerHTML =
        flightActivity.airports
            .map(code => {

                const airport =
                    airportsData[code];

                return `
                    <span
                        class="country-airport-code"
                        title="${airport.name}"
                    >
                        ${code}
                    </span>
                `;

            })
            .join("");

} else {

    airportListElement.textContent =
        "No logged airports";

}    
    // -----------------------------------------
    // VISITED
    // -----------------------------------------

    if (status.visited) {

        badgeElement.textContent =
            "VISITED";

        badgeElement.classList.add(
            "visited"
        );

        travelElement.textContent =
            "Visited";

        flightElement.textContent =
            status.flown
                ? "Flown through"
                : "—";

        noteElement.textContent =
            "You've visited this country.";

        return;

    }


    // -----------------------------------------
    // WISHLIST + FLOWN THROUGH
    // -----------------------------------------

    if (
        status.wishlist &&
        status.flown
    ) {

        badgeElement.textContent =
            "WISHLIST";

        badgeElement.classList.add(
            "wishlist"
        );

        travelElement.textContent =
            "Wishlist";

        flightElement.textContent =
            "Flown through";

        noteElement.textContent =
            "You've passed through this country, but it is still on your wishlist.";

        return;

    }


    // -----------------------------------------
    // WISHLIST
    // -----------------------------------------

    if (status.wishlist) {

        badgeElement.textContent =
            "WISHLIST";

        badgeElement.classList.add(
            "wishlist"
        );

        travelElement.textContent =
            "Wishlist";

        flightElement.textContent =
            "—";

        noteElement.textContent =
            "This country is on your travel wishlist.";

        return;

    }


    // -----------------------------------------
    // FLOWN THROUGH
    // -----------------------------------------

    if (status.flown) {

        badgeElement.textContent =
            "FLOWN THROUGH";

        badgeElement.classList.add(
            "flown"
        );

        travelElement.textContent =
            "Not visited";

        flightElement.textContent =
            "Flown through";

        noteElement.textContent =
            "You've passed through this country, but haven't counted it as visited.";

        return;

    }


    // -----------------------------------------
    // NOT YET
    // -----------------------------------------

    badgeElement.textContent =
        "NOT YET";

    badgeElement.classList.add(
        "none"
    );

    travelElement.textContent =
        "Not visited";

    flightElement.textContent =
        "—";

    noteElement.textContent =
        "No travel history recorded for this country yet.";

}

// -----------------------------------------
// DRAW COUNTRIES
// -----------------------------------------

function drawCountries(
    worldData,
    travelData,
    flightsData,
    airportsData
) {

    L.geoJSON(
        worldData,
        {

            style: function (feature) {

                const countryName =
                    feature.properties.name;

                return getCountryStyle(
                    countryName,
                    travelData
                );

            },


            onEachFeature:
                function (
                    feature,
                    layer
                ) {

                    const countryName =
                        feature.properties.name;


                    const statusText =
                        getStatusText(
                            countryName,
                            travelData
                        );


                    layer.bindTooltip(
                        `
                        <strong>
                            ${countryName}
                        </strong>

                        <br>

                        ${statusText}
                        `,
                        {
                            sticky: true,
                            direction: "top"
                        }
                    );


                    layer.on(
                        "mouseover",
                        function () {

                            layer.setStyle({
                                weight: 2.5,
                                fillOpacity: 0.9
                            });

                            layer.bringToFront();

                        }
                    );


                    layer.on(
                        "mouseout",
                        function () {

                            layer.setStyle(
                                getCountryStyle(
                                    countryName,
                                    travelData
                                )
                            );

                        }
                    );

                    layer.on(
                        "click",
                        function () {

                        showCountryDetails(
                            countryName,
                            travelData,
                            flightsData,
                            airportsData
                    );

                    }
                );

                }

        }
        ).addTo(map);

}


// -----------------------------------------
// START
// -----------------------------------------

loadCountries();