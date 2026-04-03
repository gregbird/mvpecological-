# Mobile Sync — Breaking Changes (31 Mart 2026)

> Web (Dulra) tarafinda yapilan degisiklikler. Ayni Supabase backend'i paylasildigi icin mobile tarafinda da guncelleme gerekiyor.
>
> **Baglamn:** Greg'in 11 Mart 2026 feedback'i sonrasi D grubu (Field Research) tamamen yeniden yapilandi. Survey akisi basitlesti, workflow step'ler birlesti, habitat verisi otomatik aktarilir hale geldi.

---

## Mobile Uygulama Genel Bakis

Kullanicilar mobil uygulamada su akisi izliyor:

1. **Giris** — Supabase Auth ile hesaba giris
2. **Proje Listesi** — Erisilebilir projeleri goruntuleme
3. **Proje Detay** — Secilen projenin icerigini goruntuleme:
   - **Surveys** — Aktif ve tamamlanmis anketler
   - **Habitat Mapping** — Habitat poligonlari (harita + liste)
   - **Target Notes** — Saha gozlem notlari

Bu uc veri alani (surveys, habitats, target notes) asagidaki degisikliklerden dogrudan etkileniyor.

---

## 1. Workflow Steps: 10 Step → 8 Step

### Neden degisti?

Greg'in feedback'i: Field Survey, Habitat Mapping ve Target Notes ayri step'ler olmasin, tek bir "Field Research" adimi altinda 3 alt tab olsun. Bu sahada calisan ekolojist icin daha mantikli bir akis.

### Migration: `20260330_merge_field_research_steps.sql`

```
ONCE (10 step):                      SONRA (8 step):
─────────────────                    ─────────────────
1. GIS Mapping                       1. GIS Mapping
2. Data Gathering                    2. Data Gathering
3. Desk Assessment                   3. Desk Assessment
4. Field Survey          ──┐
5. Habitat Mapping       ──┼──→      4. Field Research (3 alt tab)
6. Target Notes          ──┘            ├── Field Survey
                                        ├── Habitat Mapping
                                        └── Target Notes
7. Data Analysis         ──→         5. Data Analysis
8. AI Draft              ──→         6. AI Draft
9. Quality Review        ──→         7. Quality Review
10. Final Submission     ──→         8. Final Submission
```

### DB'de ne oldu?

- `workflow_steps` tablosunda `step_number = 5` ve `step_number = 6` **silindi**
- Step 4'un `name` alani `'Field Research'` olarak guncellendi
- Step 7-10 yeniden numaralandi: 7→5, 8→6, 9→7, 10→8
- `phase` alanlari guncellendi: step 4 = `'field_research'`, step 5-8 = `'reporting'`

### Mobile'da ne yapilmali?

- `step_number` referanslarini 8-step sistemine guncelle
- Step 5 ve 6'ya referans veren kod kaldirilmali (artik DB'de bu satirlar yok)
- Sidebar veya step listesi gosteriyorsaniz 8 step olarak guncelle
- Step 4'u "Field Research" olarak goster

---

## 2. Survey Status Enum: 4 Deger → 2 Deger

### Neden degisti?

Greg'in feedback'i: "Start the survey" secenegi gereksiz, survey olusturulunca zaten baslamis demek. "Approved" da gereksiz, survey ya devam ediyor ya tamamlanmis.

### Migration: `20260330_simplify_survey_status.sql`

```
ONCE:     planned → in_progress → completed → approved
SONRA:    in_progress → completed
```

### DB'de ne oldu?

- `survey_status` enum'undan `planned` ve `approved` degerleri **silindi**
- Mevcut `planned` satirlar `in_progress`'e cevirildi
- Mevcut `approved` satirlar `completed`'e cevirildi
- Default deger: `'in_progress'`

### Mobile'da ne yapilmali?

- `planned` ve `approved` referanslarini koddan tamamen kaldir
- Status picker/dropdown'da sadece 2 secenek goster:
  - `in_progress` — "Devam ediyor"
  - `completed` — "Tamamlandi"
- Yeni survey olusturulurken `status` alani gondermeye gerek yok (DB default: `'in_progress'`)
- "Start Survey" / "Anketi Baslat" butonu gereksiz — survey olusturuldugunda zaten baslamis oluyor

---

## 3. Survey Olusturma — Otomatik Doldurma

### Neden degisti?

Greg'in feedback'i: Ekolojist her seferinde ayni bilgileri tekrar girmesin, bilinen veriler otomatik doldurulsun.

### Yeni default degerler:

| Alan          | Kaynak                    | Ornek Deger      |
| ------------- | ------------------------- | ---------------- |
| `status`      | Sabit                     | `'in_progress'`  |
| `site_id`     | Secili site'in ID'si      | `'uuid-of-site'` |
| `survey_date` | Bugunun tarihi            | `'2026-03-31'`   |
| `surveyor_id` | Mevcut kullanicinin ID'si | `'uuid-of-user'` |

