from datetime import datetime, timezone
import json

from ephem import Date, now
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from astro import compute_all

app = FastAPI()


@app.get("/api/astro")
async def get_astro(
    date: str | None = Query(None, description="Date in ISO format or ephem date string"),
    locations: str | None = Query(None, description="JSON string of locations")
):
    try:
        if date:
            try:
                # Parse ISO format with timezone (e.g., "2026-05-06T14:30:00+02:00")
                # Replace Z with +00:00 for UTC
                date_clean = date.replace('Z', '+00:00')
                # Parse with datetime.fromisoformat (handles timezone offsets)
                dt = datetime.fromisoformat(date_clean)
                # Convert to UTC
                dt_utc = dt.astimezone(timezone.utc)
                # Convert to ephem Date format
                when = Date(dt_utc)
            except ValueError:
                # Fallback to ephem date string
                when = Date(date)
        else:
            when = now()

        # Parse locations from query parameter
        location_list = []
        if locations:
            try:
                location_list = json.loads(locations)
            except json.JSONDecodeError:
                pass

        data = compute_all(when, locations=location_list)
        return json.loads(json.dumps(data, default=str))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
