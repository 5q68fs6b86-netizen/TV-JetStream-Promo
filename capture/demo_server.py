#!/usr/bin/env python3
"""Demo source for the promo capture.

Serves a CatVod type-1 (CMS JSON) API plus media over HTTP with Range support.
All media are open movies (Blender Foundation, CC BY) downloaded at workflow time;
posters/backdrops are frames extracted from those films with ffmpeg.

    python3 demo_server.py <media_dir> [port]
"""
import json, os, re, sys, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'media')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
HOST = os.environ.get('DEMO_HOST', '10.0.2.2')
BASE = f'http://{HOST}:{PORT}'
CAT = json.load(open(os.path.join(ROOT, 'catalog.json'), encoding='utf-8'))


def vod(item, full=True):
    v = {
        'vod_id': item['id'],
        'vod_name': item['name'],
        'vod_pic': f"{BASE}/img/{item['id']}-poster.jpg",
        'vod_remarks': item.get('remarks', ''),
        'type_name': item['type_name'],
    }
    if full:
        eps = item['episodes']
        v.update({
            'vod_year': item.get('year', ''),
            'vod_area': item.get('area', ''),
            'vod_actor': item.get('actor', ''),
            'vod_director': item.get('director', ''),
            'vod_content': item.get('content', ''),
            'vod_play_from': '演示线路$$$备用线路',
            'vod_play_url': '$$$'.join(['#'.join(f"{e['name']}${BASE}/video/{e['file']}" for e in eps)] * 2),
        })
    return v


def classes():
    seen, out = set(), []
    for it in CAT['items']:
        if it['type_id'] not in seen:
            seen.add(it['type_id'])
            out.append({'type_id': it['type_id'], 'type_name': it['type_name']})
    return out


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        sys.stderr.write('[demo] ' + (fmt % args) + '\n')

    def _json(self, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        if u.path == '/config.json':
            return self._json(CAT['config'] | {'sites': [{
                'key': 'demo', 'name': '演示片库', 'type': 1, 'api': f'{BASE}/api.php/provide/vod/',
                'searchable': 1, 'quickSearch': 1, 'changeable': 1}],
                'lives': [{'name': '演示直播', 'url': f'{BASE}/live.m3u', 'epg': f'{BASE}/epg?ch={{name}}&date={{date}}'}]})
        if u.path == '/live.m3u':
            lines = ['#EXTM3U']
            for g in CAT['live']:
                for ch in g['channels']:
                    lines.append(f'#EXTINF:-1 tvg-name="{ch["name"]}" tvg-logo="{BASE}/img/{ch["logo"]}" group-title="{g["group"]}",{ch["name"]}')
                    lines.append(f'{BASE}/video/{ch["file"]}')
            b = ('\n'.join(lines) + '\n').encode()
            self.send_response(200); self.send_header('Content-Type', 'audio/x-mpegurl'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
            return
        if u.path == '/epg':
            name = q.get('ch', ''); date = q.get('date', '')
            progs = ['早间新闻', '城市漫游', '纪录片：深海', '午间剧场', '动画时光', '体育快报', '电影之夜', '晚间新闻', '音乐现场', '深夜剧场']
            epg = [{'title': progs[(i + len(name)) % len(progs)], 'start': f'{h:02d}:00', 'end': f'{h + 2:02d}:00' if h < 22 else '23:59'} for i, h in enumerate(range(0, 24, 2))]
            return self._json({'channel_name': name, 'date': date, 'epg_data': epg})
        if u.path.startswith('/api.php'):
            items = CAT['items']
            if 'ids' in q:
                ids = q['ids'].split(',')
                return self._json({'code': 1, 'list': [vod(i) for i in items if i['id'] in ids]})
            if 'wd' in q:
                w = q['wd'].lower()
                hit = [i for i in items if w in i['name'].lower() or w in i.get('en', '').lower()]
                return self._json({'code': 1, 'page': 1, 'pagecount': 1, 'total': len(hit), 'list': [vod(i) for i in hit]})
            if 't' in q:
                hit = [i for i in items if str(i['type_id']) == q['t']]
                pg = int(q.get('pg', '1') or 1)
                return self._json({'code': 1, 'page': pg, 'pagecount': 1, 'limit': 40, 'total': len(hit), 'list': [vod(i) for i in hit] if pg == 1 else []})
            return self._json({'code': 1, 'class': classes(), 'list': [vod(i) for i in items]})
        return self._range_get()

    def _range_get(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().do_GET()
        size = os.path.getsize(path)
        rng = self.headers.get('Range')
        ctype = self.guess_type(path)
        start, end = 0, size - 1
        if rng:
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            if m:
                if m.group(1):
                    start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
                else:
                    start = size - int(m.group(2))
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        else:
            self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        with open(path, 'rb') as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == '__main__':
    print(f'demo server on :{PORT}, root={ROOT}, base={BASE}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
