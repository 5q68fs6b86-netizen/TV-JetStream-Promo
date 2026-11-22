#!/usr/bin/env python3
"""Turn raw emulator recordings into 60 fps promo clips — WITHOUT motion interpolation.

The capture stretched every UI animation S x (animator scale) and every wait S x, so
speeding the footage up S x restores real-time motion. `fps=60` then only selects or
repeats captured frames: every output frame is a real frame from the device.

    python3 process_clips.py <capture_out_dir> <public_dir>
"""
import json, os, subprocess, sys

SRC, PUB = sys.argv[1], sys.argv[2]
os.makedirs(f'{PUB}/clips', exist_ok=True)
STRETCH = int(open(f'{SRC}/rec/stretch.txt').read().strip()) if os.path.exists(f'{SRC}/rec/stretch.txt') else 4
ONLY = [x for x in os.environ.get('CLIP_FILTER', '').split('+') if x]


def frames(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'frame=pts_time',
                                   '-of', 'csv=p=0', path]).decode().split()
    return [float(x) for x in out if x]


meta = {}
for fn in sorted(os.listdir(f'{SRC}/rec')):
    if not fn.endswith('.mp4'):
        continue
    name = fn[:-4]
    if ONLY and name not in ONLY:
        continue
    src = f'{SRC}/rec/{fn}'
    t = frames(src)
    if len(t) < 5:
        print('skip (empty)', name); continue
    s = STRETCH
    # motion frame rate: frames per second while the screen is changing (gaps < 0.5 s)
    gaps = [b - a for a, b in zip(t, t[1:])]
    moving = [g for g in gaps if g < 0.5]
    motion_fps = (len(moving) / sum(moving) * s) if moving else 0
    out = f'{PUB}/clips/{name}.mp4'
    vf = f'setpts=(PTS-STARTPTS)/{s},fps=60:round=near,scale=1920:1080:flags=lanczos,format=yuv420p'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'medium',
                    '-crf', '13', '-g', '30', '-movflags', '+faststart', out], check=True)
    marks = []
    mf = f'{SRC}/rec/{name}.marks.txt'
    if os.path.exists(mf):
        for line in open(mf):
            a, b = line.rstrip('\n').split('\t')
            marks.append({'t': round(float(a) / s, 3), 'label': b})
    meta[name] = {'stretch': s, 'duration': round(t[-1] / s, 3), 'motion_fps': round(motion_fps, 1), 'marks': marks}
    print(f'{name}: {meta[name]["duration"]} s, motion {meta[name]["motion_fps"]} fps (stretch {s}, no interpolation)')
json.dump(meta, open(f'{PUB}/clips/clips.json', 'w'), indent=1, ensure_ascii=False)
