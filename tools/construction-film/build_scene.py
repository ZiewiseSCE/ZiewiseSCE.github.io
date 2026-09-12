"""SCEnergy: a physically lit, ordered architectural construction film.
Run with Blender 4.5: blender -b -t 8 -P build_scene.py -- [preview|build]
External lighting and ground textures: Poly Haven CC0; see ATTRIBUTION.md.
"""
import bpy, math, random, os, sys, time
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector, multi_fractal

ROOT=Path(__file__).resolve().parent
random.seed(91326)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
S=bpy.context.scene
S.render.engine='CYCLES'; S.cycles.samples=32; S.cycles.use_denoising=True
S.cycles.denoiser='OPTIX'
S.cycles.device='GPU'
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='OPTIX'; prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='OPTIX'
    print('GPU',[(d.name,d.type,d.use) for d in prefs.devices],flush=True)
except Exception as e: print('GPU setup:',e,flush=True)
S.cycles.max_bounces=6; S.cycles.diffuse_bounces=2; S.cycles.glossy_bounces=3
S.cycles.transparent_max_bounces=6
S.render.use_persistent_data=True
S.render.resolution_x=1920; S.render.resolution_y=1080; S.render.resolution_percentage=100
S.render.fps=24; S.frame_start=1; S.frame_end=912
S.render.image_settings.file_format='PNG'; S.render.image_settings.color_mode='RGB'
S.render.image_settings.compression=15
S.view_settings.view_transform='AgX'
S.view_settings.look='AgX - Medium High Contrast'
S.view_settings.exposure=.35

def rgb(hex):
    c=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)

def mat(name,col,rough=.5,metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=rgb(col)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m

def noise_surface(m,scale,strength,distance):
    n=m.node_tree.nodes; l=m.node_tree.links
    noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=3
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=distance
    l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])

concrete=mat('Cast concrete · micro aggregate','b9b7aa',.84);noise_surface(concrete,45,.25,.06)
slabmat=mat('Warm concrete paving','cac8ba',.82);noise_surface(slabmat,85,.3,.035)
steel=mat('Galvanized structural steel','7f9195',.3,.78);noise_surface(steel,130,.12,.008)
ivory=mat('Pearl aluminium facade','deded5',.27,.48)
charcoal=mat('Dark anodized frames','303c40',.3,.75)
roofmat=mat('Standing seam roof','a1aba7',.43,.65)
glass=mat('Architectural low-E glass','426773',.075,.34)
glass.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.5
glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.25
panelmat=mat('Photovoltaic monocrystalline cells','142936',.19,.45)
panelmat.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.7
cellline=mat('PV cell metallization','688085',.4,.6)
black=mat('Rubber and cable','152025',.8)
green=mat('SCE forest green finish','315c47',.32,.4)
yellow=mat('Safety ochre','dbb33c',.45,.2)
white=mat('Equipment powder coating','d5d9d5',.38,.24)
roadmat=mat('Fine aggregate asphalt','626969',.9);noise_surface(roadmat,90,.4,.025)
paint=mat('Parking lines','e6e6d2',.8)
bark=mat('Branch bark','685747',.95);noise_surface(bark,28,.65,.045)
leaves=[]
for i,c in enumerate(['34502c','4c6636','647843','2d482d','788653']):
    m=mat('Sunlit leaf '+str(i),c,.6)
    m.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.13
    leaves.append(m)

def mesh_obj(name,verts,faces,material,parent=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);S.collection.objects.link(ob)
    if material:me.materials.append(material)
    if parent:ob.parent=parent
    return ob

