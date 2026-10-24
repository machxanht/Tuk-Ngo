"""Extract only the riverfront features used by the game from OSM map extracts.

Input: official /api/0.6/map XML, kept in the external research directory.
Output: small attributed derived dataset; no tiles, imagery or full city download.
The river is straightened into race coordinates; distances along its axis are
normalised to the existing game lengths. Building footprints retain metre scale.
"""
import argparse, json, math, xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
sources = Path(args.source_dir)
specs = {
 'phnom-penh': {
  'origin': [11.56485, 104.9336], 'axisEnd': [11.5787, 104.9257],
  'length': 1700, 'water': 1101341005,
  'features': [('moonlight',172268264),('throne-hall',172268276),
   ('silver-pagoda',172268277),('national-museum',446075047),
   ('palace-compound',1315431760),('palace-park',615419839)]},
 'siem-reap': {
  # Keep both game crossing lines 30 m inside the two mapped bridges. The
  # reported historical 500 m is a game distance, not a verified 2026 survey.
  'origin': [13.3576477,103.8586092], 'axisEnd': [13.3613023,103.8602208],
  'length': 500, 'water': 1422460292,
  'features': [('royal-residence',786233119),('royal-gardens',457433263),
   ('royal-shrine',502755968),('residence-compound',1119477127),
   ('fcc-angkor',372216937),('nr6-bridge',19728503),('tep-vong-bridge',19788143)]}
}
result = {'attribution':'© OpenStreetMap contributors',
 'license':'https://opendatacommons.org/licenses/odbl/1-0/',
 'source':'https://www.openstreetmap.org/copyright',
 'projection':'Local tangent plane, river straightened; game-length normalisation. Not a surveyed race boundary.',
 'venues':{}}

for city, spec in specs.items():
 tree = ET.parse(sources/(city+'-map.xml')).getroot()
 nodes = {int(n.attrib['id']):[float(n.attrib['lat']),float(n.attrib['lon'])] for n in tree.findall('node')}
 ways = {int(w.attrib['id']):w for w in tree.findall('way')}
 lat,lon = spec['origin']; metres=111320; coslat=math.cos(math.radians(lat))
 east=(spec['axisEnd'][1]-lon)*metres*coslat
 north=(spec['axisEnd'][0]-lat)*metres
 axis=math.hypot(east,north); ex,ey=east/axis,north/axis
 scale=spec['length']/axis
 def project(ll):
  e=(ll[1]-lon)*metres*coslat; n=(ll[0]-lat)*metres
  return [e*ex+n*ey,e*ey-n*ex]
 def points(ident): return [nodes[int(p.attrib['ref'])] for p in ways[ident].findall('nd')]
 polygon=[project(ll) for ll in points(spec['water'])]
 def banks(x):
  intersections=[]
  for a,b in zip(polygon,polygon[1:]):
   if min(a[0],b[0])<=x<max(a[0],b[0]):
    intersections.append(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]))
  if len(intersections)<2: raise ValueError((city,x,intersections))
  return min(intersections),max(intersections)
 def centre(x):
  left,right=banks(max(-200,min(axis+220,x)))
  return left+60 if city=='phnom-penh' else (left+right)/2
 samples=[]
 for i in range(-8,math.ceil(spec['length']/25)+10):
  x=i*25; left,right=banks(x/scale); c=centre(x/scale)
  # Existing two-lane steering/paddle corridor needs a minimum 38 m of water.
  samples.append([x+1090,round(min(-19,left-c),2),round(max(19,right-c),2)])
 features=[]
 for name,ident in spec['features']:
  ll=points(ident); pp=[project(p) for p in ll]
  if ll[0]==ll[-1]: ll=ll[:-1];pp=pp[:-1]
  x=sum(p[0] for p in pp)/len(pp);z=sum(p[1] for p in pp)/len(pp)
  # Rigid footprints: straightening moves the centre, not individual vertices.
  cx=1090+x*scale;cz=z-centre(x)
  footprint=[[round(cx+p[0]-x,2),round(cz+p[1]-z,2)] for p in pp]
  tags={t.attrib['k']:t.attrib['v'] for t in ways[ident].findall('tag')}
  features.append({'id':name,'osmWay':ident,'name':tags.get('name:en',tags.get('name',name)),
   'lat':round(sum(p[0] for p in ll)/len(ll),7),'lon':round(sum(p[1] for p in ll)/len(ll),7),
   'x':round(cx,2),'z':round(cz,2),'footprint':footprint})
 def inside(p,poly):
  hit=False
  for a,b in zip(poly,poly[1:]+poly[:1]):
   if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:hit=not hit
  return hit
 zones=[points(ident) for name,ident in spec['features'] if name in ['palace-compound','residence-compound','royal-gardens','fcc-angkor']]
 context=[];hero_ids={ident for _,ident in spec['features']}
 for ident,way in ways.items():
  tags={t.attrib['k']:t.attrib['v'] for t in way.findall('tag')}
  if 'building' not in tags or ident in hero_ids:continue
  ll=points(ident)[:-1]
  if len(ll)<3:continue
  mean=[sum(p[i] for p in ll)/len(ll) for i in [0,1]]
  if not any(inside(mean,zone) for zone in zones):continue
  pp=[project(p) for p in ll];x,z=project(mean);candidates=[]
  for a,b in zip(pp,pp[1:]+pp[:1]):
   angle=math.atan2(b[1]-a[1],b[0]-a[0]);co,si=math.cos(angle),math.sin(angle)
   u=[p[0]*co+p[1]*si for p in pp];v=[-p[0]*si+p[1]*co for p in pp]
   w,d=max(u)-min(u),max(v)-min(v)
   candidates.append((w*d,w,d,angle))
  _,w,d,angle=min(candidates)
  if w*d<12:continue
  context.append({'osmWay':ident,'x':round(1090+x*scale,2),'z':round(z-centre(x),2),
   'w':round(w,2),'d':round(d,2),'rotation':round(-angle,5)})
 result['venues'][city]={'origin':spec['origin'],'axisEnd':spec['axisEnd'],
  'axisMetres':round(axis,3),'longitudinalScale':round(scale,8),
  'gameLength':spec['length'],'waterWay':spec['water'],'banks':samples,'features':features,'contextBuildings':context}

target=root/'src/race/cambodia-layout.json'
target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
public=root/'public/assets/maps/cambodia-layout.json'
public.parent.mkdir(parents=True,exist_ok=True)
public.write_bytes(target.read_bytes())
print(target, target.stat().st_size, 'bytes')
