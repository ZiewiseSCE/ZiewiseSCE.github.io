"""Encode the 38-second Cycles sequence as a seamless, silent web film."""
import argparse, json, shutil, subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--frames', type=Path, default=ROOT / 'frames')
parser.add_argument('--out', type=Path, default=ROOT.parent.parent / 'resources/media/green-vision')
parser.add_argument('--ffmpeg', default=shutil.which('ffmpeg'))
args = parser.parse_args()
if not args.ffmpeg:
    import imageio_ffmpeg
    args.ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
args.out.mkdir(parents=True, exist_ok=True)

# Check completeness before producing anything used by the website.
for frame in range(1, 913):
    with Image.open(args.frames / f'{frame:04}.png') as img:
        if img.size != (1920, 1080):
            raise ValueError(f'Unexpected frame size: {frame}, {img.size}')
        img.verify()

# Fade the fully grown scene back to the empty starting landscape. The last
# frame is the first frame, so the native video loop has no abrupt cut.
graph = ('[1:v]format=rgba,fade=t=in:st=36:d=1.958333333:alpha=1[reset];'
         '[0:v][reset]overlay=shortest=1:format=auto,format=yuv420p,split=2[hd][lo];'
         '[lo]scale=960:540:flags=lanczos[mobile]')
cmd = [args.ffmpeg, '-hide_banner', '-y', '-filter_complex_threads', '2',
       '-framerate', '24', '-start_number', '1', '-i', str(args.frames / '%04d.png'),
       '-loop', '1', '-framerate', '24', '-i', str(args.frames / '0001.png'),
       '-filter_complex', graph]
for label, quality, crf, threads in [('hd', '1080', '23', '4'), ('mobile', '540', '24', '2')]:
    cmd += ['-map', f'[{label}]', '-t', '38', '-an', '-c:v', 'libx264',
            '-preset', 'medium', '-crf', crf, '-threads', threads,
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            '-metadata', 'title=SC Energy - Energy in harmony',
            str(args.out / f'energy-construction-{quality}.mp4')]
with (ROOT / 'encode.log').open('w', encoding='utf-8') as log:
    subprocess.run(cmd, check=True, stdout=log, stderr=log)
for frame, name in [(1, 'start'), (865, 'complete')]:
    with Image.open(args.frames / f'{frame:04}.png') as img:
        img.save(args.out / f'energy-{name}.webp', quality=88, method=6)
print(json.dumps({p.name: p.stat().st_size for p in args.out.glob('energy-*')}, indent=2))
