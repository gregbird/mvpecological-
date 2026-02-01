# GIS Implementation Status

**Last Updated:** 2026-01-31
**Status:** Step 1 Complete, Step 2 Complete

---

## Overview

Bu döküman, Dulra platformundaki GIS entegrasyonunun mevcut durumunu, beklenen özellikleri ve geliştirme yol haritasını takip eder.

### Tamamlanan Adımlar

| Step | Adım            | Durum         | Açıklama                                                         |
| ---- | --------------- | ------------- | ---------------------------------------------------------------- |
| 1    | GIS Mapping     | ✅ Tamamlandı | Boundary definition, buffer zones, NPWS overlay, measurement     |
| 2    | Data Gathering  | ✅ Tamamlandı | NPWS, GBIF, NBDC, EPA entegrasyonu, filtering, sorting, distance |
| 3    | Desk Assessment | ⏳ Bekliyor   | Finding relevance assessment                                     |

### Referans Dökümanlar

- `docs/draft_of_key_data_and_workflow.md` - İş gereksinimleri
- `docs/Ecological_survey_types.md` - Survey tipleri ve GIS data gereksinimleri
- `docs/USER_PERSONAS_AND_USE_CASES.md` - Kullanıcı senaryoları
- `docs/NBDC_API_INTEGRATION.md` - NBDC API entegrasyonu ve GBIF zenginleştirme

---

## 1. Project Boundary Definition

Assessor'ın projeyi başlatırken tanımladığı site boundary - tüm workflow boyunca kullanılan temel coğrafi veri.

### 1.1 Import Yöntemleri

| Yöntem               | Durum          | Dosya                                       | Notlar                              |
| -------------------- | -------------- | ------------------------------------------- | ----------------------------------- |
| **ArcGIS Online**    | 🟡 Coming Soon | `components/gis/arcgis-connection.tsx`      | UI hazır, gerçek API bağlantısı yok |
| **QGIS/PostGIS**     | 🟡 Coming Soon | `components/gis/qgis-connection.tsx`        | UI hazır, gerçek DB bağlantısı yok  |
| **Manual Drawing**   | 🟢 Aktif       | `components/maps/project-map-with-draw.tsx` | Leaflet-draw ile çalışıyor          |
| **GeoJSON Upload**   | 🟢 Aktif       | `components/steps/gis-mapping-step.tsx`     | .geojson, .json destekli            |
| **Shapefile Upload** | 🟢 Aktif       | `lib/gis/shapefile-parser.ts`               | `.shp`, `.zip` destekli             |

### 1.2 Manual Drawing - Detaylı Durum

**Konum:** `components/maps/project-map-with-draw.tsx`

| Özellik                    | Durum        | Notlar                       |
| -------------------------- | ------------ | ---------------------------- |
| Polygon çizimi             | ✅ Çalışıyor | Leaflet-draw EditControl     |
| Polygon düzenleme          | ✅ Çalışıyor | Vertex edit, move            |
| Polygon silme              | ✅ Çalışıyor | Delete control               |
| Area gösterimi             | ✅ Çalışıyor | `showArea: true`             |
| Length gösterimi           | ✅ Çalışıyor | `showLength: true`           |
| Self-intersection kontrolü | ✅ Çalışıyor | `allowIntersection: false`   |
| Basemap değiştirme         | ✅ Çalışıyor | OSM, ESRI Satellite, TopoMap |
| Fullscreen                 | ✅ Çalışıyor | Native fullscreen API        |
| Undo/Redo                  | ❌ Eksik     | Gelecek geliştirme           |
| Snap to vertex             | ❌ Eksik     | Nice to have                 |
| Distance measurement tool  | ✅ Çalışıyor | MeasureControl component     |

### 1.3 GeoJSON Upload - Detaylı Durum

**Konum:** `components/steps/gis-mapping-step.tsx` (handleFileUpload fonksiyonu)

| Özellik                     | Durum        | Notlar                            |
| --------------------------- | ------------ | --------------------------------- |
| .geojson parse              | ✅ Çalışıyor | JSON.parse                        |
| .json parse                 | ✅ Çalışıyor | JSON.parse                        |
| FeatureCollection → Feature | ✅ Çalışıyor | İlk polygon'u alır                |
| MultiPolygon → Polygon      | ✅ Çalışıyor | İlk ring'i alır                   |
| Error handling              | ✅ Çalışıyor | Toast notification                |
| **Shapefile (.shp) parse**  | ✅ Çalışıyor | `shpjs` library ile               |
| **Koordinat validasyonu**   | ✅ Çalışıyor | Ireland bounds check + warnings   |
| **CRS detection**           | ✅ Çalışıyor | WGS84, ITM, Irish Grid detection  |
| **Attribute extraction**    | ✅ Çalışıyor | Shapefile attribute'ları okunuyor |

### 1.4 Boundary Info Display

**Konum:** `components/steps/gis-mapping-step.tsx` (boundaryInfo useMemo)

| Özellik                | Durum        | Notlar                            |
| ---------------------- | ------------ | --------------------------------- |
| Irish Grid Reference   | ✅ Çalışıyor | `toIrishGridRef()` fonksiyonu     |
| Area (hectares)        | ✅ Çalışıyor | `calculateAreaHectares()`         |
| Center point (lat/lng) | ✅ Çalışıyor | Koordinat ortalaması              |
| Vertex count           | ✅ Çalışıyor | coords.length - 1                 |
| Perimeter (km)         | ✅ Çalışıyor | `calculatePerimeter()` fonksiyonu |
| Townland name          | ✅ Çalışıyor | OSM Nominatim reverse geocoding   |
| County                 | ✅ Çalışıyor | OSM Nominatim reverse geocoding   |
| Province               | ✅ Çalışıyor | County'den türetiliyor            |

### 1.5 Database Storage

**Konum:** `lib/supabase/queries/projects.ts` (updateProjectBoundary)

