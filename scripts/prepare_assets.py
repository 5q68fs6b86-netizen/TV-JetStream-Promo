"""Collect UI captures into public/ and build derived assets.

Fresh captures come from the TV repo's own GitHub Actions emulator runs on the latest
app code (artifacts tv-ui-verification-44888706278 and ...-calendar-api-34, 2026-11-21).
A few full-screen player / live / theme captures come from docs/ in the TV repo.
"""
import os, shutil, sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

TV = os.environ.get('TV_DIR', '/workspace/tv')
FRESH = os.environ.get('FRESH_DIR', '/workspace/fresh')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
D = os.path.join(TV, 'docs')
EV = f'{FRESH}/a14701302419/artifacts/compact-home/native-usability-evidence'
CAL = f'{FRESH}/a14700687377/artifacts/airing-calendar/ui-api-34/native-usability-evidence'
UP = f'{FRESH}/a14701302419/artifacts/upstream-features/spider-dialog-verification'

shots = {
    # fresh (latest code, GHA emulator)
    'home': f'{EV}/curated-home-domestic.png',
    'home-continue': f'{EV}/home-touch-7e2c6755.png',
    'cards': f'{EV}/library-home-section-cards-dark.png',
    'cards-light': f'{EV}/library-home-section-cards-light.png',
    'discover': f'{EV}/compact-home-empty.png',
    'modes': f'{EV}/mode-dark-library.png',
    'modes-light': f'{EV}/mode-light-library.png',
    'calendar': f'{CAL}/calendar-full-background-dark.png',
    'follow': f'{CAL}/library-follow-no-source.png',
    'login': f'{UP}/java-login-form.png',
    # docs captures (full-screen player / live / themes)
    'player': f'{D}/ui-redesign/visual-rework/evidence/player-drawer-r2f.png',
    'vod': f'{D}/ui-redesign/evidence/vod-theme-preserved.png',
    'live': f'{D}/ui-redesign/visual-rework/evidence/live-r2h.png',
    'search': f'{D}/ui-redesign/evidence/search-after.png',
}
for i in range(7):
    shots[f'theme-{i}'] = f'{D}/ui-redesign/visual-rework/evidence/theme-{i}.png'

os.makedirs(f'{OUT}/shots', exist_ok=True)
os.makedirs(f'{OUT}/plates', exist_ok=True)
for k, v in shots.items():
    im = Image.open(v).convert('RGB')
    assert im.size == (1920, 1080), (v, im.size)
    im.save(f'{OUT}/shots/{k}.png', optimize=True)
    # soft ambient plate (blurred at low res, displayed full-frame)
    p = im.resize((320, 180), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10))
    ImageEnhance.Brightness(p).enhance(0.8).save(f'{OUT}/plates/{k}.jpg', quality=90)

os.makedirs(f'{OUT}/fonts', exist_ok=True)
for f in ('misans_regular.ttf', 'misans_medium.ttf', 'misans_semibold.ttf'):
    shutil.copy(os.path.join(TV, 'app/src/leanback/res/font', f), f'{OUT}/fonts/{f}')

rng = np.random.default_rng(3)
g = rng.normal(128, 40, (1200, 2100)).clip(0, 255).astype(np.uint8)
Image.fromarray(g, 'L').save(f'{OUT}/grain.png', optimize=True)
print('assets ok', len(shots))
