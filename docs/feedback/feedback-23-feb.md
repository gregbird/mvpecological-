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

**Greg'e yorum:** Done. New "Surveys & Reports" page added under Admin sidebar at /templates. Two tabs: Survey Templates (10 field survey types with section/field-level customization) and Report Templates (with "Dulra Standard" / "Custom" toggle and section editor). Survey templates now flow into Step 4 forms — when an ecologist creates a survey, the template-defined fields appear automatically. DOCX/PDF upload deferred to post-MVP.

### Mimari Yaklaşım

İki farklı kavram ayrıldı:

- **Report Templates** = Rapor şablonları (PEA, EcIA, AA, NIS) → teslim edilecek belge formatları
- **Survey Templates** = Saha survey şablonları (Walkover, Bat, Bird...) → veri toplama formu formatları

Tek sayfa, iki tab: `/templates`

### Yapılacaklar

- [x] **2.1** Sol menüye "Surveys & Reports" sayfası ekle ✅ (24 Şubat 2026)
  - `app/(dashboard)/templates/page.tsx` — Ana sayfa (2 tab)
  - `components/layout/sidebar.tsx` — Sidebar'a link eklendi
- [x] **2.2** Survey Templates tab — 10 saha survey tipi ✅ (25 Şubat 2026)
  - `components/templates/survey-templates-tab.tsx` — Kart listesi
  - 10 tip: Walkover, Habitat Mapping, Relevé, Bat, Bird, Mammal, Aquatic, Botanical, Invertebrate, Other
  - Her kart: alan sayısı badge'i, "Dulra Standard" / "Customized" badge'i, Active/Inactive toggle
- [x] **2.3** Report Templates tab ✅ (24 Şubat 2026)
  - `components/templates/report-templates-tab.tsx` — Rapor template listesi
  - `components/templates/report-template-editor.tsx` — Bölüm bazlı editor
  - `components/templates/new-report-template-dialog.tsx` — Yeni template oluşturma
  - `lib/templates/pea-template.ts` — Dulra standart PEA template'i
  - `lib/templates/template-renderer.ts` — `{{placeholder}}` desteği ile rendering
  - "Use Dulra Standard" / "Reset to Dulra Standard" toggle
- [x] **2.4** Survey Template Editor — bölüm/alan düzeyinde özelleştirme ✅ (25 Şubat 2026)
  - `components/templates/survey-template-editor.tsx` — Ana editor
  - `components/templates/survey-template/section-editor.tsx` — Bölüm düzenleyici
  - `components/templates/survey-template/field-editor.tsx` — Alan düzenleyici
  - `components/templates/survey-template/tag-list-input.tsx` — Tag input (hedef türler, ekipman)
  - Özellikler: bölüm enable/disable, alan ekleme/silme, alan tipi değiştirme, özel alan ekleme
  - Relevé survey için "kendi form sistemini kullanır" bilgi notu
- [x] **2.5** Varsayılan alan tanımları — İrlanda ekolojik standartlarına uygun ✅ (25 Şubat 2026)
  - `lib/config/survey-field-definitions.ts` (~1219 satır)
  - Her survey tipi için domain-specific bölümler ve alanlar (toplam ~115 alan)
  - Kaynaklar: BCIreland bat survey guidelines, BTO bird survey methodology, EPA aquatic survey guidelines, Fossitt (2000) habitat classification
- [x] **2.6** Step 4 entegrasyonu — template alanları survey formunda ✅ (25 Şubat 2026)
  - `components/field-surveys/survey-template-fields/dynamic-field-renderer.tsx` — Alan tipine göre UI render
  - `components/field-surveys/survey-template-fields/template-sections-renderer.tsx` — Bölüm render
  - `components/field-surveys/survey-form.tsx` — Survey tipi seçilince template alanları otomatik görünür
  - `components/field-surveys/survey-view-dialog.tsx` — Kaydedilmiş verileri read-only gösterir + Edit butonu
  - Veri `surveys.weather.templateFields` JSONB'de saklanır (geriye uyumlu)
