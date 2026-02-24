# Feedback 23/2 — Greg Birdthistle (24 Şubat 2026)

> **Kaynak:** MVP feedback Google Docs — Greg Birdthistle
> **Tarih:** 23 Şubat 2026 (döküman), 24 Şubat 2026 (yeni comment)

---

## 1. Timesheets Sayfasını Kaldır ✅

**Orijinal:** "Please remove the timesheets page."

**Greg'e yorum:** Removed. The timesheets page was never fully implemented — only the sidebar link existed. Link removed from both sidebar and layout.

**Yapılacaklar:**

- [x] **1.1** Sol menüden "Timesheets" linkini kaldır ✅ (24 Şubat 2026)
  - Dosya: `components/layout/sidebar.tsx`, `app/(dashboard)/layout.tsx`
- [x] **1.2** Timesheets sayfası zaten mevcut değildi — sadece link kaldırıldı ✅

---

## 2. Surveys and Reports Sayfası (Template Yönetimi) ✅

**Orijinal:** "Create a new page for Surveys and Reports. On this new page, the management of the ecologist firm needs the ability to: View and Edit Templates, Manage Templates within the Platform."

**Greg'e yorum:** Done. New "Surveys & Reports" page added under Admin sidebar at /templates. Two tabs: Survey Templates (card grid with active/inactive toggle per type) and Report Templates (with "Dulra Standard" / "Custom" toggle and section editor). DB tables created for org-level template storage. DOCX/PDF upload deferred to post-MVP.

**Yapılacaklar:**

- [x] **2.1** Sol menüye "Surveys & Reports" sayfası ekle ✅ (24 Şubat 2026)
  - Dosya: `app/(dashboard)/templates/page.tsx`
  - Dosya: `components/layout/sidebar.tsx` — yeni link eklendi
- [x] **2.2** Survey Templates listesi ✅ (24 Şubat 2026)
  - Tüm survey tipleri için template kartları (card grid)
  - Her template için: Edit, Active/Inactive toggle
- [x] **2.3** Report Templates listesi ✅ (24 Şubat 2026)
  - PEA, EcIA, AA Screening, NIS + diğer template'ler
  - Dulra Standard / Custom badge + toggle
- [x] **2.4** Template editor ✅ (24 Şubat 2026)
  - Survey: name, description, active toggle
  - Report: tabbed section editor (per CIEEM section), {{placeholder}} support
  - "Use Dulra Standard" / "Use Custom Template" toggle
  - "Reset to Dulra Standard" button
- [ ] **2.5** (Post-MVP) Custom template upload (DOCX/PDF)

---

## 3. Search Page Feature (Dropbox Entegrasyonu)

**Orijinal:** "Introducing a new feature called 'Search' page on the left hand tabs. The primary function of this page is to enable the ecology firm to integrate Dulra with their existing repository of reports (e.g., Dropbox). Upon connection, Dulra will index and utilize this external database as a resource during desk research."

**Yapılacaklar:**

- [ ] **3.1** Sol menüye "Search" sayfası ekle
  - Dosya: `app/(dashboard)/search/page.tsx`
- [ ] **3.2** Dropbox OAuth entegrasyonu
  - Dropbox API bağlantısı
  - Kullanıcı Dropbox hesabını bağlayabilmeli
- [ ] **3.3** Rapor indexleme
  - Bağlanan Dropbox'taki raporları indexle
  - Desk research sırasında kaynak olarak kullan
- [ ] **3.4** Arama arayüzü
  - Full-text search üzerinden indexlenmiş raporlarda arama

> **Not:** Bu büyük bir feature. MVP için basit bir placeholder sayfa + "Coming Soon" olabilir.

---

## 4. Survey Type'lara "Biodiversity Net Gain" Ekle ✅

**Orijinal:** "On the list of type of 'Surveys' can you add 'Biodiversity Net Gain'"

**Greg'e yorum:** Done. "Biodiversity Net Gain" added to the centralized survey types config. It now appears in project creation (both new project page and quick create modal) and in the Surveys & Reports template management page.

**Yapılacaklar:**

- [x] **4.1** Survey type listesine "Biodiversity Net Gain" ekle ✅ (24 Şubat 2026)
  - Dosya: `lib/config/template-types.ts` — merkezi SURVEY_TYPES array (yeni)
  - Dosya: `app/(dashboard)/projects/new/page.tsx` — artık merkezi config'den okuyor
  - Dosya: `components/dashboard/quick-create-project-modal.tsx` — artık merkezi config'den okuyor

---

## 5. Desk Research — Ek Veri Kaynakları

**Orijinal:** "For the desk research can you add in this additional data sources: but have a step where the ecologist user can select which datasource they want to use for the desk research."

**Greg Comment (24 Şubat, 11:11):** "county, city, town should be inputted by the ecologist and the application should look these up"

### Eklenecek Veri Kaynakları:

