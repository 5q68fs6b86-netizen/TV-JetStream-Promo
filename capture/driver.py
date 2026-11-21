#!/usr/bin/env python3
"""Drive the TV app on the emulator and capture screenshots + screen recordings.

Every step writes:  out/shots/<NN-name>.png, out/ui/<NN-name>.json (visible texts + bounds)
Recordings:         out/rec/<name>.mp4  (adb screenrecord, 1920x1080)

    python3 driver.py <apk> <out_dir> <phase>
phase: explore | film
"""
import json, os, re, subprocess, sys, time, threading, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

APK, OUT, PHASE = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else 'explore')
for d in ('shots', 'ui', 'rec', 'log'):
    os.makedirs(f'{OUT}/{d}', exist_ok=True)
BASE = 'http://10.0.2.2:8000'
STEP = [0]
LOG = open(f'{OUT}/log/driver.log', 'a', encoding='utf-8')


def log(*a):
    s = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(s, flush=True)
    LOG.write(s + '\n'); LOG.flush()


def sh(cmd, check=False, timeout=60):
    r = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError(f'{cmd}: {r.stderr.decode(errors="ignore")}')
    return r.stdout.decode(errors='ignore')


def adb(*a, timeout=60):
    return sh(['adb', *a], timeout=timeout)


def key(*codes, gap=0.35):
    for c in codes:
        adb('shell', 'input', 'keyevent', str(c))
        time.sleep(gap)


K = dict(UP=19, DOWN=20, LEFT=21, RIGHT=22, OK=23, ENTER=66, BACK=4, HOME=3, MENU=82, PLAY=85, FF=90, RW=89)


def press(name, n=1, gap=0.35):
    for _ in range(n):
        key(K[name], gap=gap)


def tap(x, y):
    adb('shell', 'input', 'tap', str(int(x)), str(int(y)))


def dump():
    for attempt in range(3):
        o = adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml', timeout=40)
        if 'dumped' in o:
            x = adb('exec-out', 'cat', '/sdcard/ui.xml')
            try:
                root = ET.fromstring(x)
            except ET.ParseError:
                continue
            nodes = []
            for n in root.iter('node'):
                b = re.findall(r'\d+', n.get('bounds', ''))
                if len(b) != 4:
                    continue
                x1, y1, x2, y2 = map(int, b)
                nodes.append({'text': n.get('text', ''), 'desc': n.get('content-desc', ''), 'id': n.get('resource-id', ''),
                              'cls': n.get('class', '').split('.')[-1], 'focused': n.get('focused') == 'true',
                              'selected': n.get('selected') == 'true', 'clickable': n.get('clickable') == 'true',
                              'b': [x1, y1, x2, y2]})
            return nodes
        time.sleep(1.0)
    return []