cubeverts=[(x,y,z) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
cubefaces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
def box(name,loc,size,material,parent=None,bevel=.025):
    verts=[(x*size[0]/2,y*size[1]/2,z*size[2]/2) for x,y,z in cubeverts]
    o=mesh_obj(name,verts,cubefaces,material,parent);o.location=loc
    if bevel:
        b=o.modifiers.new('Machined edge','BEVEL');b.width=min(bevel,min(size)/4);b.segments=2
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o

def group(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);S.collection.objects.link(o);o.location=loc
    if parent:o.parent=parent
    return o

def tube(name,a,b,r,material,parent=None,r2=None,sides=8):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
    if u.length<.01:u=axis.cross(Vector((0,1,0)))
    u.normalize();v=axis.cross(u);verts=[]
    for pos,rad in [(a,r),(b,r if r2 is None else r2)]:
        for j in range(sides):verts.append(pos+(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides))*rad)
    faces=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]+[(j,(j+1)%sides,(j+1)%sides+sides,j+sides) for j in range(sides)]
    o=mesh_obj(name,verts,faces,material,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o

def curve(name,points,r,material,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type=b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);S.collection.objects.link(o);c.materials.append(material)
    if parent:o.parent=parent
    return o

def frame(sec):return round(sec*24)+1
def k(ob,prop,value,sec):
    setattr(ob,prop,value);ob.keyframe_insert(data_path=prop,frame=frame(sec))
def appear(ob,start,dur=.7,mode='lift',height=2):
    loc=ob.location.copy();scale=ob.scale.copy()
    k(ob,'scale',(0,0,0),start-1/24)
    if mode=='grow':
        k(ob,'scale',(scale.x,scale.y,.001),start)
        k(ob,'scale',scale,start+dur)
    else:
        k(ob,'scale',scale,start)
        k(ob,'location',loc+Vector((0,0,height)),start)
        k(ob,'location',loc,start+dur)
    return ob

def text_obj(body,loc,size,material,rot=(math.pi/2,0,0),parent=None):
    c=bpy.data.curves.new('Label '+body,'FONT');c.body=body;c.size=size;c.extrude=.002;c.align_x='CENTER'
    o=bpy.data.objects.new('Label '+body,c);S.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;c.materials.append(material)
    if parent:o.parent=parent
    return o

# Real measured HDR illumination supplies the mountain horizon and reflections.
w=bpy.data.worlds.new('Alpine daylight');w.use_nodes=True;S.world=w
wn=w.node_tree.nodes;wl=w.node_tree.links
env=wn.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'drakensberg_solitary_mountain_4k.hdr'))
tc=wn.new('ShaderNodeTexCoord');mapping=wn.new('ShaderNodeMapping');mapping.inputs['Rotation'].default_value[2]=math.radians(115)
wl.new(tc.outputs['Generated'],mapping.inputs['Vector']);wl.new(mapping.outputs['Vector'],env.inputs['Vector']);wl.new(env.outputs['Color'],wn.get('Background').inputs['Color'])
wn.get('Background').inputs['Strength'].default_value=.8

# A continuous irregular ground surface, with a level buildable pad at its center.
groundmat=mat('Photogrammetry alpine earth','d1c8a5',.9)
n=groundmat.node_tree.nodes;l=groundmat.node_tree.links;p=n.get('Principled BSDF')
tc=n.new('ShaderNodeTexCoord');v=n.new('ShaderNodeVectorMath');v.operation='SCALE';v.inputs[3].default_value=.075;l.new(tc.outputs['Object'],v.inputs[0])
for filename,out,inlet in [('diff','Color','Base Color'),('rough','Color','Roughness')]:
    t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ROOT/f'aerial_rocks_02_{filename}_2k.jpg'))
    if filename=='rough':t.image.colorspace_settings.name='Non-Color'
    l.new(v.outputs[0],t.inputs['Vector']);l.new(t.outputs[out],p.inputs[inlet])
nt=n.new('ShaderNodeTexImage');nt.image=bpy.data.images.load(str(ROOT/'aerial_rocks_02_nor_gl_2k.jpg'));nt.image.colorspace_settings.name='Non-Color'
l.new(v.outputs[0],nt.inputs['Vector']);normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;l.new(nt.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs['Normal'])
def elevation(x,y):
    edge=max(abs(x)/29,abs(y)/25)
    amp=max(0,min(1,(edge-1)/2.8))
    return -.15+amp*(multi_fractal(Vector((x*.018,y*.018,.45)),1.15,2,4)*4.5-2)
N=150;extent=240;verts=[]
for j in range(N+1):
    for i in range(N+1):
        x=-extent/2+i*extent/N;y=-extent/2+j*extent/N;verts.append((x,y,elevation(x,y)))
faces=[(j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i) for j in range(N) for i in range(N)]
terrain=mesh_obj('Continuous mountain terrain',verts,faces,groundmat)
for p in terrain.data.polygons:p.use_smooth=True

