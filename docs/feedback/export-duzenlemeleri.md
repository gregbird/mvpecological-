# Export Düzenlemeleri — Çalışma Notları

> **Bu dosya kişisel çalışma notu.** Tüm rapor tiplerinin export çıktısını tek tek inceleyip düzelteceğiz. Her seansta nereye kaldığımı buradan takip ederim.

---

## Genel Çalışma Planı

Sistemde **10 rapor tipi** var (PEA, EcIA, AA Screening, AA Stage 2, NIA, Bat Survey, Bird Survey, Habitat Survey, Protected Species, Other Technical Report). Her birini sırayla **Step 8 export** üzerinden test edeceğiz:

1. PDF çıktısı kontrol et
2. Word çıktısı kontrol et
3. HTML çıktısı kontrol et (opsiyonel)
4. Bulunan hataları düzelt
5. Bu dosyaya işlenen düzeltmeleri not al

Yan görev: **Step 3 Desk Assessment export'u** (üst Export butonu) ayrıca düzeltildi — o da raporun parçası.

---

## 1) Step 3 Desk Assessment Export — TAMAMLANDI ✅

**Konum:** `lib/export/desk-assessment-exporter.ts`
**Tetikleyici:** Step 3 üst sağdaki "Export" dropdown (PDF / Word / HTML)
**Veri kaynağı:** Saved findings + AI ecological summary + habitat rows + map screenshots

### Düzeltilen sorunlar

#### PDF (`exportDeskAssessmentPdf`)

- ✅ **Hücre içeriği 30 karakterde `…` ile kırpılıyordu** → gerçek `splitTextToSize` wrap'i eklendi, hücre yüksekliği `maxLines * 4mm + 3mm padding` ile dinamik
- ✅ **Tüm sütunlar eşit genişlik** → tabloya özel weight array'ler (`[45, 14, 15, 13, 13]` vb.) — her tabloda içeriğe orantılı
- ✅ **Hücre padding yoktu** → `cellPadX = 2mm`, `cellPadY = 1.5mm` eklendi
- ✅ **Hücre border'ı yoktu** → `doc.rect` ile her hücreye ince gri çerçeve (`#DCDCDC`, 0.1mm)
- ✅ **Header arka planı çok ince** (5mm) → `headerH = 7mm` + `#F3F4F6` dolgu + `#C8C8C8` border
- ✅ **Sayfa kırılınca tablo header'ı tekrarlanmıyordu** → `ensureSpace` page break tespit edip header'ı yeniden çiziyor + "(continued)" başlığı ekliyor
- ✅ **`## ` heading orphan oluyordu** (sayfa altında başlık, içerik üst sayfada) → `ensureSpace(18)` ile heading + 2 satır rezerve ediliyor
- ✅ **Paragraflar yapışıktı** → `y += wrapped.length * 4.5 + 1` ile küçük gap

#### DOCX (`exportDeskAssessmentDocx`)

