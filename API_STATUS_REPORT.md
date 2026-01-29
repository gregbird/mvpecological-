# Irish Environmental Data APIs - Status Report

# İrlanda Çevresel Veri API'leri - Durum Raporu

---

## ÖZET TABLO / SUMMARY TABLE

| Kaynak / Source   | API Durumu / Status                     | Erişim / Access | Spatial Query        | Eksikler / Gaps                                 |
| ----------------- | --------------------------------------- | --------------- | -------------------- | ----------------------------------------------- |
| **NPWS**          | ✅ Tam Çalışıyor / Fully Working        | 🌐 Public       | ✅ Var / Yes         | Yok / None                                      |
| **EPA**           | ⚠️ Kısmen Çalışıyor / Partially Working | 🌐 Public       | ✅ Var / Yes         | Bazı layer'lar kısıtlı / Some layers restricted |
| **Catchments.ie** | ⚠️ Kısmen Çalışıyor / Partially Working | 🌐 Public       | ❌ Yok / No          | Koordinat araması yok / No coordinate search    |
| **GBIF**          | ✅ Tam Çalışıyor / Fully Working        | 🌐 Public       | ✅ Var / Yes         | Rate limit var / Has rate limit                 |
| **NBDC**          | ✅ Çalışıyor / Working                  | 🌐 Public       | ⚠️ Kısıtlı / Limited | Grid query hatalı / Grid query buggy            |

---

## 1. NPWS - National Parks & Wildlife Service

### Türkçe

**Durum:** ✅ TAM ÇALIŞIYOR

**API Tipi:** ArcGIS REST Feature Server (Public)

**Endpoint:**

```
https://services-eu1.arcgis.com/Jhij7i46ouO8Cc0N/arcgis/rest/services/NPWSDesignatedAreas/FeatureServer
```

**Mevcut Layer'lar:**

- Layer 0: SPA (Special Protection Areas) - Kuş Koruma Alanları
- Layer 1: pNHA (Proposed Natural Heritage Areas) - Önerilen Doğal Miras Alanları
- Layer 2: NHA (Natural Heritage Areas) - Doğal Miras Alanları
- Layer 3: SAC (Special Areas of Conservation) - Özel Koruma Alanları

**Özellikler:**

- ✅ BBox (bounding box) ile spatial query
- ✅ Polygon geometri döndürme
- ✅ Tüm attribute'lar (site adı, kodu, alan, vb.)
- ✅ JSON formatında yanıt
- ✅ Kimlik doğrulama gerektirmiyor

**Eksikler:** YOK - Tam fonksiyonel

**Örnek İstek:**

```javascript
const url = `${baseUrl}/0/query?where=1%3D1&geometry=${JSON.stringify(bbox)}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json`
```

---

### English

**Status:** ✅ FULLY WORKING

**API Type:** ArcGIS REST Feature Server (Public)

**Endpoint:**

```
https://services-eu1.arcgis.com/Jhij7i46ouO8Cc0N/arcgis/rest/services/NPWSDesignatedAreas/FeatureServer
```

**Available Layers:**

- Layer 0: SPA (Special Protection Areas)
- Layer 1: pNHA (Proposed Natural Heritage Areas)
- Layer 2: NHA (Natural Heritage Areas)
- Layer 3: SAC (Special Areas of Conservation)

**Features:**

- ✅ Spatial query with bounding box
- ✅ Returns polygon geometry
- ✅ All attributes (site name, code, area, etc.)
- ✅ JSON response format
- ✅ No authentication required

**Gaps:** NONE - Fully functional

---

## 2. EPA - Environmental Protection Agency

### Türkçe

**Durum:** ⚠️ KISMEN ÇALIŞIYOR

**API Tipleri:**

1. **WFS (Web Feature Service)** - GeoServer
2. **ArcGIS REST** - MapServer

**Endpoint'ler:**

```
WFS: https://gis.epa.ie/geoserver/EPA/wfs
REST: https://gis.epa.ie/arcgis/rest/services/EPAMapServices/
```

**Çalışan Özellikler:**

