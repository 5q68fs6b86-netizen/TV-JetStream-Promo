"""Original synthesized score for the promo: 120 BPM, 32 bars = 64.0 s, 48 kHz stereo.
Structure follows the edit: impacts on bars 4, 8, 14, 22, 29 (= frames 480, 960, 1680, 2640, 3480 @60fps).
Pure numpy additive synthesis, no samples."""
import numpy as np, wave, os

rng = np.random.default_rng(7)
SR = 48000
BPM = 120.0
BEAT = 60 / BPM
BAR = 4 * BEAT
NB = 32
DUR = NB * BAR
N = int(round(DUR * SR))

def tt(d):
    return np.arange(int(d * SR)) / SR

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

def place(buf, t0, sig, gain=1.0):
    i = int(round(t0 * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(N, i + len(sig))
    buf[i:j] += gain * sig[: j - i]

# Am - F - C - G   (pad voicing, bass root)
CH = [([57, 60, 64, 69, 72], 45), ([53, 57, 60, 65, 69], 41), ([55, 60, 64, 67, 72], 48), ([55, 59, 62, 67, 71], 43)]

def chord(bar):
    if bar == 30:
        return CH[3]
    if bar == 31:
        return CH[0]
    return CH[bar % 4]

def sec(bar):
    if bar < 4: return 'intro'
    if bar < 8: return 'hero'
    if bar < 14: return 'full'
    if bar < 20: return 'peak'
    if bar < 22: return 'break'
    if bar < 29: return 'full2'
    return 'outro'

z = lambda: np.zeros(N)
padL, padR, arpL, arpR, bass, drum, clapB, hat, fxL, fxR = (z() for _ in range(10))

# ---------------- pad ----------------
def saw_add(f, t, K, bright, phase):
    s = np.zeros_like(t)
    for k in range(1, K + 1):
        if f * k > 15000:
            break
        s += np.sin(2 * np.pi * f * k * t + phase * k) / k * np.exp(-(k - 1) / bright)
    return s

for bar in range(NB):
    notes, _ = chord(bar)
    S = sec(bar)
    bright = {'intro': 1.0 + bar * 0.45, 'hero': 2.4, 'full': 3.0, 'peak': 4.2, 'break': 1.5, 'full2': 3.3, 'outro': 2.6}[S]
    g = {'intro': 0.55 + bar * 0.12, 'hero': 0.85, 'full': 0.7, 'peak': 0.72, 'break': 0.95, 'full2': 0.7, 'outro': 1.0}[S]
    d = BAR + (4.0 if bar == 31 else 0.8)
    t = tt(d)
    env = np.minimum(1, t / 0.35) * np.clip((d - t) / 0.8, 0, 1)
    sl = np.zeros_like(t); sr = np.zeros_like(t)
    for m in notes:
        f = mtof(m)
        for dc, pan in ((-0.08, 0.15), (0.0, 0.5), (0.08, 0.85)):
            v = saw_add(f * 2 ** (dc / 12), t, 12, bright, rng.uniform(0, 6.283))
            sl += v * (1 - pan); sr += v * pan
    place(padL, bar * BAR, sl * env * g)
    place(padR, bar * BAR, sr * env * g)

# ---------------- arp ----------------
_pc = {}
def pluck(f, decay):
    key = (round(f, 3), decay)
    if key not in _pc:
        t = tt(0.6)
        s = np.zeros_like(t)
        for k in range(1, 8):
            s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * decay * (0.4 + 0.25 * k))
        _pc[key] = s * np.exp(-t * decay) * np.minimum(1, t / 0.003)
    return _pc[key]

pattern = [0, 2, 4, 2, 1, 3, 4, 3]
for bar in range(2, NB):
    S = sec(bar)
    notes, _ = chord(bar)
    gain = {'intro': 0.35 + 0.2 * (bar - 2), 'hero': 0.6, 'full': 0.8, 'peak': 1.0, 'break': 0.9, 'full2': 0.85, 'outro': 0.6}[S]
    step = BEAT / 4 if S in ('full', 'peak', 'full2', 'break') else BEAT / 2
    n = int(round(BAR / step))
    for i in range(n):
        if bar == 31 and i > 3:
            break
        m = notes[pattern[i % 8]] + 12
        sig = pluck(mtof(m), 5.5 if S in ('break', 'outro', 'intro') else 8.0)
        pan = 0.25 if i % 2 == 0 else 0.75
        acc = 1.0 if i % 4 == 0 else 0.72
        place(arpL, bar * BAR + i * step, sig * gain * acc * (1 - pan) * 2)
        place(arpR, bar * BAR + i * step, sig * gain * acc * pan * 2)

# ---------------- bass ----------------
def bassnote(f, d):
    t = tt(d)
    s = np.zeros_like(t)
    for k in range(1, 7):
        s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-(k - 1) / 2.0)
    s += 0.9 * np.sin(2 * np.pi * f / 2 * t)
    env = np.minimum(1, t / 0.006) * np.clip((d - t) / 0.03, 0, 1) * (0.65 + 0.35 * np.exp(-t * 6))
    return s * env

