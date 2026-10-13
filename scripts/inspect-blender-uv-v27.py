import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(root.parent/'asset-studio/hybrid-v25/athlete-prototype-v25.blend'))
body=bpy.data.objects['Athlete_Study_Anatomy_CC0']
result={'object':body.name,'uvLayers':[],'materials':[m.name for m in body.data.materials]}
for layer in body.data.uv_layers:
 result['uvLayers'].append({'name':layer.name,'min':[min(d.uv[k] for d in layer.data) for k in [0,1]],'max':[max(d.uv[k] for d in layer.data) for k in [0,1]],'active':layer==body.data.uv_layers.active})
print('UV_DIAGNOSTIC '+json.dumps(result))
