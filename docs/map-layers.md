# Map Layers Documentation

> Last updated: 7 March 2026

## Architecture

All maps in Dulra use two shared components:

- **`project-map.tsx`** — read-only map (Steps 2, 3, 4, 6, 7)
- **`project-map-with-draw.tsx`** — map with drawing tools (Step 1 GIS Mapping, Step 5 Habitat Mapping)

Both read base map config from **`lib/config/map-constants.ts`** (`TILE_LAYERS`).
Dataset overlay layers are defined in **`lib/config/dataset-layers.ts`** (`DATASET_GROUPS`).

---

## Base Maps (TILE_LAYERS)

These appear in the "Layers > Base Map" dropdown. Only one active at a time.

### XYZ Tile Layers (fast, pre-cached CDN)

| Layer                | Source            | Speed   | Notes                            |
| -------------------- | ----------------- | ------- | -------------------------------- |
| **Streets (OSM)**    | OpenStreetMap CDN | Instant | Global, free                     |
| **Satellite (ESRI)** | ArcGIS Online CDN | Instant | Global, free                     |
| **Hybrid**           | ESRI + OSM labels | Instant | Satellite + label overlay        |
| **Topographic**      | OpenTopoMap CDN   | Instant | Contour lines, elevation shading |

These are the fastest because they use pre-rendered tiles from global CDNs.

### WMS Layers (slower, server-rendered per request)

| Layer                           | WMS Endpoint                   | WMS Layer Name            | Speed                        | Scale Limits  | Notes                                                                                                             |
| ------------------------------- | ------------------------------ | ------------------------- | ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Soil Types (Teagasc)**        | `gis.epa.ie/geoserver/EPA/wms` | `EPA:SOILS_NationalSoils` | ~0.5-1s/tile                 | None          | All zoom levels work. Previously used `SOIL_SISNationalSoils` but that has ScaleHint 75K-5M (blank at high zoom). |
| **Soil Drainage (Teagasc)**     | `gis.epa.ie/geoserver/EPA/wms` | `EPA:SOILS_WETDRY`        | ~0.5-1s/tile                 | None          | All zoom levels work.                                                                                             |
| **Bedrock Geology (GSI)**       | `gis.epa.ie/geoserver/EPA/wms` | `EPA:GSI_Bedrock_100k`    | ~0.5s (site), ~11s (country) | None          | Country-wide is slow due to complex geology. Site-level zoom is fast.                                             |
| **Subsoils / Quaternary (GSI)** | `gis.epa.ie/geoserver/EPA/wms` | `EPA:Soil_subsoils_ie`    | ~0.8s/tile                   | max 1:400,000 | Only renders when zoomed in (~10km or closer). Blank at country zoom. Label says "zoom in".                       |
| **Bedrock Aquifer (GSI)**       | `gis.epa.ie/geoserver/EPA/wms` | `EPA:GEOL_GSI_Aquifer`    | ~0.5-0.7s/tile               | 1:25K - 1:4M  | Works at most zoom levels. May be blank at extreme country-wide zoom.                                             |

### WMS Layers — EPA Water Quality & WFD (transparent overlay on Streets base)

| Layer                            | WMS Endpoint                   | WMS Layer Name               | Speed      | Scale Limits | Notes                                                                                                              |
| -------------------------------- | ------------------------------ | ---------------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **River WFD Status (EPA)**       | `gis.epa.ie/geoserver/EPA/wms` | `EPA:RWB_WFD_LatestStatus`   | ~0.9s/tile | None         | Rivers colored by WFD status (High/Good/Moderate/Poor/Bad). Transparent overlay.                                   |
| **Lake WFD Status (EPA)**        | `gis.epa.ie/geoserver/EPA/wms` | `EPA:WFD_LWBStatus_20192024` | ~0.5s/tile | None         | Lakes colored by WFD status (2019-2024). Uses period layer instead of LatestStatus which timeouts at country zoom. |
| **Groundwater WFD Status (EPA)** | `gis.epa.ie/geoserver/EPA/wms` | `EPA:GWB_WFD_LatestStatus`   | ~0.8s/tile | None         | Groundwater bodies colored by WFD status. Transparent overlay.                                                     |
| **WFD Catchments (EPA)**         | `gis.epa.ie/geoserver/EPA/wms` | `EPA:WFD_Catchments`         | ~0.7s/tile | None         | WFD catchment boundaries. Transparent overlay.                                                                     |
| **WFD Sub-Catchments (EPA)**     | `gis.epa.ie/geoserver/EPA/wms` | `EPA:WFD_SubCatchments`      | ~1.0s/tile | None         | Detailed sub-catchment boundaries. Transparent overlay.                                                            |
| **River Basin Districts (WFD)**  | `gis.epa.ie/geoserver/EPA/wms` | `EPA:WFD_RIVERBASINDISTRICT` | ~0.5s/tile | None         | Major river basin district boundaries (SWRBD etc). Transparent overlay.                                            |

These are rendered as **transparent WMS overlays** on top of the Streets (OSM) base map, so the underlying map remains visible with the WFD data layered on top.

