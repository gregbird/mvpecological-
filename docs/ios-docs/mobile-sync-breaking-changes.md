# Mobile Sync — Breaking Changes (31 Mart 2026)

> Web (Dulra) tarafinda yapilan D grubu degisiklikleri. Ayni Supabase backend'i paylasildigi icin mobile tarafinda da guncelleme gerekiyor.

---

## 1. Workflow Steps: 10 → 8 Step

**Migration:** `20260330_merge_field_research_steps.sql`

Eski step 4 (Field Survey), 5 (Habitat Mapping), 6 (Target Notes) tek bir step'e birlestirildi. Step 7-10 yeniden numaralandi.

| Eski # | Eski Ad          | Yeni # | Yeni Ad                                                                     |
| ------ | ---------------- | ------ | --------------------------------------------------------------------------- |
| 1      | GIS Mapping      | 1      | GIS Mapping                                                                 |
| 2      | Data Gathering   | 2      | Data Gathering                                                              |
| 3      | Desk Assessment  | 3      | Desk Assessment                                                             |
| 4      | Field Survey     | 4      | **Field Research** (3 alt tab: Field Survey, Habitat Mapping, Target Notes) |
| 5      | Habitat Mapping  | —      | **SILINDI** (step 4'un alt tab'i oldu)                                      |
| 6      | Target Notes     | —      | **SILINDI** (step 4'un alt tab'i oldu)                                      |
| 7      | Data Analysis    | **5**  | Data Analysis                                                               |
| 8      | AI Draft         | **6**  | AI Draft                                                                    |
| 9      | Quality Review   | **7**  | Quality Review                                                              |
| 10     | Final Submission | **8**  | Final Submission                                                            |

### Mobile'da yapilmasi gerekenler:

- `step_number` referanslarini guncelle (7→5, 8→6, 9→7, 10→8)
- Step 5 ve 6'yi referans eden kod kaldirilmali (artik DB'de yok)
- Sidebar / step listesini 8 step olarak guncelle
- Step 4 artik "Field Research" — icerisinde 3 alt bolum var

---

## 2. Survey Status Enum Degisti

**Migration:** `20260330_simplify_survey_status.sql`

Eski enum: `planned | in_progress | completed | approved`
Yeni enum: **`in_progress | completed`**

- `planned` **SILINDI** — yeni survey'ler direkt `in_progress` olarak olusturulur
- `approved` **SILINDI** — survey akisi: `in_progress → completed`

### Mobile'da yapilmasi gerekenler:

- `planned` ve `approved` status'u kullanan sorgular/filtreler kaldirilmali
- Status picker/dropdown'da sadece `in_progress` ve `completed` gosterilmeli
- Yeni survey olusturulurken `status: 'in_progress'` hardcode edilmeli
- "Start Survey" butonu gereksiz (zaten in_progress basliyor)

---

## 3. Survey Otomatik Doldurma

Yeni survey olusturulurken su alanlar otomatik dolduruluyor:

| Alan          | Deger                                                        |
| ------------- | ------------------------------------------------------------ |
| `status`      | `'in_progress'` (sabit)                                      |
| `site_id`     | Secili site'in ID'si                                         |
| `site_name`   | Proje adi (releve icin)                                      |
| `releve_code` | `REL ${101 + mevcut_releve_sayisi}` (proje genelinde unique) |
| `recorder`    | Mevcut kullanicinin `full_name`'i                            |

### Mobile'da yapilmasi gerekenler:

- Survey olusturma formunda bu alanlari otomatik doldur
- `releve_code` icin mevcut releve sayisini Supabase'den cek ve siradakini hesapla

---

## 4. Survey Site Baglantisi (Multi-Site)

Survey'ler artik `site_id` ile belirli bir site'a bagli. Multi-site projelerde:

- Survey olusturulurken `site_id` zorunlu (tek site projede otomatik atanabilir)
- Survey listesi secili site'a gore filtrelenmeli
- `site_id = null` olan survey'ler orphan — olusturulmamali

### Ilgili tablo:

```sql
surveys.site_id → project_sites.id (FK, nullable)
```

---

## 5. Habitat Polygons — Yeni Auto-Import Sistemi

Web tarafinda Data Gathering'den gelen NLC habitat verileri otomatik olarak `habitat_polygons` tablosuna aktariliyor.

Mobile icin onemli noktalar:

- `habitat_polygons` tablosunda yeni kayitlar gorebilirsiniz (notes = 'Auto-imported from Data Gathering (NLC)')
- `condition` default olarak `'moderate'` ataniyor
- `boundary` alani polygon geometrisi iceriyor (GeoJSON Polygon tipi)
- `site_id` null olabilir (proje geneli) veya belirli bir site'a bagli olabilir

### Mobile'da yapilmasi gerekenler:

- Habitat verilerini okurken `site_id = null` olan kayitlari tum site'larda goster
- Habitat duzenlemesi destekleniyorsa `condition`, `notes`, `fossitt_code` alanlarini duzenlenebilir yap

---

## 6. Degisen DB Sema Ozeti

### Silinen enum degerleri:

- `survey_status.planned` — SILINDI
- `survey_status.approved` — SILINDI

### Silinen workflow_steps:

- `step_number = 5` (eski Habitat Mapping) — SILINDI
- `step_number = 6` (eski Target Notes) — SILINDI

### Yeniden numaralanan workflow_steps:

- `step_number 7 → 5` (Data Analysis)
- `step_number 8 → 6` (AI Draft)
- `step_number 9 → 7` (Quality Review)
- `step_number 10 → 8` (Final Submission)

### Degismeyen tablolar:

- `surveys` — yapi ayni, sadece `status` enum daraldi
- `habitat_polygons` — yapi ayni, yeni auto-import kayitlari geliyor
- `releve_surveys` — yapi ayni
- `project_sites` — yapi ayni
- `desk_research_findings` — yapi ayni

---

## 7. Hizli Kontrol Listesi

- [ ] `step_number` referanslarini 8-step sistemine guncelle
- [ ] `planned` ve `approved` survey status referanslarini kaldir
- [ ] Survey olusturmada `status: 'in_progress'` default yap
- [ ] Survey olusturmada `site_id` zorunlu yap (multi-site)
- [ ] Survey olusturmada `releve_code`, `recorder` otomatik doldur
- [ ] Survey listesini `site_id`'ye gore filtrele
- [ ] Habitat listesinde `site_id = null` kayitlari tum site'larda goster
- [ ] Sidebar / step listesini 8 step olarak guncelle
