SELECT id, ST_AsGeoJSON(geometry), to_json(sources), height, num_floors,
ST_Area(ST_Transform(geometry,'EPSG:4326','EPSG:32648',always_xy:=true)) as area_m2
FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=buildings/type=building/*',hive_partitioning=1)
WHERE bbox.xmin >=105.971 AND bbox.xmax <=105.977
AND bbox.ymin >=9.6047 AND bbox.ymax <=9.6092