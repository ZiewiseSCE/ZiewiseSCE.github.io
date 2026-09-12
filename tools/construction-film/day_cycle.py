"""Append a physically lit solar + storage day to the completed Cycles campus.
blender -b <construction.blend> -t 6 -P day_cycle.py -- <output-dir> [preview|render]
The completed geometry is reused; the original construction frames stay intact.
"""
import bpy, math, sys, time, json
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
ROOT = Path(args[0]).resolve(); ROOT.mkdir(parents=True, exist_ok=True)
mode = args[1] if len(args) > 1 else 'preview'
S = bpy.context.scene
S.frame_set(865)
for ob in list(bpy.data.objects):
    ob.animation_data_clear()
    if ob.name.startswith('Energy flow highlight'):
        ob.hide_render = True
S.camera.data.animation_data_clear()
S.render.fps = 24; S.frame_start = 1; S.frame_end = 624
S.cycles.samples = 24; S.cycles.adaptive_threshold = .06
S.cycles.denoiser = 'OPTIX'; S.cycles.use_denoising = True
S.render.use_persistent_data = True
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices: d.use = d.type == 'OPTIX'
S.cycles.device = 'GPU'
S.render.resolution_percentage = 100

def fr(t): return round(t * 24) + 1
def key(ob, prop, value, t):
    setattr(ob, prop, value); ob.keyframe_insert(data_path=prop, frame=fr(t))
def socket_key(socket, value, t):
    socket.default_value = value; socket.keyframe_insert(data_path='default_value', frame=fr(t))
def smooth(a, b, t):
    x = max(0, min(1, (t-a)/(b-a))); return x*x*(3-2*x)
def material(name, color, emission=0, rough=.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    return m
def box(name, loc, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    b = o.modifiers.new('Soft fixture edges', 'BEVEL'); b.width = .025; b.segments = 2
    return o
def area(name, loc, target, energy, color, size):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.color = color; d.shape = 'DISK'; d.size = size
    o = bpy.data.objects.new(name, d); S.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target)-o.location).to_track_quat('-Z', 'Y').to_euler()
    return o

# Keep photographic ridges and reflections. Relight their HDR contribution
# alongside a true sun light, so shadows move rather than merely tinting a video.
wn = S.world.node_tree.nodes; wl = S.world.node_tree.links
bg = wn.get('Background'); env = next(n for n in wn if n.type == 'TEX_ENVIRONMENT')
tint = wn.new('ShaderNodeMixRGB'); tint.blend_type = 'MULTIPLY'; tint.inputs[0].default_value = 1
wl.new(env.outputs['Color'], tint.inputs[1]); wl.new(tint.outputs[0], bg.inputs['Color'])
for t, strength, color in [
    (0,.8,(1,1,1,1)), (3,.32,(1,.66,.38,1)), (7,.47,(1,.92,.77,1)),
    (10,.64,(.9,.96,1,1)), (14,.49,(1,.88,.7,1)), (18,.20,(1,.40,.17,1)),
    (20,.15,(.40,.51,.8,1)), (22,.12,(.33,.46,.8,1)), (26,.12,(.33,.46,.8,1))]:
    socket_key(bg.inputs['Strength'], strength, t); socket_key(tint.inputs[2], color, t)

cam = S.camera; start = cam.location.copy(); rot = cam.rotation_euler.copy()
key(cam,'location',start,0); key(cam,'rotation_euler',rot,0); key(cam.data,'lens',38,0)
pos = Vector((46,-80,29)); target = Vector((-9,3,12))
key(cam,'location',pos,3); key(cam,'rotation_euler',(target-pos).to_track_quat('-Z','Y').to_euler(),3)
key(cam.data,'lens',34,3)

sun_data = bpy.data.lights.new('Traveling daylight sun', 'SUN'); sun_data.angle = .055
sun = bpy.data.objects.new('Traveling daylight sun', sun_data); S.collection.objects.link(sun)
solar_disk = material('Atmospheric solar disk',(1,.66,.24),12)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=5)
disk = bpy.context.object; disk.name = 'Visible sun above mountain horizon'; disk.data.materials.append(solar_disk)
disk.visible_shadow = False; disk.visible_diffuse = False; disk.visible_glossy = False