| Özellik                 | Durum         | Notlar                                 |
| ----------------------- | ------------- | -------------------------------------- |
| boundary (GeoJSON)      | ✅ Çalışıyor  | JSON olarak kaydediyor                 |
| center_point            | ✅ Çalışıyor  | Point GeoJSON                          |
| grid_reference          | ✅ Çalışıyor  | String (e.g., "O 318 259")             |
| PostGIS native geometry | ⚠️ Suboptimal | JSON yerine geometry tipi kullanılmalı |
| Version history         | ❌ Eksik      | Boundary değişiklik takibi yok         |

---

## 2. Map Features

### 2.1 Basemaps

**Konum:** `components/maps/project-map-with-draw.tsx` (TILE_LAYERS)

| Basemap        | Durum    | URL                     |
| -------------- | -------- | ----------------------- |
| OpenStreetMap  | ✅ Aktif | tile.openstreetmap.org  |
| ESRI Satellite | ✅ Aktif | server.arcgisonline.com |
| OpenTopoMap    | ✅ Aktif | tile.opentopomap.org    |
| OSI Basemaps   | ❌ Yok   | Lisans sorunu           |
| Bing Maps      | ❌ Yok   | API key gerekli         |

### 2.2 Dataset Layers

**Konum:** `lib/config/dataset-layers.ts`

| Kategori | Layers                                  | Durum                               |
| -------- | --------------------------------------- | ----------------------------------- |
| **NPWS** | SAC, SPA, NHA, pNHA                     | ✅ Çalışıyor (ArcGIS FeatureServer) |
| **EPA**  | Rivers, Lakes, Catchments, River Status | ✅ Çalışıyor (WMS)                  |
| **DAFM** | LPIS, Forestry, Natura 2000             | ❌ Public WMS endpoint yok          |

**NPWS API Endpoint (Güncel - Aralık 2024):**

```
https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer
```

| Layer ID | Layer Name                             |
| -------- | -------------------------------------- |
| 0        | Special Protection Areas (SPA)         |
| 1        | Proposed Natural Heritage Areas (pNHA) |
| 2        | Natural Heritage Areas (NHA)           |
| 3        | Special Areas of Conservation (SAC)    |

**EPA WMS Endpoint:**

```
https://gis.epa.ie/geoserver/EPA/wms
```

| Layer ID         | WMS Layer                  | Açıklama                    |
| ---------------- | -------------------------- | --------------------------- |
| rivers           | EPA:WATER_RIVNETROUTES     | River network               |
| lakes            | EPA:WFD_LAKESEGMENT        | WFD Lake segments           |
| catchments       | EPA:WFD_Catchments         | WFD Catchment boundaries    |
| wfd_river_status | EPA:WFD_RWBStatus_20192024 | River water quality 2019-24 |

### 2.3 Map Tools

| Tool                  | Durum        | Notlar                         |
| --------------------- | ------------ | ------------------------------ |
| Layer toggle (on/off) | ✅ Çalışıyor | DatasetLayersPanel             |
| Basemap switching     | ✅ Çalışıyor | Dropdown menu                  |
| Zoom controls         | ✅ Çalışıyor | Leaflet native                 |
| Fullscreen            | ✅ Çalışıyor | Native API                     |
| Distance measurement  | ✅ Çalışıyor | MeasureControl component       |
| Area measurement      | ❌ Eksik     | Leaflet plugin gerekli         |
| Buffer zone preview   | ✅ Çalışıyor | BufferZonePanel + Turf.js      |
| Print/Export to PDF   | ❌ Eksik     | Leaflet-image veya html2canvas |

---

## 3. External API Integrations

### 3.1 NPWS (National Parks & Wildlife Service)

**Konum:** `lib/external-apis/npws.ts`

| Fonksiyon                     | Durum        | Notlar                                |
| ----------------------------- | ------------ | ------------------------------------- |
| queryDesignatedSites()        | ✅ Kod hazır | Bounding box, geometry, buffer search |
| getDesignatedSiteByCode()     | ✅ Kod hazır | Specific site lookup                  |
| searchDesignatedSitesByName() | ✅ Kod hazır | Name-based search                     |
| **UI Entegrasyonu**           | ✅ Çalışıyor | NPWSLayerOverlay component            |

### 3.2 GBIF (Global Biodiversity Information Facility)

**Konum:** `lib/external-apis/gbif.ts`

| Fonksiyon              | Durum        | Notlar                         |
| ---------------------- | ------------ | ------------------------------ |
| searchOccurrences()    | ✅ Kod hazır | Species occurrence search      |
| getSpecies()           | ✅ Kod hazır | Taxonomy details               |
| occurrencesToGeoJSON() | ✅ Kod hazır | Map-ready format               |
| **UI Entegrasyonu**    | ✅ Çalışıyor | Data Gathering step'te entegre |

### 3.3 NBDC (National Biodiversity Data Centre)

**Konum:** `lib/external-apis/nbdc.ts`

| Fonksiyon                | Durum        | Notlar                         |
| ------------------------ | ------------ | ------------------------------ |
| searchRecordsByGridRef() | ✅ Kod hazır | Grid reference search          |
| searchRecordsByBbox()    | ✅ Kod hazır | Bounding box search (WFS)      |
| getProtectedSpecies()    | ✅ Kod hazır | Protected species list         |
| recordsToGeoJSON()       | ✅ Kod hazır | Map-ready format               |
| **UI Entegrasyonu**      | ✅ Çalışıyor | Data Gathering step'te entegre |

### 3.4 EPA (Environmental Protection Agency)

**Konum:** `lib/external-apis/epa.ts`

| Fonksiyon                  | Durum        | Notlar                         |
| -------------------------- | ------------ | ------------------------------ |
| searchRivers()             | ✅ Kod hazır | WFD Rivers query               |
| searchLakes()              | ✅ Kod hazır | WFD Lakes query                |
| searchCatchments()         | ✅ Kod hazır | Catchment boundaries           |
| searchWaterQuality()       | ✅ Kod hazır | Water quality stations         |
| searchAllAquaticFeatures() | ✅ Kod hazır | Combined query                 |
| **UI Entegrasyonu**        | ✅ Çalışıyor | Data Gathering step'te entegre |