def shot(name, ui=True):
    STEP[0] += 1
    tag = f'{STEP[0]:03d}-{name}'
    with open(f'{OUT}/shots/{tag}.png', 'wb') as f:
        f.write(subprocess.run(['adb', 'exec-out', 'screencap', '-p'], capture_output=True, timeout=40).stdout)
    nodes = dump() if ui else []
    json.dump(nodes, open(f'{OUT}/ui/{tag}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    texts = [n['text'] or n['desc'] for n in nodes if (n['text'] or n['desc'])]
    foc = [n['text'] or n['desc'] or n['id'] for n in nodes if n['focused']]
    log('SHOT', tag, '| focus:', foc[:3], '| texts:', ' / '.join(texts[:60]))
    return nodes


def find(nodes, pat, exact=False):
    r = re.compile(pat)
    out = []
    for n in nodes:
        for s in (n['text'], n['desc']):
            if s and (r.fullmatch(s) if exact else r.search(s)):
                out.append(n); break
    return out


def tap_node(n):
    x1, y1, x2, y2 = n['b']
    tap((x1 + x2) / 2, (y1 + y2) / 2)


def tap_text(pat, exact=False, nodes=None, wait=1.5, idx=0):
    nodes = nodes if nodes is not None else dump()
    hit = find(nodes, pat, exact)
    if not hit:
        log('MISS', pat)
        return False
    tap_node(hit[min(idx, len(hit) - 1)])
    log('TAP', pat, hit[min(idx, len(hit) - 1)]['b'])
    time.sleep(wait)
    return True


def wait_text(pat, timeout=20):
    t = time.time()
    while time.time() - t < timeout:
        n = dump()
        if find(n, pat):
            return n
        time.sleep(1)
    return None


# ---------------------------------------------------------------- recording
class Rec:
    def __init__(self, name, limit=170):
        self.name = name
        self.dev = f'/sdcard/rec-{name}.mp4'
        adb('shell', 'rm', '-f', self.dev)
        self.p = subprocess.Popen(['adb', 'shell', 'screenrecord', '--bit-rate', '24000000', '--size', '1920x1080',
                                   '--time-limit', str(limit), self.dev], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.t0 = time.time()
        time.sleep(1.2)
        log('REC start', name)

    def mark(self, label):
        log('REC mark', self.name, f'{time.time() - self.t0:.2f}', label)
        with open(f'{OUT}/rec/{self.name}.marks.txt', 'a') as f:
            f.write(f'{time.time() - self.t0:.2f}\t{label}\n')

    def stop(self):
        time.sleep(0.8)
        adb('shell', 'pkill', '-INT', 'screenrecord')
        try:
            self.p.wait(timeout=15)
        except Exception:
            self.p.kill()
        time.sleep(2.5)
        adb('pull', self.dev, f'{OUT}/rec/{self.name}.mp4', timeout=120)
        log('REC stop', self.name, f'{time.time() - self.t0:.1f}s')


# ---------------------------------------------------------------- app control
PKG = None


def badging():
    global PKG
    bt = sorted(os.listdir(os.path.join(os.environ['ANDROID_HOME'], 'build-tools')))[-1]
    aapt = os.path.join(os.environ['ANDROID_HOME'], 'build-tools', bt, 'aapt')
    o = sh([aapt, 'dump', 'badging', APK])
    PKG = re.search(r"package: name='([^']+)'", o).group(1)
    log('package', PKG, re.search(r"versionName='([^']*)'", o).group(1))


def app_post(params):
    url = 'http://127.0.0.1:9978/action?' + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, data=b'', method='POST')
        r = urllib.request.urlopen(req, timeout=10).read()
        log('POST', params.get('do'), r[:80])
        return True
    except Exception as e:
        log('POST fail', e)
        return False


def launch():
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')


def alive():
    return bool(adb('shell', 'pidof', PKG).strip())


def dismiss_dialogs():
    for _ in range(3):
        n = dump()
        hit = [x for x in n if re.fullmatch(r'(允许|同意|确定|我知道了|知道了|继续|OK|Allow|始终允许|仅在使用该应用时允许)', x['text'] or '')]
        if not hit:
            return
        tap_node(hit[0]); time.sleep(1.2)


def set_config(kind, url, name):
    """kind: 点播 | 直播.  Opens Settings -> row -> ConfigDialog, injects text through the app's own LAN API."""
    n = shot(f'settings-before-{kind}')
    if not find(n, r'^(来源|点播|播放|应用)$'):
        if not tap_text(r'^设置$', exact=True, nodes=n):
            press('MENU'); time.sleep(1)
        time.sleep(2)
        n = shot(f'settings-open-{kind}')
    hit = find(n, f'^{kind}$', exact=True) or find(n, kind)
    if not hit:
        log('no row for', kind)
        return False
    tap_node(hit[0]); time.sleep(2)
    n = shot(f'config-dialog-{kind}')
    app_post({'do': 'setting', 'text': url, 'name': name})
    time.sleep(1.5)
    n = shot(f'config-filled-{kind}')
    if not tap_text(r'^(确定|确认|保存|OK)$', exact=True, nodes=n):
        press('ENTER')
    time.sleep(6)
    shot(f'config-done-{kind}')
    return True


def boot_app():
    badging()
    log(adb('install', '-r', '-g', APK, timeout=300))
    adb('shell', 'appops', 'set', APK and 'x' or 'x', 'noop')
    adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '1')
    adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '1')
    adb('shell', 'settings', 'put', 'global', 'animator_duration_scale', '1')
    adb('shell', 'settings', 'put', 'secure', 'immersive_mode_confirmations', 'confirmed')
    adb('shell', 'settings', 'put', 'system', 'time_12_24', '24')
    adb('shell', 'cmd', 'overlay', 'enable', 'com.android.internal.systemui.navbar.gestural')
    adb('shell', 'wm', 'size', '1920x1080')
    adb('shell', 'wm', 'density', '320')
    adb('forward', 'tcp:9978', 'tcp:9978')
    adb('shell', 'cmd', 'locale', 'set-app-locales', PKG, '--locales', 'zh-CN')
    adb('shell', 'settings', 'put', 'system', 'system_locales', 'zh-CN')
    adb('shell', 'appops', 'set', '--uid', PKG, 'MANAGE_EXTERNAL_STORAGE', 'allow')
    launch(); time.sleep(16)
    dismiss_dialogs()
    shot('launch')
    log('alive', alive())


