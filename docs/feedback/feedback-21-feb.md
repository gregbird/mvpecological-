# Feedback - 21 Subat 2026 (Bolum 23)

> Acik/bekleyen gorevler. Tamamlanan gorevler icin bkz. `completed-archive.md`
> Bu bolum Greg Birdthistle'in "Field Survey Planning and Preparation" feedback'inden gelmektedir.

---

## 23. Field Survey Planning & Preparation

### 23.1 Survey Targets Kutusunu Kaldir

- [ ] **23.1.1** `survey-targets-box.tsx` bilesenini `field-survey-step.tsx`'ten kaldir
- [ ] **23.1.2** `survey-targets-box.tsx` dosyasini sil veya arsivle

---

### 23.2 Editable Survey Templates (Releve Survey Bazli)

> Referans: Bolt prototipi (`dulraecological.bolt.host`) -- `ReleveSurvey.tsx` (1619 satir), 8 bolumlu form.

- [ ] **23.2.1** Releve Survey form bileseni olustur
  - Dosya: `components/field-surveys/releve-survey-form.tsx`
  - 8 bolum: Basic Info, GPS Location, Site Characteristics, Vegetation Heights, Cover Percentages, Species Records, Additional Observations, Custom Fields
  - React Hook Form + Zod validation
  - Edit mode + View mode

- [ ] **23.2.2** Supabase migration -- `releve_surveys` + `releve_species` tablolari
  - Tum 8 bolum field'lari + custom_fields JSONB
  - RLS policies + indexes

- [ ] **23.2.3** Common Irish Flora veritabani
  - Dosya: `lib/data/common-irish-flora.ts`
  - ~20 yaygin Irlanda bitkisi (Latin + English name) + DOMIN Scale tanimlari

- [ ] **23.2.4** Survey View butonunu template'e bagla
  - Survey tipi `releve_survey` ise -> `ReleveSurveyForm` goster (edit mode)
  - Diger tipler icin mevcut read-only view kalsin

- [ ] **23.2.5** Survey template kaydetme/yukleme sistemi
  - Supabase migration: `releve_survey_templates` tablosu
  - Template load/save UI (opsiyonel -- MVP sonrasi)

---

### 23.3 Email ile Survey Gonderme

- [ ] **23.3.1** "Email Survey" butonu ekle
  - `mailto:` native link yaklasimiyla (Backend SMTP yok)
  - Body: Proje adi, site, tarih, survey tipi, link

- [ ] **23.3.2** PDF export butonu ekle
  - Releve Survey form verilerini PDF'e cevir
  - "Download PDF" + "Email with PDF link" secenekleri

---

### Oncelik Sirasi

| #      | Gorev                   | Oncelik | Efor             |
| ------ | ----------------------- | ------- | ---------------- |
| 23.1   | Survey Targets kaldir   | YUKSEK  | Dusuk (15dk)     |
| 23.2.1 | Releve Survey form      | YUKSEK  | Yuksek (1-2 gun) |
| 23.2.2 | Supabase migration      | YUKSEK  | Orta             |
| 23.2.3 | Common Irish Flora data | ORTA    | Dusuk            |
| 23.2.4 | View butonu -> template | YUKSEK  | Orta             |
| 23.2.5 | Template save/load      | DUSUK   | Orta             |
| 23.3.1 | Email butonu (mailto)   | ORTA    | Dusuk            |
| 23.3.2 | PDF export              | ORTA    | Orta             |