---

## 4. Geliştirme Yol Haritası

### Faz 1: Kritik Eksikler (Öncelik: Yüksek) ✅ TAMAMLANDI

| #   | Özellik                   | Açıklama                                          | Durum         |
| --- | ------------------------- | ------------------------------------------------- | ------------- |
| 1.1 | Shapefile Import          | `.shp`, `.shx`, `.dbf` veya `.zip` dosya desteği  | ✅ Tamamlandı |
| 1.2 | Ireland Bounds Validation | Koordinat validasyonu (51.4°-55.4°N, 5.5°-10.5°W) | ✅ Tamamlandı |
| 1.3 | CRS Detection             | EPSG code detection ve WGS84'e dönüşüm            | ✅ Tamamlandı |

**Eklenen Kütüphaneler:**

- `shpjs` - Shapefile parsing ✅
- `@turf/boolean-point-in-polygon` - Spatial operations ✅
- `@turf/bbox` - Bounding box calculations ✅

### Faz 2: Yüksek Öncelik (Öncelik: Orta-Yüksek)

| #   | Özellik                | Açıklama                            | Durum         |
| --- | ---------------------- | ----------------------------------- | ------------- |
| 2.1 | Buffer Zone Preview    | 2km, 5km buffer haritada gösterim   | ✅ Tamamlandı |
| 2.2 | Distance Measurement   | Haritada mesafe ölçüm aracı         | ✅ Tamamlandı |
| 2.3 | NPWS Layer Overlay     | Designated sites haritada gösterim  | ✅ Tamamlandı |
| 2.4 | Townland/County Lookup | Reverse geocoding ile konum bilgisi | ✅ Tamamlandı |

**Eklenen Kütüphaneler:**

- `@turf/buffer` - Buffer zone calculation ✅
- `@turf/length` - Perimeter calculation ✅
- `@turf/area` - Area calculation ✅

### Faz 3: İyileştirmeler (Öncelik: Orta)

| #   | Özellik                  | Açıklama                  | Durum         |
| --- | ------------------------ | ------------------------- | ------------- |
| 3.1 | Perimeter Calculation    | Boundary çevre uzunluğu   | ✅ Tamamlandı |
| 3.2 | PostGIS Native Geometry  | JSON yerine geometry tipi | ❌ Bekliyor   |
| 3.3 | Boundary Version History | Değişiklik takibi         | ❌ Bekliyor   |
| 3.4 | Map Export to PDF        | Rapor için harita export  | ❌ Bekliyor   |

### Faz 4: Nice to Have (Öncelik: Düşük)

| #   | Özellik                 | Açıklama                  | Tahmini Efor |
| --- | ----------------------- | ------------------------- | ------------ |
| 4.1 | Undo/Redo for Drawing   | Çizim geri alma           | Orta         |
| 4.2 | Snap to Vertex          | Nokta hizalama            | Orta         |
| 4.3 | Mobile Offline Maps     | Saha için offline harita  | Yüksek       |
| 4.4 | Real-time Collaboration | Çoklu kullanıcı düzenleme | Çok Yüksek   |

---

## 5. Dosya Yapısı

```
components/
├── gis/
│   ├── index.ts                    # Export barrel
│   ├── gis-connection-modal.tsx    # GIS source selection modal
│   ├── arcgis-connection.tsx       # ArcGIS connection (Coming Soon)
│   ├── qgis-connection.tsx         # QGIS connection (Coming Soon)
│   ├── dataset-layers-panel.tsx    # Layer toggle panel
│   └── buffer-zone-panel.tsx       # ✅ NEW - Buffer zone controls
├── maps/
│   ├── project-map.tsx             # Display-only map + findings overlay
│   ├── project-map-with-draw.tsx   # Interactive map with drawing + buffer zones
│   ├── measure-control.tsx         # Distance measurement tool
│   └── npws-layer-overlay.tsx      # NPWS designated sites overlay
└── steps/
    └── gis-mapping-step.tsx        # Step 1: GIS Mapping workflow

lib/
├── gis/
│   ├── index.ts                    # Barrel export
│   ├── validation.ts               # Ireland bounds, CRS detection
│   ├── shapefile-parser.ts         # Shapefile (.shp, .zip) parsing
│   ├── buffer.ts                   # Buffer zone utilities
│   └── reverse-geocode.ts          # ✅ NEW - Townland/County lookup
├── config/
│   └── dataset-layers.ts           # NPWS, EPA, DAFM layer configs
├── external-apis/
│   ├── npws.ts                     # NPWS designated sites API
│   ├── gbif.ts                     # GBIF species occurrences API
│   └── nbdc.ts                     # NBDC biodiversity data API
└── supabase/
    └── queries/
        ├── projects.ts             # Project CRUD + boundary update
        └── habitats.ts             # Habitat polygons + area calculation
```

---

## 6. Minimum GIS Attribute Fields

Dokümandan alınan minimum attribute fields (GIS data section):

| Alan         | Zorunlu | Tip     | Açıklama                                  |
| ------------ | ------- | ------- | ----------------------------------------- |
| `OBJECT_ID`  | ✅      | Integer | Unique identifier                         |
| `FOSS_CODE`  | ✅      | String  | Fossitt habitat code (e.g., "WS1", "GA1") |
| `ANNEX_CODE` | ⚠️      | String  | EU Habitats Directive Annex I code        |
| `DATA_QUAL`  | ✅      | String  | S=Survey, V=Validated, DA-DD=Desktop      |
| `DATE`       | ✅      | Date    | Survey/creation date                      |
| `FOSS_NAME`  | ⚠️      | String  | Habitat name                              |
| `AREA`       | ⚠️      | Float   | Area in m² (auto-calculated)              |
| `LENGTH`     | ⚠️      | Float   | Length in m (for linear features)         |
| `PHOTO_ID`   | ⚠️      | String  | Linked photo references                   |
| `EVALUATION` | ⚠️      | String  | Conservation evaluation                   |
| `CONDITION`  | ⚠️      | Integer | 1-5 scale                                 |
| `THREATS`    | ⚠️      | String  | Natura 2000 threat codes                  |
| `NOTES`      | ⚠️      | String  | Free text comments                        |