### Why WMS is slower than XYZ

XYZ tile layers (Streets, Satellite, etc.) serve pre-rendered 256x256 PNG tiles from CDN edge servers worldwide. The tile is already generated — the server just sends it.

WMS layers (Soil, Bedrock, etc.) render each tile on-the-fly from vector data on EPA's single GeoServer instance in Ireland. Every pan/zoom triggers new render requests. There's no way to fix this without the data provider pre-caching tiles.

### Attempted optimizations

| Approach                                               | Result                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **GWC WMS proxy** (`geoserver/gwc/service/wms`)        | Returns 400 errors — bbox alignment too strict for Leaflet's WMS requests                                                |
| **TMS pre-cached tiles** (`geoserver/gwc/service/tms`) | Tiles exist and are fast, but Leaflet throws "infinite tiles" error at certain zoom levels due to missing tiles at z=1-3 |
| **WMTS** (`geoserver/gwc/service/wmts`)                | Available but complex URL pattern, not tested further after TMS failure                                                  |

**Conclusion:** Regular WMS (`/geoserver/EPA/wms`) is the only reliable approach for now. Performance is acceptable at site-level zoom (~0.5s/tile).

---

## Data Source Servers

### EPA GeoServer (primary — fast, reliable)

- **URL:** `https://gis.epa.ie/geoserver/EPA/wms`
- **Status:** Online, stable
- **Speed:** 0.3-1s per tile at site zoom
- **Hosts:** Teagasc soil data, GSI geology data (mirrors), EPA water data, NPWS boundaries
- **Notes:** This is the best source. EPA mirrors data from Teagasc and GSI, so we don't need to hit their (often broken) servers directly.

### GSI GeoData (slow, unreliable)

- **URL:** `https://gsi.geodata.gov.ie/server/rest/services/`
- **Status:** Online but very slow (10-20s per tile at country zoom, often timeouts)
- **Speed:** 0.5-12s per tile depending on zoom
- **Hosts:** Bedrock, Quaternary, Karst, Landslide, Groundwater
- **Notes:** Avoid for base maps. Use EPA mirror when available. Only needed for layers EPA doesn't mirror (Karst, Landslide Susceptibility).

### Teagasc (dead)

- **URL:** `https://gis.teagasc.ie/`
- **Status:** Completely down (DNS resolution failure, connection timeout)
- **Notes:** All Teagasc soil data is available via EPA GeoServer. Do not reference this server.

### Old GSI (dead)

- **URL:** `https://gis.gsi.ie/server/services/`
- **Status:** Completely down (connection refused)
- **Notes:** Migrated to `gsi.geodata.gov.ie`. EPA also mirrors most GSI data.

---

## Dataset Overlay Layers (DATASET_GROUPS)

These are defined in `dataset-layers.ts` and shown in the dataset layer selector panel. They render as overlays on top of the active base map.

### NPWS Sites (ArcGIS FeatureServer — fast)

| Layer | URL                                                               | Type   | Status        |
| ----- | ----------------------------------------------------------------- | ------ | ------------- |
| SAC   | `services-eu1.arcgis.com/.../NPWSDesignatedAreas/FeatureServer/3` | ArcGIS | Working, fast |
| SPA   | `.../FeatureServer/0`                                             | ArcGIS | Working, fast |
| NHA   | `.../FeatureServer/2`                                             | ArcGIS | Working, fast |
| pNHA  | `.../FeatureServer/1`                                             | ArcGIS | Working, fast |

Rendered client-side as GeoJSON polygons via `useNPWSLayers` hook.

### EPA Water Data (WFS — moderate speed)

| Layer            | WMS Layer Name                                      | Status  |
| ---------------- | --------------------------------------------------- | ------- |
| Rivers           | `EPA:WFD_RiverWaterBodiesActive`                    | Working |
| Lakes            | `EPA:WFD_LakeWaterBodiesActive`                     | Working |
| Catchments       | `EPA:WFD_Catchments`                                | Working |
| River WFD Status | `EPA:WFD_RiverWaterBodiesActive` (styled by status) | Working |

Fetched as GeoJSON via WFS and rendered client-side via `useEPALayers` hook.

### Geology & Soils (WMS — via EPA)

| Layer                 | WMS Layer Name            | Status            | Notes                                |
| --------------------- | ------------------------- | ----------------- | ------------------------------------ |
| Soil Types            | `EPA:SOILS_NationalSoils` | Working           | No scale limit                       |
| Soil Drainage         | `EPA:SOILS_WETDRY`        | Working           | No scale limit                       |
| Bedrock Geology       | `EPA:GSI_Bedrock_100k`    | Working           | No scale limit, slow at country zoom |
| Subsoils / Quaternary | `EPA:Soil_subsoils_ie`    | Working (zoom in) | ScaleHint max 400K                   |

### Terrain & Elevation (mixed sources)