- ✅ WFS ile bazı layer'lara erişim
- ✅ ArcGIS REST ile spatial query
- ✅ Su kalitesi verileri
- ✅ WFD (Water Framework Directive) waterbody'ler

**Eksikler ve Sorunlar:**

- ⚠️ Bazı WFS layer'ları "FeatureNotFound" hatası veriyor
- ⚠️ Bazı layer'lar için authentication gerekebilir
- ⚠️ WFS bbox formatı hassas (lat/lon sırası önemli)
- ⚠️ Tüm layer'lar JSON output desteklemiyor

**Çözüm Önerileri:**

1. WFS yerine ArcGIS REST endpoint'leri tercih et
2. Her layer için ayrı ayrı test yap
3. Çalışan layer'ları dokümante et

**Çalışan Layer'lar:**

```
ArcGIS REST:
- EPAMapServices/WFDStatus/MapServer
- EPAMapServices/WaterFeatures/MapServer

WFS (kısmen):
- EPA:WATERQ_RiverMon_CurrentStatus
```

---

### English

**Status:** ⚠️ PARTIALLY WORKING

**API Types:**

1. **WFS (Web Feature Service)** - GeoServer
2. **ArcGIS REST** - MapServer

**Endpoints:**

```
WFS: https://gis.epa.ie/geoserver/EPA/wfs
REST: https://gis.epa.ie/arcgis/rest/services/EPAMapServices/
```

**Working Features:**

- ✅ Access to some layers via WFS
- ✅ Spatial query via ArcGIS REST
- ✅ Water quality data
- ✅ WFD waterbodies

**Gaps and Issues:**

- ⚠️ Some WFS layers return "FeatureNotFound" error
- ⚠️ Some layers may require authentication
- ⚠️ WFS bbox format is sensitive (lat/lon order matters)
- ⚠️ Not all layers support JSON output

**Recommended Solutions:**

1. Prefer ArcGIS REST endpoints over WFS
2. Test each layer individually
3. Document working layers

---

## 3. Catchments.ie - Water Framework Directive

### Türkçe

**Durum:** ⚠️ KISMEN ÇALIŞIYOR (Önemli Kısıtlama)

**API Tipi:** REST API (JSON)

**Endpoint:**

```
https://wfdapi.edenireland.ie/api/
```

**Mevcut Endpoint'ler:**

```
GET /catchment          - Tüm havzalar
GET /catchment/{id}     - Havza detayı
GET /subcatchment/{id}  - Alt havza detayı
GET /waterbody/{id}     - Su kütlesi detayı
GET /search?v={query}   - İsim araması
```

**Çalışan Özellikler:**

- ✅ Tüm catchment listesi
- ✅ ID ile detay çekme
- ✅ İsim ile arama
- ✅ JSON formatında yanıt
- ✅ Kimlik doğrulama gerektirmiyor

**KRİTİK EKSİK:**

- ❌ **KOORDİNAT TABANLI ARAMA YOK!**
- ❌ BBox veya lat/lon ile sorgu yapılamıyor
- ❌ Spatial query desteklenmiyor

**Bu Ne Anlama Geliyor:**
Bir proje alanı için "bu koordinatlardaki catchment hangisi?" sorusuna API ile yanıt alamıyorsunuz. Sadece isim biliyorsanız arama yapabilirsiniz.

**Çözüm Önerileri:**

1. **Manuel Eşleştirme:** Catchment polygon'larını bir kez indirip, client-side spatial query yap
2. **Alternatif Kaynak:** EPA WFS'ten catchment boundary'leri çek
3. **Hibrit Yaklaşım:** NPWS'ten bölge adını al, Catchments.ie'de ara

---

### English

**Status:** ⚠️ PARTIALLY WORKING (Major Limitation)

**API Type:** REST API (JSON)

**Endpoint:**

```
https://wfdapi.edenireland.ie/api/
```

**Available Endpoints:**

```
GET /catchment          - All catchments
GET /catchment/{id}     - Catchment detail
GET /subcatchment/{id}  - Subcatchment detail
GET /waterbody/{id}     - Waterbody detail
GET /search?v={query}   - Name search
```

**Working Features:**

