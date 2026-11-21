#!/usr/bin/env python3
"""Download open movies (Blender Foundation / Blender Studio, CC BY) and build the demo library.

Output (in <out>):
  video/<id>[-eN].mp4   720p H.264 excerpts (fast to decode on the emulator)
  img/<id>-poster.jpg   2:3 poster cut from a film frame (title drawn by the app, not burnt in)
  img/<id>-backdrop.jpg 16:9 still
  img/wallpaper.jpg
  catalog.json          metadata consumed by demo_server.py
"""
import hashlib, json, os, subprocess, sys, urllib.parse, urllib.request, concurrent.futures as cf

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'media')
os.makedirs(f'{OUT}/video', exist_ok=True)
os.makedirs(f'{OUT}/img', exist_ok=True)
os.makedirs(f'{OUT}/src', exist_ok=True)
UA = {'User-Agent': 'TV-JetStream-Promo/1.0 (GitHub Actions; open-movie demo capture)'}


def commons(name, size='720p'):
    n = name.replace(' ', '_')
    h = hashlib.md5(n.encode()).hexdigest()
    q = urllib.parse.quote(n)
    base = f'https://upload.wikimedia.org/wikipedia/commons'
    return [f'{base}/transcoded/{h[0]}/{h[:2]}/{q}/{q}.{size}.vp9.webm', f'{base}/transcoded/{h[0]}/{h[:2]}/{q}/{q}.{size}.webm', f'{base}/{h[0]}/{h[:2]}/{q}']


# id, zh name, en, type, year, director, synopsis, sources, excerpt start (s), poster frame times
FILMS = [
    ('sintel', '辛特尔', 'Sintel', '电影', 2010, 'Colin Levy', '少女辛特尔在风雪中救下一只受伤的幼龙，为了寻回被掳走的它，她踏上一段穿越荒原与城池的漫长旅程。',
     ['https://download.blender.org/durian/movies/Sintel.2010.1080p.mkv'] + commons('Sintel_movie_4K.webm', '1080p'), 120, [345, 410, 560, 700]),
    ('tos', '钢铁之泪', 'Tears of Steel', '电影', 2012, 'Ian Hubert', '近未来的阿姆斯特丹，一群科学家与战士为挽救世界免遭机器人毁灭，试图重现一段破碎的往事。',
     ['https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov'], 60, [64, 200, 380, 590]),
    ('spring', '春', 'Spring', '电影', 2019, 'Andy Goralczyk', '牧羊少女与她的狗面对古老的森林之灵，在冬与春的交界寻找生命的回归。',
     commons('Spring_-_Blender_Open_Movie.webm', '1080p'), 30, [120, 230, 330, 400]),
    ('cosmos', '宇宙洗衣店', 'Cosmos Laundromat', '电影', 2015, 'Mathieu Auvray', '一只厌倦了生活的绵羊弗兰克，在荒岛上遇见神秘推销员维克多，被带入一场穿越无数平行世界的奇遇。',
     commons('Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm', '1080p'), 60, [100, 300, 500, 640]),
    ('bbb', '大雄兔', 'Big Buck Bunny', '动画', 2008, 'Sacha Goedegebure', '温和的大兔子在森林里被三只顽皮的啮齿动物接连捉弄，忍无可忍之后，他决定好好“回敬”一番。',
     ['https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_720p_h264.mov.zip'] + commons('Big_Buck_Bunny_4K.webm', '1080p'), 60, [70, 130, 260, 480]),
    ('ed', '大象之梦', 'Elephants Dream', '电影', 2006, 'Bassam Kurdali', '两个人在一座无尽的机械迷宫里行走，一个相信它，一个怀疑它——世界上第一部开放电影。',
     commons('Elephants_Dream_(high_quality).ogv', '720p') + commons('Elephants_Dream_(2006).webm', '720p'), 60, [80, 200, 340, 520]),
    ('sprite', '精灵惊魂', 'Sprite Fright', '动画', 2021, 'Matthew Luhn', '一群吵闹的青少年闯进林中，惊扰了守护森林的蘑菇精灵——一场既可爱又惊悚的冒险。',
     commons('Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm', '1080p'), 60, [90, 200, 420, 560]),
    ('coffee', '咖啡快跑', 'Coffee Run', '动画', 2020, 'Hjalti Hjálmarsson', '一杯咖啡下肚，她的思绪开始狂奔，在光怪陆离的记忆里一路冲刺。',
     commons('Coffee_Run_-_Blender_Open_Movie.webm', '1080p'), 0, [40, 80, 120, 160]),
    ('charge', '冲锋', 'Charge', '电影', 2022, 'Hjalti Hjálmarsson', '能源枯竭的冰封末世，一位老人为守护最后的电力，与一台冷酷的机器展开对决。',
     commons('Charge_-_Blender_Open_Movie.webm', '1080p'), 0, [40, 100, 160, 220]),
    ('wingit', '展翅', 'Wing It!', '动画', 2023, 'Rik Schutte', '谷仓里的猫和狗决定造一架火箭——只是它们完全不知道自己在做什么。',
     commons('Wing_It!_-_Blender_Open_Movie.webm', '1080p'), 0, [60, 120, 180, 220]),
    ('agent', '特工 327', 'Agent 327', '动画', 2017, 'Colin Levy', '荷兰传奇特工 327 乔装潜入一家理发店，却发现这里藏着远比剪发更危险的秘密。',
     commons('Agent_327_Operation_Barbershop.webm', '1080p') + commons('Agent_327_-_Operation_Barbershop.webm', '1080p'), 0, [40, 90, 150, 200]),
    ('hero', '英雄', 'Hero', '动画', 2018, 'Daniel M. Lara', '一场以蜡笔质感绘就的短暂冒险，致敬手绘动画的生命力。',
     commons('Hero_-_Blender_Grease_Pencil_Showcase.webm', '1080p'), 0, [30, 60, 90, 120]),
]
SERIES = ('llama', '小羊驼卡米南德斯', 'Caminandes', '剧集', 2013, 'Pablo Vazquez', '巴塔哥尼亚高原上，一只倔强的小羊驼总想越过围栏、抢到最好的那一口——三集短篇喜剧。', [
    ('第1集 羊驼大戏', commons('Caminandes-_Llama_Drama_-_Short_Movie.ogv', '720p') + commons('Caminandes_1_-_Llama_Drama.webm', '720p')),
    ('第2集 大号羊驼', ['https://download.blender.org/demo/movies/caminandes_gran_dillama.mp4.zip'] + commons('Caminandes_2_-_Gran_Dillama_-_Blender_Foundation\'s_new_Open_Movie.webm', '720p')),
    ('第3集 羊驼好朋友', commons('Caminandes_3_-_Llamigos_-_Blender_Animated_Short.webm', '1080p')),
])