# Building coordinates: 26 x 14 m. Each component has its own installation time.
campus=group('SCE ENERGY CAMPUS')
xs=[-13,-7.8,-2.6,2.6,7.8,13]
ys=[-5,9]
for i,x in enumerate(xs):
    for j,y in enumerate(ys):
        g=group('Footing and anchor bolts',(x,y,0),campus)
        box('Concrete pad',(0,0,.12),(1.4,1.4,.35),concrete,g)
        box('Column base plate',(0,0,.34),(.65,.65,.05),steel,g)
        for dx in [-.23,.23]:
            for dy in [-.23,.23]:tube('Anchor bolt',(dx,dy,.35),(dx,dy,.48),.034,charcoal,g)
        appear(g,.7+i*.23+j*.1,.45,'grow')
slab=box('Industrial floor slab',(0,2,.13),(27,15,.26),concrete,campus)
appear(slab,2.5,1.1,'grow')

def column(x,y,start):
    g=group('H section column',(x,y,.35),campus)
    box('Column web',(0,0,3.3),(.018,.34,6.6),steel,g)
    for a in [-.18,.18]:box('Column flange',(0,a,3.3),(.35,.022,6.6),steel,g)
    for z in [1.6,4.8,6.3]:box('Connection stiffener',(0,0,z),(.31,.33,.025),steel,g)
    appear(g,start,.8,'grow');return g
for i,x in enumerate(xs):
    for j,y in enumerate(ys):column(x,y,3.3+i*.37+j*.15)

def ibeam(name,a,b,start):
    mid=(Vector(a)+Vector(b))/2;d=Vector(b)-Vector(a)
    g=group(name,mid,campus);g.rotation_euler=d.to_track_quat('X','Z').to_euler()
    box('Beam web',(0,0,0),(d.length,.018,.44),steel,g)
    for z in [-.23,.23]:box('Beam flange',(0,0,z),(d.length,.24,.022),steel,g)
    for x in [-d.length/2+.08,d.length/2-.08]:box('Bolted end plate',(x,0,0),(.035,.33,.56),steel,g)
    appear(g,start,.7,'lift',1.8);return g
for i,x in enumerate(xs):
    ibeam('Cross roof primary beam',(x,-5,6.85),(x,9,6.85),5.5+i*.32)
    for j in range(5):
        # Visible open web triangulation below each transverse roof beam.
        a=(x,-5+j*2.8,6.3);b=(x,-3.6+j*2.8,6.8);c=(x,-2.2+j*2.8,6.3)
        o=tube('Roof truss diagonal',a,b,.043,steel,campus);appear(o,5.7+i*.32,.5,'lift',1)
        o=tube('Roof truss diagonal',b,c,.043,steel,campus);appear(o,5.7+i*.32,.5,'lift',1)
    o=tube('Lower truss chord',(x,-5,6.3),(x,9,6.3),.055,steel,campus);appear(o,5.7+i*.32,.5,'lift',1)
for i in range(5):
    for y in ys:ibeam('Longitudinal tie beam',(xs[i],y,6.85),(xs[i+1],y,6.85),6.3+i*.3)
for j in range(9):
    o=box('Roof purlin',(0,-4.6+j*1.62,7.04),(26.3,.1,.18),steel,campus);appear(o,7.5+j*.12,.65,'lift',1)

# Exterior walls are assembled in vertical panels; glazing follows the mullions.
for i in range(26):
    x=-12.5+i
    for y in [-5.16,9.16]:
        if y<0:
            sections=[(.8,1.1),(5.2,3)]
        else:sections=[(3.65,6.65)]
        g=group('Facade cassette',(x,y,0),campus)
        for z,h in sections:box('Pearl insulated cladding',(0,0,z),(.975,.18,h),ivory,g)
        appear(g,8.8+i*.10+(0 if y<0 else .3),.75,'lift',2.2)
        if y<0:
            g=group('Glazed front bay',(x,y-.035,1.35),campus)
            box('Glass panel',(0,0,1.05),(.945,.035,2.1),glass,g,.006)
            for xx in [-.492,.492]:box('Vertical glazing mullion',(xx,-.04,1.08),(.045,.11,2.22),charcoal,g,.007)
            for zz in [0,2.17]:box('Glazing transom',(0,-.04,zz),(.99,.11,.045),charcoal,g,.005)
            appear(g,10+i*.08,.75,'lift',1)
