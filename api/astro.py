# api/astro.py
from http.server import BaseHTTPRequestHandler
from datetime import datetime
import json
from math import pi
from urllib.parse import parse_qs, urlparse

import ephem
from ephem import (
    Date, Observer, Sun, Moon, Venus, Mars, Jupiter, Saturn,
    constellation, hours, next_equinox, next_solstice,
    previous_new_moon, next_new_moon, now, next_first_quarter_moon,
    next_full_moon, next_last_quarter_moon, separation, julian_date
)

# Constants
SYNODIC_MONTH = 29.530588867
LUNATION_BASE = Date("1923/1/17 02:40:50")

# Configuration
CITIES = {
    "Didim": ("37:24", "27:15", 85),
    "Yenikent": ("40:01:00", "32:31:50", 850),
    "Metu": ("39:54", "32:47", 700),
    "Elblag": ("54:11", "19:25", 0),
    "Gdansk": ("54:25", "18:35", 0),
    "Gdynia": ("54:31", "18:33", 0),
    "Greenwich": ("51:30", "0", 0),
}

BODIES = [Sun, Moon, Venus, Mars, Jupiter, Saturn]


def make_observer(name: str, when: Date):
    """Create an observer for a specific location and time."""
    o = Observer()
    o.name = name
    lat, lon, elev = CITIES[name]
    o.lat, o.lon, o.elevation = lat, lon, elev
    o.date = when
    o.compute_pressure()
    return o


def get_body_data(body_class, observer: Observer, sidereal_time):
    """Get astronomical data for a specific body in raw ephem format."""
    body = body_class()
    body.compute(observer)

    data = {
        "name": getattr(body, "name", body.__class__.__name__),
        "alt": body.alt,  # Keep as radians
        "az": body.az,    # Keep as radians
        "ra": str(body.ra),
        "dec": body.dec,  # Keep as radians
        "hour_angle": str(hours(sidereal_time - body.ra)),
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
            data[f"next_{event}"] = str(method(body))
        except (ephem.AlwaysUpError, ephem.NeverUpError):
            data[f"next_{event}"] = "N/A"
        except Exception:
            data[f"next_{event}"] = None

    return data


def compute_all(when: Date):
    """Compute comprehensive astronomical data for the given time."""
    # Calculate lunation
    lunation = int((when - LUNATION_BASE) / SYNODIC_MONTH) + 1

    # Greenwich reference data
    greenwich_obs = make_observer("Greenwich", when)
    greenwich_sidereal = greenwich_obs.sidereal_time()

    result = {
        "query_date": str(when),
        "julian_date": float(julian_date(when)),
        "lunation": lunation,
        "islamic_lunation": lunation + 16085,
        "greenwich_sidereal_time": str(greenwich_sidereal),
        "cities": {},
    }

    # Calculate data for each city
    for name in ("Gdynia",):  # You can expand this to include more cities
        try:
            obs = make_observer(name, when)
            sidereal_time = obs.sidereal_time()

            city_data = {
                "name": name,
                "lat": obs.lat,
                "lon": obs.lon,
                "elevation": obs.elevation,
                "sidereal_time": str(sidereal_time),
                "sidereal_offset_from_greenwich": str(hours((sidereal_time - greenwich_sidereal) % (2 * pi))),
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
        result["next_equinox"] = str(next_equinox(when))
    except Exception:
        result["next_equinox"] = None

    try:
        result["next_solstice"] = str(next_solstice(when))
    except Exception:
        result["next_solstice"] = None

    # Moon events
    try:
        result["previous_new_moon"] = str(previous_new_moon(when))
        result["next_new_moon"] = str(next_new_moon(when))
        result["next_first_quarter"] = str(next_first_quarter_moon(when))
        result["next_full_moon"] = str(next_full_moon(when))
        result["next_last_quarter"] = str(next_last_quarter_moon(when))
        result["age_of_moon_days"] = float(when - previous_new_moon(when))
    except Exception:
        pass

    # Moon-Sun separation
    try:
        moon_sun_separation = separation(Moon(when), Sun(when))
        result["moon_sun_separation"] = float(moon_sun_separation)
    except Exception:
        result["moon_sun_separation"] = None

    return result



class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            date_q = query.get("date", [None])[0]

            if date_q:
                try:
                    when = Date(datetime.fromisoformat(date_q.replace("Z", "+00:00")))
                except ValueError:
                    when = Date(date_q)
            else:
                when = now()

            data = compute_all(when)
            payload = json.dumps(data, default=str).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(payload)

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
