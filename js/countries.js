// =========================================
// COUNTRIES MAP
// =========================================


// -----------------------------------------
// CREATE MAP
// -----------------------------------------

const map = L.map("country-map", {
    minZoom: 2,
    maxZoom: 7,
    worldCopyJump: true
}).setView([15, 10], 2);


// No tile basemap is used.
// The map background colour is controlled
// by #country-map in style.css.


// =========================================
// LOAD ALL DATA
// =========================================

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


        // ---------------------------------
        // CHECK RESPONSES
        // ---------------------------------

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


        // ---------------------------------
        // CONVERT RESPONSES TO JSON
        // ---------------------------------

        const travelData =
            await travelResponse.json();


        const worldData =
            await geoResponse.json();


        const flightsData =
            await flightsResponse.json();


        const airportsData =
            await airportsResponse.json();


        // ---------------------------------
        // UPDATE PAGE
        // ---------------------------------

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


// =========================================
// TOP PAGE STATISTICS
// =========================================

function updateCountryStats(data) {

    document
        .getElementById("visited-count")
        .textContent =
        data.visited?.length || 0;


    document
        .getElementById("flown-count")
        .textContent =
        data["flown-through"]?.length || 0;


    document
        .getElementById("wishlist-count")
        .textContent =
        data.wishlist?.length || 0;

}


// =========================================
// COUNTRY STATUS
// =========================================

function getCountryStatus(
    countryName,
    data
) {

    const visited =
        data.visited?.includes(
            countryName
        ) || false;


    const flown =
        data["flown-through"]?.includes(
            countryName
        ) || false;


    const wishlist =
        data.wishlist?.includes(
            countryName
        ) || false;


    return {
        visited,
        flown,
        wishlist
    };

}


// =========================================
// COUNTRY MAP STYLE
// =========================================

function getCountryStyle(
    countryName,
    data
) {

    const status =
        getCountryStatus(
            countryName,
            data
        );


    // -------------------------------------
    // DEFAULT / NOT YET
    // -------------------------------------

    let fillColor =
        "#e8ecef";

    let fillOpacity =
        1;

    let borderColor =
        "#b8c0c7";

    let borderWeight =
        0.7;


    // -------------------------------------
    // WISHLIST
    // Blue fill
    // -------------------------------------

    if (status.wishlist) {

        fillColor =
            "#3789e8";

        fillOpacity =
            0.78;

    }


    // -------------------------------------
    // VISITED
    // Green fill
    // Overrides wishlist
    // -------------------------------------

    if (status.visited) {

        fillColor =
            "#35a76f";

        fillOpacity =
            0.85;

    }


    // -------------------------------------
    // FLOWN THROUGH
    // Green border
    // -------------------------------------

    if (status.flown) {

        borderColor =
            "#20b875";

        borderWeight =
            3;

    }


    // -------------------------------------
    // VISITED BORDER
    // -------------------------------------

    else if (status.visited) {

        borderColor =
            "#23764e";

        borderWeight =
            1.2;

    }


    // -------------------------------------
    // WISHLIST BORDER
    // -------------------------------------

    else if (status.wishlist) {

        borderColor =
            "#2565ad";

        borderWeight =
            1.1;

    }


    return {

        fillColor:
            fillColor,

        fillOpacity:
            fillOpacity,

        color:
            borderColor,

        weight:
            borderWeight,

        opacity:
            1

    };

}


// =========================================
// TOOLTIP STATUS TEXT
// =========================================

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

        statuses.push(
            "Visited"
        );

    }


    if (status.flown) {

        statuses.push(
            "Flown through"
        );

    }


    if (status.wishlist) {

        statuses.push(
            "Wishlist"
        );

    }


    if (statuses.length === 0) {

        return "Not yet";

    }


    return statuses.join(" • ");

}


// =========================================
// COUNTRY FLIGHT ACTIVITY
// =========================================

function getCountryFlightActivity(
    countryName,
    flightsData,
    airportsData
) {

    const airportCodes =
        new Set();


    let flightCount =
        0;


    flightsData.forEach(
        flight => {

            const departure =
                flight.departure;


            const arrival =
                flight.arrival;


            if (
                !departure ||
                !arrival
            ) {

                return;

            }


            const departureMatches =
                departure.country ===
                countryName;


            const arrivalMatches =
                arrival.country ===
                countryName;


            // Count the flight ONCE if either
            // end involves this country.
            //
            // Example:
            // WLG → CHC counts as one
            // New Zealand flight, not two.

            if (
                departureMatches ||
                arrivalMatches
            ) {

                flightCount++;

            }


            // Record airport codes.
            // These are retained for future
            // use even though the Countries
            // page currently only displays
            // the number of flights.

            if (
                departureMatches &&
                departure.iata
            ) {

                airportCodes.add(
                    departure.iata
                );

            }


            if (
                arrivalMatches &&
                arrival.iata
            ) {

                airportCodes.add(
                    arrival.iata
                );

            }

        }
    );


    return {

        flights:
            flightCount,

        airports:
            Array.from(
                airportCodes
            ).sort()

    };

}


// =========================================
// COUNTRY VISIT ACTIVITY
// =========================================

