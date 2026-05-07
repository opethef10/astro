// Function to convert UTC time string to local timezone display (local only)
function formatUTCtoLocal(utcStr) {
    if (!utcStr || utcStr === 'N/A') return 'N/A';

    // API returns "2026-05-06 14:30:00" (UTC)
    const date = new Date(utcStr.replace(' ', 'T') + 'Z');

    if (isNaN(date)) return 'Invalid Date';

    // Get timezone abbreviation using en-US locale
    const tzStr = date.toLocaleString('en-US', { timeZoneName: 'short' });
    const tz = tzStr.split(' ').pop(); // Extract "CEST" from "5/6/2026, 4:30:00 PM CEST"

    // Format as YYYY-MM-DD HH:MM:SS in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${tz}`;
}

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

// Function to create a text node wrapped in a span with label class and optional tooltip
function createLabeledText(label, text, tooltip = null) {
    const labelSpan = createElement('span', {class: 'label'}, `${label}: `);

    if (tooltip) {
        labelSpan.setAttribute('data-tooltip', tooltip);
    }

    return createElement('p', {}, [labelSpan, document.createTextNode(text)]);
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

// Default locations empty - wait for user to pick location
let locations = [];

// Function to get GPS location
function getGeolocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const name = `GPS Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
            locations = [{name, lat, lon, elevation: 0}];
            const now = new Date().toLocaleTimeString();
            document.getElementById('locationInfo').innerHTML = `<strong>Selected Location:</strong> ${name}<br><small>Selected at: ${now}</small>`;
        },
        (error) => {
            alert("Unable to retrieve location: " + error.message);
        }
    );
}

// Function to toggle manual form visibility
function toggleManualForm() {
    const form = document.getElementById('manualForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Function to add custom location
function addCustomLocation() {
    const name = document.getElementById('customName').value || "Custom";
    const lat = parseFloat(document.getElementById('customLat').value);
    const lon = parseFloat(document.getElementById('customLon').value);
    const elev = parseInt(document.getElementById('customElev').value) || 0;

    if (isNaN(lat) || isNaN(lon)) {
        alert("Please enter valid coordinates");
        return;
    }

    locations = [{name, lat, lon, elevation: elev}];
    const now = new Date().toLocaleTimeString();
    document.getElementById('locationInfo').innerHTML = `<strong>Selected Location:</strong> ${name}<br><small>Selected at: ${now}</small>`;
}

async function fetchAstro(dateStr = '') {
    // Don't fetch if no location selected
    if (!locations.length) {
        const container = document.getElementById('content');
        container.innerHTML = '';
        const existingLocation = document.querySelector('.location-controls');
        if (existingLocation) container.appendChild(existingLocation);
        const msg = createElement('div', {class: 'loading'}, 'Please select a location using GPS or enter custom coordinates, then click "Get Data".');
        container.appendChild(msg);
        return;
    }

    let url = '/api/astro';
    const params = new URLSearchParams();

    if (dateStr) {
        // Convert local datetime to UTC before sending
        const localDate = new Date(dateStr);
        const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
        dateStr = utcDate.toISOString();
        params.append('date', dateStr);
    }

    params.append('locations', JSON.stringify(locations));

    const queryString = params.toString();
    if (queryString) url += '?' + queryString;

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
    if (!locations.length) {
        alert("Please select a location first using GPS or custom location");
        return;
    }
    const dateInput = document.getElementById('dateInput');
    fetchAstro(dateInput.value);
}

function displayError(error) {
    const container = document.getElementById('content');
    // Only clear data section, keep location controls
    const existingLocation = document.querySelector('.location-controls');
    container.innerHTML = '';
    if (existingLocation) container.appendChild(existingLocation);

    const errorDiv = createElement('div', {class: 'error'}, [
        'Error fetching data: ',
        error.message
    ]);
    container.appendChild(errorDiv);
}

// Initialize location controls on page load
function initLocationControls() {
    const container = document.getElementById('content');

    // Add location controls with Bootstrap classes
    const locationDiv = createElement('div', {class: 'location-controls container-fluid p-3 mb-3 rounded', style: 'background:#1f2833;'});

    const gpsButton = createElement('button', {class: 'btn btn-primary me-2', onclick: 'getGeolocation()'}, 'Use GPS Location');
    locationDiv.appendChild(gpsButton);

    const manualButton = createElement('button', {class: 'btn btn-secondary', onclick: 'toggleManualForm()'}, 'Manually Type Location');
    locationDiv.appendChild(manualButton);

    const privacyNotice = createElement('div', {class: 'small text-muted mt-2'}, 'This website doesn\'t use a database. The coordinates are used for calculation and never saved.');
    locationDiv.appendChild(privacyNotice);

    // Collapsible manual form
    const manualForm = createElement('div', {id: 'manualForm', class: 'mt-3', style: 'display:none;'});
    const inputDiv = createElement('div', {class: 'row g-2'});

    inputDiv.appendChild(createElement('div', {class: 'col-md-3'}, [createElement('input', {type: 'text', id: 'customName', class: 'form-control', placeholder: 'Location name'})]));
    inputDiv.appendChild(createElement('div', {class: 'col-md-3'}, [createElement('input', {type: 'number', id: 'customLat', class: 'form-control', placeholder: 'Latitude', step: 'any'})]));
    inputDiv.appendChild(createElement('div', {class: 'col-md-3'}, [createElement('input', {type: 'number', id: 'customLon', class: 'form-control', placeholder: 'Longitude', step: 'any'})]));
    inputDiv.appendChild(createElement('div', {class: 'col-md-2'}, [createElement('input', {type: 'number', id: 'customElev', class: 'form-control', placeholder: 'Elevation (m)'})]));
    inputDiv.appendChild(createElement('div', {class: 'col-md-1'}, [createElement('button', {class: 'btn btn-primary w-100', onclick: 'addCustomLocation()'}, 'Add')]));

    manualForm.appendChild(inputDiv);
    locationDiv.appendChild(manualForm);

    const locationInfo = createElement('div', {id: 'locationInfo', class: 'mt-2 small text-muted'}, 'No location selected');
    locationDiv.appendChild(locationInfo);

    // Add date input with Bootstrap and timezone indicator
    const dateInputDiv = createElement('div', {class: 'row g-2 mt-3'});
    const dateInputCol = createElement('div', {class: 'col-md-4'});
    dateInputCol.appendChild(createElement('input', {type: 'datetime-local', id: 'dateInput', class: 'form-control'}));
    dateInputDiv.appendChild(dateInputCol);

    // Show user's timezone
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzLabel = createElement('div', {class: 'col-md-2 d-flex align-items-center'}, `(UTC, ${userTZ})`);
    dateInputDiv.appendChild(tzLabel);

    dateInputDiv.appendChild(createElement('div', {class: 'col-md-2'}, [createElement('button', {class: 'btn btn-primary w-100', onclick: 'fetchWithDate()'}, 'Get Data')]));
    locationDiv.appendChild(dateInputDiv);

    container.appendChild(locationDiv);

    // Show prompt
    const msg = createElement('div', {class: 'loading mt-3 text-center'}, 'Please select a location using GPS or enter custom coordinates, then click "Get Data".');
    container.appendChild(msg);
}

function displayData(data) {
    const container = document.getElementById('content');
    // Keep location controls, clear the rest
    const existingLocation = document.querySelector('.location-controls');
    container.innerHTML = '';
    if (existingLocation) container.appendChild(existingLocation);

    // Update location info to show it's loaded (not selected)
    const locInfo = document.getElementById('locationInfo');
    if (locInfo && locations.length) {
        locInfo.innerHTML = `<strong>Loaded Location:</strong> ${locations[0].name}`;
    }

    // Header info
    const headerDiv = createElement('div');
    headerDiv.appendChild(createLabeledText('Query Date', data.query_date ? formatUTCtoLocal(data.query_date) : 'N/A', 'The date/time for which data is calculated'));
    headerDiv.appendChild(createLabeledText('Julian Date', data.julian_date ? data.julian_date.toString() : 'N/A', 'Days since Jan 1, 4713 BC (astronomical dating system)'));
    headerDiv.appendChild(createLabeledText('Lunation', data.lunation ? data.lunation.toString() : 'N/A', 'Number of lunar cycles since reference new moon'));
    headerDiv.appendChild(createLabeledText('Islamic Lunation', data.islamic_lunation ? data.islamic_lunation.toString() : 'N/A', 'Lunar months since Islamic calendar start (July 16, 622 CE)'));
    headerDiv.appendChild(createLabeledText('Greenwich Sidereal Time', data.greenwich_sidereal_time || 'N/A', 'Time based on Earth rotation relative to fixed stars'));

    container.appendChild(headerDiv);

    // Global events
    const eventsDiv = createElement('div', {class: 'events-section'});
    eventsDiv.appendChild(createElement('h3', {}, 'Global Events:'));

    const eventsContainer = createElement('div', {class: 'data-container'});

    const eventsCol1 = createElement('div', {class: 'data-column'});
    eventsCol1.appendChild(createLabeledText('Next Equinox', data.next_equinox ? formatUTCtoLocal(data.next_equinox) : 'N/A', 'When day/night are equal length (~Mar 20, ~Sep 22)'));
    eventsCol1.appendChild(createLabeledText('Next Solstice', data.next_solstice ? formatUTCtoLocal(data.next_solstice) : 'N/A', 'When Sun reaches highest/lowest point (longest/shortest day)'));
    eventsCol1.appendChild(createLabeledText('Previous New Moon', data.previous_new_moon ? formatUTCtoLocal(data.previous_new_moon) : 'N/A', 'Last time Moon was between Earth and Sun'));

    const eventsCol2 = createElement('div', {class: 'data-column'});
    eventsCol2.appendChild(createLabeledText('Next New Moon', data.next_new_moon ? formatUTCtoLocal(data.next_new_moon) : 'N/A', 'Next time Moon will be between Earth and Sun'));
    eventsCol2.appendChild(createLabeledText('Next First Quarter', data.next_first_quarter ? formatUTCtoLocal(data.next_first_quarter) : 'N/A', 'Next half-illuminated Moon (waxing)'));
    eventsCol2.appendChild(createLabeledText('Next Full Moon', data.next_full_moon ? formatUTCtoLocal(data.next_full_moon) : 'N/A', 'Next completely illuminated Moon'));

    const eventsCol3 = createElement('div', {class: 'data-column'});
    eventsCol3.appendChild(createLabeledText('Next Last Quarter', data.next_last_quarter ? formatUTCtoLocal(data.next_last_quarter) : 'N/A', 'Next half-illuminated Moon (waning)'));
    eventsCol3.appendChild(createLabeledText('Age of Moon (days)', data.age_of_moon_days || 'N/A', 'Days since last new moon'));
    eventsCol3.appendChild(createLabeledText('Moon-Sun Separation',
        data.moon_sun_separation ? degStr(data.moon_sun_separation, 1) : 'N/A', 'Angular distance between Moon and Sun'));

    eventsContainer.appendChild(eventsCol1);
    eventsContainer.appendChild(eventsCol2);
    eventsContainer.appendChild(eventsCol3);

    eventsDiv.appendChild(eventsContainer);
    container.appendChild(eventsDiv);

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
                positionSection.appendChild(createLabeledText('Altitude', body.alt ? degStr(body.alt, 1) : 'N/A', 'Angle above the horizon (0°=horizon, 90°=zenith)'));
                positionSection.appendChild(createLabeledText('Azimuth', body.az ? degStr(body.az, 1) : 'N/A', 'Compass direction (0°=N, 90°=E, 180°=S, 270°=W)'));
                positionSection.appendChild(createLabeledText('RA', body.ra || 'N/A', 'Right Ascension - celestial longitude measured eastward'));
                positionSection.appendChild(createLabeledText('Dec', body.dec ? degStr(body.dec, 1) : 'N/A', 'Declination - celestial latitude measured north/south of equator'));
                positionSection.appendChild(createLabeledText('Hour Angle', formatHourAngle(body.hour_angle), 'Angular distance west of the meridian'));
                positionSection.appendChild(createLabeledText('Elongation', body.elong ? degStr(body.elong, 1) : 'N/A', 'Angular separation from the Sun'));
                col1.appendChild(positionSection);

                // Column 2: Additional Data
                const col2 = createElement('div', {class: 'data-column'});
                const additionalSection = createElement('div', {class: 'data-section'});
                additionalSection.appendChild(createElement('h4', {}, 'Additional Data'));
                additionalSection.appendChild(createLabeledText('Magnitude', body.mag || 'N/A', 'Brightness (lower number = brighter)'));
                additionalSection.appendChild(createLabeledText('Constellation', body.constellation || 'N/A', 'The constellation the object appears in'));
                additionalSection.appendChild(createLabeledText('Size', body.size ? formatAngularSize(body.size) : 'N/A', 'Apparent angular size in the sky'));

                if (body.radius) {
                    additionalSection.appendChild(createLabeledText('Radius', body.radius ? formatAngularSize(body.radius * 3600) : 'N/A', 'Physical radius of the object'));
                }

                if (body.phase) {
                    additionalSection.appendChild(createLabeledText('Phase', body.phase ? `${formatNumber(body.phase, 1)}%` : 'N/A', 'Illuminated fraction (0%=new, 100%=full)'));
                }

                if (body.hlon) {
                    additionalSection.appendChild(createLabeledText('Helio Longitude', body.hlon ? degStr(body.hlon, 1) : 'N/A', 'Ecliptic longitude measured from Sun'));
                }

                if (body.hlat) {
                    additionalSection.appendChild(createLabeledText('Helio Latitude', body.hlat ? degStr(body.hlat, 1) : 'N/A', 'Ecliptic latitude measured from Sun'));
                }

                col2.appendChild(additionalSection);

                // Column 3: Distance and Times
                const col3 = createElement('div', {class: 'data-column'});
                const distanceSection = createElement('div', {class: 'data-section'});
                distanceSection.appendChild(createElement('h4', {}, 'Distances'));

                if (body.earth_distance) {
                    distanceSection.appendChild(createLabeledText('Earth Distance', body.earth_distance ? `${formatNumber(body.earth_distance, 2)} AU` : 'N/A', 'Distance from Earth in Astronomical Units (1 AU = Earth-Sun distance)'));
                }

                if (body.sun_distance) {
                    distanceSection.appendChild(createLabeledText('Sun Distance', body.sun_distance ? `${formatNumber(body.sun_distance, 2)} AU` : 'N/A', 'Distance from the Sun in Astronomical Units'));
                }

                col3.appendChild(distanceSection);

                const timesSection = createElement('div', {class: 'data-section'});
                timesSection.appendChild(createElement('h4', {}, 'Rise/Set Times'));
                timesSection.appendChild(createLabeledText('Next Rising', body.next_rising ? formatUTCtoLocal(body.next_rising) : 'N/A', 'When the object next rises above horizon'));
                timesSection.appendChild(createLabeledText('Next Transit', body.next_transit ? formatUTCtoLocal(body.next_transit) : 'N/A', 'When the object next crosses the meridian (highest point)'));
                timesSection.appendChild(createLabeledText('Next Setting', body.next_setting ? formatUTCtoLocal(body.next_setting) : 'N/A', 'When the object next sets below horizon'));
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
}

// Initialize on page load
initLocationControls();
