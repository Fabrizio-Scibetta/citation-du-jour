"""Serveur local de développement — Citation du jour.
Lance : python serve.py  puis ouvre http://localhost:8765
Fournit aussi /api/quote.json (citation du jour, format widget Windows).
"""
import json
import mimetypes
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
DATA = json.loads((ROOT / "data" / "calendrier.json").read_text(encoding="utf-8"))

mimetypes.add_type("application/manifest+json", ".webmanifest")


def entry_for(d):
    iso = d.isoformat()
    for row in DATA:
        if row["date"] == iso:
            return row
    return DATA[0]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/quote.json":
            row = entry_for(date.today())
            payload = {
                "citation": row["citation"],
                "auteur": row["auteur"],
                "source": row["source"],
                "dateLabel": row["jour_date"],
                "shareUrl": f"http://localhost:8765/?date={row['date']}",
            }
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print("Citation du jour — http://localhost:8765")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
