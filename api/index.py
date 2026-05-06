from datetime import datetime
import json
from typing import Optional

from ephem import Date, now
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from astro import compute_all

app = FastAPI()


@app.get("/api/astro")
async def get_astro(
    date: Optional[str] = Query(None, description="Date in ISO format or ephem date string"),
    locations: Optional[str] = Query(None, description="JSON string of locations")
):
    try:
        if date:
            try:
                when = Date(datetime.fromisoformat(date.replace("Z", "+00:00")))
            except ValueError:
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