for x in [-13.16,13.16]:
    for j in range(14):
        y=-4.5+j
        g=group('Side facade cassette',(x,y,0),campus)
        box('Side wall',(0,0,3.55),(.18,.975,6.5),ivory,g)
        if x>0:
            box('High level window',(.105,0,4.35),(.035,.86,1.25),glass,g,.005)
            for yy in [-.46,.46]:box('Side mullion',(.145,yy,4.35),(.08,.045,1.32),charcoal,g,.004)
        appear(g,9+j*.1,.7,'lift',1.5)
for i in range(27):
    x=-13+i
    g=group('Roof deck strip',(x,2,7.16),campus)
    box('Roof sheet',(0,0,0),(.98,14.7,.055),roofmat,g,.007)
    box('Standing seam',(.49,0,.04),(.02,14.7,.08),steel,g,.004)
    appear(g,10.6+i*.073,.65,'lift',1.2)
for y in [-5.5,9.5]:
    o=box('Parapet coping',(0,y,7.31),(27,.24,.3),ivory,campus);appear(o,12.8,.65,'lift',.8)
for x in [-13.5,13.5]:
    o=box('Side parapet',(x,2,7.31),(.24,15,.3),ivory,campus);appear(o,12.8,.65,'lift',.8)
entrance=group('Main entrance',(-1,-5.4,.26),campus)
box('Entrance glazing',(0,-.02,1.47),(2.25,.07,2.95),glass,entrance)
for x in [-1.18,0,1.18]:box('Door frame',(x,-.08,1.47),(.06,.1,2.95),charcoal,entrance)
box('Entrance canopy',(0,-.95,3.3),(4.3,2.1,.17),ivory,entrance)
for x in [-.2,.2]:tube('Door pull',(x,-.16,1.1),(x,-.16,1.6),.017,steel,entrance)
text_obj('SC ENERGY',(-0,-.15,4.15),.5,green,parent=entrance)
appear(entrance,12,.7,'lift',1)

def pv_module(parent,loc,w=1.12,h=1.9,tilt=.12):
    g=group('Framed solar module',loc,parent);g.rotation_euler.x=tilt
    box('Aluminium panel frame',(0,0,0),(w,h,.042),charcoal,g,.01)
    # The glass surface and individual cells preserve reflections and subtle seams.
    box('PV glass',(0,0,.027),(w-.025,h-.025,.012),panelmat,g,.004)
    for col in range(1,6):box('Cell vertical gap',(-w/2+col*w/6,0,.035),(.004,h-.04,.002),cellline,g,0)
    for row in range(1,12):box('Half-cell separation',(0,-h/2+row*h/12,.035),(w-.04,.004,.002),cellline,g,0)
    return g
for row in range(5):
    y=-3.35+row*2.52
    for a in [-.55,.55]:
        rail=box('PV mounting rail',(0,y+a,7.56),(25.2,.045,.06),steel,campus,.008);appear(rail,13.6+row*.27,.5,'lift',.6)
    for col in range(20):
        x=-11.9+col*1.255
        g=pv_module(campus,(x,y,7.71),tilt=.14)
        appear(g,14.6+row*.56+col*.08,.65,'lift',1.3)
        for a in [-.55,.55]:
            foot=box('PV rail standoff',(x,y+a,7.42),(.10,.16,.38),steel,campus,.012);appear(foot,13.4+row*.2,.4,'grow')

# Equipment pads and access road are integrated into the terrain, not a display plinth.
yard=group('Equipment access and paving',parent=campus)
box('Forecourt paving',(0,-12.5,-.04),(34,12,.18),slabmat,yard)
box('ESS maintenance pad',(18,4,-.025),(7,17,.2),slabmat,yard)
box('Access road',(19,-31,-.085),(7,40,.12),roadmat,yard)
for y in [-29,-34,-39,-44]:box('Road centre marking',(19,y,-.018),(.1,2.2,.012),paint,yard,0)
for x in [-15,15]:
    for y in [-7.5,-10.5,-13.5,-16.5]:box('Pavement joint',(x,y,.06),(.014,2.85,.008),charcoal,yard,0)
appear(yard,18,.8,'grow')

