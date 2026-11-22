"""Original score, Apple-keynote style: felt piano + tight groove + sub, 120 BPM, 32 bars = 64 s, 48 kHz stereo.

Map (bar = 2 s = 120 frames @ 60 fps)
  0-3   intro      : solo piano, sub swell, riser          -> drop at 8 s
  4-13  groove     : kick / snap / hats / sub / piano stabs / pulses
  14-17 breakdown  : pad + sustained piano (cinema section)
  18-19 build      : half-time kick, hats, riser          -> 40 s
  20-26 full       : groove + bell hook, 16th hats from bar 24 (montage)
  27    statement  : piano chord, hard stop at 55.5 s (silence)
  28-31 end        : impact + big Dmaj9, ringing tail, fade
Pure numpy additive / FM synthesis. No samples.
"""
import numpy as np, wave, os

SR = 48000
BPM = 120.0
BEAT = 60 / BPM
BAR = 4 * BEAT
NB = 32
DUR = NB * BAR
N = int(DUR * SR)
rng = np.random.default_rng(11)


def T(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, t0, sig, g=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(len(buf), i + len(sig))
    buf[i:j] += g * sig[: j - i]


def lp(x, k):
    """cheap one-pole lowpass via cumulative (k in 0..1, smaller = darker)"""
    y = np.empty_like(x); a = 0.0
    # vectorised approximation with FFT
    n = len(x); nf = 1 << (n - 1).bit_length()
    f = np.fft.rfftfreq(nf, 1 / SR)
    H = 1 / (1 + 1j * f / k)
    return np.fft.irfft(np.fft.rfft(x, nf) * H, nf)[:n]


# ---------------------------------------------------------------- instruments
_pc = {}


def piano(m, vel=0.8, dur=3.5):
    key = (m, round(vel, 2), round(dur, 2))
    if key in _pc:
        return _pc[key]
    f = mtof(m)
    t = T(dur)
    s = np.zeros_like(t)
    B = 0.00035
    for k in range(1, 13):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 16000:
            break
        amp = (1 / k ** 1.15) * (0.55 + 0.45 * vel) ** (k * 0.35)
        dec = 0.55 + 0.38 * k + f / 700
        s += amp * np.sin(2 * np.pi * fk * t + k * 0.7) * np.exp(-t * dec)
    # two-stage decay (felt piano) + hammer
    s *= 0.65 * np.exp(-t * 1.6) + 0.35 * np.exp(-t * 0.35)
    ham = rng.standard_normal(len(t)) * np.exp(-t * 180) * 0.06
    s = s + lp(ham, 2500)
    s *= np.minimum(1, t / 0.0025)
    rel = np.clip((dur - t) / 0.25, 0, 1)
    s *= rel * vel
    _pc[key] = s
    return s


def pad(notes, dur, bright=1.0):
    t = T(dur)
    s = np.zeros_like(t)
    for m in notes:
        f = mtof(m)
        for det in (-0.07, 0.0, 0.07):
            ff = f * 2 ** (det / 12)
            for k in range(1, 8):
                s += np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6.28)) / k * np.exp(-(k - 1) / (1.2 * bright))
    env = np.minimum(1, t / 1.2) * np.clip((dur - t) / 1.0, 0, 1)
    return s * env / len(notes)


def sub(f, dur, punch=True):
    t = T(dur)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.004) * np.clip((dur - t) / 0.03, 0, 1)
    if punch:
        env *= 0.75 + 0.25 * np.exp(-t * 8)
    return s * env


def kick(g=1.0):
    t = T(0.42)
    f = 44 + 115 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s += lp(rng.standard_normal(len(t)) * np.exp(-t * 500), 6000) * 0.35
    return np.tanh(1.6 * s) * g


def snap():
    t = T(0.25)
    n = rng.standard_normal(len(t))
    body = lp(n, 5200) - lp(n, 1300)
    env = np.exp(-t * 38) + 0.6 * ((t > 0.008) * np.exp(-np.clip(t - 0.008, 0, None) * 60))
    return body * env


def hat(open_=False):
    t = T(0.3 if open_ else 0.07)
    n = rng.standard_normal(len(t))
    hp = n - lp(n, 7000)
    return hp * np.exp(-t * (14 if open_ else 70))


def pulse(m, dur=0.16):
    f = mtof(m)
    t = T(dur)
    s = np.zeros_like(t)
    for k in (1, 3, 5, 7):
        s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (18 + 6 * k))
    return s * np.minimum(1, t / 0.002)


def bell(m, dur=2.2):
    f = mtof(m)
    t = T(dur)
    I = 2.2 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 1.8)
    return s * np.minimum(1, t / 0.003)


def riser(d, lo=200, hi=5000):
    t = T(d); a = t / d
    n = rng.standard_normal(len(t))
    s = (lp(n, 900) * (1 - a) + lp(n - lp(n, 2500), 7000) * a * 0.6) * a ** 2.2
    f = lo * (hi / lo) ** a
    s += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * a ** 3
    return s


