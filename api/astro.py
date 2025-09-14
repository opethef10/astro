from datetime import datetime
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse

from ephem import Date, now

from astro import compute_all


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