- ✅ Full catchment list
- ✅ Detail retrieval by ID
- ✅ Search by name
- ✅ JSON response format
- ✅ No authentication required

**CRITICAL GAP:**

- ❌ **NO COORDINATE-BASED SEARCH!**
- ❌ Cannot query by BBox or lat/lon
- ❌ No spatial query support

**What This Means:**
You cannot ask the API "which catchment is at these coordinates?" for a project site. You can only search if you know the name.

**Recommended Solutions:**

1. **Manual Matching:** Download catchment polygons once, do client-side spatial query
2. **Alternative Source:** Get catchment boundaries from EPA WFS
3. **Hybrid Approach:** Get area name from NPWS, search in Catchments.ie

---

## 4. GBIF - Global Biodiversity Information Facility

### Türkçe

**Durum:** ✅ TAM ÇALIŞIYOR

**API Tipi:** REST API (JSON)

**Endpoint:**

```
https://api.gbif.org/v1/
```

**Mevcut Endpoint'ler:**

```
GET /occurrence/search   - Tür kaydı araması
GET /species/search      - Tür bilgisi araması
GET /dataset/search      - Veri seti araması
```

**Özellikler:**

- ✅ BBox ile spatial query (decimalLatitude, decimalLongitude)
- ✅ Ülke filtresi (country=IE)
- ✅ Tür adı ile arama (scientificName)
- ✅ Tarih filtresi
- ✅ JSON formatında yanıt
- ✅ Kimlik doğrulama gerektirmiyor (temel kullanım)

**Kısıtlamalar:**

- ⚠️ Rate limit: ~3 istek/saniye
- ⚠️ Maksimum 300 kayıt/istek (pagination gerekli)
- ⚠️ Büyük sorgular için API key önerilir

**Annex II/IV Türleri İçin Örnek:**