for bar in range(NB):
    S = sec(bar)
    _, root = chord(bar)
    f = mtof(root)
    if S == 'intro' and bar < 2:
        continue
    if S in ('intro', 'hero', 'break', 'outro'):
        if bar == 31:
            place(bass, bar * BAR, bassnote(f, BAR + 3.5) * np.exp(-tt(BAR + 3.5) * 0.6), 0.9)
        else:
            place(bass, bar * BAR, bassnote(f, BAR * 0.98), 0.55 if S == 'intro' else 0.85)
    else:
        for i in range(8):
            m = root + (12 if i % 2 == 1 else 0)
            place(bass, bar * BAR + i * BEAT / 2, bassnote(mtof(m), BEAT / 2 * 0.9))

# ---------------- drums ----------------
def kick():
    t = tt(0.5)
    f = 46 + 110 * np.exp(-t * 26)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return np.sin(ph) * np.exp(-t * 6.5) * np.minimum(1, t / 0.0015) + click

def hp_noise(d, decay):
    t = tt(d)
    n = rng.standard_normal(len(t))
    sm = np.convolve(n, np.ones(5) / 5, 'same')
    return (n - sm) * np.exp(-t * decay)

def clap():
    t = tt(0.4)
    n = rng.standard_normal(len(t))
    bp = np.convolve(n, np.ones(3) / 3, 'same') - np.convolve(n, np.ones(22) / 22, 'same')
    env = np.zeros_like(t)
    for o, dk in ((0, 90), (0.010, 90), (0.021, 13)):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) * dk)
    return bp * env

K, HAT, HAT2, CLAP = kick(), hp_noise(0.06, 55), hp_noise(0.04, 90), clap()
kick_times = []
for bar in range(NB):
    S = sec(bar); b0 = bar * BAR
    ks = [0, 2] if S == 'hero' else ([0, 1, 2, 3] if S in ('full', 'peak', 'full2') else [])
    for k in ks:
        place(drum, b0 + k * BEAT, K)
        kick_times.append(b0 + k * BEAT)
    if S in ('full', 'peak', 'full2'):
        for k in (1, 3):
            place(clapB, b0 + k * BEAT, CLAP)
        for k in range(4):
            place(hat, b0 + k * BEAT + BEAT / 2, HAT)
        if S == 'peak':
            for k in range(16):
                if k % 2 == 1:
                    place(hat, b0 + k * BEAT / 4, HAT2, 0.45)
    if S == 'hero' and bar >= 6:
        for k in range(4):
            place(hat, b0 + k * BEAT + BEAT / 2, HAT, 0.6)
    if bar in (13, 28):  # build-up rolls into the next impact
        for i in range(16):
            place(clapB, b0 + 2 * BEAT + i * (2 * BEAT / 16), CLAP, 0.25 + 0.75 * i / 15)