for i,y in enumerate([-.5,6.3]):
    g=group('ESS battery enclosure',(18,y,.13),campus)
    box('Storage enclosure',(0,0,1.5),(3.1,5.55,2.8),white,g,.065)
    box('Base skid',(0,0,.1),(3.2,5.7,.2),charcoal,g)
    for xx in [-1.1,0,1.1]:
        box('Access door',(xx,-2.801,1.47),(.98,.035,2.53),white,g,.016)
        box('Door seam',(xx-.49,-2.829,1.47),(.014,.012,2.45),charcoal,g,0)
        box('Door handle',(xx+.32,-2.85,1.42),(.04,.055,.24),charcoal,g,.008)
        for z in [.5,.59,.68,.77,.86]:box('Vent louvre',(xx,-2.85,z),(.63,.045,.037),charcoal,g,.004)
    for y2 in [-1.6,1.6]:
        box('Thermal management unit',(1.7,y2,1.45),(.35,1.45,1.6),white,g)
        for z in range(12):box('Heat exchanger fin',(1.89,y2,.85+z*.1),(.018,1.25,.032),charcoal,g,.004)
        tube('Cooling fan surround',(0,y2,2.89),(0,y2,2.97),.52,charcoal,g,sides=24)
        for a in range(6):
            blade=box('Cooling fan blade',(0,y2,2.99),(.85,.10,.025),steel,g,.007);blade.rotation_euler.z=a*math.pi/6
    box('Green service stripe',(0,-2.835,2.44),(2.75,.035,.2),green,g,.003)
    text_obj('ESS',(0,-2.86,1.75),.37,green,parent=g)
    appear(g,19+i*1.3,1.05,'lift',3)
    for xx in [-2.2,2.2]:
        for yy in [-3.25,3.25]:
            b=group('Protective bollard',(18+xx,y+yy,.1),campus)
            tube('Bollard',(0,0,0),(0,0,.85),.075,yellow,b,sides=12)
            tube('Reflective stripe',(0,0,.6),(0,0,.73),.079,charcoal,b,sides=12)
            appear(b,21.5,.5,'grow')

# Three-bay PV carport, with equipment and vehicles installed after the structure.
carport=group('EV charging court',(-6.8,-12.7,.1),campus)
for i,x in enumerate([-4.6,0,4.6]):
    g=group('Carport steel support',(x,1,0),carport)
    box('Carport column',(0,0,1.7),(.2,.2,3.4),steel,g)
    box('Carport cantilever',(0,-.7,3.4),(.17,5.4,.22),steel,g)
    tube('Knee brace',(0,0,2.55),(0,-1.2,3.31),.058,steel,g)
    appear(g,22+i*.28,.65,'grow')
for y in [-2.8,1.65]:
    o=box('Carport edge beam',(0,y,3.47),(10.8,.17,.22),steel,carport);appear(o,23,.6,'lift',1)
for row in range(2):
    for col in range(9):
        g=pv_module(carport,(-4.83+col*1.2,-1.82+row*2.08,3.65),w=1.16,h=2.0,tilt=.035)
        appear(g,23.5+col*.10+row*.22,.7,'lift',1.2)
for i,x in enumerate([-3.4,0,3.4]):
    g=group('DC charging pedestal',(x,1.15,0),carport)
    box('Charger housing',(0,0,.95),(.7,.48,1.9),white,g,.09)
    box('Black touch face',(0,-.257,1.31),(.57,.035,.93),charcoal,g,.025)
    box('Screen',(0,-.28,1.51),(.38,.017,.24),green,g,.013)
    box('Charging status',(0,-.279,1.13),(.37,.014,.025),paint,g,.003)
    curve('Charging cable',[(.34,-.1,1.57),(.55,-.12,.75),(.55,-.5,.29),(.17,-.7,.45),(.31,-.38,1.0)],.033,black,g)
    text_obj('EV',(0,-.287,.61),.18,green,parent=g)
    appear(g,24.5+i*.22,.7,'lift',.8)
    for xx in [-1.5,1.5]:
        o=box('Parking bay line',(x+xx,-1.35,.06),(.08,5,.012),paint,carport,0);appear(o,24,.5,'grow')

