"""Join the unchanged 36-second construction and 26-second solar/storage cycle."""
import argparse, subprocess, json
from pathlib import Path
from PIL import Image
import imageio_ffmpeg

parser=argparse.ArgumentParser()
parser.add_argument('--construction',type=Path,required=True)
parser.add_argument('--day',type=Path,required=True)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
for directory,count in [(args.construction,864),(args.day,312)]:
    for f in range(1,count+1):
        with Image.open(directory/f'{f:04}.png') as img:
            if img.size!=(1920,1080):raise ValueError((f,img.size))
            img.verify()
# Slow sun, light and camera motion is rendered at 12 fps, then interpolated to
# 24 fps. Construction remains at its original 24 fps. Reset only after night.
graph=(
    '[0:v]trim=end_frame=864,setpts=PTS-STARTPTS,format=rgba[build];'
    '[1:v]tpad=start_mode=clone:start_duration=0.083333333,minterpolate=fps=24:mi_mode=blend,setpts=PTS-STARTPTS,'
    'tpad=stop_mode=clone:stop_duration=0.2,trim=duration=26,setpts=PTS-STARTPTS,format=rgba[day];'
    '[build][day]concat=n=2:v=1:a=0,fps=24,tpad=stop_mode=clone:stop_duration=0.25,'
    'trim=end_frame=1488,settb=expr=1/24,setpts=N[sequence];'
    '[2:v]format=rgba,fade=t=in:st=60:d=1.7:alpha=1[reset];'
    '[sequence][reset]overlay=shortest=1:format=auto,format=yuv420p,split=2[hd][lo];'
    '[lo]scale=960:540:flags=lanczos[mobile]')
cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-y','-filter_complex_threads','4',
     '-framerate','24','-start_number','1','-i',str(args.construction/'%04d.png'),
     '-framerate','12','-start_number','1','-i',str(args.day/'%04d.png'),
     '-loop','1','-framerate','24','-i',str(args.construction/'0001.png'),'-filter_complex',graph]
for label,quality,crf,threads in [('hd','1080','23','4'),('mobile','540','24','2')]:
    cmd+=['-map',f'[{label}]','-frames:v','1488','-r','24','-fps_mode','cfr','-an','-c:v','libx264','-preset','medium',
          '-crf',crf,'-threads',threads,'-pix_fmt','yuv420p','-movflags','+faststart',
          '-metadata','title=SC Energy - From sunlight to stored energy',
          str(args.out/f'energy-construction-{quality}.mp4')]
with (args.day.parent/'day-encode.log').open('w',encoding='utf-8') as log:
    subprocess.run(cmd,check=True,stdout=log,stderr=log)
print(json.dumps({p.name:p.stat().st_size for p in args.out.glob('energy-construction-*.mp4')},indent=2))