# sidechain envelope
sc = np.ones(N)
for kt in kick_times:
    i = int(kt * SR); t = tt(0.4)
    d = 1 - 0.6 * np.exp(-t / 0.09)
    j = min(N, i + len(t))
    sc[i:j] = np.minimum(sc[i:j], d[: j - i])

# ---------------- fx: risers + impacts ----------------
def riser(d):
    t = tt(d); a = t / d
    n = rng.standard_normal(len(t))
    sm = np.convolve(n, np.ones(32) / 32, 'same')
    hi = n - np.convolve(n, np.ones(4) / 4, 'same')
    s = (sm * (1 - a) * 3 + hi * a) * a ** 2
    f = 180 * 2 ** (a * 4.2)
    s += 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * a ** 3
    return s

def impact():
    t = tt(3.5)
    f = 28 + 75 * np.exp(-t * 5)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    n = rng.standard_normal(len(t))
    sm = np.convolve(n, np.ones(14) / 14, 'same')
    return boom * 1.0 + sm * np.exp(-t * 2.6) * 0.9

IMP = impact()
for b in (4, 8, 14, 22, 29):
    r = riser(4.0 if b != 14 else 2.0)
    place(fxL, b * BAR - len(r) / SR, r * 0.9); place(fxR, b * BAR - len(r) / SR, r * 0.9)
    place(fxL, b * BAR, IMP); place(fxR, b * BAR, IMP)

# ---------------- mix ----------------
def rms_db(x):
    a = x[np.abs(x) > 1e-5]
    return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12) if len(a) else -120

def to_db(x, target):
    return x * 10 ** ((target - rms_db(x)) / 20)

def reverb(x, seed, dur=3.0, decay=1.1):
    t = tt(dur)
    r = np.random.default_rng(seed).standard_normal(len(t)) * np.exp(-t * 6.9 / (decay * 2.5))
    r[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    r = np.convolve(r, np.ones(10) / 10, 'same')
    n = len(x) + len(r) - 1
    nf = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(r, nf), nf)[: len(x)]
    return y / np.sqrt(np.sum(r ** 2))

# normalise stereo pairs with one common gain
def pair(l, r, target):
    g = 10 ** ((target - rms_db((l + r) / 2)) / 20)
    return l * g, r * g

padL, padR = pair(padL, padR, -21.0)
arpL, arpR = pair(arpL, arpR, -25.0)
fxL, fxR = pair(fxL, fxR, -24.0)
bass = to_db(bass, -20.5)
drum = to_db(drum, -17.5)
clapB = to_db(clapB, -27.0)
hat = to_db(hat, -31.0)

padL *= sc; padR *= sc; bass *= sc
sendL = padL * 0.45 + arpL * 0.55 + clapB * 0.25 + fxL * 0.35
sendR = padR * 0.45 + arpR * 0.55 + clapB * 0.25 + fxR * 0.35
revL = reverb(sendL, 11); revR = reverb(sendR, 12)

L = padL + arpL + bass + drum + clapB + hat * 0.9 + fxL + revL * 0.32
R = padR + arpR + bass + drum + clapB + hat * 1.1 + fxR + revR * 0.32

mix = np.stack([L, R], 1)
mix -= mix.mean(0)
mix *= 10 ** ((-13.5 - rms_db(mix.mean(1))) / 20)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.89 / np.max(np.abs(mix))
fade_in = np.minimum(1, np.arange(N) / (0.05 * SR))
tail = np.clip((DUR - np.arange(N) / SR) / 3.0, 0, 1) ** 1.6
mix *= (fade_in * tail)[:, None]

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'music.wav')
pcm = np.clip(mix * 32767 + rng.uniform(-0.5, 0.5, mix.shape), -32768, 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('music ok', N / SR, 's  rms(dB)=', round(rms_db(mix.mean(1)), 1), ' peak=', round(float(np.max(np.abs(mix))), 3))
for name, b in (('pad', padL), ('arp', arpL), ('bass', bass), ('kick', drum), ('clap', clapB), ('hat', hat), ('fx', fxL)):
    print(f'  {name:5s} {rms_db(b):6.1f} dB')