```javascript
const url = `https://api.gbif.org/v1/occurrence/search?scientificName=Lutra%20lutra&country=IE&decimalLatitude=52.5,54.0&decimalLongitude=-7.0,-5.5&limit=100`
```

---

### English

**Status:** ✅ FULLY WORKING

**API Type:** REST API (JSON)

**Endpoint:**

```
https://api.gbif.org/v1/
```

**Available Endpoints:**

```
GET /occurrence/search   - Species occurrence search
GET /species/search      - Species information search
GET /dataset/search      - Dataset search
```

**Features:**

- ✅ Spatial query with BBox (decimalLatitude, decimalLongitude)
- ✅ Country filter (country=IE)
- ✅ Search by species name (scientificName)
- ✅ Date filters
- ✅ JSON response format
- ✅ No authentication required (basic usage)

**Limitations:**

- ⚠️ Rate limit: ~3 requests/second
- ⚠️ Maximum 300 records/request (pagination required)
- ⚠️ API key recommended for large queries

---

## 5. NBDC - National Biodiversity Data Centre

### Türkçe

**Durum:** ✅ API VAR VE ÇALIŞIYOR!

**ÖNCEKİ YANLIŞ BİLGİ DÜZELTMESİ:** NBDC'nin API'si VAR ve çalışıyor!

**API Tipi:** ASP.NET Web API (Public, POST istekleri)

**Base URL:**

```
https://maps.biodiversityireland.ie/api/services/app/
```

**Çalışan Endpoint'ler:**

1. **Tür Arama (İsim ile)**

```javascript
POST /taxonService/GetTaxonNames?searchString=Lutra
// Yanıt: ["Otter (Lutra lutra)", ...]
```

2. **Tür Detayı (ID ile)**

```javascript
POST /taxonService/GetTaxon?taxonId=119290
// Yanıt: { taxonName, commonName, recordCount, designations, ... }
```

3. **Tür Profili**

```javascript
POST /taxonProfileService/GetTaxonProfile?taxonId=119290
// Yanıt: { habitat, threats, conservationStatus, ... }
```

4. **Yıllık Kayıt Özeti**

```javascript
POST /taxonService/GetYearSummary?taxonId=119290
// Yanıt: [{ period: 2023, recordCount: 43 }, ...]
```

5. **Aylık Kayıt Özeti**

```javascript
POST /taxonService/GetMonthSummary?taxonId=119290
```

6. **Tür Grupları**

```javascript
POST / taxonService / GetTaxonOutputGroups
// Yanıt: [{ id: 98, name: "Terrestrial mammal" }, ...]
```

7. **Koruma Durumu Özeti**

```javascript
POST / taxonService / GetTaxonDesignationSummaries
// Yanıt: [
//   { name: "Protected Species", speciesCount: 431, recordCount: 2,114,603 },
//   { name: "Threatened Species", speciesCount: 965, recordCount: 1,857,299 },
//   { name: "Invasive Species", speciesCount: 257, recordCount: 103,484 }
// ]
```

**Örnek Veri - Otter (Lutra lutra):**

```json
{
  "taxonId": 119290,
  "taxonName": "Lutra lutra",
  "commonName": "Otter",
  "recordCount": 12420,
  "designations": "EU Habitats Directive Annex II & IV, Wildlife Acts",
  "oldestRecord": "1905-06-03",
  "newestRecord": "2025-04-23"
}
```

**Kısıtlamalar:**

- ⚠️ Doğrudan BBox/koordinat ile spatial query görünmüyor
- ⚠️ Grid bazlı görselleştirme API'si hata veriyor
- ⚠️ Bazı endpoint'ler JSON serialization hatası veriyor

**Çözüm Önerileri:**

1. Tür araması için NBDC API kullan (daha zengin veri)
2. Spatial query için GBIF kullan (koordinat destekli)
3. Her iki kaynağı birleştir (NBDC tür detayı + GBIF koordinatlar)

---

### English

**Status:** ✅ API EXISTS AND WORKS!

**CORRECTION OF PREVIOUS WRONG INFO:** NBDC DOES have an API and it works!

**API Type:** ASP.NET Web API (Public, POST requests)

**Base URL:**

```
https://maps.biodiversityireland.ie/api/services/app/
```

**Working Endpoints:**

1. **Species Search (by name)**

```javascript
POST /taxonService/GetTaxonNames?searchString=Lutra
// Response: ["Otter (Lutra lutra)", ...]
```

2. **Species Detail (by ID)**

```javascript
POST /taxonService/GetTaxon?taxonId=119290
// Response: { taxonName, commonName, recordCount, designations, ... }
```

3. **Species Profile**

```javascript
POST /taxonProfileService/GetTaxonProfile?taxonId=119290
// Response: { habitat, threats, conservationStatus, ... }
```

4. **Yearly Record Summary**

```javascript
POST /taxonService/GetYearSummary?taxonId=119290
// Response: [{ period: 2023, recordCount: 43 }, ...]
```

5. **Monthly Record Summary**

```javascript
POST /taxonService/GetMonthSummary?taxonId=119290
```

6. **Taxon Groups**

```javascript
POST / taxonService / GetTaxonOutputGroups
// Response: [{ id: 98, name: "Terrestrial mammal" }, ...]
```

7. **Designation Summaries**

```javascript
POST / taxonService / GetTaxonDesignationSummaries
// Response: [
//   { name: "Protected Species", speciesCount: 431, recordCount: 2,114,603 },
//   { name: "Threatened Species", speciesCount: 965, recordCount: 1,857,299 },
//   { name: "Invasive Species", speciesCount: 257, recordCount: 103,484 }
// ]
```

**Sample Data - Otter (Lutra lutra):**

```json
{
  "taxonId": 119290,
  "taxonName": "Lutra lutra",
  "commonName": "Otter",
  "recordCount": 12420,
  "designations": "EU Habitats Directive Annex II & IV, Wildlife Acts",
  "oldestRecord": "1905-06-03",
  "newestRecord": "2025-04-23"
}
```

**Limitations:**

- ⚠️ No direct BBox/coordinate spatial query visible
- ⚠️ Grid-based visualization API returns errors
- ⚠️ Some endpoints have JSON serialization issues

**Recommended Solutions:**

1. Use NBDC API for species search (richer data)
2. Use GBIF for spatial queries (coordinate support)
3. Combine both sources (NBDC species detail + GBIF coordinates)

---

## EKSİKLERİ TAMAMLAMA STRATEJİSİ / GAP FILLING STRATEGY

### Türkçe

| Eksik                           | Çözüm                                                                     | Zorluk |
| ------------------------------- | ------------------------------------------------------------------------- | ------ |
| Catchments.ie spatial query yok | EPA WFS'ten catchment boundary çek veya polygon'ları statik olarak depola | Orta   |
| NBDC API yok                    | GBIF kullan + manuel CSV import                                           | Kolay  |
| EPA bazı layer'lar çalışmıyor   | Çalışan layer'ları dokümante et, alternatif kaynak bul                    | Kolay  |
| GBIF rate limit                 | Sonuçları cache'le, batch query yap                                       | Kolay  |

### Önerilen Mimari:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│                         ↓                                    │
│              ┌─────────────────────┐                        │
│              │   Backend API       │                        │
│              │   (Node.js/Python)  │                        │
│              └─────────────────────┘                        │
│                         ↓                                    │
│    ┌────────┬────────┬────────┬────────┬────────┐          │
│    │ NPWS   │ EPA    │ GBIF   │ Static │ Cache  │          │
│    │ (REST) │ (REST) │ (REST) │ Data   │ (Redis)│          │
│    └────────┴────────┴────────┴────────┴────────┘          │
│                                   ↑                         │
│                     Catchments + NBDC CSV                   │
└─────────────────────────────────────────────────────────────┘
```

