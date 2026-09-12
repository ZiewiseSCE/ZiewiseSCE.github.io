import bpy,time,sys,json
from pathlib import Path
root=Path(__file__).resolve().parent;s=bpy.context.scene
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
first=int(args[0]) if args else 1;last=int(args[1]) if len(args)>1 else 912
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='OPTIX';p.get_devices()
for d in p.devices:d.use=d.type=='OPTIX'
s.cycles.device='GPU';s.cycles.samples=24;s.cycles.denoiser='OPTIX';s.cycles.adaptive_threshold=.07
s.render.resolution_percentage=100;s.render.use_persistent_data=True
dest=root/'frames';dest.mkdir(exist_ok=True)
started=time.monotonic()
for f in range(first,last+1):
    file=dest/f'{f:04}.png'
    if file.exists():continue
    s.frame_set(f);s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
    (root/f'progress-{first}.json').write_text(json.dumps({'frame':f,'last':last,'elapsed':round(time.monotonic()-started,1)}))
print('RENDER_COMPLETE',first,last,round(time.monotonic()-started,1),flush=True)