---

## 7. Coordinate Systems

| CRS                       | EPSG | Kullanım                   | Durum      |
| ------------------------- | ---- | -------------------------- | ---------- |
| WGS84                     | 4326 | Map display, Leaflet       | ✅ Aktif   |
| Irish Transverse Mercator | 2157 | PostGIS storage, NPWS data | ⚠️ Partial |
| Irish Grid                | -    | Grid reference display     | ✅ Aktif   |

**Not:** Tüm spatial data WGS84'te saklanıyor. ITM dönüşümü için `proj4` library gerekebilir.

---

## 8. Changelog

### 2026-01-31 (Faz 1 Tamamlandı)

**Faz 1.1 - Shapefile Import:**

- `shpjs` kütüphanesi eklendi
- `lib/gis/shapefile-parser.ts` oluşturuldu
- `.shp` ve `.zip` dosya desteği eklendi
- MultiPolygon → Polygon dönüşümü
- Attribute extraction desteği

**Faz 1.2 - Ireland Bounds Validation:**

- `lib/gis/validation.ts` oluşturuldu
- Ireland bounding box kontrolü (51.4°-55.4°N, 5.5°-10.5°W)
- Warning sistemi (boundary İrlanda'ya yakın ama dışında)
- Polygon validity kontrolü (min 3 vertex, closed polygon)

**Faz 1.3 - CRS Detection:**

- EPSG code detection eklendi (WGS84, ITM, Irish Grid)
- Koordinat değerlerine göre otomatik CRS tespiti
- WGS84 dışındaki CRS'ler için hata mesajı

**Dosya Değişiklikleri:**

- `lib/gis/index.ts` - Barrel export
- `lib/gis/validation.ts` - Validation utilities
- `lib/gis/shapefile-parser.ts` - Shapefile parser
- `components/steps/gis-mapping-step.tsx` - Shapefile + validation entegrasyonu
- `components/gis/gis-connection-modal.tsx` - Coming Soon badges

### 2026-01-31 (Faz 2.4 Tamamlandı)

**Faz 2.4 - Townland/County Lookup:**

- `lib/gis/reverse-geocode.ts` oluşturuldu
  - OSM Nominatim API ile reverse geocoding
  - `reverseGeocode()` - Koordinattan konum bilgisi
  - `getLocationFromBoundary()` - Boundary centroid'den konum
  - `formatLocation()` - Konum bilgisini formatlama
  - County name normalization (Co. Dublin → Dublin)
  - Province mapping (County → Leinster/Munster/Connacht/Ulster)
  - Rate limiting için debounce (500ms)
- `lib/gis/index.ts` - Export eklendi
- `components/steps/gis-mapping-step.tsx` güncellendi
  - Location state ve useEffect eklendi
  - Boundary Information card'a Townland, County, Province eklendi
  - Loading state gösterimi

### 2026-01-31 (Faz 2.3 Tamamlandı)

**Faz 2.3 - NPWS Layer Overlay:**

- `components/maps/npws-layer-overlay.tsx` oluşturuldu
  - `NPWSLayerOverlay` component - designated sites haritada gösterimi
  - `useNPWSLayers` hook - state management ve fetch logic
  - Boundary'e göre bbox hesaplama (configurable search radius)
  - SAC, SPA, NHA, pNHA site tipleri destekleniyor (Ramsar yeni API'de mevcut değil)
  - Site-specific renklendirme (`getSiteTypeColor`)
  - Popup ile site detayları (Site Name, Code, Area)
  - Tooltip ile site adı gösterimi
- `components/maps/project-map-with-draw.tsx` güncellendi
  - `visibleLayers` prop eklendi
  - `npwsSearchRadius` prop eklendi (default: 5km)
  - NPWS sites count badge eklendi
  - useNPWSLayers hook entegrasyonu
- `components/steps/gis-mapping-step.tsx` güncellendi
  - `visibleLayers` prop haritaya aktarıldı

### 2026-01-31 (Faz 2.2 Tamamlandı)

**Faz 2.2 - Distance Measurement Tool:**

- `components/maps/measure-control.tsx` oluşturuldu
  - Toggle button (Measure/Exit)
  - Click to add measurement points
  - Live distance display (m/km)
  - Dashed line between points
  - Temporary line following cursor
  - Clear measurement button
  - Haversine formula ile mesafe hesaplama
- `components/maps/project-map-with-draw.tsx` güncellendi
  - `showMeasureTool` prop eklendi (default: true)
  - MeasureControl entegrasyonu

### 2026-01-31 (Faz 2.1 Tamamlandı)

**Faz 2.1 - Buffer Zone Preview:**

- `@turf/buffer`, `@turf/length`, `@turf/area` kütüphaneleri eklendi
- `lib/gis/buffer.ts` oluşturuldu
  - `createBuffer()` - Buffer polygon oluşturma
  - `calculatePerimeter()` - Çevre uzunluğu hesaplama (km)
  - `calculateAreaHa()` - Alan hesaplama (hektar)
  - `getBufferStyle()` - Buffer styling (farklı mesafeler için farklı opacity)
  - `STANDARD_BUFFER_DISTANCES` - 500m, 1km, 2km, 5km, 10km, 15km
- `components/gis/buffer-zone-panel.tsx` oluşturuldu
  - Buffer zone toggle switches
  - Visibility toggle (göster/gizle)
  - Interactive styling preview
- `components/maps/project-map-with-draw.tsx` güncellendi
  - `bufferZones` prop desteği
  - Buffer zones haritada görüntüleme (büyükten küçüğe)
- `components/steps/gis-mapping-step.tsx` güncellendi
  - BufferZonePanel entegrasyonu
  - Perimeter bilgisi Boundary Information'a eklendi

**Faz 3.1 - Perimeter Calculation (bonus):**

- `calculatePerimeter()` fonksiyonu ile boundary çevre uzunluğu
- Boundary Information paneline "Perimeter: X.XX km" eklendi

### 2026-01-31 (Başlangıç)

- ArcGIS ve QGIS seçenekleri "Coming Soon" olarak işaretlendi
- GIS Implementation Status dokümanı oluşturuldu
- Manual Drawing ve GeoJSON Upload analizi tamamlandı

### 2026-01-31 (Map Integration - Findings on Map)

**ProjectMap Component Updates:**

- `components/maps/project-map.tsx` güncellendi
  - `findings` prop eklendi - DeskResearchFinding array
  - `selectedFinding` prop eklendi - Seçili finding highlight
  - `visibleFindingTypes` prop eklendi - Type filtering
  - `onFindingClick` callback eklendi
  - Finding type colors (designated_site: green, species_record: blue, water_quality: cyan, catchment: purple)
  - Finding source colors (NPWS: green, GBIF: blue, NBDC: purple, EPA: cyan, Manual: amber)
  - Geometry support: Point, Polygon, MultiPolygon, LineString, GeometryCollection
  - MapController: Zoom to selected finding (flyTo/flyToBounds)
  - Finding popup with source badge, title, content, distance

**DataGatheringStep Integration:**

- `components/steps/data-gathering-step.tsx` güncellendi
  - ProjectMap'e findings props eklendi
  - `allSavedFindings` haritada görüntüleniyor
  - `selectedFinding` state ile zoom-to-location
  - `onFindingClick` ile finding seçimi

**Layer Controls:**

- Findings layer "Desk Research Findings" olarak layers listesine eklendi
- Layer toggle ile findings görünürlüğü kontrol edilebiliyor

### 2026-02-01 (Step 2: Data Gathering Wizard Refactoring)

**Database Migrations:**

- `projects` tablosuna `townland`, `county`, `province`, `enabled_buffer_distances` kolonları eklendi
- `desk_research_findings` tablosuna `distance_from_boundary_km`, `is_protected`, `red_list_status`, `relevance_level` kolonları eklendi
- `target_notes` tablosu oluşturuldu (RLS policies dahil)
- `update_project_boundary` RPC fonksiyonu güncellendi

**TypeScript Types:**

- `types/database.ts` güncellendi
  - Project type'a yeni kolonlar eklendi
  - TargetNote, TargetNoteCategory, TargetNotePriority, RelevanceLevel tipleri eklendi
  - DeskResearchFinding type'a yeni kolonlar eklendi

**GIS Mapping Güncellemesi:**

- `components/steps/gis-mapping-step.tsx` güncellendi
  - `handleSave()` fonksiyonuna townland, county, province kaydetme eklendi
- `lib/supabase/queries/projects.ts` güncellendi
  - `updateProjectBoundary()` fonksiyonuna yeni parametreler eklendi
- `hooks/use-project-data.ts` güncellendi
  - `useUpdateProjectBoundary` hook'una yeni parametreler eklendi

**Target Notes Altyapısı:**

- `lib/supabase/queries/target-notes.ts` oluşturuldu
  - `getProjectTargetNotes()` - Proje target notes listesi
  - `createTargetNote()` - Target note oluşturma
  - `updateTargetNote()` - Target note güncelleme
  - `deleteTargetNote()` - Target note silme
  - `verifyTargetNote()` - Target note doğrulama
  - `getTargetNotesStats()` - İstatistikler
- `hooks/use-project-data.ts` güncellendi
  - `useTargetNotes`, `useTargetNote`, `useTargetNotesStats` hooks eklendi
  - `useCreateTargetNote`, `useUpdateTargetNote`, `useDeleteTargetNote`, `useVerifyTargetNote` mutation hooks eklendi

**Data Gathering Wizard:**

- `components/steps/data-gathering-step.tsx` wizard yapısına dönüştürüldü
  - 5 sub-step: Info, Sites, Species, Aquatic, Review
  - GIS Mapping pattern kullanıldı
  - Preview mode ve wizard mode desteği

**Sub-Step Componentleri:**

- `components/steps/data-gathering/project-info-substep.tsx` - GIS data özeti
- `components/steps/data-gathering/designated-sites-substep.tsx` - NPWS araması
- `components/steps/data-gathering/species-records-substep.tsx` - GBIF + NBDC araması
- `components/steps/data-gathering/aquatic-features-substep.tsx` - EPA araması
- `components/steps/data-gathering/review-export-substep.tsx` - Özet ve export
- `components/steps/data-gathering/findings-list.tsx` - Reusable findings list
- `components/steps/data-gathering/target-note-form.tsx` - Target note formu
- `components/steps/data-gathering/export-findings-modal.tsx` - Export modal
- `components/steps/data-gathering/index.ts` - Barrel export

**TypeScript Fixes:**

- `FindingSource` ve `FindingType` type imports eklendi
- `ProjectMap` component'ine veri gönderirken type cast'ler eklendi
- `Shield` icon'dan geçersiz `title` prop kaldırıldı
- `NBDCRecord` type'da olmayan `RedList` property kullanımı kaldırıldı

### 2026-01-31 (Step 2: Data Gathering - Tam Entegrasyon)

**NBDC Entegrasyonu:**

- `lib/external-apis/nbdc.ts` güncellendi
  - `searchRecordsByBbox()` fonksiyonu eklendi (WFS ile bbox araması)
  - `searchProtectedSpeciesInBbox()` fonksiyonu eklendi
- `components/desk-research/search-interface.tsx` güncellendi
  - NBDC araması performSearch'e entegre edildi
  - Species records gruplandırılıyor ve görüntüleniyor

**EPA Entegrasyonu:**

- `lib/external-apis/epa.ts` oluşturuldu
  - `searchRivers()` - WFD rivers araması
  - `searchLakes()` - WFD lakes araması
  - `searchCatchments()` - Catchment boundaries
  - `searchWaterQuality()` - Water quality stations
  - `searchAllAquaticFeatures()` - Tüm aquatic features tek çağrıda
  - WFD status renklendirme ve display fonksiyonları
- `components/desk-research/search-interface.tsx` güncellendi
  - EPA araması performSearch'e entegre edildi
  - Rivers, lakes, catchments görüntüleniyor

**Finding Edit Modal:**

- `components/desk-research/finding-edit-modal.tsx` oluşturuldu
  - Notes ve relevance assessment (High/Medium/Low/None)
  - Finding metadata görüntüleme
  - Format: `[relevance] notes` olarak kaydediliyor

**Manuel Finding Formu:**

- `components/desk-research/manual-finding-form.tsx` oluşturuldu
  - Title, type, description, notes alanları
  - Type'a göre conditional fields (siteCode, scientificName)
  - Source URL desteği
  - Source: 'manual' olarak işaretleniyor

**Source URL'leri:**

- NPWS findings: `https://www.npws.ie/protected-sites/{type}/{siteCode}` (örn: `/protected-sites/sac/002122`)
- GBIF findings: `https://www.gbif.org/species/{speciesKey}`
- NBDC findings: `https://maps.biodiversityireland.ie/Species/{taxonId}`
- EPA findings: `https://www.catchments.ie/data/#/waterbody/{code}`

**Filtreleme ve Sıralama:**

- Source filter (NPWS, GBIF, NBDC, EPA, Manual)
- Type filter (designated_site, species_record, water_quality, catchment)
- Sort by: Distance, Source, Type, Title
- Sort order: Asc/Desc toggle

**Distance Hesaplama:**

- `calculateDistanceFromBoundary()` fonksiyonu eklendi
- Turf.js ile point-to-polygon distance
- Boundary içindeyse 0, dışındaysa km olarak mesafe
- Tüm findings'e metadata.distance eklendi
- Varsayılan sıralama: Nearest first

**Pagination:**

- 20 sonuç per page
- "Load More" butonu ile daha fazla sonuç yükleme
- Kalan sonuç sayısı gösterimi

**Source Selector Güncellemesi:**

- EPA: 'partial' → 'available' (tam entegrasyon)
- Catchments.ie: 'partial' → 'unavailable' (EPA üzerinden erişilebilir)
- NBDC: Status confirmed 'available'

**Dosya Değişiklikleri:**

- `lib/external-apis/nbdc.ts` - Bbox search eklendi
- `lib/external-apis/epa.ts` - Yeni dosya (EPA API client)
- `components/desk-research/search-interface.tsx` - Tam yeniden yazıldı
- `components/desk-research/finding-edit-modal.tsx` - Yeni dosya
- `components/desk-research/manual-finding-form.tsx` - Yeni dosya
- `components/desk-research/source-selector.tsx` - Status güncellemeleri

---

## 9. İlgili Issues / Tasks

- [x] Faz 1.1: Shapefile import desteği ✅
- [x] Faz 1.2: Ireland bounds validation ✅
- [x] Faz 1.3: CRS detection ✅
- [x] Faz 2.1: Buffer zone preview ✅
- [x] Faz 2.2: Distance measurement tool ✅
- [x] Faz 2.3: NPWS layer overlay ✅
- [x] Faz 2.4: Townland/County lookup ✅
- [x] Faz 3.1: Perimeter calculation ✅

### Step 2: Data Gathering Tasks

- [x] NBDC entegrasyonu ✅
- [x] EPA API client oluşturma ✅
- [x] EPA entegrasyonu (rivers, lakes, catchments) ✅
- [x] Finding edit modal ✅
- [x] Manuel finding formu ✅
- [x] Source URL'leri ekleme ✅
- [x] Sonuç filtreleme ✅
- [x] Sonuç sıralama ✅
- [x] Distance from boundary hesaplama ✅
- [x] Pagination ✅
- [x] Source selector status düzeltmeleri ✅

### Map Integration Tasks

- [x] ProjectMap findings desteği ✅
- [x] Finding tıklanınca zoom to location ✅
- [x] Finding layer toggle ✅
- [x] DataGatheringStep harita entegrasyonu ✅
- [ ] HabitatMappingStep findings overlay (gelecek iterasyon)

### Step 2: Data Gathering Wizard Refactoring Tasks (2026-02-01)

- [x] Database migrations (projects, desk_research_findings, target_notes tabloları) ✅
- [x] TypeScript types güncelleme ✅
- [x] GIS Mapping'den location data kaydetme ✅
- [x] Target notes queries ve hooks ✅
- [x] Wizard yapısına dönüşüm ✅
- [x] Sub-step componentleri oluşturma ✅
- [x] TypeScript hataları düzeltme ✅

---

## 10. Step 2: Data Gathering Wizard

### 10.1 Genel Bakış

Data Gathering adımı, GIS Mapping gibi wizard-style sub-steps yapısına dönüştürüldü. Kullanıcılar her sub-step'te farklı veri kaynaklarından arama yapabilir ve bulguları projeye kaydedebilir.

### 10.2 Sub-Steps

| #   | ID        | Label            | Icon       | Amaç                                                       |
| --- | --------- | ---------------- | ---------- | ---------------------------------------------------------- |
| 1   | `info`    | Project Info     | `Info`     | GIS'ten gelen verilerin özeti, buffer zones, location info |
| 2   | `sites`   | Designated Sites | `MapPin`   | NPWS araması (SAC, SPA, NHA, pNHA)                         |
| 3   | `species` | Species Records  | `Bug`      | GBIF + NBDC araması, protected species                     |
| 4   | `aquatic` | Aquatic Features | `Droplets` | EPA rivers, lakes, catchments                              |
| 5   | `review`  | Review & Export  | `Check`    | Özet, export, target notes, tamamlama                      |

### 10.3 Database Schema Değişiklikleri

**1. `projects` tablosuna eklenen kolonlar:**

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS townland text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS enabled_buffer_distances numeric[] DEFAULT ARRAY[2, 5]::numeric[];
```

**2. `desk_research_findings` tablosuna eklenen kolonlar:**

```sql
ALTER TABLE desk_research_findings
  ADD COLUMN IF NOT EXISTS distance_from_boundary_km numeric,
  ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS red_list_status text,
  ADD COLUMN IF NOT EXISTS relevance_level text CHECK (relevance_level IN ('high', 'medium', 'low'));
```

**3. `target_notes` tablosu (Yeni):**

```sql
CREATE TABLE target_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES desk_research_findings(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('access_point', 'check_feature', 'habitat', 'fauna', 'flora', 'management', 'damage', 'ownership')),
  title text NOT NULL,
  description text,
  location jsonb,
  priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### 10.4 Component Yapısı

```
components/steps/
├── data-gathering-step.tsx          # Wizard Container
└── data-gathering/
    ├── index.ts                      # Barrel export
    ├── project-info-substep.tsx      # GIS data display
    ├── designated-sites-substep.tsx  # NPWS search
    ├── species-records-substep.tsx   # GBIF + NBDC search
    ├── aquatic-features-substep.tsx  # EPA search
    ├── review-export-substep.tsx     # Summary + export + target notes
    ├── findings-list.tsx             # Reusable findings list
    ├── target-note-form.tsx          # Target note form
    └── export-findings-modal.tsx     # Export modal (CSV/GeoJSON/JSON)
```

### 10.5 Sub-Step Componentleri

#### ProjectInfoSubStep

- GIS Mapping'den gelen boundary bilgilerini gösterir
- Townland, County, Province bilgileri
- Aktif buffer distances
- Aranacak veri kaynaklarının listesi
- Mevcut bulgu sayısı

#### DesignatedSitesSubStep

- NPWS API ile SAC, SPA, NHA, pNHA araması
- Buffer zone seçimi
- Harita ile entegre görüntüleme
- Bulguları kaydetme/silme
- Distance from boundary hesaplama

#### SpeciesRecordsSubStep

- GBIF ve NBDC tabları
- Protected species flag'leri
- Tür gruplandırma (scientific name bazında)
- Record count gösterimi
- Harita ile entegre görüntüleme

#### AquaticFeaturesSubStep

- EPA API ile rivers, lakes, catchments araması
- WFD status gösterimi
- Harita ile entegre görüntüleme
- Distance hesaplama

#### ReviewExportSubStep

- Kayıtlı bulgu özeti (source ve type bazında)
- Target notes yönetimi
- Export seçenekleri (CSV, GeoJSON, JSON)
- Step tamamlama butonu

### 10.6 Hooks

**Target Notes Hooks (`hooks/use-project-data.ts`):**

```typescript
// Target notes listesi
useTargetNotes(projectId: string)

// Tek target note
useTargetNote(noteId: string)

// Target notes istatistikleri
useTargetNotesStats(projectId: string)

// CRUD operasyonları
useCreateTargetNote()
useUpdateTargetNote()
useDeleteTargetNote()
useVerifyTargetNote()
```

### 10.7 Validation Rules

| Step    | Validation                         | Atlanabilir?        |
| ------- | ---------------------------------- | ------------------- |
| Info    | Project boundary olmalı            | Hayır (GIS'e bağlı) |
| Sites   | -                                  | Evet                |
| Species | -                                  | Evet                |
| Aquatic | -                                  | Evet                |
| Review  | En az 1 finding kaydedilmiş olmalı | Hayır               |

### 10.8 Export Formatları

**CSV:**

- Findings ve Target Notes ayrı bölümlerde
- Excel uyumlu format
- Türkçe karakter desteği

**GeoJSON:**

- Sadece location'ı olan findings ve notes
- GIS yazılımlarında açılabilir (QGIS, ArcGIS)

**JSON:**

- Tüm data (location olmasa da)
- Metadata dahil
- Programatik erişim için

### 10.9 Target Note Kategorileri

| Kategori        | Açıklama                    |
| --------------- | --------------------------- |
| `access_point`  | Saha girişi/çıkışı          |
| `check_feature` | Sahada doğrulanacak özellik |
| `habitat`       | Habitat alanı               |
| `fauna`         | Hayvan türü                 |
| `flora`         | Bitki türü                  |
| `management`    | Arazi yönetimi              |
| `damage`        | Hasar veya tehdit           |
| `ownership`     | Mülkiyet bilgisi            |

---

## 11. Veri Kaynakları ve Kısaltmalar

### 10.1 NPWS (National Parks & Wildlife Service)

**Kurum:** İrlanda Ulusal Parklar ve Yaban Hayatı Servisi - Korunan alanların yönetiminden sorumlu devlet kurumu.

**API Endpoint:** `https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer`

| Kısaltma   | Tam Adı                        | Açıklama                                                                                                        |
| ---------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **SAC**    | Special Area of Conservation   | AB Habitat Direktifi kapsamında korunan alanlar. Nadir ve tehlike altındaki habitatlar ile türleri korur.       |
| **SPA**    | Special Protection Area        | AB Kuş Direktifi kapsamında korunan alanlar. Nadir ve tehlike altındaki kuş türlerinin yaşam alanlarını korur.  |
| **NHA**    | Natural Heritage Area          | İrlanda ulusal mevzuatı kapsamında korunan alanlar. Ulusal öneme sahip doğal miras bölgeleri.                   |
| **pNHA**   | Proposed Natural Heritage Area | NHA olarak önerilmiş ama henüz yasal olarak tescil edilmemiş alanlar. Yine de değerlendirmede dikkate alınmalı. |
| **Ramsar** | Ramsar Wetland Site            | Uluslararası öneme sahip sulak alanlar (Ramsar Sözleşmesi). Genellikle SAC/SPA ile örtüşür.                     |

### 10.2 EPA (Environmental Protection Agency)

**Kurum:** İrlanda Çevre Koruma Ajansı - Su kalitesi, emisyonlar ve çevre izleme konularında yetkili kuruluş.

**API Endpoint:** `https://gis.epa.ie/geoserver/EPA/wms` (WMS) / `https://gis.epa.ie/geoserver/EPA/wfs` (WFS)

| Kısaltma       | Tam Adı                    | Açıklama                                                                                    |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| **WFD**        | Water Framework Directive  | AB Su Çerçeve Direktifi. Tüm su kütlelerinin "iyi ekolojik durum"a ulaşmasını hedefler      |
| **WMS**        | Web Map Service            | Harita görüntüsü (raster) döndüren OGC standardı. Filtreleme imkanı sınırlı.                |
| **WFS**        | Web Feature Service        | Vektör veri (GeoJSON/GML) döndüren OGC standardı. Bbox ile filtreleme yapılabilir.          |
| **Rivers**     | WFD River Water Bodies     | Su Çerçeve Direktifi kapsamındaki nehir su kütleleri. Su kalitesi durumu içerir.            |
| **Lakes**      | WFD Lake Water Bodies      | Su Çerçeve Direktifi kapsamındaki göl su kütleleri.                                         |
| **Catchments** | River Catchment Boundaries | Nehir havzası sınırları. Yağış sularının toplandığı alanları gösterir.                      |
| **RBD**        | River Basin District       | Nehir Havzası Bölgesi. İrlanda'da 4 ana RBD var (Eastern, South Eastern, Shannon, Western). |

**WFD Su Kalitesi Durumları:**

| Durum      | Renk | Açıklama                   |
| ---------- | ---- | -------------------------- |
| High       | 🔵   | Mükemmel ekolojik durum    |
| Good       | 🟢   | İyi ekolojik durum (hedef) |
| Moderate   | 🟡   | Orta - iyileştirme gerekli |
| Poor       | 🟠   | Kötü - acil eylem gerekli  |
| Bad        | 🔴   | Çok kötü - ciddi bozulma   |
| Unassigned | ⚫   | Henüz değerlendirilmemiş   |

### 10.3 Catchments.ie

**Kurum:** EPA tarafından yönetilen su havzaları bilgi portalı. Aslında EPA verilerinin kullanıcı dostu arayüzü.

**Web Sitesi:** `https://www.catchments.ie`

Bu portal, EPA verilerine erişim sağlar. Sistemimizde EPA API'leri doğrudan kullanıldığından Catchments.ie ayrı bir veri kaynağı olarak işaretlenmemiştir.

Sağladığı bilgiler:

- Nehir havzası raporları
- Su kalitesi izleme verileri
- Havza yönetim planları
- İyileştirme önlemleri

### 10.4 NBDC (National Biodiversity Data Centre)

**Kurum:** İrlanda Ulusal Biyoçeşitlilik Veri Merkezi - Tür gözlem kayıtlarının merkezi veritabanı.

**API Endpoint:** `https://maps.biodiversityireland.ie/` (WFS/WMS)

| Kısaltma     | Tam Adı              | Açıklama                                                            |
| ------------ | -------------------- | ------------------------------------------------------------------- |
| **Grid Ref** | Irish Grid Reference | İrlanda'ya özgü koordinat sistemi (ör: O 318 259). 10km, 1km, 100m. |
| **Taxon ID** | Taxonomic Identifier | Türlerin benzersiz kimlik numarası.                                 |

**Koruma Durumları:**

| Kısaltma         | Tam Adı                         | Açıklama                                        |
| ---------------- | ------------------------------- | ----------------------------------------------- |
| **Red List**     | IUCN Red List of Threatened Spp | Tehlike altındaki türlerin uluslararası listesi |
| **Wildlife Act** | Wildlife Acts 1976 & 2000       | İrlanda'da yasal koruma altındaki türler        |
| **Annex II**     | Habitats Directive Annex II     | AB düzeyinde korunan türler                     |
| **Annex IV**     | Habitats Directive Annex IV     | Sıkı koruma gerektiren türler                   |

### 10.5 GBIF (Global Biodiversity Information Facility)

**Kurum:** Küresel Biyoçeşitlilik Bilgi Tesisi - Dünya genelinde tür gözlem verilerini toplayan uluslararası ağ.

**API Endpoint:** `https://api.gbif.org/v1/`

Sağladığı bilgiler:

- Tür gözlem kayıtları (occurrence records)
- Taksonomi bilgileri
- Müze koleksiyon verileri
- Citizen science verileri

### 10.6 Diğer Kısaltmalar

| Kısaltma    | Tam Adı                         | Açıklama                                                       |
| ----------- | ------------------------------- | -------------------------------------------------------------- |
| **GIS**     | Geographic Information System   | Coğrafi bilgi sistemi                                          |
| **CRS**     | Coordinate Reference System     | Koordinat referans sistemi (ör: WGS84, ITM)                    |
| **EPSG**    | European Petroleum Survey Group | Koordinat sistemi kod standardı (ör: EPSG:4326 = WGS84)        |
| **WGS84**   | World Geodetic System 1984      | GPS'in kullandığı global koordinat sistemi (EPSG:4326)         |
| **ITM**     | Irish Transverse Mercator       | İrlanda'nın resmi projeksiyon sistemi (EPSG:2157)              |
| **OSM**     | OpenStreetMap                   | Açık kaynak harita veritabanı                                  |
| **ESRI**    | Environmental Systems Research  | GIS yazılım şirketi (ArcGIS üreticisi)                         |
| **PostGIS** | PostgreSQL GIS Extension        | PostgreSQL için spatial veri uzantısı                          |
| **bbox**    | Bounding Box                    | Coğrafi alan sınırları (minLng, minLat, maxLng, maxLat)        |
| **FOSSITT** | Fossitt Classification System   | İrlanda habitat sınıflandırma sistemi (ör: WS1 = Oak Woodland) |

---
