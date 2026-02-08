# Field Survey - MVP To-Do List

**Document Version:** 1.0
**Date:** February 2026
**Status:** MVP Development

---

## Overview

Field Research, workflow'un Phase 2 kısmını oluşturuyor (Steps 4-6). Desk Research bulgularına dayalı olarak saha çalışması planlanır ve yürütülür.

**Mevcut Adımlar:**

- Step 4: Field Survey Planning
- Step 5: Habitat Mapping
- Step 6: Target Notes (şu an Species Observations olarak implemente edilmiş)

---

## To-Do Items

### 1. Target Notes Sistemi (Kritik)

PRD'ye göre Target Notes, species observations'dan farklı bir konsept. 8 kategori ile geo-tagged saha notları.

- [ ] **Target Notes tablosu oluştur** (`target_notes`)

  ```sql
  - id, project_id, survey_id
  - category: enum (access_point, check_feature, habitat, fauna, flora, management, damage, ownership)
  - title, description
  - location: geometry(Point)
  - photos: text[] (storage URLs)
  - surveyor_id, created_at, updated_at
  ```

- [ ] **Target Notes Step bileşeni oluştur** (`target-notes-step.tsx` güncelle)
  - Mevcut species observation mantığını koru
  - Target notes için ayrı bir tab/bölüm ekle
  - 8 kategori için ikonlar ve renkler

- [ ] **Target Notes Form oluştur**
  - Kategori seçimi (dropdown)
  - Başlık ve açıklama
  - GPS konum alma butonu
  - Fotoğraf ekleme

- [ ] **Haritada Target Notes gösterimi**
  - Kategori bazlı marker renkleri
  - Marker'a tıklandığında detay popup

---

### 2. Harita Görüntüleme İyileştirmeleri

Mevcut durumda çizilen habitatlar ve gözlemler haritada görünmüyor.

- [ ] **Habitat polygonları haritada göster**
  - `habitat-mapping-step.tsx` içinde mevcut habitatları render et
  - FOSSITT koduna göre renklendirme
  - Tıklandığında detay popup

- [ ] **Species observations haritada göster**
  - `target-notes-step.tsx` içinde observation noktalarını render et
  - Taxon group'a göre marker renkleri
  - Protected species için özel marker

- [ ] **Tüm verileri gösteren birleşik harita view**
  - Survey boundary
  - Habitat polygons
  - Target notes
  - Species observations
  - Layer toggle kontrolü

---

### 3. Habitat Form Geliştirmeleri

PRD'de belirtilen ek alanlar eksik.

- [ ] **EU Annex kod alanı ekle**
  - Habitat Directive Annex I kodları
  - FOSSITT kodu seçildiğinde otomatik öneri

- [ ] **Evaluation alanı ekle**
  - Dropdown: Low Local, High Local, County, National, International

- [ ] **Threats alanı ekle**
  - EU threat kodları listesi
  - Multi-select

- [ ] **Survey Method alanı ekle**
  - Smith et al 2011 kodları

- [ ] **Listed Species alanı ekle**
  - Habitat içinde gözlemlenen önemli türler
  - Multi-select veya free text

---

### 4. Photo Upload Sistemi

Fotoğraf yükleme arayüzü var ama implementasyon yok.

- [ ] **Supabase Storage bucket oluştur**
  - `project-photos` bucket
  - RLS policies

- [ ] **Photo upload component oluştur**
  - Drag & drop
  - Kamera erişimi (mobil için)
  - Thumbnail preview
  - Progress indicator

- [ ] **Survey'e photo bağlama**
  - Survey card'da photo count göster
  - Photo gallery view

- [ ] **Observation/Habitat'a photo bağlama**
  - Form içinde photo picker
  - Kaydedilmiş fotoğrafları göster

---

### 5. Survey Form İyileştirmeleri

- [ ] **Gerçek surveyor listesi**
  - Mock data yerine Supabase'den kullanıcılar
  - Proje ekibine göre filtreleme

- [ ] **Survey'e observation/habitat count bağlama**
  - Survey card'da göster
  - İstatistikler

- [ ] **Survey status workflow**
  - planned → in_progress → completed → approved
  - Status değişikliğinde notification

---

### 6. Desk Research → Field Survey Bağlantısı

- [ ] **Survey Targets listesi**
  - Desk research'den gelen designated sites
  - Protected species kayıtları
  - Aquatic features
  - Her biri için "survey needed" flag

- [ ] **Otomatik survey önerileri geliştir**
  - Mevcut logic'i zenginleştir
  - Daha detaylı reasoning

- [ ] **Field survey'de desk research verilerine erişim**
  - Quick reference panel
  - Site kodları ve mesafeler

---

### 7. Data Export

- [ ] **Survey data export**
  - CSV format
  - GeoJSON format
  - Shapefile format (opsiyonel)

- [ ] **Habitat map export**
  - PNG/PDF olarak harita
  - Legend dahil

---

## Priority Order (MVP için)

### P0 - Must Have

1. Target Notes sistemi (tablo + form + liste)
2. Haritada mevcut verileri gösterme
3. Photo upload (en azından temel)

### P1 - Should Have

4. Habitat form ek alanları (Evaluation, EU Annex)
5. Gerçek surveyor listesi
6. Survey-observation count bağlantısı

### P2 - Nice to Have

7. Threats ve Survey Method alanları
8. Data export
9. Birleşik harita view

---

## Technical Notes

### Database Tables Needed

- `target_notes` - yeni tablo
- `habitat_polygons` - mevcut, ek alanlar
- `species_observations` - mevcut
- `surveys` - mevcut

### Components to Create/Update

- `components/steps/target-notes-step.tsx` - major update
- `components/field-surveys/target-note-form.tsx` - yeni
- `components/field-surveys/target-note-card.tsx` - yeni
- `components/maps/survey-map.tsx` - yeni (tüm verileri gösteren)
- `components/ui/photo-upload.tsx` - yeni

### API Routes Needed

- `/api/upload/photos` - photo upload handler
- Target notes için CRUD (`lib/supabase/queries/target-notes.ts`)

---

## References

- PRD: `/docs/prd.md` Section 4.5
- User Personas: `/docs/USER_PERSONAS_AND_USE_CASES.md`
- Data Workflow: `/docs/draft_of_key_data_and_workflow.md`
