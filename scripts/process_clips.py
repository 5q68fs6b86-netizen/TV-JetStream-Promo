#!/usr/bin/env python3
"""Turn raw emulator recordings into 60 fps promo clips.

The capture stretched every UI animation S x (animator scale) and spaced key presses S x,
so speeding the footage up S x restores real-time motion while multiplying the effective
frame rate; motion-compensated interpolation then fills it to 60 fps.

    python3 process_clips.py <capture_out_dir> <public_dir>
"""
import json, os, subprocess, sys

SRC, PUB = sys.argv[1], sys.argv[2]
os.makedirs(f'{PUB}/clips', exist_ok=True)

# name -> stretch factor used when it was recorded (1 = real time)
CLIPS = {
    'home': 4, 'detail': 4, 'tab-calendar': 4, 'tab-library': 4, 'tab-search': 4, 'tab-mine': 4,
    'player-osd': 4, 'player-live': 1, 'live': 1, 'library': 4, 'vod-detail': 4, 'themes': 4,
}


def run(cmd):
    print('+', ' '.join(cmd[:8]), '...', flush=True)
    subprocess.run(cmd, check=True)


def frames(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'frame=pts_time',
                                   '-of', 'csv=p=0', path]).decode().split()
    return [float(x) for x in out if x]


meta = {}
for name, s in CLIPS.items():
    src = f'{SRC}/rec/{name}.mp4'
    if not os.path.exists(src):
        print('skip', name); continue
    t = frames(src)
    dur = (t[-1] if t else 0) / s
    eff = len(t) / max(0.1, t[-1] if t else 1) * s
    out = f'{PUB}/clips/{name}.mp4'
    vf = [f'setpts=(PTS-STARTPTS)/{s}', 'fps=60' if eff >= 40 else
          'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=8',
          'scale=1920:1080:flags=lanczos', 'format=yuv420p']
    run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-an', '-vf', ','.join(vf), '-c:v', 'libx264', '-preset', 'medium',
         '-crf', '14', '-g', '30', '-movflags', '+faststart', out])
    marks = []
    mf = f'{SRC}/rec/{name}.marks.txt'
    if os.path.exists(mf):
        for line in open(mf):
            a, b = line.rstrip('\n').split('\t')
            marks.append({'t': round(float(a) / s, 3), 'label': b})
    meta[name] = {'stretch': s, 'duration': round(dur, 3), 'source_fps': round(eff, 1), 'marks': marks,
                  'frames60': int(dur * 60)}
    print(name, meta[name]['duration'], 's, effective', meta[name]['source_fps'], 'fps')
json.dump(meta, open(f'{PUB}/clips/clips.json', 'w'), indent=1, ensure_ascii=False)
