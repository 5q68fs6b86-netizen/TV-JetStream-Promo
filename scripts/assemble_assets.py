#!/usr/bin/env python3
"""Assemble public/ for the Remotion project from capture runs.

    python3 assemble_assets.py <public> <release_tag> <processed_public_dir>... -- <capture_out_dir>...

* clips/*.mp4 + clips.json  from processed dirs (later dirs override earlier ones)
* shots/<name>.png          picked from capture screenshots by step-name suffix
* posters/*.jpg             poster cards cropped from home-row screenshots (bounds from the UI dumps)
* writes src/assets.json
"""
import glob, json, os, shutil, sys
from PIL import Image

PUB, RELEASE = sys.argv[1], sys.argv[2]
rest = sys.argv[3:]
sep = rest.index('--')
PROC, CAPS = rest[:sep], rest[sep + 1:]
os.makedirs(f'{PUB}/clips', exist_ok=True)
os.makedirs(f'{PUB}/shots', exist_ok=True)
os.makedirs(f'{PUB}/posters', exist_ok=True)

clips = {}
for d in PROC:
    meta = json.load(open(f'{d}/clips/clips.json')) if os.path.exists(f'{d}/clips/clips.json') else {}
    for name, m in meta.items():
        src = f'{d}/clips/{name}.mp4'
        if os.path.exists(src) and os.path.getsize(src) > 50_000:
            shutil.copy(src, f'{PUB}/clips/{name}.mp4')
            clips[name] = m

# step-name suffix -> promo still name (first match across captures, later captures win)
WANT = {
    'home-hero': ['ready', 'home-hero', 'launch'],
    'home-row': ['row-1', 'home-src-d1'],
    'detail': ['detail-after', 'detail'],
    'calendar': ['tab-calendar'],
    'player-danmaku': ['player-danmaku'],
    'player-osd': ['player-osd-after', 'player-paused', 'play-osd-d1'],
    'live-list': ['live-list', 'live-after'],
    'library': ['library-after', 'library'],
    'vod-detail': ['sintel-page-2', 'sintel-page'],
    'theme-a': ['themes-after', 'dlg-主题色彩'],
}
shots = []
for name, cands in WANT.items():
    found = None
    for cap in CAPS:
        for c in cands:
            hit = sorted(glob.glob(f'{cap}/shots/*-{c}.png'))
            if hit:
                found = hit[-1]
                break
    if found:
        Image.open(found).convert('RGB').save(f'{PUB}/shots/{name}.png', optimize=True)
        shots.append(name)

posters, seen = [], set()
for cap in CAPS:
    for uj in sorted(glob.glob(f'{cap}/ui/*row-*.json') + glob.glob(f'{cap}/ui/*home-src-d*.json')):
        png = uj.replace('/ui/', '/shots/').replace('.json', '.png')
        if not os.path.exists(png):
            continue
        im = Image.open(png).convert('RGB')
        for x in json.load(open(uj)):
            x1, y1, x2, y2 = x['b']
            w, h = x2 - x1, y2 - y1
            if 200 < w < 340 and 1.6 < h / w < 1.9 and x1 >= 0 and x2 <= 1920:
                ph = int(w * 1.5)
                crop = im.crop((x1, y1, x2, y1 + ph))
                key = crop.resize((8, 12)).tobytes()
                if key in seen:
                    continue
                seen.add(key)
                n = f'posters/p{len(posters):02d}.jpg'
                crop.resize((400, 600), Image.LANCZOS).save(f'{PUB}/{n}', quality=92)
                posters.append(n)

films = [os.path.basename(p)[:-4] for p in sorted(glob.glob(f'{PUB}/films/*.mp4'))]
out = {'release': RELEASE, 'clips': clips, 'shots': shots, 'posters': posters, 'films': films}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(PUB)), 'src', 'assets.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: (list(v) if isinstance(v, dict) else v) for k, v in out.items()}, ensure_ascii=False))