function getCountryVisitActivity(
    countryName,
    travelData
) {

    const visits =
        travelData.visits?.[
            countryName
        ] || [];


    const places =
        new Set();


    visits.forEach(
        visit => {

            if (
                Array.isArray(
                    visit.places
                )
            ) {

                visit.places.forEach(
                    place => {

                        places.add(
                            place
                        );

                    }
                );

            }

        }
    );


    return {

        visits:
            visits.length,

        places:
            Array.from(
                places
            )

    };

}


// =========================================
// COUNTRY DETAIL PANEL
// =========================================

function showCountryDetails(
    countryName,
    travelData,
    flightsData,
    airportsData
) {

    // -------------------------------------
    // GET DATA
    // -------------------------------------

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


    const visitActivity =
        getCountryVisitActivity(
            countryName,
            travelData
        );


    // -------------------------------------
    // GET PAGE ELEMENTS
    // -------------------------------------

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


    const transitElement =
        document.getElementById(
            "country-detail-flight"
        );


    const visitCountElement =
        document.getElementById(
            "country-visit-count"
        );


    const flightCountElement =
        document.getElementById(
            "country-flight-count"
        );


    const placesListElement =
        document.getElementById(
            "country-places-list"
        );


    const noteElement =
        document.getElementById(
            "country-detail-note"
        );


    // -------------------------------------
    // SHOW DETAIL VIEW
    // -------------------------------------

    emptyPanel.style.display =
        "none";


    contentPanel.style.display =
        "block";


    // -------------------------------------
    // COUNTRY NAME
    // -------------------------------------

    nameElement.textContent =
        countryName;


    // -------------------------------------
    // VISIT COUNT
    // -------------------------------------

    // A dash means visit history has not
    // been entered yet.
    //
    // We don't show "0 visits" for a
    // country already marked as visited.

    visitCountElement.textContent =
        visitActivity.visits > 0
            ? visitActivity.visits
            : "—";


    // -------------------------------------
    // FLIGHT COUNT
    // -------------------------------------

    flightCountElement.textContent =
        flightActivity.flights;


    // -------------------------------------
    // PLACES VISITED
    // -------------------------------------

    if (
        visitActivity.places.length > 0
    ) {

        placesListElement.textContent =
            visitActivity.places.join(
                " • "
            );

    } else {

        placesListElement.textContent =
            "No places recorded yet";

    }


    // -------------------------------------
    // RESET STATUS BADGE
    // -------------------------------------

    badgeElement.className =
        "country-status-badge";


    // =====================================
    // VISITED
    // =====================================

    if (status.visited) {

        badgeElement.textContent =
            "VISITED";


        badgeElement.classList.add(
            "visited"
        );


        travelElement.textContent =
            "Visited";


        transitElement.textContent =
            status.flown
                ? "Flown through"
                : "—";


        noteElement.textContent =
            "You've visited this country.";


        return;

    }


    // =====================================
    // WISHLIST + FLOWN THROUGH
    // =====================================

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


        transitElement.textContent =
            "Flown through";


        noteElement.textContent =
            "You've passed through this country, but it is still on your wishlist.";


        return;

    }


    // =====================================
    // WISHLIST
    // =====================================

    if (status.wishlist) {

        badgeElement.textContent =
            "WISHLIST";


        badgeElement.classList.add(
            "wishlist"
        );


        travelElement.textContent =
            "Wishlist";


        transitElement.textContent =
            "—";


        noteElement.textContent =
            "This country is on your travel wishlist.";


        return;

    }


    // =====================================
    // FLOWN THROUGH
    // =====================================

    if (status.flown) {

        badgeElement.textContent =
            "FLOWN THROUGH";


        badgeElement.classList.add(
            "flown"
        );


        travelElement.textContent =
            "Not visited";


        transitElement.textContent =
            "Flown through";


        noteElement.textContent =
            "You've passed through this country, but haven't counted it as visited.";


        return;

    }


    // =====================================
    // NOT YET
    // =====================================

    badgeElement.textContent =
        "NOT YET";


    badgeElement.classList.add(
        "none"
    );


    travelElement.textContent =
        "Not visited";


    transitElement.textContent =
        "—";


    noteElement.textContent =
        "No travel history recorded for this country yet.";

}


// =========================================
// DRAW WORLD COUNTRIES
// =========================================

function drawCountries(
    worldData,
    travelData,
    flightsData,
    airportsData
) {

    L.geoJSON(
        worldData,
        {

            // ---------------------------------
            // COUNTRY COLOURS
            // ---------------------------------

            style:
                function (feature) {

                    const countryName =
                        feature.properties.name;


                    return getCountryStyle(
                        countryName,
                        travelData
                    );

                },


            // ---------------------------------
            // COUNTRY INTERACTIONS
            // ---------------------------------

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


                    // -------------------------
                    // HOVER TOOLTIP
                    // -------------------------

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


                    // -------------------------
                    // HOVER HIGHLIGHT
                    // -------------------------

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


                    // -------------------------
                    // RESET AFTER HOVER
                    // -------------------------

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


                    // -------------------------
                    // CLICK COUNTRY
                    // -------------------------

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


// =========================================
// START
// =========================================

loadCountries();