### Releve Survey icin ek default'lar:

| Alan          | Kaynak                              | Ornek Deger       |
| ------------- | ----------------------------------- | ----------------- |
| `site_name`   | Proje adi                           | `'Tralee Bay WF'` |
| `releve_code` | `REL ${101 + mevcut_releve_sayisi}` | `'REL 103'`       |
| `recorder`    | Mevcut kullanicinin `full_name`'i   | `'John Smith'`    |

**Not:** `releve_code` proje genelinde unique'tir. Hesaplamak icin:

```sql
SELECT COUNT(*) FROM releve_surveys WHERE project_id = :projectId
-- Sonuc 5 ise → sonraki kod: REL 106
```

### Mobile'da ne yapilmali?

- Survey olusturma formunda bu alanlari otomatik doldur
- Kullanici isterse degistirebilmeli (read-only degil, sadece pre-filled)

---

## 4. Survey ↔ Site Baglantisi (Multi-Site)

### Neden degisti?

Greg'in feedback'i: Bir proje birden fazla site iceriyorsa her survey hangi site'a ait oldugu belli olmali.

### Yeni kolon:

`surveys` tablosuna `site_id` kolonu eklendi (migration: `20260329_add_project_sites.sql`).
**Bu kolon mobilde yok — eklenmeli.**

### Nasil calisiyor?

```
project
├── project_sites (YENI TABLO)
│   ├── Site A (test1 — Co. Kildare)
│   │   ├── Survey 1 (releve)
│   │   └── Survey 2 (walkover)
│   └── Site B (test2 — Co. Kildare)
│       └── Survey 3 (bat_survey)
```

- `surveys.site_id` → `project_sites.id` (FK, nullable) — **YENI kolon**
- Multi-site projelerde survey olusturulurken `site_id` **zorunlu**
- Tek site projede otomatik atanabilir
- `site_id = null` olan survey'ler orphan — olusturulmamali

### Mobile'da ne yapilmali?

- Proje birden fazla site iceriyorsa, survey olusturmadan once site sectir
- Survey listesini secili site'a gore filtrele:
  ```sql
  SELECT * FROM surveys
  WHERE project_id = :projectId AND site_id = :siteId
  ORDER BY survey_date DESC
  ```
- "Tum Siteler" gorunumunde filtresiz goster

---

## 5. Habitat Polygons — Yeni Kolonlar + Otomatik Import

### Neden degisti?

1. **Yeni kolonlar:** `site_id`, `boundary`, `include_in_report` eklendi (migration: `20260329_add_project_sites.sql`)
2. **Otomatik import:** Greg'in feedback'i: Web'de Data Gathering adiminda toplanan NLC habitat verileri Field Research'e otomatik aktarilsin

### Yeni / degisen kolonlar:

| Kolon               | Tip              | Aciklama                                |
| ------------------- | ---------------- | --------------------------------------- |
| `site_id`           | UUID / null      | FK → project_sites (YENI — mobilde yok) |
| `boundary`          | GEOMETRY/Polygon | GeoJSON Polygon (YENI — mobilde yok)    |
| `include_in_report` | boolean          | Rapora dahil mi (YENI — mobilde yok)    |
| `survey_id`         | UUID / null      | FK → surveys (YENI — mobilde yok)       |

### Condition enum degisti:

```
MOBILDE MEVCUT:   "good" | "moderate" | "poor" | "degraded"
WEB'DE GUNCEL:    "excellent" | "good" | "moderate" | "poor" | "bad"
```

- `"degraded"` → `"bad"` olarak degisti
- `"excellent"` eklendi

### Otomatik Import nasil calisiyor?

Web tarafinda su akis oluyor:

1. Step 2 (Data Gathering) → NLC aramasiyla habitat verileri `desk_research_findings` tablosuna kaydediliyor
2. Step 4 (Field Research) → Habitat Mapping tab acildiginda, bu findings otomatik olarak `habitat_polygons` tablosuna aktariliyor

### Mobile icin onemli noktalar:

- `habitat_polygons` tablosunda `notes = 'Auto-imported from Data Gathering (NLC)'` olan kayitlar gorebilirsiniz — bunlar web'in otomatik olusturdugu kayitlar
- `condition` default olarak `'moderate'` ataniyor
- `boundary` alani GeoJSON **Polygon** tipi iceriyor (haritada gosterilebilir)
- `site_id` **null** olabilir (proje geneli arama sonucu) veya belirli bir site'a bagli olabilir

### Mobile'da ne yapilmali?