def car(loc,col,start):
    g=group('Electric vehicle',loc,carport);cm=mat('Automotive metallic '+col,col,.22,.6)
    # A continuous bevelled profile avoids a stack-of-boxes silhouette.
    sections=[(-2.12,.68,.46),(-1.72,.92,.76),(-.83,.93,.85),(-.4,.82,1.4),(.94,.8,1.44),(1.52,.9,.94),(2.12,.79,.72)]
    v=[]
    for y,w,h in sections:v.extend([(-w,y,.39),(-w,y,h),(w,y,h),(w,y,.39)])
    f=[(0,3,2,1),(24,25,26,27)]+[(i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j) for i in range(6) for j in range(4)]
    o=mesh_obj('Sculpted body',v,f,cm,g)
    be=o.modifiers.new('Automotive radii','BEVEL');be.width=.17;be.segments=4;o.modifiers.new('Body normals','WEIGHTED_NORMAL')
    for p in o.data.polygons:p.use_smooth=True
    # Panoramic windshield and side glass, conforming to the sloping body.
    mesh_obj('Windshield',[(-.76,-.8,.91),(.76,-.8,.91),(.71,-.4,1.44),(-.71,-.4,1.44)],[(0,1,2,3)],glass,g)
    mesh_obj('Glass roof',[(-.72,-.35,1.46),(.72,-.35,1.46),(.71,.92,1.48),(-.71,.92,1.48)],[(0,1,2,3)],glass,g)
    for x in [-.815,.815]:
        mesh_obj('Side glass',[(x,-.32,1.37),(x,.87,1.39),(x,1.3,1.02),(x,-.68,.99)],[(0,1,2,3)],glass,g)
        for y in [-1.25,1.28]:
            tube('Tyre',(x*1.05,y,.42),(x*1.25,y,.42),.36,black,g,sides=24)
            tube('Alloy rim',(x*1.26,y,.42),(x*1.28,y,.42),.255,steel,g,sides=24)
        box('Flush handle',(x,.4,1.02),(.024,.21,.029),charcoal,g,.006)
    for x in [-.57,.57]:box('LED headlamp',(x,-2.075,.76),(.41,.025,.075),paint,g,.018)
    target=g.location.copy();k(g,'scale',(0,0,0),start-1/24);k(g,'scale',(1,1,1),start)
    k(g,'location',target+Vector((0,-9,0)),start);k(g,'location',target,start+1.7)
    return g
car((-3.4,-1.3,.08),'d1d8d8',25);car((3.4,-1.3,.08),'546c72',26)

# A lattice construction crane makes the assembly legible in the skeletal stage.
crane=group('Temporary erection crane',(-17,10,0),campus)
for z in range(8):
    for x in [-.5,.5]:
        for y in [-.5,.5]:tube('Crane tower upright',(x,y,z*2),(x,y,(z+1)*2),.07,yellow,crane)
    for y in [-.5,.5]:
        tube('Crane mast diagonal',(-.5,y,z*2),(.5,y,(z+1)*2),.035,yellow,crane)
        tube('Crane mast diagonal',(.5,y,z*2),(-.5,y,(z+1)*2),.035,yellow,crane)
jib=group('Rotating crane jib',(0,0,16),crane)
for y in [-.45,.45]:tube('Jib chord',(-5,y,0),(24,y,0),.07,yellow,jib)
tube('Jib ridge',(-5,0,.9),(24,0,.9),.06,yellow,jib)
for x in range(-5,24):
    for y in [-.45,.45]:tube('Jib web',(x,y,0),(x+.5,0,.9),.025,yellow,jib)
box('Counterweight',(-4,0,.4),(2,1.5,1.2),concrete,jib)
box('Operator cabin',(1,-.8,.4),(1.4,1.1,1.3),yellow,jib)
box('Cab glazing',(1,-1.36,.57),(1.07,.02,.8),glass,jib,.01)
hook=group('Trolley hook',(12,0,0),jib)
tube('Hoist cable',(0,0,0),(0,0,-8),.022,charcoal,hook)
box('Hook block',(0,0,-8),(.35,.23,.45),yellow,hook)
curve('Lifting hook',[(0,0,-8.25),(0,0,-8.6),(.17,0,-8.7),(.27,0,-8.48)],.055,charcoal,hook)
appear(crane,2.9,.55,'grow')
for t,angle in [(3,-.18),(5,-.42),(8,-.05),(11,-.55),(13,-.2)]:k(jib,'rotation_euler',(0,0,angle),t)
for t,x in [(3,8),(5,15),(8,23),(11,14),(13,9)]:k(hook,'location',(x,0,0),t)
k(crane,'scale',(1,1,1),13.25);k(crane,'scale',(1,1,.001),14.1);k(crane,'scale',(0,0,0),14.15)

