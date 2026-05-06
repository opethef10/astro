// Utility function to convert radians to degrees string
function degStr(rad, digits=1) {
    if (rad === null || rad === undefined) return 'N/A';
    return `${(rad * 180 / Math.PI).toFixed(digits)}°`;
}

// Function to format angular size
function formatAngularSize(arcsec) {
    if (arcsec === null || arcsec === undefined) return 'N/A';

    const num = parseFloat(arcsec);
    if (isNaN(num)) return arcsec;

    if (num >= 3600) {
        return `${(num / 3600).toFixed(2)}°`;
    } else if (num >= 60) {
        return `${(num / 60).toFixed(1)}'`;
    } else {
        return `${num.toFixed(1)}"`;
    }
}

// Function to create DOM elements with attributes and content
function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);

    // Set attributes
    Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
    });

    // Handle content
    if (content !== null) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (typeof item === 'string') {
                    element.appendChild(document.createTextNode(item));
                } else if (item instanceof Node) {
                    element.appendChild(item);
                }
            });
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
    }

    return element;
}

// Function to create a text node wrapped in a span with label class
function createLabeledText(label, text) {
    return createElement('p', {}, [
        createElement('span', {class: 'label'}, `${label}: `),
        document.createTextNode(text)
    ]);
}

// Function to format hour angle strings
function formatHourAngle(angleStr) {
    if (!angleStr || angleStr === 'N/A') return 'N/A';

    // If it's already in the correct format, just return it
    if (angleStr.includes(':')) return angleStr;

    // Otherwise, try to convert from radians
    try {
        const angleRad = parseFloat(angleStr);
        return !isNaN(angleRad) ? degStr(angleRad, 1) : angleStr;
    } catch (e) {
        return angleStr;
    }
}

// Function to format numeric values
function formatNumber(value, decimals=1) {
    if (value === null || value === undefined) return 'N/A';

    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(decimals);
}

async function fetchAstro(dateStr = '') {
    let url = '/api/astro';
    if (dateStr) url += '?date=' + encodeURIComponent(dateStr);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayData(data);
    } catch (error) {
        displayError(error);
    }
}

function fetchWithDate() {
    const dateInput = document.getElementById('dateInput');
    fetchAstro(dateInput.value);
}

function displayError(error) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    const errorDiv = createElement('div', {class: 'error'}, [
        'Error fetching data: ',
        error.message
    ]);

    container.appendChild(errorDiv);

    // Add date input back
    const dateInputDiv = createElement('div', {class: 'date-input'}, [
        createElement('input', {type: 'datetime-local', id: 'dateInput'}),
        createElement('button', {onclick: 'fetchWithDate()'}, 'Get Data')
    ]);

    container.appendChild(dateInputDiv);
}

