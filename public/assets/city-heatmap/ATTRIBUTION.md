# City Heatmap Geography

- Provider: DataV.GeoAtlas, Alibaba Cloud.
- Source pattern: https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json
- Retrieval date: 2026-09-15. Retrieval date is not the source boundary revision date.
- Index and per-region source links: src/assets/city-regions.json.
- Refresh script: game-tools/city-heatmap/refresh-geography.ps1.
- Files preserve source geometry coordinates; properties retain region codes and names only.
- 33 available region collections, 475 named subdivisions. Taiwan subdivision endpoint returned HTTP 404.
- Subdivision levels vary: prefecture-level cities, autonomous prefectures, directly administered counties, municipality districts and special administrative region areas.
- These files are a demonstration snapshot, not a guarantee of current administrative boundaries or official cartographic suitability. Provider rights remain with the source; no new license is asserted here.
- No statistical indicators are inferred from this geometry.