def fetch(urls, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 1 << 20:
        return dst
    import time as _t
    for u in [x for x in urls for _ in range(3)]:
        try:
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r, open(dst + '.part', 'wb') as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            if os.path.getsize(dst + '.part') < 1 << 20:
                raise RuntimeError('too small')
            if u.endswith('.zip'):
                import zipfile
                with zipfile.ZipFile(dst + '.part') as z:
                    name = max(z.namelist(), key=lambda n: z.getinfo(n).file_size)
                    with z.open(name) as s, open(dst, 'wb') as d:
                        while True:
                            b = s.read(1 << 20)
                            if not b:
                                break
                            d.write(b)
                os.remove(dst + '.part')
            else:
                os.replace(dst + '.part', dst)
            print('  ok', u, flush=True)
            return dst
        except Exception as e:
            print('  fail', u, e, flush=True)
            if '429' in str(e):
                _t.sleep(15)
                continue
            if 'HTTP Error 404' in str(e):
                # skip remaining retries of this url
                urls = [x for x in urls if x != u]
            continue
    return None


def duration(p):
    try:
        return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode().strip())
    except Exception:
        return 0.0


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def excerpt(src, dst, start, length=240):
    d = duration(src)
    if d and start + 20 > d:
        start = max(0, d * 0.1)
    run(['ffmpeg', '-y', '-ss', str(start), '-i', src, '-t', str(length), '-map', '0:v:0', '-map', '0:a:0?',
         '-vf', 'scale=-2:720:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
         '-g', '48', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-movflags', '+faststart', dst])


def stills(src, iid, times):
    d = duration(src) or 600
    best = None
    for k, t in enumerate(times):
        t = min(t, d * 0.9)
        out = f'{OUT}/src/{iid}-{k}.png'
        try:
            run(['ffmpeg', '-y', '-ss', str(t), '-i', src, '-frames:v', '1', '-vf', 'scale=1920:-2:flags=lanczos', out])
            best = best or out
        except Exception:
            pass
    from PIL import Image, ImageStat
    cands = [f'{OUT}/src/{iid}-{k}.png' for k in range(len(times)) if os.path.exists(f'{OUT}/src/{iid}-{k}.png')]
    if not cands:
        return False
    # pick the most colourful/bright frames
    def score(p):
        im = Image.open(p).convert('RGB').resize((192, 108))
        st = ImageStat.Stat(im.convert('HSV'))
        return st.mean[1] * 0.6 + st.mean[2]
    cands.sort(key=score, reverse=True)
    bd = Image.open(cands[0]).convert('RGB')
    w, h = bd.size
    bd = bd.crop((0, (h - w * 9 // 16) // 2, w, (h - w * 9 // 16) // 2 + w * 9 // 16)).resize((1920, 1080), Image.LANCZOS)
    bd.save(f'{OUT}/img/{iid}-backdrop.jpg', quality=92)
    pim = Image.open(cands[1] if len(cands) > 1 else cands[0]).convert('RGB')
    w, h = pim.size
    pw = int(h * 2 / 3)
    # centre-weighted crop toward the region with most detail
    import numpy as np
    a = np.asarray(pim.convert('L').resize((w // 8, h // 8)), dtype=np.float32)
    gx = np.abs(np.diff(a, axis=1)).sum(0)
    win = pw // 8
    xs = np.convolve(gx, np.ones(win), 'valid')
    x0 = int(np.argmax(xs)) * 8 if len(xs) else (w - pw) // 2
    x0 = max(0, min(w - pw, x0))
    pim.crop((x0, 0, x0 + pw, h)).resize((600, 900), Image.LANCZOS).save(f'{OUT}/img/{iid}-poster.jpg', quality=92)
    return True


def build_film(f):
    iid, zh, en, tname, year, director, content, urls, start, times = f
    print('film', iid, flush=True)
    src = fetch(urls, f'{OUT}/src/{iid}.bin')
    if not src:
        return None
    if not stills(src, iid, times):
        return None
    excerpt(src, f'{OUT}/video/{iid}.mp4', start)
    return {'id': iid, 'name': zh, 'en': en, 'type_name': tname, 'year': str(year), 'area': '荷兰', 'director': director,
            'actor': 'Blender Studio', 'content': content + '（Blender Foundation 开放电影 · CC BY）',
            'remarks': f'{year} · 4K' if year >= 2015 else f'{year} · HD',
            'episodes': [{'name': '正片', 'file': f'{iid}.mp4'}]}


def build_series():
    iid, zh, en, tname, year, director, content, eps = SERIES
    out_eps = []
    for k, (ename, urls) in enumerate(eps):
        src = fetch(urls, f'{OUT}/src/{iid}{k + 1}.bin')
        if not src:
            continue
        if k == 0 or not os.path.exists(f'{OUT}/img/{iid}-poster.jpg'):
            stills(src, iid, [20, 45, 70, 100])
        excerpt(src, f'{OUT}/video/{iid}-e{k + 1}.mp4', 0, 180)
        out_eps.append({'name': ename, 'file': f'{iid}-e{k + 1}.mp4'})
    if not out_eps:
        return None
    return {'id': iid, 'name': zh, 'en': en, 'type_name': tname, 'year': str(year), 'area': '阿根廷', 'director': director,
            'actor': 'Blender Studio', 'content': content + '（Blender Foundation 开放电影 · CC BY）',
            'remarks': f'全{len(out_eps)}集', 'episodes': out_eps}


if __name__ == '__main__':
    with cf.ThreadPoolExecutor(3) as ex:
        films = list(ex.map(build_film, FILMS))
    series = build_series()
    items = [x for x in films if x] + ([series] if series else [])
    tid = {'电影': 1, '剧集': 2, '动画': 3}
    for it in items:
        it['type_id'] = tid[it['type_name']]
    # live channels loop film excerpts
    have = [it for it in items if it['type_name'] != '剧集']
    names = [('央视风格', ['光影一台', '光影二台', '纪实频道']), ('动画', ['动画频道', '少儿频道']), ('电影', ['电影频道', '科幻频道', '午夜剧场'])]
    live, k = [], 0
    from PIL import Image, ImageDraw
    for g, chs in names:
        arr = []
        for ch in chs:
            it = have[k % len(have)]; k += 1
            logo = f'logo-{k}.png'
            im = Image.open(f"{OUT}/img/{it['id']}-backdrop.jpg").resize((320, 180)).crop((70, 0, 250, 180)).resize((256, 256))
            im.save(f'{OUT}/img/{logo}')
            arr.append({'name': ch, 'file': it['episodes'][0]['file'], 'logo': logo})
        live.append({'group': g, 'channels': arr})
    first = items[0]
    Image.open(f"{OUT}/img/{first['id']}-backdrop.jpg").save(f'{OUT}/img/wallpaper.jpg', quality=90)
    json.dump({'items': items, 'live': live, 'config': {}}, open(f'{OUT}/catalog.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # remove big sources
    print('library:', [(i['id'], len(i['episodes'])) for i in items])