| Layer                    | Source                            | Status  | Notes                          |
| ------------------------ | --------------------------------- | ------- | ------------------------------ |
| Elevation Contours       | ESRI World Hillshade (ArcGIS)     | Working | Free global service            |
| Hillshade                | ESRI World Hillshade (ArcGIS)     | Working | Free global service            |
| Landslide Susceptibility | GSI direct (`gsi.geodata.gov.ie`) | Slow    | Not on EPA mirror, may timeout |

### GBIF Bat Records (XYZ Tile — fast)

| Layer              | URL                                                                                                    | Status  | Notes                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------- |
| Bat Records (GBIF) | `api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=734&country=IE&style=orange.point` | Working | Pre-rendered 512px density tiles, orange triangles, Ireland |

Uses GBIF Map Tiles API v2 with `taxonKey=734` (order Chiroptera) filtered to Ireland (`country=IE`). Rendered as a TileLayer overlay in the `overlayPane` with `tileSize=512` and `zoomOffset=-1` (GBIF `@1x` tiles are 512x512px). Toggle available in both `project-map.tsx` and `project-map-with-draw.tsx` under "Data Layers > ▲ Bat Records (GBIF)".

**Why GBIF?** BCIreland does not have a public API. Their bat records are held by NBDC (Dataset #128) under a "Restricted" license — view-only on their website, no API, WMS, or download available. NBDC ArcGIS server only hosts a Counties boundary service. GBIF is the only source with a Leaflet-compatible tile API for bat occurrence data in Ireland. If species-level bat data is needed (not just occurrence locations), a formal data request to NBDC or BCIreland would be required.

### BirdWatch Ireland I-WEBS (ArcGIS FeatureServer)

| Layer              | URL                                                               | Status  |
| ------------------ | ----------------------------------------------------------------- | ------- |
| I-WEBS Boundaries  | `services5.arcgis.com/.../IWeBS_Boundaries_2017/FeatureServer`    | Working |
| I-WEBS Site Points | `services5.arcgis.com/.../Map_Data_Coverage_Jul22/FeatureServer`  | Working |
| I-WEBS Sub-sites   | `services5.arcgis.com/.../Season_26_IWeBS_Subsites/FeatureServer` | Working |

---

## Known Issues

### Scale Limits (ScaleHint)

Some EPA/GSI WMS layers have server-side scale limits that cannot be overridden:

| Layer                   | ScaleHint | Effect                                                      |
| ----------------------- | --------- | ----------------------------------------------------------- |
| `SOIL_SISNationalSoils` | 75K - 5M  | Blank below 1:75K — **replaced with `SOILS_NationalSoils`** |
| `Soil_subsoils_ie`      | 0 - 400K  | Blank above 1:400K (country zoom)                           |
| `GEOL_GSI_Aquifer`      | 25K - 4M  | Blank at extreme zoom out                                   |

**Auto-zoom mitigation:** Scale-limited layers have a `minZoom` value in `map-constants.ts` (`subsoils: 10`, `aquifer: 8`). When a user selects one of these base maps, the map automatically zooms to the minimum required level and locks zoom-out to prevent blank tiles.

### Performance at Country Zoom

WMS layers rendering the entire country are slow (5-12s) because the server must render complex vector data for a huge area. This is unavoidable with WMS. At project-level zoom (5-10km area), performance is acceptable (~0.5s).

### GSI Server Reliability

`gsi.geodata.gov.ie` is unreliable — frequent timeouts, 10+ second response times. Always prefer EPA mirror when the same data is available. Layers only on GSI (Karst, Landslide) should be marked as potentially slow.

---

## Potential Improvements

### Pre-cached tiles (if EPA enables it)

EPA's GeoServer has GeoWebCache (GWC) installed with TMS and WMTS endpoints. Pre-cached tiles exist for some layers but Leaflet has compatibility issues (bbox alignment for GWC WMS, missing zoom levels for TMS). If EPA improves their tile cache configuration, switching to:

- **TMS:** `gis.epa.ie/geoserver/gwc/service/tms/1.0.0/{layer}@EPSG:900913@png/{z}/{x}/{y}.png`
- **WMTS:** `gis.epa.ie/geoserver/gwc/service/wmts`

would make WMS layers as fast as Streets/Satellite.

### Server-side tile proxy

Build a Next.js API route that proxies and caches WMS tile requests (e.g., `/api/tiles/soil-types/{z}/{x}/{y}.png`). Tiles could be cached in Vercel Edge or a CDN. This would:

- Convert WMS to XYZ tile format
- Add caching headers for CDN
- Handle retries for slow/failed requests
- Eliminate direct browser-to-EPA requests

### Additional layers to consider

| Layer                     | Source                                   | Notes                                              |
| ------------------------- | ---------------------------------------- | -------------------------------------------------- |
| Groundwater Vulnerability | GSI via EPA (`GEOL_GSI_GWVulnerability`) | Useful for ecological assessments, check if on EPA |
| Gravel Aquifer            | EPA (`GEOL_GSI_Aquifer_SandGravel`)      | Sand and gravel aquifers specifically              |
| Karst Features            | GSI direct only                          | Important for GWDTEs, but GSI server is slow       |
| OSI Aerial Photography    | Tailte Eireann MapGenie                  | Requires auth/license — waiting on Greg            |
