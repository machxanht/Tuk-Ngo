"""Validate and render the exported shirt GLBs after actual importer reload."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=Path(__file__).resolve().parent.parent.parent/'asset-studio/garment-v32';results=[]
for name in ('caller-seated','controller-standing','rower-seated','rower-standing'):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=96
 if '--blend' in sys.argv:bpy.ops.wm.open_mainfile(filepath=str(out/(name+'.blend')))
 else:bpy.ops.import_scene.gltf(filepath=str(out/(name+'.glb')))
 scene=bpy.context.scene;shirt=next(o for o in scene.objects if o.type=='MESH' and o.name.startswith('Connected_Shirt'))
 body=next(o for o in scene.objects if o.type=='MESH' and o.name.startswith('Athlete_Study_Anatomy'))
 report={'name':name,'actualReloadedClipPoses':17,'minSignedDistanceM':100.,'maxNearestSurfaceDistanceM':0.}
 for step in range(17):
  f=1+step*96/16;scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
  be=body.evaluated_get(deps);bm=be.to_mesh();points=[be.matrix_world@v.co for v in bm.vertices];polys=[list(p.vertices) for p in bm.polygons];tree=BVHTree.FromPolygons(points,polys)
  se=shirt.evaluated_get(deps);sm=se.to_mesh()
  for v in sm.vertices:
   p=se.matrix_world@v.co;nearest,normal,index,distance=tree.find_nearest(p)
   signed=(p-nearest).dot(normal)
   if signed<report['minSignedDistanceM']:report['worst']={'frame':f,'vertex':v.index,'point':list(p),'nearest':list(nearest),'normal':list(normal)}
   report['minSignedDistanceM']=min(report['minSignedDistanceM'],signed);report['maxNearestSurfaceDistanceM']=max(report['maxNearestSurfaceDistanceM'],distance)
  se.to_mesh_clear();be.to_mesh_clear()
 results.append(report)
 if '--no-render' in sys.argv:continue
 data=bpy.data.cameras.new('GLBReview');cam=bpy.data.objects.new('GLBReview',data);scene.collection.objects.link(cam);scene.camera=cam
 cam.location=(2.3,-3.6,2);cam.rotation_euler=(Vector((0,-.05,1.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.75
 world=bpy.data.worlds.new('Review');scene.world=world;world.color=(.7,.7,.65)
 ld=bpy.data.lights.new('Review','AREA');ld.energy=700;ld.size=4;light=bpy.data.objects.new('Review',ld);scene.collection.objects.link(light);light.location=(2,-3,4)
 scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
 for frame in (1,25,73):
  scene.frame_set(frame);scene.render.filepath=str(out/(name+'-glb-'+str(frame)+'.png'));bpy.ops.render.render(write_still=True)
(out/'reload-validation.json').write_text(json.dumps(results,indent=2));print('GLB_RELOAD',json.dumps(results))
assert all(r['minSignedDistanceM']>0 and r['maxNearestSurfaceDistanceM']<.006 for r in results),results