- [x] **2.7** Ek düzeltmeler ✅ (25 Şubat 2026)
  - Proje oluşturmada `survey_type` artık zorunlu değil (optional)
  - AI Draft step'inde rapor tipi seçici dropdown eklendi (`ai-draft-step.tsx`)
  - Survey view dialog'dan edit'e geçiş butonu eklendi
- [ ] **2.8** (Post-MVP) Custom template upload (DOCX/PDF)
- [x] **2.9** AI Draft (Step 8) — 10 rapor tipi için uçtan uca destek ✅ (2 Mart 2026)
  - Önceki durum: Sadece PEA çalışıyordu, diğer 9 tip PEA'nın 6 bölümünü gösteriyordu, AI'a 1 cümle prompt gidiyordu
  - `lib/ai/report-section-prompts.ts` — 10 rapor tipi için detaylı AI talimatları (~530 satır). Her bölüm İrlanda mevzuatına referanslı, kelime sayısı hedefli, alt başlıklı
  - `app/api/ai/report-section/route.ts` — PEA-only inline promptlar kaldırıldı, merkezi prompt sistemi kullanılıyor
  - 8 dosyadan hardcoded `PEA_REPORT_SECTIONS` kaldırıldı (15 referans), dinamik `sectionDefs` prop ile değiştirildi
  - Her rapor tipi kendi bölüm yapısına sahip (5-8 bölüm arası, tipe göre değişir)
  - Step 9 (Quality Review) ve Step 10 (Final Submission) da seçilen tipe göre doğru bölüm sayısını gösteriyor
- [x] **2.10** Rapor tipi değişiminde güvenli geçiş ✅ (2 Mart 2026)
  - `components/steps/ai-draft/change-report-type-dialog.tsx` — Onay dialogu
  - İçerik varken tip değiştirilince: onay isteniyor → mevcut içerik versiyon olarak saklanıyor → yeni tip boş bölümlerle açılıyor
  - İçerik yoksa direkt geçiyor
  - useEffect'te `existingReport.report_type === reportType` kontrolü — tip değişiminde eski rapor yüklenmiyor
- [x] **2.11** Versiyon isimlendirme ✅ (2 Mart 2026)
  - DB: `version_name` kolonu `reports` tablosuna eklendi
  - `version-history-panel.tsx` — Versiyonlara inline isim verme/düzenleme (kalem ikonu, Enter/Escape)
  - Tip değişiminde otomatik isim: "Pre-switch from {eski tip}"
  - Scroll düzeltmesi: 5+ versiyon olduğunda liste scroll edilebiliyor
- [x] **2.12** Zengin başlangıç şablonları ✅ (2 Mart 2026)
  - `lib/templates/ecia-template.ts` — 8 bölümlük EcIA şablonu (CIEEM 2018, EIA Directive)
  - `lib/templates/aa-screening-template.ts` — 6 bölümlük AA Screening şablonu (Article 6(3), source-pathway-receptor)
  - `lib/templates/nis-template.ts` — 8 bölümlük NIS şablonu (DoEHLG 2010, AA Stage 2 ve NIA için ortak)
  - `lib/templates/template-renderer.ts` — Zengin şablon registry'si güncellendi (PEA, EcIA, AA Screening, NIS)
  - Proje verileri (designated sites, habitats, flora, fauna) şablonlara otomatik doluyor
- [x] **2.13** Survey form/view/edit davranışı düzeltildi ✅ (2 Mart 2026)
  - Fotoğraf yönetimi View'dan Edit'e taşındı — View'da fotoğraflar artık sadece görüntülenebilir
  - Relevé'de veri yokken boş form yerine bilgilendirme mesajı gösteriliyor
  - Edit butonu artık Relevé dahil tüm tiplerde tutarlı: doğrudan ilgili formu açıyor
  - Form açıldığında farklı survey verisi doğru yükleniyor (sıfırlanma hatası düzeltildi)
- [x] **2.14** BNG survey tipi Step 4'e tam entegre edildi ✅ (2 Mart 2026)
  - Varsayılan alanlar: Weather, Site Assessment, Habitat Parcel, Linear Features
  - Tüm dosyalarda label, Zod schema ve tip tanımları eklendi
