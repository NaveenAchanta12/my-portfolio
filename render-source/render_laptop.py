import bpy, math, os, sys
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.render.resolution_x=1024;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.16,.19,.25);scene.view_settings.view_transform='AgX'
def mat(name,color,metal=0,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
silver=mat('Anodized aluminium',(.45,.49,.55),.9,.23);edge=mat('Polished chamfer',(.65,.70,.77),.92,.18);black=mat('Black glass',(.005,.007,.011),.15,.2);keymat=mat('Keycaps',(.012,.015,.02),.08,.45);rubber=mat('Rubber',(.025,.03,.038),0,.8)
def box(name,dim,loc,material,bevel=.025,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 mod=o.modifiers.new('Machined edge radius','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if parent:o.parent=parent
 return o
box('Unibody', (3.12,2.21,.114),(0,0,0),silver,.05);box('Bottom seam',(3.10,2.19,.018),(0,0,-.055),edge,.04)
box('Front finger recess',(.6,.016,.018),(0,-1.105,.045),black,.008)
box('Keyboard inset',(2.55,.96,.012),(0,.37,.059),black,.04)
for row in range(5):
 for col in range(14):
  if row==4 and 4<=col<=9:continue
  box('Key %d %d'%(row,col),(.15,.145,.015),(-1.17+col*.18,.73-row*.175,.073),keymat,.012)
box('Spacebar',(.99,.145,.015),(.045,.03,.073),keymat,.015)
box('Trackpad rim',(1.30,.8,.006),(0,-.63,.06),edge,.035);box('Trackpad',(1.28,.78,.006),(0,-.63,.064),silver,.035)
# Small, recessed dark ports with metal inner lips.
for y in [.75,.4,.06]:
 box('USB C rim',(.014,.17,.048),(-1.562,y,0),edge,.008);box('USB C opening',(.015,.13,.027),(-1.57,y,0),black,.006)
for x in [-1.4,1.4]:
 for y in range(35):
  for k in range(3):box('Speaker hole',(.008,.008,.002),(x+(k-1)*.025,-.05+y*.025,.059),black,.002)
# Continuous hinge with a separately pivoting lid.
box('Hinge barrel',(2.7,.095,.095),(0,1.04,.047),black,.045)
hinge=bpy.data.objects.new('Hinge pivot',None);bpy.context.collection.objects.link(hinge);hinge.location=(0,1.05,.069)
box('Display aluminium',(3.12,.052,2.025),(0,0,1.0125),silver,.045,hinge)
box('Display glass',(3.06,.012,1.97),(0,-.032,1.015),black,.035,hinge)
# Black illuminated display; restrained cool reflection, no unrelated artwork.
screenmat=mat('Black display',(.002,.003,.005),.0,.23)
screenmat.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=0
screenmat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=1
box('Active screen',(2.97,.003,1.855),(0,-.040,1.035),screenmat,.025,hinge)
box('Notch',(.23,.01,.045),(0,-.048,1.975),black,.01,hinge)
def area(name,loc,power,size,color,target=(0,0,.4)):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='RECTANGLE';o.data.size=size;o.data.size_y=size*.5;o.data.color=color;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large silver softbox',(-3,-2,5),650,5,(.8,.88,1));area('Edge strip',(4,2,3),950,4,(.65,.77,1));area('Front fill',(0,-4,2),230,3,(1,1,1))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.lens=50
out='/workspace/scratch/740740231e3b/portfolio-prototype/frames'
def ease(t):return t*t*(3-2*t)
def clamp(t):return max(0,min(1,t))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
indices=[int(x) for x in args] if args else list(range(49))
for i in indices:
 p=i/48;turn=ease(clamp(p/.58));opening=ease(clamp((p-.08)/.56));zoom=ease(clamp((p-.66)/.34))
 hinge.rotation_euler.x=math.radians(68*(1-opening)-3*opening)
 angle=-math.pi/2*(1-turn);distance=7
 camera.location=(math.sin(angle)*distance,-math.cos(angle)*distance,.18+2.2*turn)
 target=Vector((0,0,.27*(1-turn)+.80*turn));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
 camera.data.ortho_scale=(3.0+(6.0-3.0)*ease(clamp(p/.28)))*(1-zoom)+1.90*zoom
 scene.render.filepath=os.path.join(out,'%03d.png'%i);bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath='/workspace/scratch/740740231e3b/portfolio-prototype/render-source/laptop.blend')
