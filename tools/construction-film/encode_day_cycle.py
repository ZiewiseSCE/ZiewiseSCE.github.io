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
for directory,count in [(args.construction,864),(args.day,624)]:
    for f in range(1,count+1):
        with Image.open(directory/f'{f:04}.png') as img:
            if img.size!=(1920,1080):raise ValueError((f,img.size))
            img.verify()
# Every input frame is a native Cycles render at 24 fps. No duplication or
# blending is used to synthesize intermediate camera/sun positions.
graph=(
    '[0:v]trim=end_frame=864,settb=expr=1/24,setpts=N,format=rgba[build];'
    '[1:v]trim=end_frame=624,settb=expr=1/24,setpts=N,format=rgba[day];'
    '[build][day]concat=n=2:v=1:a=0,settb=expr=1/24,setpts=N[sequence];'
    '[2:v]format=rgba,fade=t=in:st=60:d=1.7:alpha=1[reset];'
    '[sequence][reset]overlay=shortest=1:format=auto,format=yuv420p,split=2[hd][lo];'
    '[lo]scale=960:540:flags=lanczos[mobile]')
cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-y','-filter_complex_threads','4',
     '-framerate','24','-start_number','1','-i',str(args.construction/'%04d.png'),
     '-framerate','24','-start_number','1','-i',str(args.day/'%04d.png'),
     '-loop','1','-framerate','24','-i',str(args.construction/'0001.png'),'-filter_complex',graph]
for label,quality,crf,threads,rate,buffer in [('hd','1080','23','4','6000k','12000k'),('mobile','540','24','2','1500k','3000k')]:
    cmd+=['-map',f'[{label}]','-frames:v','1488','-r','24','-fps_mode','cfr','-an','-c:v','libx264','-preset','medium',
          '-crf',crf,'-threads',threads,'-maxrate',rate,'-bufsize',buffer,
          '-g','48','-keyint_min','48','-sc_threshold','0','-bf','2','-refs','3',
          '-pix_fmt','yuv420p','-movflags','+faststart',
          '-metadata','title=SC Energy - From sunlight to stored energy',
          str(args.out/f'energy-construction-{quality}.mp4')]
with (args.day.parent/'day-encode.log').open('w',encoding='utf-8') as log:
    subprocess.run(cmd,check=True,stdout=log,stderr=log)
print(json.dumps({p.name:p.stat().st_size for p in args.out.glob('energy-construction-*.mp4')},indent=2))
