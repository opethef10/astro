from datetime import datetime
import json

from ephem import Date, now
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from astro import compute_all

app = FastAPI()


@app.get("/api/astro")
async def get_astro(date: str | None = Query(None, description="Date in ISO format or ephem date string")):
    try:
        if date:
            try:
                when = Date(datetime.fromisoformat(date.replace("Z", "+00:00")))
            except ValueError:
                when = Date(date)
        else:
            when = now()

        data = compute_all(when)
        return json.loads(json.dumps(data, default=str))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