function displayData(data) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    // Add date input
    const dateInputDiv = createElement('div', {class: 'date-input'}, [
        createElement('input', {type: 'datetime-local', id: 'dateInput'}),
        createElement('button', {onclick: 'fetchWithDate()'}, 'Get Data')
    ]);

    container.appendChild(dateInputDiv);

    // Header info
    const headerDiv = createElement('div');
    headerDiv.appendChild(createLabeledText('Query Date', data.query_date || 'N/A'));
    headerDiv.appendChild(createLabeledText('Julian Date', data.julian_date ? data.julian_date.toString() : 'N/A'));
    headerDiv.appendChild(createLabeledText('Lunation', data.lunation ? data.lunation.toString() : 'N/A'));
    headerDiv.appendChild(createLabeledText('Islamic Lunation', data.islamic_lunation ? data.islamic_lunation.toString() : 'N/A'));
    headerDiv.appendChild(createLabeledText('Greenwich Sidereal Time', data.greenwich_sidereal_time || 'N/A'));

    container.appendChild(headerDiv);

    // Cities
    for (const cityName in data.cities) {
        const city = data.cities[cityName];

        const cityDiv = createElement('div', {class: 'city'});
        cityDiv.appendChild(createElement('h2', {}, city.name || cityName));

        cityDiv.appendChild(createLabeledText('Location',
            `${degStr(city.lat, 2) || 'N/A'}, ${degStr(city.lon, 2) || 'N/A'}, ${city.elevation ? `${city.elevation}m` : 'N/A'}`));

        cityDiv.appendChild(createLabeledText('Sidereal Time', city.sidereal_time || 'N/A'));

        cityDiv.appendChild(createElement('h3', {}, 'Celestial Bodies:'));

        // Bodies - now an object, not an array
        const bodies = city.bodies || {};

        // Define the order of bodies to display
        const bodyOrder = ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

        // Create body cards in the specified order
        bodyOrder.forEach(bodyName => {
            if (bodies[bodyName]) {
                const body = bodies[bodyName];
                const bodyCard = createElement('div', {class: 'body-card'});

                bodyCard.appendChild(createElement('h4', {}, body.name || bodyName));

                // Create three-column layout
                const dataContainer = createElement('div', {class: 'data-container'});

                // Column 1: Position Data
                const col1 = createElement('div', {class: 'data-column'});
                const positionSection = createElement('div', {class: 'data-section'});
                positionSection.appendChild(createElement('h4', {}, 'Position Data'));
                positionSection.appendChild(createLabeledText('Altitude', body.alt ? degStr(body.alt, 1) : 'N/A'));
                positionSection.appendChild(createLabeledText('Azimuth', body.az ? degStr(body.az, 1) : 'N/A'));
                positionSection.appendChild(createLabeledText('RA', body.ra || 'N/A'));
                positionSection.appendChild(createLabeledText('Dec', body.dec ? degStr(body.dec, 1) : 'N/A'));
                positionSection.appendChild(createLabeledText('Hour Angle', formatHourAngle(body.hour_angle)));
                positionSection.appendChild(createLabeledText('Elongation', body.elong ? degStr(body.elong, 1) : 'N/A'));
                col1.appendChild(positionSection);

                // Column 2: Additional Data
                const col2 = createElement('div', {class: 'data-column'});
                const additionalSection = createElement('div', {class: 'data-section'});
                additionalSection.appendChild(createElement('h4', {}, 'Additional Data'));
                additionalSection.appendChild(createLabeledText('Magnitude', body.mag || 'N/A'));
                additionalSection.appendChild(createLabeledText('Constellation', body.constellation || 'N/A'));
                additionalSection.appendChild(createLabeledText('Size', body.size ? formatAngularSize(body.size) : 'N/A'));

                if (body.radius) {
                    additionalSection.appendChild(createLabeledText('Radius', body.radius ? formatAngularSize(body.radius * 3600) : 'N/A'));
                }

                if (body.phase) {
                    additionalSection.appendChild(createLabeledText('Phase', body.phase ? `${formatNumber(body.phase, 1)}%` : 'N/A'));
                }

                if (body.hlon) {
                    additionalSection.appendChild(createLabeledText('Helio Longitude', body.hlon ? degStr(body.hlon, 1) : 'N/A'));
                }

                if (body.hlat) {
                    additionalSection.appendChild(createLabeledText('Helio Latitude', body.hlat ? degStr(body.hlat, 1) : 'N/A'));
                }

                col2.appendChild(additionalSection);

                // Column 3: Distance and Times
                const col3 = createElement('div', {class: 'data-column'});
                const distanceSection = createElement('div', {class: 'data-section'});
                distanceSection.appendChild(createElement('h4', {}, 'Distances'));

                if (body.earth_distance) {
                    distanceSection.appendChild(createLabeledText('Earth Distance', body.earth_distance ? `${formatNumber(body.earth_distance, 2)} AU` : 'N/A'));
                }

                if (body.sun_distance) {
                    distanceSection.appendChild(createLabeledText('Sun Distance', body.sun_distance ? `${formatNumber(body.sun_distance, 2)} AU` : 'N/A'));
                }

                col3.appendChild(distanceSection);

                const timesSection = createElement('div', {class: 'data-section'});
                timesSection.appendChild(createElement('h4', {}, 'Rise/Set Times'));
                timesSection.appendChild(createLabeledText('Next Rising', body.next_rising || 'N/A'));
                timesSection.appendChild(createLabeledText('Next Transit', body.next_transit || 'N/A'));
                timesSection.appendChild(createLabeledText('Next Setting', body.next_setting || 'N/A'));
                col3.appendChild(timesSection);

                // Add columns to container
                dataContainer.appendChild(col1);
                dataContainer.appendChild(col2);
                dataContainer.appendChild(col3);

                bodyCard.appendChild(dataContainer);
                cityDiv.appendChild(bodyCard);
            }
        });

        container.appendChild(cityDiv);
    }

    // Global events
    const eventsDiv = createElement('div');
    eventsDiv.appendChild(createElement('h3', {}, 'Global Events:'));

    const eventsContainer = createElement('div', {class: 'data-container'});

    const eventsCol1 = createElement('div', {class: 'data-column'});
    eventsCol1.appendChild(createLabeledText('Next Equinox', data.next_equinox || 'N/A'));
    eventsCol1.appendChild(createLabeledText('Next Solstice', data.next_solstice || 'N/A'));
    eventsCol1.appendChild(createLabeledText('Previous New Moon', data.previous_new_moon || 'N/A'));

    const eventsCol2 = createElement('div', {class: 'data-column'});
    eventsCol2.appendChild(createLabeledText('Next New Moon', data.next_new_moon || 'N/A'));
    eventsCol2.appendChild(createLabeledText('Next First Quarter', data.next_first_quarter || 'N/A'));
    eventsCol2.appendChild(createLabeledText('Next Full Moon', data.next_full_moon || 'N/A'));

    const eventsCol3 = createElement('div', {class: 'data-column'});
    eventsCol3.appendChild(createLabeledText('Next Last Quarter', data.next_last_quarter || 'N/A'));
    eventsCol3.appendChild(createLabeledText('Age of Moon (days)', data.age_of_moon_days || 'N/A'));
    eventsCol3.appendChild(createLabeledText('Moon-Sun Separation',
        data.moon_sun_separation ? degStr(data.moon_sun_separation, 1) : 'N/A'));

    eventsContainer.appendChild(eventsCol1);
    eventsContainer.appendChild(eventsCol2);
    eventsContainer.appendChild(eventsCol3);

    eventsDiv.appendChild(eventsContainer);
    container.appendChild(eventsDiv);
}

// Call the function
fetchAstro(); // default current date