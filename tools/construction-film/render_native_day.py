"""Complete all 624 native day-cycle frames, reusing the existing odd frames.
blender -b energy-day-cycle.blend -t 6 -P render_native_day.py -- <render-dir>
"""
import bpy, sys, time, json, os, shutil
from pathlib import Path

root=Path(sys.argv[sys.argv.index('--')+1]).resolve()
dest=root/'day-native24';dest.mkdir(exist_ok=True)
for i in range(1,313):
    source=root/'day-frames'/f'{i:04}.png';target=dest/f'{i*2-1:04}.png'
    if not target.exists():
        try:os.link(source,target)
        except OSError:shutil.copy2(source,target)
s=bpy.context.scene
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
s.cycles.device='GPU';s.cycles.samples=24;s.cycles.adaptive_threshold=.06
s.cycles.denoiser='OPTIX';s.cycles.use_denoising=True
s.render.use_persistent_data=True;s.render.resolution_percentage=100
started=time.monotonic()
for f in range(2,625,2):
    file=dest/f'{f:04}.png'
    if file.exists():continue
    s.frame_set(f);s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
    (root/'native-progress.json').write_text(json.dumps({'frame':f,'last':624,'elapsed':round(time.monotonic()-started,1)}))
print('NATIVE_24_COMPLETE',round(time.monotonic()-started,1),flush=True)