# ---------------------------------------------------------------- phases
def explore():
    boot_app()
    if not alive():
        log(adb('logcat', '-d', '-t', '400', timeout=60)[-20000:])
        return
    set_config('点播', f'{BASE}/config.json', '演示片库')
    for _ in range(4):
        press('BACK'); time.sleep(1)
        n = dump()
        if find(n, r'^(点播|直播|搜索|推荐|媒体库|首页)$'):
            break
    if not alive():
        launch(); time.sleep(10)
    time.sleep(8)
    shot('home-loaded')
    # tour: walk focus around and snapshot
    for i in range(6):
        press('DOWN'); time.sleep(1.6); shot(f'home-down-{i}')
    press('UP', 8, 0.25); time.sleep(1.5)
    for i in range(5):
        press('RIGHT'); time.sleep(1.2); shot(f'home-right-{i}')
    # open first focused item
    press('DOWN'); time.sleep(1); press('OK'); time.sleep(6)
    shot('detail-0')
    press('DOWN'); time.sleep(1); shot('detail-down')
    press('OK'); time.sleep(10); shot('play-0')
    time.sleep(6); shot('play-1')
    press('OK'); time.sleep(2); shot('play-osd')
    press('DOWN'); time.sleep(1.5); shot('play-osd-down')
    press('UP'); time.sleep(1.5); shot('play-osd-up')
    press('BACK'); time.sleep(1.5); press('BACK'); time.sleep(2); shot('back-detail')
    press('BACK'); time.sleep(2); shot('back-home')
    # try live
    r = Rec('explore-live', 60)
    n = dump()
    if tap_text(r'^直播$', exact=True, nodes=n, wait=8):
        shot('live-0')
        press('OK'); time.sleep(2); shot('live-list')
        press('DOWN'); time.sleep(1); press('DOWN'); time.sleep(1); shot('live-list-2')
        press('RIGHT'); time.sleep(1.5); shot('live-epg')
        press('BACK'); time.sleep(1); press('BACK'); time.sleep(2)
    r.stop()
    n = dump()
    if tap_text(r'^搜索$', exact=True, nodes=n, wait=3):
        shot('search-0')
        press('BACK'); time.sleep(2)
    n = dump()
    if tap_text(r'^设置$', exact=True, nodes=n, wait=3):
        shot('setting-0')
        for i in range(8):
            press('DOWN'); time.sleep(0.8); shot(f'setting-down-{i}')
        press('BACK'); time.sleep(2)
    shot('end')


def act(name):
    return f'{PKG}/com.fongmi.android.tv.ui.activity.{name}'


def tab(pat):
    n = dump()
    hit = [x for x in find(n, pat, exact=True) if x['b'][1] < 120]
    if not hit:
        log('no tab', pat); return False
    tap_node(hit[0]); return True


