"""Local preview and read-only public-data backend. Python 3.11+, curl recommended."""
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
from .jma import JMAService, AREAS, municipality
from .shelters import nearby

ROOT = Path(__file__).resolve().parents[1]
service = JMAService()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # No user location/query logs.

    def send(self, status, data, mime='application/json; charset=utf-8'):
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store' if mime.startswith('application/json') else 'no-cache')
        self.end_headers();self.wfile.write(data)

    def json(self, status, payload):
        self.send(status,json.dumps(payload,ensure_ascii=False).encode())

    def do_GET(self):
        url = urlsplit(self.path);query = parse_qs(url.query)
        if url.path == '/api/health':
            return self.json(200,{'ok':True,'version':'0.2.0','source':'JMA public XML','notificationDelivery':'not-configured','eew':'not-connected'})
        if url.path == '/api/areas':
            cities = [municipality(c) for c in AREAS['class20s']]
            return self.json(200,{'cities':cities,'source':'https://www.jma.go.jp/bosai/common/const/area.json','snapshotDate':'2026-09-11'})
        if url.path == '/api/snapshot':
            code = query.get('city',[''])[0]
            try:
                coast=query.get('coast',[''])[0]
                if coast and coast not in {c[0] for c in json.loads((ROOT/'data/tsunami-areas.json').read_text())}:raise ValueError('unknown coast')
                return self.json(200,service.snapshot(code,coast))
            except ValueError:
                return self.json(400,{'error':'Select a valid JMA municipality code; no default location.'})
        if url.path == '/api/shelters':
            try:
                return self.json(200,nearby(query.get('lat',[''])[0],query.get('lon',[''])[0],query.get('hazard',[''])[0]))
            except (ValueError,TypeError):
                return self.json(400,{'error':'Valid Japan GPS coordinates and a specific disaster type are required.'})
        if url.path.startswith('/api/'):
            return self.json(404,{'error':'not found'})
        path = unquote(url.path)
        if path.startswith('/modules/'):
            base = ROOT / 'agent/modules'; relative = path[len('/modules/'):]
        else:
            base = ROOT / 'preview'; relative = path.lstrip('/') or 'index.html'
        candidate = (base / relative).resolve()
        if not candidate.is_relative_to(base.resolve()) or not candidate.is_file():
            return self.json(404,{'error':'not found'})
        mime = mimetypes.guess_type(candidate.name)[0] or 'application/octet-stream'
        return self.send(200,candidate.read_bytes(),mime+'; charset=utf-8')


if __name__ == '__main__':
    host,port = os.environ.get('HOST','127.0.0.1'),int(os.environ.get('PORT','8787'))
    server = ThreadingHTTPServer((host,port),Handler)
    print(f'MAMORI preview: http://{host}:{port}',flush=True)
    server.serve_forever()
