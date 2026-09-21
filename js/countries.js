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

        const [travelResponse, geoResponse] =
            await Promise.all([

                fetch("data/countries.json"),

                fetch(
                    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
                )

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


        const travelData =
            await travelResponse.json();

        const worldData =
            await geoResponse.json();


        updateCountryStats(travelData);

        drawCountries(
            worldData,
            travelData
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

function getCountryStyle(
    countryName,
    data
) {

    const status =
        getCountryStatus(
            countryName,
            data
        );


    // VISITED
    // Green fill takes highest priority.

    if (status.visited) {

        return {
            fillColor: "#35a76f",
            fillOpacity: 0.8,

            color: "#23764e",
            weight: 1.2,

            opacity: 1
        };

    }


    // WISHLIST + FLOWN THROUGH
    // Blue fill with green outline.

    if (
        status.wishlist &&
        status.flown
    ) {

        return {
        fillColor: "#e8ecef",
        fillOpacity: 1,

        color: "#b8c0c7",
        weight: 0.7,

        opacity: 1
        };

    }


    // WISHLIST
    // Blue fill.

    if (status.wishlist) {

        return {
            fillColor: "#3789e8",
            fillOpacity: 0.72,

            color: "#2565ad",
            weight: 1.1,

            opacity: 1
        };

    }


    // FLOWN THROUGH
    // Neutral interior + green outline.

    if (status.flown) {

        return {
            fillColor: "#e8ecef",
            fillOpacity: 1,
            
            color: "#35a76f",
            weight: 2.5,

            opacity: 1
        };

    }


    // EVERYTHING ELSE

    return {
        fillColor: "#cfd5da",
        fillOpacity: 0.22,

        color: "#aeb7bf",
        weight: 0.7,

        opacity: 0.8
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
        return "Not yet";
    }


    return statuses.join(" • ");

}


// -----------------------------------------
// DRAW COUNTRIES
// -----------------------------------------

function drawCountries(
    worldData,
    travelData
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

                }

        }
    ).addTo(map);

}


// -----------------------------------------
// START
// -----------------------------------------

loadCountries();