- **`condition` enum'unu guncelle:** `"degraded"` → `"bad"`, `"excellent"` ekle
- Habitat cache'e `site_id`, `boundary`, `include_in_report` kolonlarini ekle
- Habitat listesini gosterirken **`site_id = null` olan kayitlari her site altinda da goster**:
  ```sql
  SELECT * FROM habitat_polygons
  WHERE project_id = :projectId
    AND (site_id = :siteId OR site_id IS NULL)
  ORDER BY fossitt_code
  ```
- Eger habitat duzenleme destekleniyorsa su alanlar duzenlenebilir olmali:
  - `condition` (excellent / good / moderate / poor / bad)
  - `notes` (serbest metin)
  - `fossitt_code` + `fossitt_name` (FOSSITT habitat siniflandirmasi)
  - `boundary` (polygon geometrisi — haritada yeniden cizilebilir)

---

## 6. Target Notes — Yeni Kolonlar + Site Baglantisi

### Yeni / degisen kolonlar:

| Kolon               | Tip         | Aciklama                                |
| ------------------- | ----------- | --------------------------------------- |
| `site_id`           | uuid / null | FK → project_sites (YENI — mobilde yok) |
| `created_by`        | uuid        | FK → profiles (YENI — mobilde yok)      |
| `include_in_report` | boolean     | Rapora dahil mi (YENI — mobilde yok)    |

### Priority enum degisti:

```
MOBILDE MEVCUT:   "high" | "normal"
WEB'DE GUNCEL:    "high" | "normal" | "low"
```

- `"low"` eklendi (mobilde sadece high/normal vardi)

### Filtreleme:

- `target_notes.site_id` → `project_sites.id` (FK, nullable)
- Ayni filtreleme mantigi: site seciliyken `site_id = :siteId OR site_id IS NULL`

### Target Notes Tablo Yapisi (tam guncel):

| Alan                | Tip         | Aciklama                              |
| ------------------- | ----------- | ------------------------------------- |
| `id`                | uuid        | Primary key                           |
| `project_id`        | uuid        | FK → projects                         |
| `site_id`           | uuid / null | FK → project_sites (YENI)             |
| `title`             | string      | Not basligi                           |
| `description`       | string/null | Detayli aciklama                      |
| `category`          | string      | Kategori (fauna, flora, habitat, etc) |
| `location`          | GeoJSON     | Nokta koordinati                      |
| `photos`            | string[]    | Foto URL'leri                         |
| `priority`          | string/null | high / normal / low                   |
| `is_verified`       | boolean     | Dogrulanmis mi                        |
| `created_by`        | uuid        | FK → profiles (YENI)                  |
| `include_in_report` | boolean     | Rapora dahil mi (YENI)                |

---

## 7. Tum Enum Degerleri (Guncel)

```typescript
survey_status: 'in_progress' | 'completed'
// ⚠️ Mobilde "planned" ve "approved" KALDIRILDI

sync_status: 'synced' | 'pending' | 'conflict'
// ⚠️ Mobilde "failed" kullaniliyor → "conflict" olarak degistir

project_status: 'draft' | 'active' | 'completed' | 'archived'
// ⚠️ Mobilde sadece "active" ve "completed" var → "draft" ve "archived" ekle

project_member_role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer' | 'member'
// ⚠️ Mobilde bu enum tanimli degil — ekle

user_role: 'admin' |
  'project_manager' |
  'ecologist' |
  'junior' |
  'third_party' |
  'client' |
  'assessor'
// ⚠️ "assessor" deprecated — ecologist ile ayni yetkiler, label "Ecologist" olarak goster

workflow_status: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
project_phase: 'desk_research' | 'field_research' | 'reporting'

habitat_condition: 'excellent' | 'good' | 'moderate' | 'poor' | 'bad'
// ⚠️ Mobilde "degraded" → "bad" olarak degistir, "excellent" ekle

target_note_priority: 'high' | 'normal' | 'low'
// ⚠️ Mobilde "low" yok → ekle
```

### Survey Tipleri:

```typescript
;'walkover' |
  'habitat_mapping' |
  'releve_survey' |
  'bat_survey' |
  'bird_survey' |
  'mammal_survey' |
  'aquatic_survey' |
  'botanical_survey' |
  'invertebrate_survey' |
  'biodiversity_net_gain' |
  'other'
```

---

## 8. Yeni Tablo: `project_sites`

Mobilde bu tablo yok — eklenmeli. Multi-site projeler icin gerekli.

