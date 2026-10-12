from pathlib import Path
import json,math
root=Path(__file__).resolve().parent.parent
geo=json.loads((root/'public/assets/maps/maspero-buildings.geojson').read_text(encoding='utf8'))
lon0,lat0=105.97565895,9.6062873;lon1,lat1=105.97255835,9.6068528
mx=111319.49079327357*math.cos(math.radians(lat0));my=111319.49079327357
ex,ny=(lon1-lon0)*mx,(lat1-lat0)*my;length=math.hypot(ex,ny);ax,ay=ex/length,ny/length;scale=400/length
records=[]
for f in geo['features']:
 pts=[]
 for lon,lat in f['geometry']['coordinates'][0][:-1]:
  e,n=(lon-lon0)*mx,(lat-lat0)*my;pts.append([round(940+(e*ax+n*ay)*scale,3),round((-e*ay+n*ax)*scale,3)])
 records.append({'id':f['properties']['id'],'points':pts,'areaM2':f['properties']['area_m2'],'height':None})
data={'release':'2026-09-23.1','source':'Overture Maps Foundation','license':'ODbL-1.0','heightStatus':'unknown; game heights authored','projection':{'origin':[lon0,lat0],'axis':[ax,ay],'scale':scale,'bridgeAnchorX':[940,1340]},'buildings':records}
(root/'src/race/data').mkdir(exist_ok=True);(root/'src/race/data/maspero-buildings.json').write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False),encoding='utf8')
print({'count':len(records),'scale':scale,'heightStatus':'unknown'})
