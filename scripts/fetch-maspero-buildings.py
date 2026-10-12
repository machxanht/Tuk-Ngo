import duckdb,urllib.request,json,pathlib,time
p=pathlib.Path(__file__).resolve().parent.parent/'public/assets/maps'
catalog=json.loads(urllib.request.urlopen('https://stac.overturemaps.org/catalog.json').read())
p.joinpath('overture-catalog.json').write_text(json.dumps(catalog),encoding='utf-8')
release=catalog.get('latest','2026-09-23.1')
print('release',release,flush=True)
c=duckdb.connect()
c.execute('INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;')
c.execute("SET s3_region='us-west-2'")
src=f's3://overturemaps-us-west-2/release/{release}/theme=buildings/type=building/*'
sql=f"""SELECT id, ST_AsGeoJSON(geometry), to_json(sources), height, num_floors,
ST_Area(ST_Transform(geometry,'EPSG:4326','EPSG:32648',always_xy:=true)) as area_m2
FROM read_parquet('{src}',hive_partitioning=1)
WHERE bbox.xmin >=105.971 AND bbox.xmax <=105.977
AND bbox.ymin >=9.6047 AND bbox.ymax <=9.6092"""
rows=c.execute(sql).fetchall()
features=[];rejected=[]
for id,g,s,h,f,a in rows:
 props={'id':id,'sources':json.loads(s) if s else [],'height':h,'num_floors':f,'area_m2':round(a,2),'height_status':'source_recorded_unverified' if h else 'unknown','release':release}
 feature={'type':'Feature','geometry':json.loads(g),'properties':props}
 (features if 12<=a<=2500 else rejected).append(feature)
p.joinpath('maspero-buildings.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False),encoding='utf-8')
p.joinpath('maspero-buildings-excluded.geojson').write_text(json.dumps({'type':'FeatureCollection','features':rejected}),encoding='utf-8')
p.joinpath('maspero-buildings-query.sql').write_text(sql,encoding='utf-8')
print('features',len(features),'excluded',len(rejected),'heights',sum(x['properties']['height'] is not None for x in features),flush=True)