- ✅ **Font 9pt'di** (size: 18 half-points) → **11pt** (size: 22)
- ✅ **Content width 8640 dxa** (yorum 1.25" margin için doğru ama Word default 1") → **9360 dxa** (Word default 1" margin A4 doğrusu)
- ✅ **Heading `after` spacing yoktu** → `spacing: { before: 360, after: 180 }`
- ✅ **Cell margin tanımlı değildi** → `{ top: 80, bottom: 80, left: 100, right: 100 }` twips
- ✅ **Table border explicit değildi** → `BorderStyle.SINGLE`, size 4, color `CCCCCC` (LibreOffice/Pages tutarlılığı için)
- ✅ **Eşit sütun genişlikleri** → PDF ile aynı weight sistemi
- ✅ **Map görseli sabit 600×360 px** → doğal en-boy oranını koruyan dinamik (`Image()` ile `naturalWidth/Height` okuyup max 600 px'e ölçekliyor)
  - İlk denemede 720×432 yaptım, sağa taştı → 600 px max'a düşürdüm
- ✅ **Plain paragraflar zorla italic** → kaldırıldı, bold-aware split kaldı
- ✅ **Bullet/paragraf `after` spacing yok** → bullets `80`, paragraphs `120`

### Test sonucu

- Kullanıcı raporladı: "Wordde en altta maps kısmındaki harita sağa taşmış" → düzeltildi (720→600 px + dinamik aspect ratio)
- Şu an stabil görünüyor

---

## 2) Step 8 Final Submission Export — DEVAM EDİYOR 🔄

**Konum:** `lib/export/pdf-generator.ts` + `lib/export/pdf/*.ts` modülleri (orchestrator + 11 alt modül)
**Tetikleyici:** Step 8 → "Export Report" butonu (PDF / Word / HTML)
**Veri kaynağı:** `reports` tablosu → `content.sections` (Step 6'da AI üretti) + `appendixData` + branding + cover page

### Test edilen proje

- **Proje:** Ecologist Project (`EP-2026-907`)
- **Rapor tipi:** PEA (Preliminary Ecological Appraisal)
- **Versiyonlar:**
  - v1 (draft, 11.05.2026 11:43, 6/6 section)
  - v2 (**final**, 11.05.2026 17:45, 6/6 section)
  - v3 (draft, 11.05.2026 17:46, 6/6 section) — **bu test edildi**
- **Veri hacmi:** 74 finding, 63 habitat, 1 species observation, 0 protected species
- Junction tablo (`project_report_types`) boş — fallback `'pea'` çalıştı

### Sorunlar (test PDF'inde tespit edildi)

#### Görsel/render sorunları

1. **Hücrede ham `**Header**` markdown** — tüm tablolarda asterix'ler raw görünüyordu
2. **Kelime birleşmesi** — `**bold**word` parsing'inde boşluk yutuluyor (`(SACs)and`, `0.5 kmbeyond`, `(EPACatchment Code 30)` vb.)
3. **Tablo hücrelerinde `…` truncate** — `Williamstown Turlou…`, `Distance from B…` her yerde
4. **Sayfa 12 → 13 tablo kırılınca header reprint yok** — son satır tek başına yeni sayfada
5. **Empty appendix sayfaları:**
   - Sayfa 19 Appendix A (Habitat Map) — sadece "[Content to be inserted]"
   - Sayfa 21 Appendix C (Species List) — sadece başlık, tablo yok
   - Sayfa 23 Appendix E (Site Photographs) — sadece "[Content to be inserted]"
6. **Yarım/boş sayfalar** — bölüm bitiminde 35mm "ensure space" kuralı yarım sayfaları boş bırakıyordu

#### Düzeltilen sorunlar

**`lib/export/pdf/markdown-parser.ts`**

- ✅ **Word boundary repair** — `segmentsToWords`'te segment geçişlerinde boundary kontrolü: önceki segment kelime karakteriyle bitip yeni segment kelime karakteriyle başlıyorsa `trailingSpace=true` zorlanır
  - `**bold**word` → "bold word" (artık doğru aralık)
  - `(002296)comprises` → "(002296) comprises"
  - `\p{L}\p{N})` ile kapanış parantezi de kelime sonu sayılıyor

**`lib/export/pdf/table-renderer.ts`** (full rewrite)

- ✅ **`stripMarkdown` fonksiyonu** — `**bold**`, `*italic*`, `` `code` ``, `__under__` markerları hücreden temizleniyor (header + body)
- ✅ **`splitTextToSize` wrap'i** — eskiden `truncateText` ile `…` ekleniyordu, artık gerçek wrap
- ✅ **Dinamik satır yüksekliği** — `maxLines * 4mm + 4mm padding`, max 6 satır (sonrası `…`)
- ✅ **Header reprint on page break** — `yBefore !== y` kontrolü ile yeni sayfada otomatik header
- ✅ **`calculateColumnWidths` cap'i** — her sütun max %40 (`maxColRatio = 0.4`) ile sınırlı, AI Summary 800px alıp diğerlerini ezemez
- ✅ **Min sütun genişliği 18mm** — okunamayacak kadar dar sütun olmaz

**`lib/export/pdf/appendix-renderer.ts`**

- ✅ **`writeEmptyNote` helper** — boş appendix için italic açıklama mesajı
- ✅ **`species_list` boş ise** → "No species records were returned from the desk study or field surveys. Targeted Phase 2 surveys are recommended..."
- ✅ **`designated_sites` boş ise** → "No designated sites recorded for this project."
- ✅ **`habitat_data` boş ise** → "No habitat polygons recorded for this project."
- ✅ **`aquatic_data` boş ise** → "No aquatic features recorded within the study buffer."
- ✅ **`habitat_map` kuralı yeni:** veri varsa habitat tablosunu döküyor + "georeferenced habitat map supplied separately" notu; veri yoksa sadece placeholder
- ✅ **`photographs` kuralı yeni:** "Site photographs are supplied as a separate deliverable..." mesajı
- ✅ **Bilinmeyen key (`survey_datasheets`, `legislation_references` vb.)** — "Content to be supplied with the final deliverable."

**`lib/export/pdf/section-renderer.ts`**

- ✅ **Orphan whitespace eşiği 35mm → 18mm** — bölüm bittiğinde yer kalmışsa yeni bölüm aynı sayfada başlayabiliyor

### 2. tur düzeltmeleri — PEA v3 ikinci test sonrası

İlk düzeltmeden sonra kullanıcı yeni PDF'i test etti. Görsel sorunlar büyük ölçüde düzeldi (tablo asterix, hücre wrap, appendix mesajları, header reprint), ama text-extraction (kopyalayınca veya PDF reader'ın search ettiği gerçek metin) seviyesinde kelime birleşmeleri kaldı. Ek olarak DOCX export hiç test edilmemişti.

**`lib/export/pdf-generator.ts`** — `writeRichText` text-extraction fix

- ✅ **PDF text extraction kelime birleşmesi** — jsPDF her kelimeyi ayrı `doc.text()` çağrısıyla yazıyordu. Görsel olarak boşluk var (x-koordinatı ileri kayıyor) ama PDF içeriğinde **gerçek space karakteri yoktu**. Sonuç: copy/paste, find-in-page ve Read tool ile metin çıkardığında `Turloughs are` → `Turloughsare`, `seasonal flooding` → `seasonalflooding`.
  - Fix: `trailingSpace=true` olan kelimelerde, lookahead ile sonraki kelime aynı satıra sığacaksa metnin sonuna `' '` karakteri eklenip tek `doc.text()` çağrısıyla yazılıyor → gerçek space karakteri PDF içeriğine işleniyor.
  - Line wrap olduğunda son kelimenin trailing space'i skip ediliyor (margin dışına taşmaz).
  - DB'de metin "seasonal flooding" doğru saklanıyordu — sorun TipTap→markdown→render zincirinde değil, sadece jsPDF'in alt seviye text positioning'inde.

**`lib/export/docx-generator.ts`** — full set of fixes (DOCX hiç düzeltilmemişti)

- ✅ **`stripMarkdown` helper** — tablo hücrelerindeki `**bold**`, `*italic*` markerları temizleniyor (header + body + `buildDocxAppendixTable`). Eskiden Word'de tablolarda raw asterix vardı.
- ✅ **`repairRunBoundaries`** — adjacent `TextRun` arasında letter→letter veya `)`→letter geçişi varsa önceki run'a `' '` ekleniyor. Word adjacent TextRun'ları arasına otomatik boşluk koymaz, o yüzden PDF'teki segmentsToWords fix'inin DOCX karşılığı şart.
- ✅ **Empty appendix mesajları** — `[Content to be inserted]` placeholder yerine her appendix tipine özel italic açıklama (PDF appendix-renderer ile aynı içerikler).
- ✅ **`habitat_map`** — habitat verisi varsa tablo + GIS deliverable notu, yoksa "Habitat map figure to be supplied as a separate deliverable."
- ✅ **`photographs`** — "Site photographs are supplied as a separate deliverable..."
- ✅ **`survey_datasheets` / `legislation`** — "Content to be supplied with the final deliverable."

**`lib/export/docx-generator.ts`** — Word boşluk fix (3. tur, kullanıcı raporladı)

- ✅ **Smart appendix page break** — eskiden her appendix öncesi `PageBreak()` vardı; kısa not içeren appendix tek satırla koca sayfa kaplıyordu (2-3 yarısı boş sayfa). Yeni mantık:
  - **İlk appendix** → her zaman page break (ana rapordan ayrılır)
  - **Sonraki "heavy" appendix** (tablo içeren — `designated_sites`, `species_list` dolu, `habitat_data`, `aquatic_data`, `habitat_map` habitat verisi varsa) → page break
  - **Sonraki "note-only" appendix** → page break **YOK**, önceki appendix ile aynı sayfada devam
  - PEA v3 için toplam tahmini kazanç: 2-3 boş sayfa daha az
- ✅ Heading spacing — note-only appendix için `before: 360` (üst nottan biraz nefes), heavy için `before: 240`

### Çözmediklerim (export'la ilgili değil)

| Sorun                           | Neden / Nereye düşüyor                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `(Lowland` yarım kesik cümleler | **Step 6 AI üretim truncate'i** — Claude `max_tokens` limitine takılmış. DB'de `reports.content.sections`'da metin zaten kesik. Step 6 generator'ında `max_tokens` artırılmalı veya chunked generation |
| `km·h{¹` (`km·h⁻¹` yerine)      | jsPDF default Helvetica font Unicode superscript karakterleri render edemiyor. Custom font yüklenmeli veya superscript chars HTML/Unicode encoding farklı yapılmalı                                    |

### 3. tur düzeltmeleri — PEA v3 dördüncü test sonrası (12.05.2026)

Kullanıcı PDF (4)'ü test etti. Önceki turdaki büyük merge sorunlarının çoğu düzelmiş; geride sadece **line-wrap noktasında** birleşen kelimeler ve **Survey Table'da düşen header** kaldı.

**`lib/export/pdf-generator.ts`** — `writeRichText` tam yeniden yazıldı

- ✅ **Same-style run batching** — eskiden her kelime ayrı `doc.text()` çağrısıydı; jsPDF iki ardışık Tj operatörünü çoğu PDF reader birleşik metin olarak görüyordu ("which provides" → "whichprovides"). Yeni mantık: aynı stildeki ardışık kelimeleri TEK `doc.text()` çağrısında topluyor, içine gerçek boşluk karakteri koyuyor. Stil değişimi (plain ↔ bold ↔ italic) veya line wrap olunca run flush ediliyor.
- ✅ **Wrap-aware trailing space** — wrap durumunda da kelime sonuna boşluk embed ediliyor + forced wrap ile y advance ediyor. `at0.18`, `toEU`, `duringfieldwork`, `(Code3180*)`, `withinthe` gibi merge'ler kapanıyor.

**`lib/export/pdf/markdown-parser.ts`** — `segmentsToWords` boundary repair genişletildi

- ✅ Word-end karakter setine `: , . ; ! ?` eklendi, word-start setine `(` eklendi. Eskiden sadece `\p{L}\p{N})` vardı, dolayısıyla `**Habitats:**Desktop` gibi `:` ile biten bold segment'ler düzgün boşluk almıyordu. Şimdi:
  - `**Habitats:**Desktop` → `Habitats: Desktop` ✅
  - `**Wildlife Acts (1976–2021):**Irish` → `Wildlife Acts (1976–2021): Irish` ✅

**`lib/export/pdf/table-renderer.ts`** — üç düzeltme

- ✅ **Cell `…` truncate kaldırıldı** — eskiden `slice(0, 6)` ile 6 satır cap + `…` vardı; Constraints Assessment tablosunda 19 hücre kesik yazılıyordu. Şimdi hücreler ihtiyaç kadar uzuyor, header reprint zaten devrede.
- ✅ **`calculateColumnWidths` yeniden yazıldı** — header genişliği artık "hard floor" (sütun en az header'ın tek satıra sığacağı kadar geniş). Slack dağıtımı `(desired - floor)` üzerinden orantılı. Tek sütun cap'i %40 → %50.
- ✅ **Multi-line header desteği** — `drawHeader` artık header sığmazsa wrap edip tüm satırları çiziyor, header bandı yüksekliği dinamik. Survey Table 6-sütun da olsa `Recorder/Surveyor` ve `Weather Conditions` tam görünüyor.

### Test sonucu (PDF v5, 12.05.2026 — kullanıcı onayı)

**Çözüldü:**

- Bold-noktalama merge'leri (`Habitats: Desktop`, `(1976–2021): Irish` vb.) ✅
- `whichprovides` → `which provides` ✅
- `seasonalflooding` → `seasonal flooding` ✅
- `(2000)comprises` → `(2000) comprises` ✅
- Constraints Assessment tablosu tam metin (no `…`) ✅
- Habitat tablosu 5 header tam yazılı ✅
- Survey Table 6 header tam yazılı (multi-line wrap) ✅
- Header reprint sayfa kırılınca ✅

**Kalan minor merge'ler (line-wrap noktasında, 3. tur fix'iyle çözülecek — kullanıcı onayı ile şimdilik bırakıldı):**

- `duringfieldwork`, `at0.18`, `distincthabitat`, `toEU`, `(Code3180*)` gibi sınır durumları
- "Şuan iyiyse kalsın" — sıradaki rapor tipine geçilecek

---

## Test Edilecek Diğer Rapor Tipleri (10 - 1 = 9 kaldı)

| #   | Rapor Tipi                             | ID                  | Test Edildi   | Sorun Sayısı   | Düzeltildi               |
| --- | -------------------------------------- | ------------------- | ------------- | -------------- | ------------------------ |
| 1   | Preliminary Ecological Appraisal (PEA) | `pea`               | ✅ v3 (3 tur) | 6 + 5 ek minor | ✅ (3. tur kabul edildi) |
| 2   | Ecological Impact Assessment (EcIA)    | `ecia`              | ⏳            | —              | —                        |
| 3   | Appropriate Assessment Screening       | `aa_screening`      | ⏳            | —              | —                        |
| 4   | Appropriate Assessment (Stage 2)       | `aa_stage2`         | ⏳            | —              | —                        |
| 5   | Natura Impact Assessment (NIA)         | `nia`               | ⏳            | —              | —                        |
| 6   | Bat Survey Report                      | `bat_survey`        | ⏳            | —              | —                        |
| 7   | Bird Survey Report                     | `bird_survey`       | ⏳            | —              | —                        |
| 8   | Habitat Survey Report                  | `habitat_survey`    | ⏳            | —              | —                        |
| 9   | Protected Species Report               | `protected_species` | ⏳            | —              | —                        |
| 10  | Other Technical Report                 | `other`             | ⏳            | —              | —                        |

### Test stratejisi (her rapor için)

1. Aynı projede (veya yeni test projesi) Step 8 → selector'dan rapor tipini değiştir
2. Step 6'da o tipte rapor üret (Generate All)
3. Step 8'e dön → Export Report → PDF
4. Export Report → Word
5. PDF + Word çıktılarını incele, sorunları bu dosyaya not al
6. Düzeltme yap → tekrar test

### Aynı proje üzerinden gitmek vs. ayrı projeler

- **Aynı proje:** Daha hızlı, aynı veri (74 finding, 63 habitat) farklı template ile nasıl render olduğunu gösterir → **şu an tercih edilen yol**
- **Ayrı projeler:** Her rapor tipinin kendi veri profili olur ama setup uzun

---

## Genel Yapısal Bilgiler

### Export'ların kod yerleri

| Export                 | Dosya                                                 | Tetikleyici                   |
| ---------------------- | ----------------------------------------------------- | ----------------------------- |
| Step 3 Desk Assessment | `lib/export/desk-assessment-exporter.ts`              | Step 3 header Export dropdown |
| Step 8 Final Report    | `lib/export/pdf-generator.ts` + `lib/export/pdf/*.ts` | Step 8 Export Format card     |
| Step 8 Shapefile       | `lib/export/...` (Use shapefile-export hook)          | Step 8 Additional Exports     |
| Step 8 Survey CSV      | `final-submission-step.tsx` içinde inline             | Step 8 Additional Exports     |
| Step 2 Findings        | `components/steps/data-gathering/export-panel.tsx`    | Step 2 sub-step 7             |
| Step 5 Habitats CSV    | `components/steps/data-analysis/habitat-tab.tsx`      | Step 5 Habitats tab           |
| Step 5 Map Screenshot  | `components/steps/data-analysis/maps-tab.tsx`         | Step 5 Maps tab               |
| Audit Log CSV          | `app/(dashboard)/audit/page.tsx`                      | Audit Trail page              |

### Veri akış (Step 8 için)

```
/templates → Report Templates (tanım: section + AI prompt)
       ↓
Step 6 AI Draft → reports.content.sections (üretim)
       ↓
Step 7 Quality Review (onay)
       ↓
Step 8 Final Submission
   ├── reports.content.sections       (metin)
   ├── appendixData (savedFindings)   (tablolar)
   ├── branding (org seviyesi)        (renk/logo/font)
   └── cover page (UI'da elle)        (kapak)
       ↓
PDF / Word / HTML çıktı
```

### Önemli not

- `/templates` doğrudan Step 8'e gelmiyor — Step 6 üzerinden dolaylı
- Template değiştirilince Step 6'da **Regenerate All** çalıştırılmazsa Step 8 eski içeriği basıyor

---

## Çalışma Geçmişi

| Tarih      | Yapılan                                                                                                            | Test eden       |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| 11.05.2026 | Step 3 PDF + Word export rewrite (table wrap, header reprint, padding, branding)                                   | Kullanıcı ✅    |
| 11.05.2026 | Step 3 Word map görseli 720→600 px düzeltmesi (sağa taşma)                                                         | Kullanıcı ✅    |
| 11.05.2026 | Step 8 PDF generator markdown/table/appendix/orphan fix (PEA v3, 1. tur)                                           | Kullanıcı ✅    |
| 11.05.2026 | Step 8 PDF `writeRichText` text-extraction kelime birleşmesi fix (PEA v3, 2. tur)                                  | Test bekleniyor |
| 11.05.2026 | Step 8 DOCX generator full fix (stripMarkdown, repairRunBoundaries, empty appendix notes, habitat_map/photographs) | Test bekleniyor |
| 11.05.2026 | Step 8 DOCX smart appendix page-break (note-only appendices artık önceki ile aynı sayfada — 2-3 boş sayfa kazancı) | Test bekleniyor |
| 12.05.2026 | Step 8 PDF `writeRichText` same-style run batching + wrap-aware trailing space (PEA v3, 3. tur)                    | Kullanıcı ✅    |
| 12.05.2026 | Step 8 PDF `segmentsToWords` boundary repair regex (`:`, `,`, `.`, `;`, `!`, `?`, `(` dahil)                       | Kullanıcı ✅    |
| 12.05.2026 | Step 8 PDF `table-renderer` `…` truncate kaldırıldı, header floor + multi-line header desteği                      | Kullanıcı ✅    |

---

## Yapılacaklar / Notlar

- [x] PEA v3 1. tur PDF düzeltmeleri doğrulandı (görsel iyileşme onaylandı, text-extraction'da kelime birleşmesi tespit edildi)
- [x] PEA v3 2. tur PDF doğrulama — text-extraction'da kelime birleşmesi büyük ölçüde düzeldi, ama bold-colon ve line-wrap durumları kaldı
- [x] PEA v3 3. tur PDF doğrulama — same-style run batching + wrap-aware fix sonrası kullanıcı "şuan iyiyse kalsın" dedi, PEA stabil sayılıyor
- [ ] PEA v3 DOCX (Word) doğrulama — boş sayfa sayısı azaldı mı, tablo asterix temiz mi, kelime merge düzeldi mi
- [ ] **EcIA test edilecek** (sırada 2.) — aynı proje EP-2026-907, Step 8'de selector'dan tip değiştir + Step 6 Regenerate All
- [x] **Step 6 "appendices" section AI üretimi atlandı** (12.05.2026) — PEA + EcIA template'lerinde `id: 'appendices'` section'ı tanımlı, AI buraya ~22K (PEA) / ~15K (EcIA) char üretiyordu ama `pdf-generator.ts:289` kasıtlı filter ile basmıyor (AI uydurma "Appendix A:..." listesi otomatik appendix tablolarla çakışıyor). `ai-draft-step.tsx:164` `generateAllSections` artık `def.id !== 'appendices'` filter'a sahip → ~1$ + 1 dk tasarruf her rapor üretiminde. Görsel etki yok (otomatik Appendix A-E zaten basılıyor).
- [x] **Karar revize edildi** (12.05.2026) — Kullanıcı "müşteri bu adımları (section listesini) verdi, AI üretiyorsa rapora basalım" dedi. Hem Step 6 skip'i geri alındı (AI üretmeye devam) hem de Step 8 export skip'leri (PDF + DOCX + HTML, 3 yerde) kaldırıldı. Artık "Appendices" section'ı AI metniyle birlikte PDF'e basılıyor, sonra otomatik Appendix A-E tabloları onun ardından geliyor.
- [x] **Appendices template prompt'u yeniden yazıldı** (12.05.2026) — EcIA v1 (4) test PDF'inde AI 7-appendix listesi (Site Location Map, Habitat Map, Designated Sites Map, Species, Photos, Survey Datasheets, CEMP Outline) yazıyordu; otomatik renderer 5 appendix basıyordu (Habitat, Designated, Species, Aquatic, Photos). Sonuç: harf numaraları kayıyor + iki uyumsuz liste yan yana. Çakışmanın sebebi template prompt'u kendi içinde appendix listesi tanımlamasıydı. `lib/templates/pea-template.ts:150` ve `ecia-template.ts:237` artık AI'a "appendix listesi yazma — sadece Data Sources and References listesini doldur" diyor. Otomatik appendix tabloları olduğu gibi devam ediyor, AI metni artık sadece kaynak/referans listesi.
- [ ] AI truncation sorunu için Step 6'da `max_tokens` artırılması ayrı bir feedback olarak ele alınmalı (`route.ts` veya AI generation logic)
- [ ] Superscript encoding (`⁻¹` rendering) — jsPDF custom font yüklenmesi gerekecek (Helvetica-Unicode varsa) — ayrı task
- [ ] Branding (logo/renk) Step 8 export'unda doğru uygulanıyor mu — ayrı kontrol
- [ ] Cover page metinleri (Report Title, Prepared For, Project Reference) doğru basılıyor mu — ayrı kontrol
- [ ] Step 8 HTML export hiç test edilmedi — PDF/Word kararlı olunca HTML'e geçilebilir
- [ ] **Word cover page** çok yukarıda boş kalıyor olabilir (`spacing.before: 2400` = 1.67") — kullanıcı isterse azaltılır
- [ ] **Word TOC sayfası** kısa olunca alt yarı boş — şu an design intent olarak kabul ediliyor, kullanıcı şikayet ederse compacter TOC yapılır

---

## Şu an açık olan dosyalar (referans için)

`lib/export/` ağacı:

```
lib/export/
├── desk-assessment-exporter.ts    ← Step 3 export (jsPDF + docx)
├── pdf-generator.ts                ← Step 8 PDF orchestrator
├── docx-generator.ts               ← Step 8 DOCX
├── pdf-generator-types.ts          ← shared types (PeaExportOptions, APPENDIX_LABELS)
├── tiptap-to-markdown.ts           ← TipTap JSON → markdown converter (Step 6'da editor'da kayıt edilen format)
├── appendix-data.ts                ← prepareAppendixData() — savedFindings → AppendixData
├── image-utils.ts                  ← fetchImageAsBase64 / fetchImageAsBuffer
├── export-worker.ts                ← Web Worker, PDF/DOCX/HTML üretimi off main thread
└── pdf/                            ← Step 8 PDF render modülleri
    ├── appendix-renderer.ts        ← her appendix tipi için render dalı
    ├── cover-page.ts               ← kapak sayfası
    ├── html-generator.ts           ← HTML export
    ├── markdown-parser.ts          ← markdown → MdBlock[] + parseInline + segmentsToWords (word boundary repair burada)
    ├── markdown-types.ts           ← TextSegment, StyledWord, MdBlock şemaları
    ├── render-context.ts           ← shared RenderContext interface
    ├── scientific-genera.ts        ← otomatik italik için bilinen genus listesi
    ├── section-renderer.ts         ← her bölümün heading + body bloklarını basar
    ├── table-renderer.ts           ← inline tablolar için (stripMarkdown + dynamic wrap + header reprint burada)
    ├── theme.ts                    ← branding'i theme'e çevirir
    └── toc-page.ts                 ← table of contents sayfası
```