# Branching broadleaf prototypes: actual leaf geometry and subsurface materials.
def make_tree(seed):
    rng=random.Random(seed);bv=[];bf=[];lv=[];lf=[];lm=[]
    def branch(a,b,r1,r2,sides=7):
        a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0))).normalized();v=d.cross(u);off=len(bv)
        for p,r in [(a,r1),(b,r2)]:
            for j in range(sides):bv.append(p+(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides))*r)
        bf.extend([(off+j,off+(j+1)%sides,off+(j+1)%sides+sides,off+j+sides) for j in range(sides)])
    def leaf(p,size):
        p=Vector(p);az=rng.random()*math.tau;el=rng.uniform(-.4,.6)
        u=Vector((math.cos(az),math.sin(az),el)).normalized()*size
        v=Vector((-math.sin(az),math.cos(az),rng.uniform(-.6,.6)))*size*.4
        off=len(lv)
        lv.extend([p-u,p+v,p+Vector((0,0,size*.14)),p+u*1.3,p-v])
        lf.extend([(off,off+1,off+2),(off+1,off+3,off+2),(off+3,off+4,off+2),(off+4,off,off+2)])
        lm.extend([rng.randrange(5)]*4)
    for z in range(7):branch((math.sin(z)*.07,0,z*.8),(math.sin(z+1)*.07,0,(z+1)*.8),.19*(1-z/9),.18*(1-(z+1)/9))
    for j in range(22):
        angle=j*2.39996+rng.uniform(-.2,.2);h=1.8+j*.17
        spread=2.1*(1-abs((h-3.8)/4)) * rng.uniform(.85,1.13)
        a=Vector((0,0,h));b=Vector((math.cos(angle)*spread,math.sin(angle)*spread,h+rng.uniform(.5,1.25)))
        branch(a,b,.065,.016)
        for sub in range(8):
            f=.3+sub*.085;c=a.lerp(b,f)
            ang=angle+(-1 if sub%2 else 1)*rng.uniform(.5,1.5)
            tip=c+Vector((math.cos(ang)*rng.uniform(.4,.85),math.sin(ang)*rng.uniform(.4,.85),rng.uniform(.15,.7)))
            branch(c,tip,.019,.004,5)
            for q in range(25):
                pos=c.lerp(tip,rng.random())+Vector((rng.uniform(-.29,.29),rng.uniform(-.29,.29),rng.uniform(-.1,.28)))
                leaf(pos,rng.uniform(.11,.22))
    bm=bpy.data.meshes.new('Branched tree wood');bm.from_pydata(bv,[],bf);bm.materials.append(bark)
    for p in bm.polygons:p.use_smooth=True
    lmsh=bpy.data.meshes.new('Folded botanical leaf canopy');lmsh.from_pydata(lv,[],lf)
    for m in leaves:lmsh.materials.append(m)
    for p,mi in zip(lmsh.polygons,lm):p.material_index=mi
    return bm,lmsh
prototypes=[make_tree(213+i*379) for i in range(5)]
points=[]
# Natural clusters around the site, with safe equipment/access clearances.
for i in range(250):
    x=random.uniform(-76,76);y=random.uniform(-48,90)
    if -21<x<24 and -23<y<16:continue
    if 14<x<24 and y<-15:continue
    if y< -23 and x>0:continue  # Keep the foreground clear to reveal the project.
    if any((x-a)**2+(y-b)**2<13 for a,b in points):continue
    points.append((x,y))
points.extend([(-17,-6),(-17,-13),(-18,2),(-12,14),(-5,15),(3,15),(11,16),(25,10),(26,2)])
for i,(x,y) in enumerate(points):
    g=group('Growing broadleaf %03d'%i,(x,y,elevation(x,y)),campus)
    bm,lmsh=prototypes[i%5]
    for name,me in [('Branch network',bm),('Living leaf canopy',lmsh)]:
        o=bpy.data.objects.new(name,me);S.collection.objects.link(o);o.parent=g
    scale=random.uniform(.85,1.5);g.rotation_euler.z=random.random()*math.tau
    delay=25.8+min(5.5,math.hypot(x*.06,y*.065))+random.uniform(0,1.2)
    k(g,'scale',(0,0,0),delay)
    k(g,'scale',(scale*.2,scale*.2,scale*.33),delay+.9)
    k(g,'scale',(scale,scale,scale),delay+3.1)
    a=g.rotation_euler.z
    for t in [delay+3.1,34,35,36,37.95]:k(g,'rotation_euler',(math.sin(i+t)*.008,math.cos(i+t)*.008,a),t)

