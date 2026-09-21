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