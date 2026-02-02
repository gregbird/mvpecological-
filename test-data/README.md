# Test Data for GIS Upload

Bu klasör GeoJSON ve Shapefile upload özelliklerini test etmek için örnek dosyalar içerir.

## GeoJSON Dosyaları

| Dosya                              | Lokasyon                | Açıklama                                           |
| ---------------------------------- | ----------------------- | -------------------------------------------------- |
| `sample-boundary-dublin.geojson`   | Phoenix Park, Dublin    | Basit dikdörtgen boundary                          |
| `sample-boundary-galway.geojson`   | Connemara, Galway       | Basit dikdörtgen boundary                          |
| `sample-boundary-cork.geojson`     | Glengarriff Woods, Cork | SAC yakınında test                                 |
| `sample-complex-boundary.geojson`  | The Burren, Clare       | Düzensiz şekilli boundary                          |
| `sample-featurecollection.geojson` | Waterford               | FeatureCollection formatı (ilk polygon kullanılır) |

## Nasıl Test Edilir

### GeoJSON Upload Testi

1. Uygulamayı başlat: `npm run dev`
2. Login ol ve bir proje aç
3. **GIS Mapping** step'ine git
4. "Upload File" seçeneğine tıkla
5. Test dosyalarından birini seç
6. Boundary'nin haritada görünmesini kontrol et
7. Boundary Info panelinde şunları doğrula:
   - Area (hektar)
   - Grid Reference
   - County/Townland (reverse geocoding)

### Shapefile Upload Testi

Shapefile testi için gerçek bir shapefile gerekiyor. Online kaynaklardan indirebilirsin:

**OSi Open Data (Ireland):**

- https://data-osi.opendata.arcgis.com/
- Townland boundaries, county boundaries vb.

**NPWS:**

- https://www.npws.ie/maps-and-data
- Protected areas shapefiles

**Test adımları:**

1. `.zip` formatında shapefile indir (içinde .shp, .shx, .dbf olmalı)
2. "Upload File" seçeneğine tıkla
3. `.zip` dosyasını seç
4. Boundary'nin parse edilmesini bekle

## Beklenen Davranışlar

### Başarılı Upload

- Toast: "Boundary loaded successfully" veya benzeri
- Harita boundary'ye zoom yapar
- Boundary Info paneli güncellenir
- "Next" butonu aktif olur

### Hata Durumları

- **Geçersiz koordinat:** "Coordinates outside Ireland" uyarısı
- **Polygon yok:** "No polygon found in file" hatası
- **Geçersiz format:** "Unsupported file format" hatası

## Koordinat Sistemi

Tüm test dosyaları **WGS84 (EPSG:4326)** formatındadır.

- Longitude: -10.5° ile -5.5° arası (İrlanda)
- Latitude: 51.4° ile 55.4° arası (İrlanda)

Başka koordinat sistemlerindeki dosyalar (ITM, Irish Grid) için dönüşüm gerekebilir.
