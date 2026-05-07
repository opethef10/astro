# api/astro.py
import calendar
from math import tau

import ephem
from ephem import (
    Date, Observer, Sun, Moon, Venus, Mars, Jupiter, Saturn,
    constellation, hours, next_equinox, next_solstice,
    previous_new_moon, next_new_moon, next_first_quarter_moon,
    next_full_moon, next_last_quarter_moon, separation, julian_date
)

# Constants
SYNODIC_MONTH = 29.530588867
LUNATION_BASE = Date("1923/1/17 02:40:50")

BODIES = [Sun, Moon, Venus, Mars, Jupiter, Saturn]


def make_observer(name: str, lat_deg: float, lon_deg: float, elev: int, when: Date):
    """Create an observer for a specific location and time."""
    o = Observer()
    o.name = name
    # Convert decimal degrees to radians for ephem
    o.lat = lat_deg * tau / 360.0
    o.lon = lon_deg * tau / 360.0
    o.elevation = elev
    o.date = when
    o.compute_pressure()
    return o


def get_body_data(body_class, observer: Observer, sidereal_time):
    """Get astronomical data for a specific body in raw ephem format."""
    body = body_class()
    body.compute(observer)

    # Normalize hour angle to [-tau/2, +tau/2] range in radians, then convert to string
    ha_rad = sidereal_time - body.ra
    ha_rad = ((ha_rad + tau / 2) % tau) - tau / 2
    hour_angle_str = str(hours(ha_rad))

    data = {
        "name": getattr(body, "name", body.__class__.__name__),
        "alt": body.alt,  # Keep as radians
        "az": body.az,    # Keep as radians
        "ra": str(body.ra),
        "dec": body.dec,  # Keep as radians
        "hour_angle": hour_angle_str,
        "elong": body.elong,
        "mag": body.mag,
        "size": body.size,
        "constellation": constellation(body)[1],
    }

    # Optional attributes
    optional_attrs = ["sun_distance", "earth_distance", "phase", "hlon", "hlat", "radius"]

    for attr in optional_attrs:
        if hasattr(body, attr):
            value = getattr(body, attr)
            data[attr] = value

        # Rise/transit/set times
        for event in ["rising", "transit", "setting"]:
            try:
                method = getattr(observer, f"next_{event}")
                data[f"next_{event}"] = str(Date(method(body)).datetime())
            except (ephem.AlwaysUpError, ephem.NeverUpError):
                data[f"next_{event}"] = "N/A"

    return data


def compute_all(when: Date, locations: list = None):
    """Compute comprehensive astronomical data for the given time."""
    # Calculate lunation
    lunation = int((when - LUNATION_BASE) / SYNODIC_MONTH) + 1

    # Greenwich reference data
    greenwich_obs = make_observer("Greenwich", 51.5, 0.0, 0, when)
    greenwich_sidereal = greenwich_obs.sidereal_time()

    result = {
        "query_date": str(when.datetime()),
        "unix_timestamp": calendar.timegm(when.datetime().timetuple()),
        "julian_date": float(julian_date(when)),
        "lunation": lunation,
        "islamic_lunation": lunation + 16085,
        "greenwich_sidereal_time": str(greenwich_sidereal),
        "cities": {},
    }

    # Calculate data for each location from request
    for loc in locations:
        name = loc.get("name", "Unknown")
        lat = loc.get("lat")
        lon = loc.get("lon")
        elev = loc.get("elevation", 0)

        try:
            obs = make_observer(name, lat, lon, elev, when)
            sidereal_time = obs.sidereal_time()

            city_data = {
                "name": name,
                "lat": float(obs.lat),   # Return as radians for frontend
                "lon": float(obs.lon),   # Return as radians for frontend
                "elevation": obs.elevation,
                "sidereal_time": str(sidereal_time),
                "sidereal_offset_from_greenwich": str(hours((sidereal_time - greenwich_sidereal) % tau)),
                "bodies": {},
            }

            # Calculate data for each celestial body
            for body_class in BODIES:
                body_name = body_class.__name__
                try:
                    body_data = get_body_data(body_class, obs, sidereal_time)
                    city_data["bodies"][body_name] = body_data
                except Exception as e:
                    city_data["bodies"][body_name] = {"error": str(e)}

            result["cities"][name] = city_data

        except Exception as e:
            result["cities"][name] = {"error": str(e)}

    # Global events
    try:
        result["next_equinox"] = str(Date(next_equinox(when)).datetime())
    except Exception:
        result["next_equinox"] = None

    try:
        result["next_solstice"] = str(Date(next_solstice(when)).datetime())
    except Exception:
        result["next_solstice"] = None

    # Moon events
    try:
        result["previous_new_moon"] = str(Date(previous_new_moon(when)).datetime())
        result["next_new_moon"] = str(Date(next_new_moon(when)).datetime())
        result["next_first_quarter"] = str(Date(next_first_quarter_moon(when)).datetime())
        result["next_full_moon"] = str(Date(next_full_moon(when)).datetime())
        result["next_last_quarter"] = str(Date(next_last_quarter_moon(when)).datetime())
        age_days = float(when - previous_new_moon(when))
        result["age_of_moon_days"] = round(age_days, 1)
    except Exception:
        pass

    # Moon-Sun separation
    try:
        moon_sun_separation = separation(Moon(when), Sun(when))
        result["moon_sun_separation"] = float(moon_sun_separation)
    except Exception:
        result["moon_sun_separation"] = None

    return result