- [x] **2.15** Field Survey step UI sadeleştirildi ✅ (2 Mart 2026)
  - Bilgilendirme kutusu ve 5 istatistik kartı kaldırıldı
  - "Schedule Survey" butonu liste başlığının yanına taşındı
  - Kartlar satırda 3 olarak düzenlendi
- [x] **2.16** Email paylaşımı eklendi ✅ (2 Mart 2026)
  - Generic ve Relevé survey view'a Email butonu eklendi (mailto: link)
- [ ] **2.17** (Post-MVP) Custom template upload (DOCX/PDF)

### Dosya Özeti (14+12 dosya, ~1951+2100 satır yeni kod)

| Dosya                                                                            | Satır | Durum           |
| -------------------------------------------------------------------------------- | ----- | --------------- |
| `lib/config/survey-field-definitions.ts`                                         | 1219  | YENİ            |
| `lib/config/template-types.ts`                                                   | ~540  | GENİŞLETİLDİ    |
| `app/(dashboard)/templates/page.tsx`                                             | 70    | YENİ            |
| `components/templates/survey-templates-tab.tsx`                                  | 147   | YENİ            |
| `components/templates/survey-template-editor.tsx`                                | 264   | YENİDEN YAZILDI |
| `components/templates/survey-template/section-editor.tsx`                        | 105   | YENİ            |
| `components/templates/survey-template/field-editor.tsx`                          | 76    | YENİ            |
| `components/templates/survey-template/tag-list-input.tsx`                        | 56    | YENİ            |
| `components/templates/report-templates-tab.tsx`                                  | 208   | YENİ            |
| `components/templates/report-template-editor.tsx`                                | 195   | YENİ            |
| `components/templates/new-report-template-dialog.tsx`                            | 189   | YENİ            |
| `components/field-surveys/survey-template-fields/dynamic-field-renderer.tsx`     | ~100  | YENİ            |
| `components/field-surveys/survey-template-fields/template-sections-renderer.tsx` | ~120  | YENİ            |
| `hooks/queries/use-template-management-hooks.ts`                                 | 81    | GENİŞLETİLDİ    |
| `lib/ai/report-section-prompts.ts`                                               | ~530  | YENİ            |
| `lib/templates/ecia-template.ts`                                                 | ~180  | YENİ            |
| `lib/templates/aa-screening-template.ts`                                         | ~150  | YENİ            |
| `lib/templates/nis-template.ts`                                                  | ~200  | YENİ            |
| `lib/templates/template-renderer.ts`                                             | ~530  | GENİŞLETİLDİ    |
| `components/steps/ai-draft/change-report-type-dialog.tsx`                        | ~50   | YENİ            |
| `components/steps/ai-draft/version-history-panel.tsx`                            | ~250  | GENİŞLETİLDİ    |
| `components/steps/ai-draft-step.tsx`                                             | ~655  | GENİŞLETİLDİ    |
| `components/steps/ai-draft/ai-draft-tab.tsx`                                     | ~130  | GENİŞLETİLDİ    |
| `components/steps/ai-draft/document-shell.tsx`                                   | —     | GENİŞLETİLDİ    |
| `components/steps/ai-draft/document-top-bar.tsx`                                 | ~110  | GENİŞLETİLDİ    |
| `components/steps/ai-draft/version-compare-dialog.tsx`                           | —     | GENİŞLETİLDİ    |
| `components/steps/ai-draft/version-view-dialog.tsx`                              | —     | GENİŞLETİLDİ    |
| `components/steps/quality-review-step.tsx`                                       | —     | GENİŞLETİLDİ    |
| `components/steps/final-submission-step.tsx`                                     | —     | GENİŞLETİLDİ    |
| `app/api/ai/report-section/route.ts`                                             | —     | GENİŞLETİLDİ    |
| `lib/supabase/queries/reports.ts`                                                | —     | GENİŞLETİLDİ    |
| `hooks/queries/use-report-hooks.ts`                                              | —     | GENİŞLETİLDİ    |

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

_Son güncelleme: 2 Mart 2026_