| Kolon              | Tip              | Aciklama              |
| ------------------ | ---------------- | --------------------- |
| `id`               | UUID (PK)        | Primary key           |
| `project_id`       | UUID             | FK → projects         |
| `site_code`        | string           | Site kodu (zorunlu)   |
| `site_name`        | string / null    | Site adi              |
| `sort_order`       | number           | Siralama              |
| `boundary`         | GEOMETRY/Polygon | Site siniri (GeoJSON) |
| `center_point`     | GEOMETRY/Point   | Merkez noktasi        |
| `grid_reference`   | string / null    | Irish Grid referansi  |
| `county`           | string / null    | Ilce                  |
| `townland`         | string / null    | Townland              |
| `province`         | string / null    | Il                    |
| `buffer_distances` | number[]         | Buffer mesafeleri     |
| `visible_layers`   | string[]         | Gorunur katmanlar     |
| `attributes`       | JSONB            | Ek ozellikler         |
| `created_at`       | timestamptz      | Olusturulma tarihi    |
| `updated_at`       | timestamptz      | Guncellenme tarihi    |

### Mobile'da ne yapilmali?

- SQLite'a `cached_project_sites` tablosu ekle
- Uygulama acilisinda (`cacheAllData`) project_sites verisini de cek
- Proje detay ekraninda site listesini gostermek icin kullan

---

## 9. DB Sema Ozeti — Neler Degisti, Neler Ayni?

### Degisen:

| Tablo/Enum             | Degisiklik                                                                |
| ---------------------- | ------------------------------------------------------------------------- |
| `survey_status`        | `planned` ve `approved` silindi                                           |
| `sync_status`          | `"failed"` → `"conflict"` olarak degisti                                  |
| `workflow_steps`       | Step 5,6 silindi; 7-10 → 5-8 yeniden numaralandi                          |
| `surveys`              | `site_id` kolonu eklendi (FK → project_sites)                             |
| `habitat_polygons`     | `site_id`, `boundary`, `include_in_report`, `survey_id` kolonlari eklendi |
| `target_notes`         | `site_id`, `created_by`, `include_in_report` kolonlari eklendi            |
| `habitat_condition`    | `"degraded"` → `"bad"`, `"excellent"` eklendi                             |
| `target_note_priority` | `"low"` eklendi                                                           |

### Yeni:

| Tablo           | Aciklama                              |
| --------------- | ------------------------------------- |
| `project_sites` | Multi-site proje destegi (YENI tablo) |

### Degismeyen:

| Tablo                    | Durum     |
| ------------------------ | --------- |
| `releve_surveys`         | Yapi ayni |
| `desk_research_findings` | Yapi ayni |
| `profiles`               | Yapi ayni |
| `photos`                 | Yapi ayni |
| `survey_templates`       | Yapi ayni |
| `project_members`        | Yapi ayni |

---

## 10. Hizli Kontrol Listesi

### Kritik (uygulamayi bozar):

- [ ] `survey_status` enum'dan `planned` ve `approved` referanslarini kaldir
- [ ] `sync_status` enum'da `"failed"` → `"conflict"` olarak degistir
- [ ] Workflow step numaralarini 8-step sistemine guncelle (5,6 silindi; 7→5, 8→6, 9→7, 10→8)
- [ ] Yeni survey'lerde `status: 'in_progress'` default yap

### Onemli (islevsellik — yeni kolonlar):

- [ ] `surveys` tablosuna `site_id` kolonu ekle (SQLite cache + Supabase sorgu)
- [ ] `habitat_polygons` tablosuna `site_id`, `boundary`, `include_in_report`, `survey_id` kolonlari ekle
- [ ] `target_notes` tablosuna `site_id`, `created_by`, `include_in_report` kolonlari ekle
- [ ] `project_sites` tablosu icin yeni SQLite cache tablosu olustur (`cached_project_sites`)
- [ ] `cacheAllData()` fonksiyonuna `project_sites` verisini ekle

### Onemli (islevsellik — enum degisiklikleri):

- [ ] `habitat_condition`: `"degraded"` → `"bad"`, `"excellent"` ekle
- [ ] `target_note_priority`: `"low"` secenegi ekle

### Onemli (islevsellik — site filtreleme):

- [ ] Survey olusturmada `site_id` zorunlu yap (multi-site projelerde)
- [ ] Survey olusturmada `releve_code`, `recorder`, `site_name` otomatik doldur
- [ ] Survey listesini `site_id`'ye gore filtrele
- [ ] Habitat listesinde `site_id IS NULL` kayitlari tum site'larda goster
- [ ] Target notes listesinde `site_id IS NULL` kayitlari tum site'larda goster

### Gorseller:

- [ ] Step 4'u "Field Research" olarak goster
- [ ] Sidebar / step listesini 8 step olarak guncelle
- [ ] Status picker'da sadece `in_progress` / `completed` goster
- [ ] Habitat condition picker'da 5 secenegi goster (excellent/good/moderate/poor/bad)
- [ ] Target note priority picker'da 3 secenegi goster (high/normal/low)