| #   | Veri Kaynağı                             | Tür                  | Endpoint/Not                                                                                                |
| --- | ---------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| a   | OSI Aerial photography                   | Harita katmanı       | WMS/WMTS endpoint gerekli                                                                                   |
| b   | NBDC (on-line map viewer)                | Mevcut               | Zaten entegre, UI'da seçenek olarak ekle                                                                    |
| c   | Teagasc soil area maps                   | Harita katmanı       | NBDC website üzerinden                                                                                      |
| d   | GSI area maps                            | Harita katmanı       | Geological Survey Ireland                                                                                   |
| e   | EPA water quality data                   | Mevcut               | Zaten entegre, UI'da seçenek olarak ekle                                                                    |
| f   | River Basin District (SWRBD/WFD)         | Mevcut               | Catchments.ie zaten entegre                                                                                 |
| g   | Bat Conservation Ireland (BCIreland)     | Yeni API             | Araştırılacak                                                                                               |
| h   | County Development Plan                  | Doküman arama        | Ekolojist county girer, uygulama arar                                                                       |
| i   | Municipal District Local Area Plan       | Doküman arama        | Ekolojist city/town girer, uygulama arar                                                                    |
| j   | Town Development Plan                    | Doküman arama        | Ekolojist town girer, uygulama arar                                                                         |
| k   | NPWS Rare and Protected Species database | Yeni                 | Request-based kayıt inceleme                                                                                |
| l   | Bird Watch Ireland I-WEBS Boundaries     | ArcGIS FeatureServer | `https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/IWeBS_Boundaries_2017/FeatureServer`    |
| m   | Bird Watch Ireland I-WEBS Site points    | ArcGIS FeatureServer | `https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/Map_Data_Coverage_Jul22/FeatureServer`  |
| n   | Bird Watch Ireland I-WEBS Sub-sites      | ArcGIS FeatureServer | `https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/Season_26_IWeBS_Subsites/FeatureServer` |

**Yapılacaklar:**

- [ ] **5.1** Data source seçim adımı oluştur
  - Dosya: `components/steps/data-gathering/data-source-selector.tsx`
  - Desk research başlamadan önce ekolojist hangi kaynakları kullanacağını seçsin
  - Checkbox listesi + "Select All" / "Deselect All"
- [ ] **5.2** County/City/Town input alanı (Greg comment)
  - Development Plan aramaları için ekolojist lokasyon girer
  - Uygulama otomatik olarak ilgili planları arar
- [ ] **5.3** Bird Watch Ireland I-WEBS entegrasyonu
  - 3 ArcGIS FeatureServer endpoint'ini `lib/external-apis/` altına ekle
  - Harita katmanı olarak da göster
- [ ] **5.4** Teagasc soil maps katmanı
  - WMS/WMTS endpoint araştır ve ekle
- [ ] **5.5** GSI area maps katmanı
  - Geological Survey Ireland API/WMS araştır ve ekle
- [ ] **5.6** OSI Aerial photography katmanı
  - OSI aerial imagery WMS endpoint araştır ve ekle
- [ ] **5.7** Bat Conservation Ireland entegrasyonu
  - BCIreland veri erişimi araştır
- [ ] **5.8** County/Municipal/Town Development Plan arama
  - Greg'in comment'ine göre: ekolojist county/city/town girer → uygulama planları arar

---

## 6. Tüm Haritalara Scale (Ölçek) Ekle

**Orijinal:** "Can you add a scale to all maps"

**Yapılacaklar:**

- [ ] **6.1** Leaflet scale control ekle
  - Tüm harita bileşenlerine `L.control.scale()` ekle
  - Dosyalar: `components/maps/project-map.tsx`, `project-map-with-draw.tsx`, ve diğer harita bileşenleri
  - Metric + Imperial ölçek gösterimi

---

## 7. Harita Görüntüleme Düzeltmeleri

**Orijinal:** "Ensure all maps are displayed like below: a number of them are viewed [Yes/No örnekleri]"

**Yapılacaklar:**

- [ ] **7.1** Tüm harita bileşenlerini kontrol et
  - Bazı haritalar düzgün render edilmiyormuş
  - Her step'teki haritayı test et ve düzelt
- [ ] **7.2** Harita boyutlandırma ve responsive kontrol
  - Container resize'da haritaların düzgün render olmasını sağla
  - `map.invalidateSize()` çağrılarını kontrol et

---

## 8. Habitat Mapping — Preliminary Habitat Inventory Kullanımı

**Orijinal:** "For the habitat mapping stage, please utilise the data from the Preliminary Habitat Inventory. This information should be displayed on the map, and the ecologist must have the functionality to edit, save, and delete map entries."

**Yapılacaklar:**

- [ ] **8.1** Preliminary Habitat Inventory verisini habitat mapping haritasında göster
  - Mevcut CORINE/habitat inventory datasını Step 5 haritasına entegre et
- [ ] **8.2** Harita üzerinde edit/save/delete
  - Habitat polygon'larını haritada düzenleyebilme
  - Yeni habitat entry ekleme
  - Mevcut entry'leri silme
  - Tüm değişiklikleri kaydetme

---

## Öncelik Tablosu

| #       | Görev                        | Öncelik   | Efor             | Bağımlılık |
| ------- | ---------------------------- | --------- | ---------------- | ---------- |
| 1       | Timesheets kaldır            | 🔴 Yüksek | Düşük (15dk)     | -          |
| 4       | "Biodiversity Net Gain" ekle | 🔴 Yüksek | Düşük (15dk)     | -          |
| 6       | Haritalara scale ekle        | 🔴 Yüksek | Düşük (30dk)     | -          |
| 7       | Harita görüntüleme düzelt    | 🔴 Yüksek | Orta             | -          |
| 5.1     | Data source seçim adımı      | 🔴 Yüksek | Orta             | -          |
| 5.2     | County/City/Town input       | 🔴 Yüksek | Orta             | 5.1        |
| 5.3     | I-WEBS entegrasyonu          | 🟡 Orta   | Orta             | 5.1        |
| 8       | Habitat Inventory → harita   | 🟡 Orta   | Yüksek           | -          |
| 2       | Surveys & Reports sayfası    | 🟡 Orta   | Yüksek (2-3 gün) | -          |
| 5.4-5.8 | Ek veri kaynakları           | 🟡 Orta   | Yüksek           | 5.1        |
| 3       | Search page (Dropbox)        | 🟢 Düşük  | Çok Yüksek       | -          |

---

_Son güncelleme: 24 Şubat 2026_
