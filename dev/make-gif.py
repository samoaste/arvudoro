"""Render dev/frames.html in headless Chrome and slice it into docs/demo.gif.
Needs the dev server: python3 -m http.server 8765 (from the project root)."""
import subprocess, sys, tempfile, os
from PIL import Image

IDS = 'squat-press,gorilla-row,burpee,rope-bounce'
N, DT, ROW_H, W = 60, 100, 260, 960
out = tempfile.mktemp(suffix='.png')
subprocess.run(['google-chrome', '--headless=new', '--disable-gpu', '--hide-scrollbars',
                f'--window-size={W},{N * ROW_H}', '--virtual-time-budget=4000',
                f'--screenshot={out}',
                f'http://localhost:8765/dev/frames.html?ids={IDS}&n={N}&dt={DT}'],
               check=True, stderr=subprocess.DEVNULL)
sheet = Image.open(out).convert('RGB')
frames = [sheet.crop((0, i * ROW_H, W, (i + 1) * ROW_H)) for i in range(N)]
pal = frames[0].quantize(colors=64)
frames = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
dest = sys.argv[1] if len(sys.argv) > 1 else 'docs/demo.gif'
frames[0].save(dest, save_all=True, append_images=frames[1:], duration=DT, loop=0, optimize=True)
os.remove(out)
print(dest, os.path.getsize(dest) // 1024, 'KB')