def impact():
    t = T(4.5)
    f = 30 + 70 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 0.9)
    n = rng.standard_normal(len(t))
    return boom + lp(n, 1500) * np.exp(-t * 2.2) * 0.5


# ---------------------------------------------------------------- harmony (D major)
CH = [  # (bass midi, voicing)
    (38, [66, 69, 73, 76]),  # Dmaj9
    (47, [62, 66, 69, 73]),  # Bm9
    (43, [59, 62, 66, 69]),  # Gmaj9
    (45, [62, 64, 69, 71]),  # A sus add6
]


def chord(bar):
    return CH[bar % 4]


def sec(b):
    if b < 4: return 'intro'
    if b < 14: return 'groove'
    if b < 18: return 'break'
    if b < 20: return 'build'
    if b < 27: return 'full'
    if b < 28: return 'state'
    return 'end'


Z = lambda: np.zeros(N)
pnL, pnR, padB, subB, kickB, snapB, hatB, plsL, plsR, belB, fxB = (Z() for _ in range(11))


def pn(t0, m, vel, dur=3.2):
    s = piano(m, vel, dur)
    pan = 0.5 + (m - 64) / 60
    place(pnL, t0, s * (1 - pan) * 1.2)
    place(pnR, t0, s * pan * 1.2)


for b in range(NB):
    S = sec(b); t0 = b * BAR
    bass, v = chord(b)
    if S == 'intro':
        pn(t0, bass + 12, 0.55, 4.0)
        for i, m in enumerate(v):
            pn(t0 + 0.012 * i, m, 0.5, 4.0)
        pn(t0 + 2.5 * BEAT, v[-1] + 12, 0.35, 2.5)
        if b >= 2:
            pn(t0 + 3 * BEAT, v[1] + 12, 0.32, 2.0)
            pn(t0 + 3.5 * BEAT, v[2] + 12, 0.3, 2.0)
    elif S in ('groove', 'full', 'build'):
        hits = [0, 1.5, 2.5, 3.5] if S != 'build' else [0, 2]
        for h in hits:
            vel = 0.62 if h == 0 else 0.48
            for i, m in enumerate(v):
                pn(t0 + h * BEAT + 0.006 * i, m, vel, 0.9 if h else 1.6)
        if h and S == 'full':
            pn(t0 + 3.75 * BEAT, v[-1] + 12, 0.35, 0.8)
    elif S == 'break':
        pn(t0, bass + 12, 0.5, 4.2)
        for i, m in enumerate(v):
            pn(t0 + 0.03 * i, m, 0.45, 4.2)
        pn(t0 + 2 * BEAT, v[-1] + 12, 0.3, 3.0)
    elif S == 'state':
        pn(t0, bass + 12, 0.6, 3.0)
        for i, m in enumerate(v):
            pn(t0 + 0.01 * i, m, 0.55, 3.0)
    elif S == 'end' and b == 28:
        for m in [26, 38, 50] + [66, 69, 73, 76, 81]:
            pn(t0 + 0.004 * (m % 5), m, 0.85, 7.5)

    # pad
    if S in ('break', 'build', 'full', 'end', 'intro'):
        g = {'intro': 0.35, 'break': 1.0, 'build': 0.8, 'full': 0.55, 'end': 0.9}[S]
        if S != 'end' or b == 28:
            place(padB, t0, pad(v + [bass + 12], BAR + 1.0 if S != 'end' else 8.0, 1.4 if S == 'full' else 0.9), g)

    # sub bass
    f = mtof(bass)
    if S == 'groove' or S == 'full':
        for i in range(8):
            if i in (0, 3, 4, 6):
                place(subB, t0 + i * BEAT / 2, sub(f * (2 if i == 6 else 1), BEAT / 2 * 0.9))
    elif S in ('break', 'build'):
        place(subB, t0, sub(f, BAR, punch=False), 0.6)
    elif S == 'intro' and b >= 2:
        place(subB, t0, sub(f, BAR, punch=False) * np.linspace(0, 1, int(BAR * SR)), 0.5)
    elif S == 'end' and b == 28:
        place(subB, t0, sub(mtof(26), 6.0, punch=False) * np.exp(-T(6.0) * 0.5), 1.0)

    # drums
    if S in ('groove', 'full'):
        for k in (0, 2):
            place(kickB, t0 + k * BEAT, kick())
        place(kickB, t0 + 2.75 * BEAT, kick(0.7))
        for k in (1, 3):
            place(snapB, t0 + k * BEAT, snap())
        steps = 16 if (S == 'full' and b >= 24) else 8
        for i in range(steps):
            st = BAR / steps
            acc = 1.0 if (i * 8 // steps) % 2 == 1 else 0.55
            place(hatB, t0 + i * st, hat(), acc)
        place(hatB, t0 + 3.5 * BEAT, hat(True), 0.5)
    elif S == 'build':
        for k in range(4):
            place(kickB, t0 + k * BEAT, kick(0.55 + 0.1 * (b - 18)))
        for i in range(8 if b == 18 else 16):
            place(hatB, t0 + i * BAR / (8 if b == 18 else 16), hat(), 0.5)
        if b == 19:
            for i in range(8):
                place(snapB, t0 + 2 * BEAT + i * BEAT / 4, snap(), 0.2 + 0.8 * i / 7)

    # pulses (8th staccato)
    if S in ('groove', 'full'):
        for i in range(8):
            m = v[(i * 2) % 4] + 12
            sg = pulse(m)
            pan = 0.3 if i % 2 else 0.7
            place(plsL, t0 + i * BEAT / 2, sg * (1 - pan))
            place(plsR, t0 + i * BEAT / 2, sg * pan)

    # bell hook
    if S == 'full':
        hook = [(0, 78), (0.75, 76), (1.5, 73), (2.5, 76), (3.0, 81)] if b % 2 == 0 else [(0, 78), (1.0, 81), (1.5, 78), (2.5, 76)]
        for (bt, m) in hook:
            place(belB, t0 + bt * BEAT, bell(m))

# fx: risers into the drops, impact on the end hit
for b, d in ((4, 4.0), (20, 4.0), (14, 2.0)):
    r = riser(d)
    place(fxB, b * BAR - d, r, 0.8 if b != 14 else 0.4)
place(fxB, 4 * BAR, impact(), 0.55)
place(fxB, 20 * BAR, impact(), 0.45)
place(fxB, 28 * BAR, impact(), 1.0)


# ---------------------------------------------------------------- mix
def rms(x):
    a = x[np.abs(x) > 1e-6]
    return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12) if len(a) else -120


