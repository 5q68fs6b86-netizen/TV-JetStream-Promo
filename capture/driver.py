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
    adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '1')
    adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '1')
    adb('shell', 'settings', 'put', 'global', 'animator_duration_scale', '1')
    adb('shell', 'settings', 'put', 'secure', 'immersive_mode_confirmations', 'confirmed')
    adb('shell', 'settings', 'put', 'system', 'time_12_24', '24')
    adb('shell', 'cmd', 'overlay', 'enable', 'com.android.internal.systemui.navbar.gestural')
    adb('shell', 'wm', 'size', '1920x1080')
    adb('shell', 'wm', 'density', '320')
    adb('forward', 'tcp:9978', 'tcp:9978')
    launch(); time.sleep(14)
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