# Subtle moving light in the physical cable route visualizes PV -> ESS -> EV.
energy=mat('Flowing clean energy','b6d985',.3)
ep=energy.node_tree.nodes.get('Principled BSDF');ep.inputs['Emission Color'].default_value=rgb('b6d985');ep.inputs['Emission Strength'].default_value=2.2
routes=[[(10,-5.65,7.3),(13.6,-5.65,7.3),(13.6,-5.65,.18),(18,-5.65,.18),(18,-3.4,.18)],[(18,-3.4,.18),(18,-6.6,.18),(-6.8,-6.6,.18),(-6.8,-11.4,.18)]]
for ri,route in enumerate(routes):
    conduit=curve('Protected energy conduit',route,.046,steel,campus);appear(conduit,21.7+ri*3,.5,'grow')
    for j in range(5):
        o=box('Energy flow highlight',(0,0,0),(.11,.11,.11),energy,campus,.04)
        k(o,'scale',(0,0,0),27);k(o,'scale',(1,1,1),27.05)
        for f in range(frame(27),913,3):
            t=(f-1)/24;prog=((t-27)*.20+j/5)%1
            lengths=[(Vector(b)-Vector(a)).length for a,b in zip(route,route[1:])];dist=prog*sum(lengths)
            for a,b,length in zip(route,route[1:],lengths):
                if dist<=length:pos=Vector(a).lerp(Vector(b),dist/length);break
                dist-=length
            o.location=pos;o.keyframe_insert(data_path='location',frame=f)

# Perspective aerial photography, planted in the landscape with a gentle crane move.
bpy.ops.object.camera_add(location=(46,-76,27));cam=bpy.context.object;cam.name='Cinematic aerial camera';S.camera=cam
cam.data.lens=38;cam.data.sensor_width=36;cam.data.clip_end=1000
target=Vector((-9,3,8))
for sec,pos in [(0,(46,-76,27)),(12,(45,-74,27)),(24,(44,-75,28)),(38,(46,-76,27))]:
    cam.location=pos;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.keyframe_insert(data_path='location',frame=frame(sec));cam.keyframe_insert(data_path='rotation_euler',frame=frame(sec))
cam.data.shift_x=-.02

# Merge the static detail of each installation into a single mesh. Keep the
# assembly's animation on its parent and keep independently moving parts intact.
bpy.context.view_layer.update()
remove_after=[]
for parent in [ob for ob in bpy.data.objects if ob.type=='EMPTY']:
    children=[c for c in parent.children if c.type=='MESH' and not c.animation_data and not c.name.startswith('Sculpted body')]
    if len(children)<3:continue
    vs=[];fs=[];indices=[];smooth=[];materials=[]
    for child in children:
        me=child.data;offset=len(vs)
        vs.extend([child.matrix_basis@v.co for v in me.vertices])
        mi=[]
        for material in me.materials:
            if material not in materials:materials.append(material)
            mi.append(materials.index(material))
        for p in me.polygons:
            fs.append(tuple(offset+i for i in p.vertices));indices.append(mi[p.material_index] if mi else 0);smooth.append(p.use_smooth)
    ob=mesh_obj(parent.name+' · assembly',vs,fs,None,parent)
    for material in materials:ob.data.materials.append(material)
    for p,mi,sm in zip(ob.data.polygons,indices,smooth):p.material_index=mi;p.use_smooth=sm
    bevel=ob.modifiers.new('Fabricated edge finish','BEVEL');bevel.width=.012;bevel.segments=2
    ob.modifiers.new('Surface normals','WEIGHTED_NORMAL')
    remove_after.extend(children)
bpy.data.batch_remove(remove_after)

# Explicit linear motion for the energy beads; smooth construction everywhere else.
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for fc in ob.animation_data.action.fcurves:
            for p in fc.keyframe_points:
                if 'Energy flow' in ob.name:p.interpolation='LINEAR'
                else:p.handle_left_type=p.handle_right_type='AUTO_CLAMPED'

S.frame_set(frame(34))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sce-construction.blend'))
print('SCENE_READY',len(bpy.data.objects),'objects',len(points),'trees',flush=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if 'preview' in args:
    S.render.resolution_percentage=60;S.cycles.samples=24
    S.render.filepath=str(ROOT/'preview.png');bpy.ops.render.render(write_still=True)