# A restrained arc stays in the available upper right sky on desktop and mobile.
# Coordinates are camera-plane positions, transformed into a common sun direction.
for t,x,y,power,color in [(0,.94,.79,0,(1,.7,.4)), (3,.94,.80,1.7,(1,.57,.25)),
    (7,.85,.83,2.1,(1,.83,.6)), (11,.74,.86,2.4,(1,.94,.82)),
    (14,.66,.83,2.0,(1,.8,.49)), (18,.57,.79,.9,(1,.36,.12)),
    (20,.54,.755,0,(1,.24,.07)), (26,.54,.755,0,(1,.24,.07))]:
    S.frame_set(fr(t)); bpy.context.view_layer.update()
    distance = 600; half_w = distance * cam.data.sensor_width/(2*cam.data.lens); half_h = half_w*1080/1920
    local = Vector(((x-.5)*2*half_w,(y-.5)*2*half_h,-distance))
    location = cam.matrix_world @ local
    key(disk,'location',location,t)
    direction = (location-Vector((0,0,0))).normalized()
    key(sun,'rotation_euler',direction.to_track_quat('Z','Y').to_euler(),t)
    key(sun_data,'energy',power,t); key(sun_data,'color',color,t)
    socket_key(solar_disk.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'],(*color,1),t)
dn=solar_disk.node_tree.nodes; dl=solar_disk.node_tree.links
transparent=dn.new('ShaderNodeBsdfTransparent');fade=dn.new('ShaderNodeMixShader')
dl.new(transparent.outputs[0],fade.inputs[1]);dl.new(dn.get('Principled BSDF').outputs[0],fade.inputs[2])
dl.new(fade.outputs[0],dn.get('Material Output').inputs['Surface'])
for t,opacity in [(0,0),(1,0),(3,1),(18,1),(19.7,0),(26,0)]:socket_key(fade.inputs[0],opacity,t)

warm = material('Warm architectural LED',(1,.62,.29),0)
cool = material('EV charging indicator',(.26,1,.68),2)
dark = material('Luminaire graphite',(.035,.052,.055),0,.3)
fixtures=[]
for x in [-11.5,-7.6,-3.8,0,3.8,7.6,11.5]:
    box('Facade downlight housing',(x,-5.22,3.16),(.44,.20,.10),dark)
    box('Facade downlight lens',(x,-5.28,3.10),(.35,.16,.025),warm)
    fixtures.append((area('Warm facade wash',(x,-5.4,3.05),(x,-7.4,0),0,(1,.65,.34),1.8),90))
    box('Ceiling light visible through glass',(x,-4.50,2.83),(1.2,.06,.05),warm)
for x in [-10.2,-6.8,-3.4]:
    box('Carport ceiling luminaire',(x,-12.9,3.47),(.8,.5,.03),warm)
    fixtures.append((area('EV court downlight',(x,-12.9,3.4),(x,-13,0),0,(.78,.88,1),2),180))
for x,y in [(15,-9),(15,-17),(22,-24),(-15,-9)]:
    box('Path light post',(x,y,.65),(.13,.13,1.3),dark)
    box('Path light diffusing cap',(x,y,1.33),(.24,.24,.08),warm)
    fixtures.append((area('Pedestrian path lighting',(x,y,1.4),(x,y-.5,0),0,(1,.69,.40),1.3),65))
for y in [-.5,6.3]:
    fixtures.append((area('ESS service lighting',(18,y-2.9,3.5),(18,y-4,0),0,(.64,.88,1),2),160))
    box('ESS state indicator',(18,y-2.87,2.6),(1.6,.035,.07),cool)

# Interior panes retain their metallic reflection by day, becoming warm at night.
original_glass = bpy.data.materials.get('Architectural low-E glass')
glass = original_glass.copy();glass.name='Illuminated building glazing'
for ob in bpy.data.objects:
    if ob.type=='MESH' and not (ob.parent and (ob.parent.name.startswith('Electric vehicle') or ob.parent.name.startswith('Rotating crane'))):
        for slot in ob.material_slots:
            if slot.material == original_glass:slot.material=glass
gp = glass.node_tree.nodes.get('Principled BSDF')
gp.inputs['Emission Color'].default_value=(1,.53,.19,1)
for t,val in [(0,0),(16,0),(18,.15),(20,.6),(22,.85),(26,.85)]:
    socket_key(gp.inputs['Emission Strength'],val,t)
for t,val in [(0,0),(16,0),(18,1),(20,4),(26,4)]:
    socket_key(warm.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'],val,t)
for ob, watts in fixtures:
    for t,factor in [(0,0),(16,0),(18,.25),(20,1),(26,1)]:key(ob.data,'energy',watts*factor,t)

# Dimensional SC ENERGY lettering keeps its identity in daylight and lights
# progressively with the ESS-powered building after sunset.
neon=material('SC Energy warm white neon',(.70,1,.81),0,.3)
sign=bpy.data.objects.get('Label SC ENERGY')
if sign:
    sign.data.materials.clear();sign.data.materials.append(neon)
    sign.data.size=.72;sign.data.extrude=.018;sign.data.bevel_depth=.008;sign.data.bevel_resolution=3
    for t,strength in [(0,0),(16,0),(18,2.5),(20,6),(26,6)]:
        socket_key(neon.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'],strength,t)
    halo=area('Neon glow on facade',(-1,-5.82,4.4),(-1,-5.16,4.4),0,(.58,1,.73),3.3)
    for t,watts in [(0,0),(16,0),(18,10),(20,24),(26,24)]:key(halo.data,'energy',watts,t)

# Render energy routes in world space. Daytime solar splits between on-site
# loads and surplus charging. After sunset only ESS-to-load routes remain lit.
def line(name, points, mat, radius=.045):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=radius; c.bevel_resolution=3
    sp=c.splines.new('POLY');sp.points.add(len(points)-1)
    for p,xyz in zip(sp.points,points):p.co=(*xyz,1)
    o=bpy.data.objects.new(name,c);S.collection.objects.link(o);c.materials.append(mat);return o
routes=[
    ('Solar to ESS',[(10,-5.7,7.4),(13.7,-5.7,7.4),(13.7,-5.7,.2),(18,-5.7,.2),(18,-3.4,.2)],'solar'),
    ('Solar to building',[(1,-5.7,7.4),(1,-5.7,3.5),(-1,-5.7,3.5)],'solar'),
    ('Solar to EV',[(1,-5.7,3.5),(1,-5.7,.2),(1,-8,.2),(-6.8,-8,.2),(-6.8,-11.4,.2)],'solar'),
    ('ESS to building',[(18,-3.4,.2),(18,-6.3,.2),(1,-6.3,.2),(1,-5.8,3.5),(-1,-5.8,3.5)],'stored'),
    ('ESS to EV',[(18,-3.4,.2),(18,-7.1,.2),(-6.8,-7.1,.2),(-6.8,-11.4,.2)],'stored')]
for name,points,kind in routes:
    col=(.36,.9,.35) if kind=='solar' else (.14,.65,1)
    m=material(name+' luminous route',col,0)
    line(name+' cable trace',points,m,.039)
    for t,on in ([(0,0),(2,0),(3,1),(16,1),(19,0),(26,0)] if kind=='solar' else [(0,0),(17,0),(19,1),(26,1)]):
        socket_key(m.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'],on*3,t)
    for j in range(4):
        bead=box(name+' moving light',points[0],(.19,.19,.19),m)
        for f in range(1,625,2):
            t=(f-1)/24
            on=(smooth(2,3,t)*(1-smooth(16,19,t))) if kind=='solar' else smooth(17,19,t)
            key(bead,'scale',(on,)*3,t)
            lengths=[(Vector(b)-Vector(a)).length for a,b in zip(points,points[1:])]
            travel=((t*.22+j/4)%1)*sum(lengths)
            for a,b,length in zip(points,points[1:],lengths):
                if travel<=length:pos=Vector(a).lerp(Vector(b),travel/length);break
                travel-=length
            key(bead,'location',pos,t)

# Optical bloom is subtle and only affects the bright sun and working fixtures.
S.use_nodes=True; nodes=S.node_tree.nodes; links=S.node_tree.links; nodes.clear()
rl=nodes.new('CompositorNodeRLayers');glow=nodes.new('CompositorNodeGlare')
glow.glare_type='FOG_GLOW';glow.quality='HIGH';glow.threshold=1.4;glow.size=8;glow.mix=-.7
out=nodes.new('CompositorNodeComposite');links.new(rl.outputs['Image'],glow.inputs['Image']);links.new(glow.outputs['Image'],out.inputs['Image'])
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for fc in ob.animation_data.action.fcurves:
            for p in fc.keyframe_points:
                if 'moving light' in ob.name:p.interpolation='LINEAR'
                else:p.handle_left_type=p.handle_right_type='AUTO_CLAMPED'
S.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'energy-day-cycle.blend'))
dest=ROOT/'day-native24';dest.mkdir(exist_ok=True)
frames=[1,fr(5),fr(11),fr(18),fr(23)] if mode=='preview' else range(1,625)
started=time.monotonic()
for f in frames:
    file=(ROOT/f'day-preview-{f:04}.png') if mode=='preview' else (dest/f'{f:04}.png')
    if mode!='preview' and file.exists():continue
    S.frame_set(f);S.render.filepath=str(file);bpy.ops.render.render(write_still=True)
    (ROOT/'day-progress.json').write_text(json.dumps({'frame':f,'last':624,'elapsed':round(time.monotonic()-started,1)}))
print('DAY_CYCLE_READY',mode,round(time.monotonic()-started,1),flush=True)