---

### English

| Gap                            | Solution                                                           | Difficulty |
| ------------------------------ | ------------------------------------------------------------------ | ---------- |
| Catchments.ie no spatial query | Get catchment boundaries from EPA WFS or store polygons statically | Medium     |
| NBDC no API                    | Use GBIF + manual CSV import                                       | Easy       |
| EPA some layers not working    | Document working layers, find alternatives                         | Easy       |
| GBIF rate limit                | Cache results, batch queries                                       | Easy       |

### Recommended Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│                         ↓                                    │
│              ┌─────────────────────┐                        │
│              │   Backend API       │                        │
│              │   (Node.js/Python)  │                        │
│              └─────────────────────┘                        │
│                         ↓                                    │
│    ┌────────┬────────┬────────┬────────┬────────┐          │
│    │ NPWS   │ EPA    │ GBIF   │ Static │ Cache  │          │
│    │ (REST) │ (REST) │ (REST) │ Data   │ (Redis)│          │
│    └────────┴────────┴────────┴────────┴────────┘          │
│                                   ↑                         │
│                     Catchments + NBDC CSV                   │
└─────────────────────────────────────────────────────────────┘
```

---

## SONUÇ / CONCLUSION

### Türkçe

**Hemen Kullanılabilir:**

- ✅ NPWS (tam) - Designated sites için ana kaynak
- ✅ GBIF (tam) - Spatial species query için ana kaynak
- ✅ NBDC (çalışıyor) - Tür detayları ve İrlanda'ya özgü veriler
- ⚠️ EPA (kısmen) - ArcGIS REST tercih et

**Ek Çalışma Gerekli:**

- Catchments.ie (statik polygon verisi ekle veya EPA WFS kullan)

**Önerilen Strateji:**

1. Designated Sites → NPWS
2. Spatial Species Query → GBIF (koordinat desteği)
3. Species Details/Profiles → NBDC (daha zengin İrlanda verisi)
4. Water Quality → EPA (ArcGIS REST)

### English

**Ready to Use:**

- ✅ NPWS (full) - Primary source for designated sites
- ✅ GBIF (full) - Primary source for spatial species queries
- ✅ NBDC (working) - Species details and Ireland-specific data
- ⚠️ EPA (partial) - prefer ArcGIS REST

**Additional Work Required:**

- Catchments.ie (add static polygon data or use EPA WFS)

**Recommended Strategy:**

1. Designated Sites → NPWS
2. Spatial Species Query → GBIF (coordinate support)
3. Species Details/Profiles → NBDC (richer Irish data)
4. Water Quality → EPA (ArcGIS REST)

---

_Rapor Tarihi / Report Date: January 2026_