def explore2():
    boot_app()
    if not alive():
        return
    # A. home tour
    r = Rec('home', 120)
    time.sleep(5); shot('home-hero'); r.mark('hero')
    for i in range(3):
        press('RIGHT'); time.sleep(3.0); shot(f'hero-right-{i}'); r.mark(f'hero-right-{i}')
    press('DOWN'); time.sleep(2.5); shot('row-0'); r.mark('row-0')
    for i in range(6):
        press('RIGHT'); time.sleep(0.9)
    shot('row-0-right'); r.mark('row-0-right')
    for i in range(5):
        press('DOWN'); time.sleep(2.2); shot(f'row-{i + 1}'); r.mark(f'row-{i + 1}')
        press('RIGHT'); time.sleep(0.9); press('RIGHT'); time.sleep(1.2)
    press('UP', 12, 0.3); time.sleep(2.5); shot('home-top'); r.mark('home-top')
    r.stop()
    # B. tabs
    r = Rec('tabs', 160)
    for name, pat in (('library', r'(片库|Library)'), ('calendar', r'(日历|Calendar)'), ('search', r'(搜索|Search)'), ('mytv', r'(我的|My TV|我的电视)')):
        if tab(pat):
            r.mark(name); time.sleep(5); shot(f'tab-{name}')
            for i in range(3):
                press('DOWN'); time.sleep(1.8); shot(f'tab-{name}-d{i}')
            press('RIGHT'); time.sleep(1.5); shot(f'tab-{name}-r')
            press('UP', 6, 0.3); time.sleep(1.2)
    r.stop()
    # C. My TV deep look (settings entry discovery)
    tab(r'(我的|My TV|我的电视)'); time.sleep(3)
    for i in range(10):
        press('DOWN'); time.sleep(1.0); shot(f'mytv-scan-{i}')
    press('UP', 12, 0.25)
    # D. try settings activity directly
    log(adb('shell', 'am', 'start', '-n', act('SettingActivity')))
    time.sleep(4); shot('settings-direct')
    for i in range(8):
        press('DOWN'); time.sleep(0.9); shot(f'settings-d{i}')
    press('BACK'); time.sleep(2)
    # E. back home -> detail page
    tab(r'(首页|Home)'); time.sleep(3)
    r = Rec('detail', 90)
    n = dump()
    if not tap_text(r'(查看详情|View details)', nodes=n, wait=6):
        press('OK'); time.sleep(6)
    shot('detail'); r.mark('detail')
    for i in range(5):
        press('DOWN'); time.sleep(2.2); shot(f'detail-d{i}'); r.mark(f'detail-d{i}')
    press('UP', 6, 0.3); time.sleep(2)
    r.stop()
    press('BACK'); time.sleep(2)
    # F. playback via share intent
    r = Rec('play', 170)
    adb('shell', 'am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT',
        f'{BASE}/video/sintel.mp4', '-n', act('HomeActivity'))
    time.sleep(12); shot('play-0'); r.mark('play-0')
    for i, t in enumerate(['前方高能！', '这画质太顶了', '遥控器操作好顺手', '名场面打卡', '弹幕护体', '大屏党狂喜', '字幕好清晰',
                           '这配色好高级', '收藏了！', '一起看真香', '比原版顺滑多了', 'HDR 太震撼', '追更日历救我', '龙！！！', '泪目了']):
        app_post({'do': 'danmaku', 'text': t}); time.sleep(0.45)
    time.sleep(2); shot('play-danmaku'); r.mark('danmaku')
    press('OK'); time.sleep(2.5); shot('play-osd'); r.mark('osd')
    press('DOWN'); time.sleep(2); shot('play-osd-d1'); r.mark('osd-d1')
    press('RIGHT'); time.sleep(1.5); shot('play-osd-d1-r')
    press('RIGHT'); time.sleep(1.5); shot('play-osd-d1-rr')
    press('OK'); time.sleep(2.5); shot('play-drawer'); r.mark('drawer')
    press('DOWN'); time.sleep(1.2); press('DOWN'); time.sleep(1.5); shot('play-drawer-d')
    press('BACK'); time.sleep(1.5); shot('play-after-back')
    press('BACK'); time.sleep(1.5); shot('play-after-back2')
    press('RIGHT'); time.sleep(1.5); shot('play-seek'); r.mark('seek')
    press('UP'); time.sleep(2); shot('play-up'); r.mark('up')
    press('BACK'); time.sleep(1.5)
    press('MENU'); time.sleep(2); shot('play-menu'); r.mark('menu')
    press('BACK'); time.sleep(1.5)
    r.stop()
    press('BACK'); time.sleep(1.5); press('BACK'); time.sleep(2); shot('after-play')
    if not alive():
        launch(); time.sleep(10)
    # G. live via m3u file
    m3u = urllib.request.urlopen('http://127.0.0.1:8000/live.m3u').read()
    open('/tmp/demo.m3u', 'wb').write(m3u)
    adb('push', '/tmp/demo.m3u', '/sdcard/Download/demo.m3u')
    r = Rec('live', 120)
    log(adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'file:///sdcard/Download/demo.m3u', '-t', 'text/plain', '-n', act('HomeActivity')))
    time.sleep(10); shot('live-after-intent'); r.mark('live-intent')
    n = dump()
    if not find(n, r'(光影|频道|直播)'):
        tab(r'(首页|Home)'); time.sleep(2)
        tap_text(r'^(直播|Live)$', exact=True, wait=8)
    time.sleep(4); shot('live-0'); r.mark('live-0')
    press('OK'); time.sleep(2.5); shot('live-list'); r.mark('live-list')
    press('DOWN'); time.sleep(1.2); press('DOWN'); time.sleep(1.5); shot('live-list-2')
    press('LEFT'); time.sleep(1.5); shot('live-groups')
    press('RIGHT'); time.sleep(1); press('RIGHT'); time.sleep(1.5); shot('live-epg'); r.mark('live-epg')
    press('BACK'); time.sleep(1.5); shot('live-back')
    press('DOWN'); time.sleep(4); shot('live-next'); r.mark('live-next')
    press('BACK'); time.sleep(1.5); press('BACK'); time.sleep(2)
    r.stop()
    shot('end')


S = 4  # animation stretch: animator scale and key gaps are multiplied by S, footage is sped up S x in post


def anim(scale):
    for k in ('window_animation_scale', 'transition_animation_scale', 'animator_duration_scale'):
        adb('shell', 'settings', 'put', 'global', k, str(scale))


def g(sec):
    time.sleep(sec * S)


def kp(name, n=1, gap=0.6):
    for _ in range(n):
        adb('shell', 'input', 'keyevent', str(K[name]))
        g(gap)


def settle(pat, timeout=40):
    n = wait_text(pat, timeout)
    log('settle', pat, bool(n))
    return n


def goto_settings():
    adb('shell', 'am', 'start', '-n', act('SettingActivity'))
    time.sleep(4)
    return dump()