def to(x, db):
    return x * 10 ** ((db - rms(x)) / 20)


def pair(l, r, db):
    g = 10 ** ((db - rms((l + r) / 2)) / 20)
    return l * g, r * g


def reverb(x, seed, dur=2.6, rt=1.6):
    t = T(dur)
    ir = np.random.default_rng(seed).standard_normal(len(t)) * np.exp(-t * 6.9 / rt)
    ir = lp(ir, 6000)
    ir[: int(0.015 * SR)] = 0
    n = len(x) + len(ir) - 1; nf = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[: len(x)]
    return y / np.sqrt(np.sum(ir ** 2))


pnL, pnR = pair(pnL, pnR, -19)
padB = to(lp(padB, 2400), -27)
subB = to(lp(subB, 220), -20)
kickB = to(kickB, -18)
snapB = to(snapB, -25)
hatB = to(hatB, -36)
plsL, plsR = pair(lp(plsL, 3500), lp(plsR, 3500), -30)
belB = to(belB, -29)
fxB = to(lp(fxB, 7000), -28)

# sidechain from kick
sc = np.ones(N)
env = np.abs(kickB)
k = int(0.01 * SR)
env = np.convolve(env, np.ones(k) / k, 'same')
env /= env.max() + 1e-9
sc = 1 - 0.45 * np.clip(env * 3, 0, 1)
for x in (padB, subB, plsL, plsR):
    x *= sc

sendL = pnL * 0.35 + padB * 0.5 + snapB * 0.3 + plsL * 0.4 + belB * 0.6 + fxB * 0.3
sendR = pnR * 0.35 + padB * 0.5 + snapB * 0.3 + plsR * 0.4 + belB * 0.6 + fxB * 0.3
rvL, rvR = reverb(sendL, 3), reverb(sendR, 4)

L = pnL + padB + subB + kickB + snapB + hatB * 0.9 + plsL + belB * 0.9 + fxB + rvL * 0.28
R = pnR + padB + subB + kickB + snapB + hatB * 1.1 + plsR + belB * 1.1 + fxB + rvR * 0.28
mix = np.stack([L, R], 1)

# the stop: silence from 55.5 s until the 56 s hit
t = np.arange(N) / SR
gate = np.ones(N)
gate[(t > 55.42) & (t < 56.0)] = 0
ramp = (t > 55.3) & (t <= 55.42)
gate[ramp] = 1 - (t[ramp] - 55.3) / 0.12
mix *= gate[:, None]

mix -= mix.mean(0)
mix *= 10 ** ((-13.5 - rms(mix.mean(1))) / 20)
mix = np.tanh(mix * 1.05) / np.tanh(1.05)
mix *= 0.9 / np.max(np.abs(mix))
fade = np.clip((DUR - t) / 3.5, 0, 1) ** 1.5
mix *= np.minimum(1, t / 0.03)[:, None] * fade[:, None]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'music.wav')
pcm = np.clip(mix * 32767, -32768, 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('music', DUR, 's  rms', round(rms(mix.mean(1)), 1), 'dB')
