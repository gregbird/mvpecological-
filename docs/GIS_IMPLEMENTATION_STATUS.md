# GIS Implementation Status

**Last Updated:** 2026-01-31
**Status:** In Progress

---

## Overview

Bu döküman, Dulra platformundaki GIS entegrasyonunun mevcut durumunu, beklenen özellikleri ve geliştirme yol haritasını takip eder.

### Referans Dökümanlar

- `docs/draft_of_key_data_and_workflow.md` - İş gereksinimleri
- `docs/Ecological_survey_types.md` - Survey tipleri ve GIS data gereksinimleri
- `docs/USER_PERSONAS_AND_USE_CASES.md` - Kullanıcı senaryoları

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
| Distance measurement tool  | ❌ Eksik     | Faz 2'de planlandı           |

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

| Özellik                | Durum        | Notlar                        |
| ---------------------- | ------------ | ----------------------------- |
| Irish Grid Reference   | ✅ Çalışıyor | `toIrishGridRef()` fonksiyonu |
| Area (hectares)        | ✅ Çalışıyor | `calculateAreaHectares()`     |
| Center point (lat/lng) | ✅ Çalışıyor | Koordinat ortalaması          |
| Vertex count           | ✅ Çalışıyor | coords.length - 1             |
| Perimeter (km)         | ❌ Eksik     | Turf.js ile eklenebilir       |
| Townland name          | ❌ Eksik     | Reverse geocoding gerekli     |
| County                 | ❌ Eksik     | Reverse geocoding gerekli     |

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

| Kategori | Layers                                | Durum                                 |
| -------- | ------------------------------------- | ------------------------------------- |
| **NPWS** | SAC, SPA, NHA, pNHA, Ramsar           | 🟡 Config var, entegrasyon eksik      |
| **EPA**  | Rivers, Lakes, Catchments, WFD Status | 🟡 Config var, WMS entegrasyonu eksik |
| **DAFM** | LPIS, Forestry, Natura 2000 Zones     | 🟡 Config var, WMS entegrasyonu eksik |

### 2.3 Map Tools

| Tool                  | Durum        | Notlar                         |
| --------------------- | ------------ | ------------------------------ |
| Layer toggle (on/off) | ✅ Çalışıyor | DatasetLayersPanel             |
| Basemap switching     | ✅ Çalışıyor | Dropdown menu                  |
| Zoom controls         | ✅ Çalışıyor | Leaflet native                 |
| Fullscreen            | ✅ Çalışıyor | Native API                     |
| Distance measurement  | ❌ Eksik     | Leaflet plugin gerekli         |
| Area measurement      | ❌ Eksik     | Leaflet plugin gerekli         |
| Buffer zone preview   | ❌ Eksik     | Turf.js gerekli                |
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
| **UI Entegrasyonu**           | ❌ Eksik     | Haritada gösterim yok                 |

### 3.2 GBIF (Global Biodiversity Information Facility)

**Konum:** `lib/external-apis/gbif.ts`

| Fonksiyon              | Durum        | Notlar                    |
| ---------------------- | ------------ | ------------------------- |
| searchOccurrences()    | ✅ Kod hazır | Species occurrence search |
| getSpecies()           | ✅ Kod hazır | Taxonomy details          |
| occurrencesToGeoJSON() | ✅ Kod hazır | Map-ready format          |
| **UI Entegrasyonu**    | ❌ Eksik     | Haritada gösterim yok     |

### 3.3 NBDC (National Biodiversity Data Centre)

**Konum:** `lib/external-apis/nbdc.ts`

| Fonksiyon                | Durum        | Notlar                 |
| ------------------------ | ------------ | ---------------------- |
| searchRecordsByGridRef() | ✅ Kod hazır | Grid reference search  |
| getProtectedSpecies()    | ✅ Kod hazır | Protected species list |
| recordsToGeoJSON()       | ✅ Kod hazır | Map-ready format       |
| **UI Entegrasyonu**      | ❌ Eksik     | Haritada gösterim yok  |

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

| #   | Özellik                | Açıklama                            | Tahmini Efor |
| --- | ---------------------- | ----------------------------------- | ------------ |
| 2.1 | Buffer Zone Preview    | 2km, 5km buffer haritada gösterim   | Orta         |
| 2.2 | Distance Measurement   | Haritada mesafe ölçüm aracı         | Düşük        |
| 2.3 | NPWS Layer Overlay     | Designated sites haritada gösterim  | Orta         |
| 2.4 | Townland/County Lookup | Reverse geocoding ile konum bilgisi | Düşük        |

**Gerekli Kütüphaneler:**

- `@turf/buffer` - Buffer zone calculation
- `@turf/length` - Perimeter calculation
- `leaflet-measure` veya custom implementation

### Faz 3: İyileştirmeler (Öncelik: Orta)

| #   | Özellik                  | Açıklama                  | Tahmini Efor |
| --- | ------------------------ | ------------------------- | ------------ |
| 3.1 | Perimeter Calculation    | Boundary çevre uzunluğu   | Düşük        |
| 3.2 | PostGIS Native Geometry  | JSON yerine geometry tipi | Orta         |
| 3.3 | Boundary Version History | Değişiklik takibi         | Yüksek       |
| 3.4 | Map Export to PDF        | Rapor için harita export  | Orta         |

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
│   └── dataset-layers-panel.tsx    # Layer toggle panel
├── maps/
│   ├── project-map.tsx             # Display-only map
│   └── project-map-with-draw.tsx   # Interactive map with drawing
└── steps/
    └── gis-mapping-step.tsx        # Step 1: GIS Mapping workflow

lib/
├── gis/                            # ✅ NEW - Faz 1
│   ├── index.ts                    # Barrel export
│   ├── validation.ts               # Ireland bounds, CRS detection
│   └── shapefile-parser.ts         # Shapefile (.shp, .zip) parsing
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

### 2026-01-31 (Başlangıç)

- ArcGIS ve QGIS seçenekleri "Coming Soon" olarak işaretlendi
- GIS Implementation Status dokümanı oluşturuldu
- Manual Drawing ve GeoJSON Upload analizi tamamlandı

---

## 9. İlgili Issues / Tasks

- [ ] Faz 1.1: Shapefile import desteği
- [ ] Faz 1.2: Ireland bounds validation
- [ ] Faz 1.3: CRS detection
- [ ] Faz 2.1: Buffer zone preview
- [ ] Faz 2.2: Distance measurement tool
- [ ] Faz 2.3: NPWS layer overlay