def config_row(kind, url, name):
    n = goto_settings()
    rows = [x for x in find(n, f'^{kind}$', exact=True) if x['b'][0] > 300]
    if not rows:
        log('no settings row', kind); shot(f'cfg-miss-{kind}'); return False
    tap_node(rows[0]); time.sleep(2.5)
    n = shot(f'cfg-dialog-{kind}')
    app_post({'do': 'setting', 'text': url, 'name': name}); time.sleep(1.5)
    n = dump()
    if not find(n, re.escape(url[:20])):
        edits = [x for x in n if x['cls'] == 'EditText']
        if edits:
            tap_node(edits[-1]); time.sleep(0.6)
            adb('shell', 'input', 'text', url.replace('&', '\\&'))
            time.sleep(0.8); adb('shell', 'input', 'keyevent', '111')
    shot(f'cfg-filled-{kind}')
    if not tap_text(r'^确定$', exact=True, wait=3):
        press('ENTER')
    time.sleep(8)
    shot(f'cfg-after-{kind}')
    press('BACK'); time.sleep(2)
    return True


def film():
    boot_app()
    if not alive():
        return
    settle(r'查看详情', 40)
    time.sleep(6)
    shot('ready')
    # ---- 1. home (slow-motion UI) ----
    anim(S)
    r = Rec('home', 178)
    r.mark('start'); g(2.5)
    for i in range(2):
        r.mark(f'hero-right-{i}'); kp('RIGHT', gap=3.0)
    r.mark('down-row0'); kp('DOWN', gap=2.0)
    for i in range(5):
        kp('RIGHT', gap=0.75)
    r.mark('down-row1'); kp('DOWN', gap=1.6)
    kp('RIGHT', 3, 0.7)
    r.mark('down-row2'); kp('DOWN', gap=1.6)
    kp('RIGHT', 3, 0.7)
    r.mark('down-row3'); kp('DOWN', gap=1.6)
    kp('RIGHT', 2, 0.7)
    r.mark('up'); kp('UP', 6, 0.35); g(2.0)
    r.mark('end')
    r.stop()
    anim(1)
    shot('home-after')
    # ---- 2. detail ----
    n = dump()
    anim(S)
    r = Rec('detail', 150)
    r.mark('open')
    if not tap_text(r'查看详情', nodes=n, wait=0.1):
        adb('shell', 'input', 'keyevent', '23')
    g(3.5)
    for i in range(4):
        r.mark(f'down-{i}'); kp('DOWN', gap=1.8)
    kp('RIGHT', 3, 0.7)
    r.mark('up'); kp('UP', 6, 0.4); g(1.5)
    r.mark('end')
    r.stop()
    anim(1)
    shot('detail-after')
    press('BACK'); time.sleep(3)
    # ---- 3. tabs (calendar, library, search, mine) ----
    for name, pat in (('calendar', r'^日历$'), ('library', r'^片库$'), ('search', r'^搜索$'), ('mine', r'^我的$')):
        n = dump()
        hit = [x for x in find(n, pat, exact=True) if x['b'][1] < 140]
        if not hit:
            log('no tab', name); continue
        tap_node(hit[0]); time.sleep(6)
        shot(f'tab-{name}')
        anim(S)
        r = Rec(f'tab-{name}', 120)
        r.mark('start'); g(1.5)
        kp('DOWN', gap=1.6); kp('RIGHT', 3, 0.8); kp('DOWN', gap=1.6); kp('RIGHT', 2, 0.8)
        r.mark('end'); g(0.5)
        r.stop()
        anim(1)
        shot(f'tab-{name}-after')
        kp('UP', 6, 0.1); time.sleep(1)
        if not alive():
            launch(); time.sleep(10)
    # ---- 4. settings & themes ----
    n = goto_settings()
    shot('settings')
    for sec in ('首页与发现', '播放', '弹幕', '应用'):
        n = dump()
        hit = [x for x in find(n, f'^{sec}$', exact=True) if x['b'][0] < 300]
        if hit:
            tap_node(hit[0]); time.sleep(2.5); shot(f'settings-{sec}')
            for i in range(3):
                press('DOWN'); time.sleep(0.6)
            shot(f'settings-{sec}-down')
    n = dump()
    hit = [x for x in find(n, '^应用$', exact=True) if x['b'][0] < 300]
    if hit:
        tap_node(hit[0]); time.sleep(2)
    for row in ('主题色彩', '外观模式'):
        n = dump()
        h = find(n, f'^{row}$', exact=True)
        log('row', row, bool(h))
        if h:
            tap_node(h[0]); time.sleep(2.5); shot(f'row-{row}')
            press('BACK'); time.sleep(1.5)
    press('BACK'); time.sleep(2)
    # ---- 5. configure demo sources ----
    config_row('点播', f'{BASE}/config.json', '演示片库')
    config_row('直播', f'{BASE}/live.m3u', '演示直播')
    if not alive():
        launch(); time.sleep(12)
    adb('shell', 'am', 'start', '-n', act('HomeActivity')); time.sleep(10)
    shot('home-with-source')
    for i in range(4):
        press('DOWN'); time.sleep(2); shot(f'home-src-d{i}')
    press('UP', 8, 0.3); time.sleep(1.5)
    # top-right switcher (影视 / 直播)
    n = dump()
    hit = find(n, r'^(影视|直播)$', exact=True)
    log('switcher', [(x['text'], x['b']) for x in hit])
    # ---- 6. search the demo library -> detail -> play ----
    n = dump()
    hit = [x for x in find(n, r'^搜索$', exact=True) if x['b'][1] < 140]
    if hit:
        tap_node(hit[0]); time.sleep(4); shot('search-open')
        n = dump()
        edits = [x for x in n if x['cls'] == 'EditText']
        if edits:
            tap_node(edits[0]); time.sleep(1)
        app_post({'do': 'search', 'word': '辛特尔'}); time.sleep(10)
        shot('search-result')
    # direct: push a CMS item via search event already; fallback play by intent
    n = dump()
    hit = find(n, r'辛特尔')
    if hit:
        tap_node(hit[-1]); time.sleep(8); shot('vod-detail')
    else:
        adb('shell', 'am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT',
            f'{BASE}/video/sintel.mp4', '-n', act('HomeActivity'))
        time.sleep(10)
    shot('vod-page')
    n = dump()
    full = find(n, r'(全屏|播放|立即播放|继续播放)')
    log('play buttons', [(x['text'], x['b']) for x in full][:6])
    if full:
        tap_node(full[0]); time.sleep(8)
    else:
        press('OK'); time.sleep(8)
    shot('player-0')
    r = Rec('player-live', 60)
    r.mark('playing')
    for i, t in enumerate(['前方高能！', '这画质太顶了', '遥控器操作好顺手', '名场面打卡', '大屏党狂喜', '字幕好清晰', '这配色好高级',
                           '收藏了！', '一起看真香', '比原版顺滑多了', '龙！！！', '泪目了', '弹幕护体', '好看好看', '截图当壁纸']):
        app_post({'do': 'danmaku', 'text': t}); time.sleep(0.6)
    time.sleep(6); r.mark('end')
    r.stop()
    shot('player-danmaku')
    # paused OSD in slow motion
    app_post({'do': 'control', 'type': 'pause'}); time.sleep(1.5)
    anim(S)
    r = Rec('player-osd', 170)
    r.mark('osd'); kp('OK', gap=2.0)
    r.mark('osd-down'); kp('DOWN', gap=1.5)
    kp('RIGHT', gap=1.0); kp('RIGHT', gap=1.0)
    r.mark('drawer'); kp('OK', gap=2.5)
    kp('DOWN', 2, 0.9)
    r.mark('drawer-back'); kp('BACK', gap=1.5)
    kp('RIGHT', gap=1.0)
    r.mark('drawer2'); kp('OK', gap=2.5)
    kp('DOWN', 2, 0.9)
    r.mark('back'); kp('BACK', gap=1.5)
    r.mark('end')
    r.stop()
    anim(1)
    shot('player-osd-after')
    press('BACK'); time.sleep(1.5); press('BACK'); time.sleep(1.5); press('BACK'); time.sleep(2)
    if not alive():
        launch(); time.sleep(10)
    # ---- 7. live ----
    adb('shell', 'am', 'start', '-n', act('LiveActivity')); time.sleep(10)
    shot('live-0')
    r = Rec('live', 90)
    r.mark('live'); time.sleep(4)
    r.mark('list'); press('OK'); time.sleep(3)
    press('DOWN'); time.sleep(1.5); press('DOWN'); time.sleep(1.5)
    r.mark('groups'); press('LEFT'); time.sleep(2)
    press('DOWN'); time.sleep(1.5)
    r.mark('epg'); press('RIGHT'); time.sleep(1.2); press('RIGHT'); time.sleep(1.2); press('RIGHT'); time.sleep(2.5)
    r.mark('back'); press('BACK'); time.sleep(2)
    r.mark('zap'); press('UP'); time.sleep(5)
    r.mark('end')
    r.stop()
    shot('live-after')
    press('OK'); time.sleep(2); shot('live-list')
    press('LEFT'); time.sleep(2); shot('live-groups')
    press('RIGHT'); press('RIGHT'); time.sleep(2); shot('live-epg')
    press('BACK'); press('BACK'); time.sleep(2)
    shot('end')


def top_tab(pat):
    n = dump()
    hit = [x for x in find(n, pat, exact=True) if x['b'][1] < 140]
    if not hit:
        log('no top tab', pat); return None
    tap_node(hit[0]); return hit[0]


def config_via_library():
    top_tab(r'^片库$'); time.sleep(4)
    n = shot('lib-or-settings')
    ok = False
    for kind, url, name in (('点播', f'{BASE}/config.json', '演示片库'), ('直播', f'{BASE}/live.m3u', '演示直播')):
        n = dump()
        rows = [x for x in find(n, f'^{kind}$', exact=True) if x['b'][0] > 330]
        log('rows', kind, [x['b'] for x in rows])
        if not rows:
            continue
        tap_node(rows[0]); time.sleep(3)
        n = shot(f'cfg-dialog-{kind}')
        app_post({'do': 'setting', 'text': url, 'name': name}); time.sleep(2)
        n = dump()
        if not find(n, re.escape(url[7:25])):
            edits = [x for x in n if x['cls'] == 'EditText']
            log('typing into', len(edits))
            if edits:
                tap_node(edits[-1]); time.sleep(0.8)
                adb('shell', 'input', 'text', url); time.sleep(1)
        shot(f'cfg-filled-{kind}')
        if not tap_text(r'^确定$', exact=True, wait=2):
            press('ENTER')
        time.sleep(10)
        shot(f'cfg-after-{kind}')
        ok = True
    return ok


def film2():
    boot_app()
    if not alive():
        return
    settle(r'查看详情', 40); time.sleep(4)
    config_via_library()
    for _ in range(3):
        n = dump()
        if find(n, r'^(首页|片库|日历|搜索|我的)$'):
            break
        press('BACK'); time.sleep(2)
    if not alive():
        launch(); time.sleep(12)
    time.sleep(6); shot('home-src')
    # library tab with the demo source
    top_tab(r'^片库$'); time.sleep(8)
    shot('library')
    anim(S)
    r = Rec('library', 170)
    r.mark('start'); g(2.0)
    kp('DOWN', gap=1.6); kp('RIGHT', 3, 0.8); kp('DOWN', gap=1.6); kp('RIGHT', 3, 0.8); kp('DOWN', gap=1.6); kp('RIGHT', 2, 0.8)
    r.mark('end'); g(0.5)
    r.stop()
    anim(1)
    shot('library-after')
    for i in range(3):
        press('DOWN'); time.sleep(1.5); shot(f'library-d{i}')
    press('UP', 8, 0.3); time.sleep(1)
    # mine tab -> settings
    top_tab(r'^我的$'); time.sleep(5)
    n = shot('mine')
    for i in range(5):
        press('DOWN'); time.sleep(1.2); shot(f'mine-d{i}')
    press('UP', 8, 0.3); time.sleep(1)
    # search demo library
    top_tab(r'^搜索$'); time.sleep(4)
    app_post({'do': 'search', 'word': '辛特尔'}); time.sleep(12)
    n = shot('search-sintel')
    hits = [x for x in find(n, r'辛特尔') if x['b'][0] > 600]
    log('search hits', [(x['text'], x['b']) for x in hits][:8])
    if hits:
        tap_node(hits[0]); time.sleep(8)
    n = shot('sintel-page')
    # demo detail (CMS) in slow motion
    anim(S)
    r = Rec('vod-detail', 120)
    r.mark('start'); g(2.0)
    kp('DOWN', gap=1.5); kp('DOWN', gap=1.5); kp('UP', 2, 0.6); g(1.0)
    r.mark('end')
    r.stop()
    anim(1)
    n = shot('sintel-page-2')
    # start playback (fullscreen)
    play = find(n, r'(立即播放|播放|全屏观看|继续观看)')
    log('play candidates', [(x['text'], x['b']) for x in play][:6])
    if play:
        tap_node(play[0]); time.sleep(8)
    else:
        press('OK'); time.sleep(8)
    n = shot('player-a')
    if find(n, r'全屏'):
        tap_text(r'全屏', wait=6); shot('player-b')
    r = Rec('player-live', 45)
    r.mark('playing'); time.sleep(1)
    for t in ['前方高能！', '这画质太顶了', '遥控器操作好顺手', '名场面打卡', '大屏党狂喜', '字幕好清晰', '这配色好高级',
              '收藏了！', '一起看真香', '比原版顺滑多了', '龙！！！', '泪目了', '弹幕护体', '好看好看', '截图当壁纸', '开源万岁',
              '片头已跳过', '倍速长按好评', '这一幕绝了', '再看一遍']:
        app_post({'do': 'danmaku', 'text': t}); time.sleep(0.5)
    time.sleep(8); r.mark('end')
    r.stop()
    shot('player-danmaku')
    app_post({'do': 'control', 'type': 'pause'}); time.sleep(2)
    shot('player-paused')
    anim(S)
    r = Rec('player-osd', 175)
    r.mark('osd'); kp('OK', gap=2.0)
    r.mark('osd-down'); kp('DOWN', gap=1.6)
    for i in range(3):
        r.mark(f'osd-right-{i}'); kp('RIGHT', gap=1.0)
    r.mark('drawer'); kp('OK', gap=2.4)
    kp('DOWN', 2, 0.9)
    r.mark('drawer-back'); kp('BACK', gap=1.4)
    kp('LEFT', gap=1.0)
    r.mark('drawer2'); kp('OK', gap=2.4)
    kp('DOWN', 2, 0.9)
    r.mark('back'); kp('BACK', gap=1.4)
    r.mark('end')
    r.stop()
    anim(1)
    shot('player-osd-after')
    for i in range(3):
        press('BACK'); time.sleep(1.5)
    if not alive():
        launch(); time.sleep(10)
    # live
    adb('shell', 'am', 'start', '-n', act('LiveActivity')); time.sleep(12)
    shot('live-0')
    r = Rec('live', 80)
    r.mark('live'); time.sleep(4)
    r.mark('list'); press('OK'); time.sleep(3)
    press('DOWN'); time.sleep(1.5); press('DOWN'); time.sleep(1.5)
    r.mark('groups'); press('LEFT'); time.sleep(2)
    press('DOWN'); time.sleep(1.5)
    r.mark('epg'); press('RIGHT'); time.sleep(1.2); press('RIGHT'); time.sleep(1.2); press('RIGHT'); time.sleep(2.5)
    r.mark('back'); press('BACK'); time.sleep(2)
    r.mark('zap'); press('UP'); time.sleep(5)
    r.mark('end')
    r.stop()
    shot('live-after')
    press('OK'); time.sleep(2.5); shot('live-list')
    press('LEFT'); time.sleep(2); shot('live-groups')
    press('RIGHT'); time.sleep(1); press('RIGHT'); time.sleep(2); shot('live-epg')
    press('BACK'); time.sleep(1); press('BACK'); time.sleep(1); press('BACK'); time.sleep(2)
    if not alive():
        launch(); time.sleep(10)
    # settings: find an entry (mine tab or long-press) and scan sections for theme rows
    top_tab(r'^我的$'); time.sleep(4)
    n = dump()
    st = find(n, r'^设置$', exact=True)
    if st:
        tap_node(st[0]); time.sleep(4)
    n = shot('settings-0')
    for sec in ('来源', '首页与发现', '播放', '解码', '预载', '弹幕', '应用'):
        n = dump()
        hit = [x for x in find(n, f'^{sec}$', exact=True) if x['b'][0] < 330]
        if not hit:
            continue
        tap_node(hit[0]); time.sleep(2.5); shot(f'set-{sec}')
        press('RIGHT'); time.sleep(0.8)
        for i in range(6):
            press('DOWN'); time.sleep(0.5)
        shot(f'set-{sec}-low')
    for row in ('主题色彩', '外观模式'):
        for sec in ('应用', '首页与发现'):
            n = dump()
            h = find(n, f'^{row}$', exact=True)
            if h:
                break
            hs = [x for x in find(n, f'^{sec}$', exact=True) if x['b'][0] < 330]
            if hs:
                tap_node(hs[0]); time.sleep(2)
                for i in range(8):
                    n = dump(); h = find(n, f'^{row}$', exact=True)
                    if h: break
                    press('RIGHT'); press('DOWN', 3, 0.3)
            if h:
                break
        log('row', row, bool(h))
        if not h:
            continue
        tap_node(h[0]); time.sleep(3)
        n = shot(f'dlg-{row}')
        opts = [x for x in n if (x['text'] or '') in ('星际蓝', '跟随壁纸', 'B站粉', '翡翠绿', '琥珀金', '曜石紫', '赤焰红', '深色', '浅色', '跟随系统')]
        log('opts', [(x['text'], x['b']) for x in opts])
        if row == '主题色彩' and opts:
            anim(S)
            r = Rec('themes', 175)
            for o in [x for x in opts if x['text'] in ('B站粉', '翡翠绿', '琥珀金', '曜石紫', '赤焰红', '星际蓝')]:
                r.mark(o['text']); tap_node(o); g(2.4)
                n2 = dump()
                again = [x for x in n2 if x['text'] == o['text']]
                if not again:
                    h2 = find(n2, '^主题色彩$', exact=True)
                    if h2:
                        tap_node(h2[0]); g(1.2)
            r.mark('end')
            r.stop()
            anim(1)
            shot('themes-after')
        press('BACK'); time.sleep(1.5)
    shot('end')


if __name__ == '__main__':
    t = time.time()
    try:
        globals()[PHASE]()
    except Exception as e:
        import traceback
        log('ERROR', traceback.format_exc())
        try:
            shot('error')
        except Exception:
            pass
    adb('logcat', '-d', '-t', '3000')
    open(f'{OUT}/log/logcat.txt', 'w').write(adb('logcat', '-d', timeout=120)[-3_000_000:])
    log('done in', round(time.time() - t), 's')
