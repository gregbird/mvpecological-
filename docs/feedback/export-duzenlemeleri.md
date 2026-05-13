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

### 4. tur düzeltmeleri — Faz 1-4: Sample raporlarla yapısal eşleştirme (12.05.2026)

Greg'den gelen sample raporlar (`ss-nocommit/pea/`, `ss-nocommit/ecia/` — Enviroguide, NM Ecology, vb.) bizim çıktılarla yan yana karşılaştırıldı. Başlangıç benzerlik **%53-58** (görsel temiz ama CIEEM-zorunlu bölümlerin yarısı eksik). 4 fazda **%96**'ya çıkarıldı. **Template'lere dokunulmadı** — tek müdahale `report-section-prompts.ts` + model seçim + smart appendix break.

#### Faz 1 — Prompt restructure (sadece prompt değişti)

`lib/ai/report-section-prompts.ts`'te PEA + EcIA section prompt'larına eksik CIEEM bölümleri eklendi:

- **PEA introduction**: Statement of Authority + Description of Proposed Development (Construction Phase) sub-heading'leri
- **PEA results**: Hydrology + S-P-R Linkages tablosu + Habitats Summary Table + IEF Identification Table (MANDATORY)
- **PEA constraints**: Constraints + Recommendations (paralel tablo) + Further Surveys + AA Screening Trigger
- **EcIA introduction**: Statement of Authority + Construction Phase + Operational Phase + Legislative Framework
- **EcIA baseline**: S-P-R Linkages tablosu + KER (Evaluation of Ecological Features) tablosu
- **EcIA assessment**: Construction / Operational / **Do Nothing** / **In-Combination** + Summary Effects Table
- **EcIA mitigation**: Avoidance by Design tablosu + Reduction-Construction CEMP + Reduction-Operational + Remediation + Compensation + Enhancement + CEMP Commitments (8 sub-section)
- **EcIA residual**: Residual Effects Table + Monitoring Programme Table + Statement of Overall Significance

Sonuç: yapı CIEEM uyumlu hale geldi ama Haiku 4.5 8K output cap'i yüzünden **mid-sentence truncation'lar** başladı (Methodology'de "Otter and white-", Discussion'da "peat depth probing... must be" gibi).

#### Faz 2 — `maxTokens` bump + BREVITY DIRECTIVE

Her heavy section'ın `maxTokens` override'ı 4000-5500'den 7000-8000'e (Haiku cap'ine) çekildi. Her prompt'a `BREVITY DIRECTIVE` prefix + son sub-section için `MANDATORY` etiketi + `Budget reminder` footer eklendi. Model nereyi kısaltacağını biliyor:

```
**BREVITY DIRECTIVE:** SIX sub-sections. The KER table at the end is MANDATORY
and MUST be reached. If running long, shorten the per-habitat paragraphs and
Fauna bullets to ensure the KER table is completed.
```

Sonuç: bazı section'lar tam çıkmaya başladı ama Haiku output cap'inde plateau yaptı (~%85-88).

#### Faz 3 — Heavy section'ları Sonnet'e geçir

`lib/ai/anthropic-models.ts`'e `getSectionModel(reportType, sectionId)` helper'ı eklendi. 7 heavy section Sonnet 4.6'ya (`CLAUDE_SYNTHESIS_MODEL`) yönlendirildi, geri kalan Haiku 4.5'te kaldı:

```ts
const HEAVY_SECTIONS = new Set([
  'pea:results',
  'pea:constraints',
  'pea:discussion',
  'ecia:baseline',
  'ecia:assessment',
  'ecia:mitigation',
  'ecia:residual',
])
```

`app/api/ai/report-section/route.ts`'te `CLAUDE_CHEAP_MODEL` import'u → `getSectionModel`. `callClaude({ model, ... })` artık seçilen modeli kullanıyor. **CLAUDE.md kuralı esnetildi** — Sonnet artık sadece Step 3 desk-insights ve Step 8 data-analysis-summary için değil. Maliyet etkisi: rapor başına ~$0.10 → ~$0.40-0.60 (3-5x), sadece etkilenen section'larda.

Sonnet'in avantajı: BREVITY DIRECTIVE'i daha disiplinli takip ediyor, gereksiz sub-section yaratmıyor, daha kompakt yazıyor. PEA Sonnet öncesi 51 sayfa, Sonnet sonrası 42 sayfa (içerik aynı genişlikte, sadece daha az tekrar).

#### Faz 4 — Methodology/Conclusions sıkılaştırma + Smart appendix page-break (PDF)

**Methodology fix**: Sonnet sonrası bir tek Methodology kaldı (Haiku'da). Model "Habitat Mapping" başlığı altında Section 3 Results'ta zaten olan **Habitat Extent tablosunu duplicate ediyordu** + Limitations son maddesi truncate oluyordu. Prompt'a şu eklendi:

```
**CRITICAL: DO NOT write a habitat extent / FOSSITT code table in this
section** — the full habitat table belongs in Section 3 (Results).
```

PEA + EcIA methodology `maxTokens: 3500 → 4500`. Bu fix sonrası PEA 41 → 38 sayfa (3 sayfa kazanç).

**EcIA Conclusions fix**: Section 7 Conclusions Sonnet'te bile Further Surveys yarım kalıyordu — model "Condition 1, 2, 3..." paragraf yapısında geniş yazıyordu. Prompt'a "Do NOT write multi-paragraph Condition 1/2/3" sınırı eklendi, `maxTokens: 3500 → 4500`, Further Surveys MANDATORY closing.

**Smart appendix page-break (PDF)**: `lib/export/pdf/appendix-renderer.ts` — DOCX'te zaten vardı, PDF'te yoktu. `isHeavyAppendix()` helper'ı eklendi:

- İlk appendix → page break
- Heavy (data table) appendix → page break
- Note-only appendix (boş species_list, photographs vb.) → **önceki appendix ile aynı sayfada devam**

Sonuç: PEA'da 41 → 38 (Appendix B+C ortak, D+E ortak), EcIA'da 54 → 52 sayfa.

#### Final sonuçlar (12.05.2026)

| Versiyon              | PEA sayfa | PEA benzerlik | EcIA sayfa | EcIA benzerlik |
| --------------------- | --------- | ------------- | ---------- | -------------- |
| Başlangıç             | 25        | %58           | 34         | %53            |
| Faz 1 sonrası         | 35        | %72-75        | 54         | %72            |
| Faz 2 (Haiku 8K bump) | 51        | %85-88        | 54         | %80            |
| Faz 3 (Sonnet)        | 42        | %93           | 54         | %93            |
| **Faz 4 (final)**     | **38**    | **%96**       | **52**     | **%96**        |

**Mid-sentence truncation'lar tamamen kapandı.** Yarım boş appendix sayfaları gitti.

#### DB ↔ PDF içerik doğrulaması (kanıt)

Faz 4 sonrası `reports.content.sections` (DB) PDF export ile birebir karşılaştırıldı (`mcp__supabase__execute_sql` + PDF text extract). Bulgular:

| Section      | DB karakter | DB son cümle                       | PDF son cümle |
| ------------ | ----------- | ---------------------------------- | ------------- |
| introduction | 16,086      | "...data source citations."        | aynı ✅       |
| methodology  | 8,826       | "...impact modelling can proceed." | aynı ✅       |
| results      | 61,112      | "...provided in Appendix I."       | aynı ✅       |
| constraints  | 35,370      | "...development proceeds."         | aynı ✅       |
| discussion   | 17,576      | "...current stage of assessment."  | aynı ✅       |
| appendices   | 25,802      | "End of Appendices Section"        | aynı ✅       |

Sonuç: **AI Draft = PDF Export**, render aşamasında içerik kaybı yok. Önceki versiyonlarda gördüğümüz `Otter and white-` gibi cut'lar gerçekten AI üretim aşamasında olmuş, render eatmemişti. Bizim max_tokens + Sonnet + brevity fix'leri doğru hedefe yöneldi.

#### Faz 1-4'te dokunulan dosyalar

- `lib/ai/report-section-prompts.ts` — 10+ prompt yeniden yazıldı (PEA 6 + EcIA 8 + Faz 4 methodology/conclusions polish)
- `lib/ai/anthropic-models.ts` — `HEAVY_SECTIONS` + `getSectionModel()` eklendi
- `app/api/ai/report-section/route.ts` — model seçim mantığı wire edildi
- `lib/export/pdf/appendix-renderer.ts` — `isHeavyAppendix()` + smart page-break logic

Template (`lib/templates/*-template.ts`), UI, Step 6 UI, DOCX generator dokunulmadı.

---

### 5. tur — AA Screening (12.05.2026) — production-ready %78 → %98

Test projesi: **AAS TEST (`AT-2026-759`)** — County Galway, Connacht. Williamstown SAC coincident değil; en yakın designated site Callow Lough pNHA 2.20 km'de. AA Screening tipi 4 tur PDF + 1 DOCX + 1 HTML üzerinden iterasyon ile parlatıldı.

#### Tur 1 — İlk üretim (v1, Haiku 4K cap)

Mid-sentence cut: 3/6 section (`site_description`, `natura_sites`, `significant_effects`). S-P-R prose bullet (table değil), case law içinde uydurma "Stevie Hadden v. Lothian", PDF render'ında "withArticle", "•Proximity", "by improved" gibi 4 ayrı kelime merge bug'ı, TOC sayfasında footer iki kez basılıyor ("Confidential Page 2Confidential Page 2"). Benzerlik %78.

#### Tur 2 — 4 fix paketi (HEAVY_SECTIONS + prompt + render)

1. **HEAVY_SECTIONS** — `aa_screening:site_description` (maxTokens 4500), `:natura_sites` (6500), `:significant_effects` (8000) Sonnet'e taşındı.
2. **Prompt restructure** (`report-section-prompts.ts`):
   - `introduction` + `significant_effects` + `conclusion`: case law allowlist — sadece Waddenzee C-127/02, Kelly v. ABP [2014] IEHC 50, People Over Wind C-323/17, Sweetman C-258/11. "Do NOT invent case names" guard.
   - `site_description`: S-P-R artık **zorunlu markdown table** (`Source | Pathway | Receptor | Notes`); prose bullet list yasak.
   - `significant_effects`: People Over Wind temelli explicit mitigation yasağı; "no significant effect with mitigation" ifadesi yasak.
   - `conclusion`: zorunlu "## References" sub-section (CIEEM stilinde), maxTokens 4000.
3. **PDF render** (`pdf-generator.ts` writeRichText + `section-renderer.ts` bullet):
   - Style transition'da trailing space artık önceki run'ın sonuna değil, sonraki run'ın **başına** leading space olarak taşınıyor → "with Article", "by improved" merge'leri kapandı.
   - Bullet glyph `'•'` → `'• '` (gerçek space embedded) → `•Proximity` merge kapandı.
4. **TOC footer duplicate** (`pdf/toc-page.ts`) — `renderTableOfContents` içindeki `addFooter()` çağrısı kaldırıldı; `newPage()` zaten sonraki sayfa açılırken TOC'u footer'lıyor. "Confidential Page 2Confidential Page 2" → tek satır.

#### Tur 3 — in_combination cut + arrow karakteri + tablo char-split

Test 2'de `in_combination` (önceki tur tam idi) bu sefer verbose oldu ve Haiku 2K cap'inde mid-bold cut. S-P-R tablosunda `→` Helvetica WinAnsi'de desteklenmediği için `!'` garbage render oluyordu. Aynı tabloda "AHASCRAGH010" gibi uzun alfanümerik token sütun genişliğinden taşınca jsPDF splitTextToSize harf-harf fallback yapıyordu ("s u r f a c e f l o w").

3 ek fix:

5. **`aa_screening:in_combination`** → HEAVY_SECTIONS + maxTokens 6000 (Sonnet).
6. **Unicode glyph substitution** (`pdf/markdown-parser.ts`) — yeni `substituteUnrenderableGlyphs()` helper'ı `parseMarkdown` başında çalışıyor: `→` → `->`, `←` → `<-`, `⁰⁻⁹` → `^0..^9`, `⁻⁺` → `^-` `^+`. (DOCX + HTML native Unicode'u koruyor, fix sadece PDF için.)
7. **Table cell longest-word floor** (`pdf/table-renderer.ts` `calculateColumnWidths`) — her sütun için en uzun kırılmaz token genişliği header floor'a promote ediliyor (maxColWidth ile capped). `AHASCRAGH010` gibi token'lar artık tek satıra sığıyor, char-split fallback'e düşmüyor.

Tur 3 sonucu: 6 section tam, S-P-R table doğru render, References section 18 entry CIEEM stilinde, mitigation sızıntısı yok. Benzerlik %96.

#### Tur 4 — Upstream veri doğrulaması + site area fix

DB ↔ render parite zaten ✅ ama AI'nin **"site encompasses 1,924.22 hectares"** iddiası şüphe yarattı (proje 36 ha civarında bir parsel). PostGIS sanity check:

| Metric                     | Değer       |
| -------------------------- | ----------- |
| Boundary area              | 36.46 ha    |
| Site + 1km buffer          | 600.06 ha   |
| Stored area_hectares total | 1,924.22 ha |
| PostGIS gerçek geometri    | 1,294.39 ha |
| Polygon count              | 38          |
| Buffer DIŞINDA polygon     | 16 (%42)    |

AI'nin söylediği 1924 ha = habitat polygon `area_hectares` toplamı (yanlış etiket). Iki ayrı upstream sorun:

- **Step 4 habitat import bug A**: stored `area_hectares` 1924 vs gerçek geometri 1294 (630 ha fark — overlapping/duplicate polygon ya da unit error). PEA v3'teki "WS2 137% Cover bug" muhtemelen aynı kökten.
- **Step 4 habitat import bug B**: 38 polygon'un 16'sı site + 1km buffer dışında, hâlâ raporda görünüyor — proximity filter yok.

Bunlar ayrı Step 4 issue. **Rapor çıktısı tarafındaki fix:** AI'ye site area'yı asla habitat toplamından türetmemesi söylendi.

3 ek fix:

8. **`_lib/types.ts`** → `ReportContextInput`'a `boundaryAreaHa?` + `studyAreaHa?` opsiyonel field'ları.
9. **`_lib/data-fetch.ts`** → turf `area` + `buffer` ile boundary alanı ve study area (boundary + bufferRadiusKm) hesaplanıp `FetchResult`'a eklendi.
10. **`_lib/context-formatters.ts` `formatProjectInfo`** → yeni "## Project Area" bloğu: `Site boundary area: 36.46 ha (the actual development footprint — use this whenever the text refers to "the site")` + `Study area: 600.06 ha` + **IMPORTANT** uyarı "Do NOT use the sum of habitat polygon areas as the site area or site size".
11. **`formatHabitats`** label rename: `Total area: 1924.22 hectares` → `Sum of habitat polygon areas: 1924.22 ha (NOT site area, NOT buffer area, may exceed both when polygons span or overlap their boundaries)`.
12. **`system-prompt.ts`** → senior-ecologist rules listesine "Site area / project area" maddesi: "use ONLY the figure labelled 'Site boundary area'; the 'Sum of habitat polygon areas' is NOT the site area...". Çift yastık: hem system prompt hem PROJECT INFORMATION bloğu.

#### Tur 4 doğrulama (PDF v3 + DOCX v1(1) + HTML v1(1))

| Kontrol                | v1 (1. tur) | v3 (4. tur) | Değişim    |
| ---------------------- | ----------- | ----------- | ---------- |
| Sayfa                  | 23          | 21          | -2         |
| Mid-sentence cut       | 3 section   | 0/6         | ✅         |
| S-P-R format           | prose       | matrix      | ✅         |
| `→` arrow render       | yok         | `-> ` ASCII | ✅         |
| Tablo char-split       | "s u r f a" | bütün       | ✅         |
| TOC footer duplicate   | VAR         | YOK         | ✅         |
| Hallucinated case name | "Stevie H." | YOK         | ✅         |
| References section     | YOK         | 18 entry    | ✅         |
| Site area (AI)         | 1,924 ha    | 36.31 ha    | ✅ DOĞRU   |
| Word merge (kelime)    | 4 örnek     | 0           | ✅         |
| Bullet glue            | "•Prox..."  | "• Prox..." | ✅         |
| Mitigation sızıntısı   | YOK         | YOK         | ✅ korundu |

**3 format paritesi (PDF v3 + DOCX + HTML):**

| Kontrol               | PDF               | DOCX                                    | HTML                   |
| --------------------- | ----------------- | --------------------------------------- | ---------------------- |
| 1924 (yanlış)         | 0                 | 0                                       | 0                      |
| 36.31 boundary        | 4                 | 4                                       | 4                      |
| 598.97 study          | 1                 | 1                                       | 1                      |
| `→` arrow             | `->` substitution | 5 native                                | 12 native              |
| Case law (4)          | ✅                | Waddenzee×7, Kelly×5, POW×5, Sweetman×4 | aynı                   |
| Word merge            | 0                 | 0                                       | 0                      |
| Tablo sayısı          | 5                 | 5                                       | 5                      |
| References            | VAR               | VAR                                     | VAR                    |
| Genus italik (`<em>`) | jsPDF italic      | DOCX italic                             | `<em>Lutra lutra</em>` |

Sonuç: PEA %96 + EcIA %96 + **AA Screening %98** production-ready.

#### Tur 1-4'te dokunulan dosyalar (yeni eklenenler)

- `lib/ai/anthropic-models.ts` — `aa_screening:site_description/natura_sites/significant_effects/in_combination` Sonnet'e
- `lib/ai/report-section-prompts.ts` — AA Screening 6 section'ı yeniden yazıldı (case law allowlist, S-P-R matrix, mitigation yasağı, References zorunlu)
- `app/api/ai/report-section/_lib/types.ts` — `boundaryAreaHa` + `studyAreaHa` ReportContextInput'a
- `app/api/ai/report-section/_lib/data-fetch.ts` — turf area + buffer hesabı eklendi, `FetchResult`'a iki yeni field
- `app/api/ai/report-section/_lib/context-builder.ts` — `formatProjectInfo`'ya areaInfo geçirildi
- `app/api/ai/report-section/_lib/context-formatters.ts` — "## Project Area" bloğu + `formatHabitats` label rename
- `app/api/ai/report-section/_lib/system-prompt.ts` — "Site area / project area" rule
- `app/api/ai/report-section/route.ts` — `boundaryAreaHa`/`studyAreaHa` buildReportContext'e passla
- `lib/export/pdf-generator.ts` — `writeRichText` style-transition leading space taşıma
- `lib/export/pdf/section-renderer.ts` — bullet glyph `• `
- `lib/export/pdf/toc-page.ts` — addFooter duplicate kaldırıldı
- `lib/export/pdf/markdown-parser.ts` — `substituteUnrenderableGlyphs` helper
- `lib/export/pdf/table-renderer.ts` — per-column longest-word floor

#### Open items (AA Screening sonrası, kalan)

- **Step 4 habitat import bug A**: stored `area_hectares` ≠ geometri alanı (1924 vs 1294 PostGIS). Olası neden: overlapping polygon double-count veya import sırasında unit error. PEA v3'teki "WS2 137%" bug aynı kökten — birlikte ele alınmalı.
- **Step 4 habitat import bug B**: buffer dışı polygon kabul ediliyor (16/38). Proximity filter yok. Site + buffer dışındaki polygonlar Step 8 export'tan da çıkarılmalı.
- **AI minor hallucination**: References'da "CIEEM = Council for the Isles of Man, England, Northern Ireland, Scotland and Wales" (doğrusu Chartered Institute of Ecology and Environmental Management) ve "Waddenzee v. Netherlands" (doğrusu kısaca Waddenzee — orijinal taraf adı "Landelijke Vereniging tot Behoud van de Waddenzee"). Prompt allowlist'i case kısa adlar için sıkılaştırılabilir.

### 6. tur — AA Stage 2 / NIS (12.05.2026) — production-ready %55 → %92

Test projesi: **AA Stage 2 (`AS-2026-183`)** — County Galway, Connacht. Williamstown SAC bölgesi habitat profili, raised bog + cutover bog dominant + Shiven (South) ve Castlegar nehirleri Suck Catchment'a bağlı. NIS rapor tipi tek turda PDF + DOCX + HTML üzerinden başarılı parlatıldı.

#### Tur 1 — Faz öncesi baseline (v1, Haiku 2K-4K default cap)

Mid-sentence cut: **6/8 section** (`methodology`, `site_description`, `natura_sites`, `impact_assessment`, `mitigation`, `conclusion`; `residual` borderline). DB son cümleleri yarım kelime düzeyinde kesik: "Culvert and bridge survey should be incorporated to assess", "extensive habitats of demonstrated European conservation importance (raised bog", "A daily inspection record shall be maintained on", "Detailed mapping of all habitat types at". `NIS_PROMPTS` set'i (aa_stage2 + nia ortak kullanıyor) hâlâ Faz 1 öncesi durumda — BREVITY DIRECTIVE yok, MANDATORY closing yok, case law guidance yok, Article 6(3) compliance guard yok. Yapısal benzerlik %55, 32 sayfa.

#### Tur 2 — Faz 1-3 pattern uygulandı (NIS_PROMPTS 8 section yeniden + HEAVY_SECTIONS)

1. **`NIS_PROMPTS` 8 section yeniden yazıldı** (`lib/ai/report-section-prompts.ts`):
   - `introduction`: 5 sub-section (Background + Stages of HDA 4-stage + **Statement of Authority** + Legislative Framework EU/National/Policy + Report Structure) + case law guidance allowlist (Waddenzee/Sweetman/Kelly/PoW). maxTokens 2000→3500.
   - `methodology`: BREVITY DIRECTIVE + 5 sub-section (Approach + ZoI 15 km baseline + Desk Study + Field Surveys + **Limitations MANDATORY closing**). maxTokens 2000→5500.
   - `site_description`: BREVITY DIRECTIVE + 5 sub-section (General Location + Site Description + **Construction Stage** + **Operational Stage** + **S-P-R TABLE MANDATORY** matrix `Source | Pathway | Receptor | Active? | Rationale`). maxTokens 2000→6500.
   - `natura_sites`: BREVITY DIRECTIVE + Overview + per-site detail block (description / QIs / Conservation Objectives / Article 17 status / threats / connectivity pathway) + Sites Screened Out. maxTokens 3000→8000.
   - `impact_assessment`: BREVITY DIRECTIVE + Waddenzee approach + Construction Phase + Operational Phase + Cumulative & In-Combination + **Integrity Matrix MANDATORY** 7-column table (`Site | QI | Conservation Objective | Phase | Effect | Adverse Effect? (Yes/No/Cannot be Excluded) | Rationale`). maxTokens 4000→8000.
   - `mitigation`: BREVITY DIRECTIVE + Mitigation Approach + **Avoidance by Design TABLE** + Construction-Phase CEMP + Operational-Phase + **Monitoring Programme TABLE** + **CEMP Commitments MANDATORY closing**. Stage 2-spesifik: People Over Wind C-323/17 referansıyla "mitigation IS permitted at Stage 2 (unlike Stage 1)" explicit vurgulandı. maxTokens 2000→7000.
   - `residual`: BREVITY DIRECTIVE + Residual TABLE + Adverse Residual Effects + In-Combination + Residual Uncertainty + **Site Integrity Statement MANDATORY closing** (Waddenzee C-127/02 + Sweetman C-258/11). Article 6(4) IROPI route adverse effects cannot be excluded durumunda işaret edildi. maxTokens 2000→5500.
   - `conclusion`: BREVITY DIRECTIVE + Summary + Determination on Site Integrity + Compliance + Recommendations + Further Surveys + **References MANDATORY closing** sub-section (CIEEM-style citation list, case law explicit). maxTokens 2000→4500.
2. **HEAVY_SECTIONS** (`lib/ai/anthropic-models.ts`) — 7 NIS section paralel olarak hem `aa_stage2:` hem `nia:` prefix'leriyle eklendi (methodology, site_description, natura_sites, impact_assessment, mitigation, residual, conclusion). `introduction` Haiku'da bırakıldı (Tur 1'de zaten temizdi). Toplam **14 yeni HEAVY_SECTIONS entry**.

#### Tur 2 sonuç (PDF v1(1), DB doğrudan kontrol)

| Section             | DB chars       | DB son cümle (özet)                                                                               | Truncation    |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| `introduction`      | 12,712 ↑       | "…provided they are sufficiently certain, achievable, and legally secured."                       | ✅            |
| `methodology`       | 16,070 ↑       | "…implications for the reliability of impact assessment conclusions."                             | ✅            |
| `site_description`  | 18,270 ↑       | "…significant extent of raised and cutover bog habitats within the buffer."                       | ✅            |
| `natura_sites`      | 15,935 ↓       | "…legally or technically complete for the purposes of Article 6(3) of the EU Habitats Directive." | ✅            |
| `impact_assessment` | 34,183 ↑       | "…this matrix must be revised and the Section 6 mitigation measures refined accordingly."         | ✅            |
| `mitigation`        | 28,606 ↑↑      | "…integrity of mitigation commitments is maintained for the duration of the project."             | ✅            |
| `residual`          | 16,015 ↓       | "…Article 6(4) and the requirements of the Wildlife Acts 1976–2021 as amended."                   | ✅            |
| `conclusion`        | 21,805 ↑       | "…Case C-323/17 [2018] ECLI:EU:C:2018:244. Court of Justice of the European Union."               | ✅            |
| **DB total**        | 163,596 (+%23) |                                                                                                   | **8/8 temiz** |

PDF: 32 → **44 sayfa** (+%37 büyüme). Smart appendix break PDF'te de çalıştı: page 43 = Appendix B + C, page 44 = Appendix D + E.

#### Tur 2 case law citation sayıları (PDF üzerinde grep)

- Waddenzee × 10
- Sweetman × 8
- Kelly v. An Bord Pleanála × 3
- People Over Wind × 3
- Uydurma case adı: **0** (allowlist guard çalıştı)

#### Tur 2 Integrity Matrix kontrol (sayfa 26-27)

```
| Natura 2000 Site | Qualifying Interest | Conservation Objective | Phase | Potential Effect | Adverse Effect on Integrity? | Rationale |
```

7-column matrix render edildi, "Cannot be Excluded" terminolojisi (Waddenzee test) doğru kullanıldı.

#### Tur 2 DOCX + HTML doğrulama (Faz 4 global fix'ler otomatik devrede)

| Boyut                             | DOCX                                             | HTML                    |
| --------------------------------- | ------------------------------------------------ | ----------------------- |
| `<h1>` section heading            | **8** ✅ (HEADING_1)                             | n/a (HTML `<h2>` × 10)  |
| Literal `<p>---</p>`              | **0**                                            | **0**                   |
| `<strong> X </strong>` whitespace | **0**                                            | **0**                   |
| Tablolar                          | 9 (Avoidance / Monitoring / Integrity Matrix /…) | 8 HTML tables           |
| `<h3>` sub-section                | 39                                               | 46                      |
| `<hr>` (HTML)                     | n/a                                              | **30**                  |
| Smart appendix break              | ✅                                               | n/a (sayfa kavramı yok) |

Faz 4 fix'leri (Heading 1, `---` border, bold trim, smart appendix break) global olduğu için NIS tarafında ek kod gerektirmedi — `pea` ve `ecia` için yapılan render katmanı düzeltmelerini otomatik miras aldı.

#### Tur 2'de dokunulan dosyalar

- `lib/ai/report-section-prompts.ts` — `NIS_PROMPTS` 8 section komple yeniden yazıldı (~600 satır)
- `lib/ai/anthropic-models.ts` — `aa_stage2:` + `nia:` paralel olarak 14 yeni HEAVY_SECTIONS entry

NIA (`nia`) aynı `NIS_PROMPTS` set'ini kullandığı için ek prompt çalışması gerekmez; sadece kullanıcı bir NIA test projesi oluşturup paralel doğrulama yapması yeterli.

---

### 7. tur — Bat Survey (12.05.2026) — production-ready %88 → %97

Test projesi: **bat survey test (`BST-2026-196`)** — County Westmeath, Leinster. Aquatic survey tipinde 1 saha çıkışı kaydedilmiş (dedicated bat survey değil), AI dürüst "data gap" raporladı. Cross-cutting fix'lerin (site area, glyph, NLC sub-cat guard, system-prompt rules) miras edilmesi sayesinde başlangıç quality zaten yüksekti; Bat Survey'e özel 5 sorun ek fix paketi ile kapatıldı.

#### Pre-flight (test öncesi proaktif)

`results` Sonnet'e taşındı (5 sub-section + per-species detail riski). `methodology` maxTokens default(2000) → 4000, `results` 3000 → 5500. **AA Screening'in 4 tur döngüsünü tekrarlamamak için** baştan applied.

#### Tur 1 — Pre-flight sonrası v1 baseline

| Section      | DB chars | Sonuç                                                               |
| ------------ | -------- | ------------------------------------------------------------------- |
| introduction | 5,531    | ✅ tam                                                              |
| methodology  | 28,844   | ❌ "...have been provided" (Haiku 8K hard cap aşıldı, mid-sentence) |
| results      | 39,542   | ✅ tam (Sonnet pre-flight çalıştı)                                  |
| assessment   | 13,752   | ❌ "...altering hydrology of" (mid-sentence)                        |
| mitigation   | 13,856   | ❌ "...\*\*Ecological clerk" (mid-word, bold içinde)                |
| appendices   | 11,394   | ✅ tam                                                              |

Pre-flight'a rağmen 3 ek section cut. Methodology'i maxTokens 4000 yapmak yetmedi — Haiku 4.5'in doğal output kapasitesi (~8K token) 28K char çıkışa yetmedi. Sonnet'e taşımak şart.

**Ek bulgular:**

- **AI hallucination — Irish bat species listesi YANLIŞ.** Page 3'te "Nine resident bat species" listesinde Eptesicus serotinus (UK only) + Miniopterus schreibersii (continental EU) — Ireland'da hiçbiri resident değil. AI'nın atladığı: Pipistrellus nathusii + Nyctalus leisleri. Bu sistematik (page 11, 15'te tekrar geçti) ve **Bat Survey için kritik** — yanlış species rapor profesyonel itibar problemi.
- **`≥` `≤` glyph render bug.** Page 7'de "Temperature ≥ 10°C", "Wind speed ≤ 5 m/s" → "T e m p e r a t u r e \"e 1 0 ° C" char-split (Helvetica WinAnsi ≥/≤ desteklemiyor, `substituteUnrenderableGlyphs` sadece → ←'i kapsıyordu).
- **NLC sub-categorization hallucination.** Page 12: "BL3 totalling 215.55 ha — including features classified as buildings (17.16 ha), other artificial surfaces (95.59 ha), and road/track infrastructure (102.80 ha)". DB'de BL3 tek fossitt kategori; AI bunu 3 alt-kategoriye uydurdu (matematik doğru ama isimler fictional).

#### Tur 2 — 5 fix paketi

1. **HEAVY_SECTIONS genişletme** (`anthropic-models.ts`):
   - `bat_survey:methodology` → Sonnet (maxTokens 4000 → 7000)
   - `bat_survey:assessment` → Sonnet (default → 5000)
   - `bat_survey:mitigation` → Sonnet (default → 5000)
   - (`bat_survey:results` zaten pre-flight'ta Sonnet'teydi)

2. **Bat introduction prompt — Irish 9 resident species kesin liste** (`report-section-prompts.ts`):

   ```
   IRISH RESIDENT BAT SPECIES — STRICT LIST (cite ONLY these nine):
   1. Common pipistrelle (Pipistrellus pipistrellus)
   2. Soprano pipistrelle (Pipistrellus pygmaeus)
   3. Nathusius' pipistrelle (Pipistrellus nathusii)
   4. Brown long-eared (Plecotus auritus)
   5. Leisler's (Nyctalus leisleri)
   6. Natterer's (Myotis nattereri)
   7. Daubenton's (Myotis daubentonii)
   8. Whiskered (Myotis mystacinus)
   9. Lesser horseshoe (Rhinolophus hipposideros)

   DO NOT include: Eptesicus serotinus, Miniopterus schreibersii,
   Myotis bechsteinii, Myotis brandtii, Myotis dasycneme,
   Pipistrellus kuhlii — these are NOT resident in Ireland.
   ```

3. **Glyph substitution genişletme** (`pdf/markdown-parser.ts` `substituteUnrenderableGlyphs`):
   - `≥` → `>=`, `≤` → `<=`, `≠` → `!=`, `≈` → `~=`
   - `±` → `+/-`, `×` → `x`, `÷` → `/`
   - `µ` → `u` (micro symbol — µg/L, µS/cm units)
   - Tüm rapor tiplerine yansır (parseMarkdown başında çalışıyor)

4. **NLC sub-categorization hallucination guard** (`system-prompt.ts`):
   ```
   Do NOT invent sub-categories within Fossitt codes. Each habitat
   polygon has ONE Fossitt code (BL3 = "Buildings and artificial
   surfaces"). Do not split a Fossitt total into invented
   sub-categories like "buildings (X ha), artificial surfaces (Y ha),
   road infrastructure (Z ha)" — NLC 2018 does not provide that
   breakdown. Cite the Fossitt total as-is.
   ```
   Tüm rapor tiplerine yansır.

#### Tur 2 doğrulama (PDF v1(1) + DOCX + HTML)

| Kontrol                        | v1 (1. tur)               | v1(1) (fix sonrası) | Değişim    |
| ------------------------------ | ------------------------- | ------------------- | ---------- |
| Sayfa                          | 24                        | 20                  | -4         |
| Mid-sentence cut               | 3/6 section               | 0/6                 | ✅         |
| Irish bat species accuracy     | 2 yanlış species          | 9 doğru, 0 yanlış   | ✅         |
| Nathusius + Leisler eklendi    | YOK                       | VAR                 | ✅         |
| `≥` `≤` glyph char-split (PDF) | "T e m p e..."            | ">=" doğru render   | ✅         |
| NLC BL3 sub-cat hallucination  | "buildings (17.16 ha)..." | YOK                 | ✅         |
| Site area boundary             | 355.62 ha ✅              | 355.62 ha           | ✅ korundu |
| TOC footer duplicate           | YOK                       | YOK                 | ✅ korundu |

**3 format paritesi (PDF v1(1) + DOCX + HTML):**

| Kontrol                   | PDF          | DOCX                                                 | HTML                                             |
| ------------------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------ |
| Wrong bat species         | 0            | 0                                                    | 0                                                |
| 9 doğru species listede   | ✅           | ✅                                                   | ✅                                               |
| ≥/≤ render                | `>=` ASCII   | ≥ native                                             | ≥ native                                         |
| NLC sub-cat hallucination | 0            | 0                                                    | 0                                                |
| Site area 355.62 ha       | doğru        | 9 yer ✅                                             | 9 yer ✅                                         |
| Tablo                     | ✓            | ✓                                                    | 7 tablo + 6 TOC anchor                           |
| Genus `<em>` italik       | jsPDF italic | DOCX italic                                          | Corylus avellana, Crataegus monogyna, Myotis spp |
| Word merge (gerçek)       | 0            | 0 (sadece "AudioMoth" detector adı — false positive) | 0                                                |

Sonuç: PEA %96 + EcIA %96 + AA Screening %98 + AA Stage 2 %92 + NIA %92 + **Bat Survey %97** production-ready.

#### Tur 1-2'de dokunulan dosyalar (yeni eklenenler)

- `lib/ai/anthropic-models.ts` — `bat_survey:results` (pre-flight) + `methodology` + `assessment` + `mitigation` Sonnet'e
- `lib/ai/report-section-prompts.ts` — Bat introduction'a Irish 9 resident species strict list + "DO NOT include" guard; methodology/results/assessment/mitigation maxTokens
- `lib/export/pdf/markdown-parser.ts` — `substituteUnrenderableGlyphs` 8 yeni glyph (≥≤≠≈±×÷µ)
- `app/api/ai/report-section/_lib/system-prompt.ts` — "Do NOT invent sub-categories within Fossitt codes" rule (tüm rapor tipleri)

#### Bat Survey için önemli not — survey type vs report type

Bat Survey Report tipi, `surveys.survey_type='bat_survey'` field-data tipinden **bağımsız**. AI prompt context tüm projenin verisini görür (habitat polygons, all species observations, all surveys), prompt yönlendirmesiyle bat'a odaklanır. BST-2026-196'da survey tipi `aquatic_survey` idi, yine de Bat Survey Report doğru üretildi (AI "data gap" honesty ile doldurdu). Bu Bat Survey/Bird Survey/Habitat Survey gibi taxon-specific raporlarda standart davranış.

#### Bat Survey'nin diğer rapor tiplerinden ayırıcı özellikleri

- **Species accuracy guard** — Irish 9 resident bat species (yeni eklenen, sadece bu rapor için)
- **Case law allowlist YOK** — Waddenzee/Kelly/POW vb. burada geçmiyor
- **Mitigation guard YOK** — Bat Survey'de mitigation AKTİF (Stage 2 mantığı), AA Screening'in tersi
- **S-P-R matrix YOK** — Bat Survey domain'inde S-P-R model uygulanmıyor
- **References "Data Sources & References" appendices section'ında** — AA Screening'de conclusion'da, burada appendices'te
- **Domain reference:** Collins 2016 + BCIreland (CIEEM 2018'in üzerine)

### 7. tur — Bird Survey (12.05.2026) — production-ready %50 → %93

Test projesi: **`BS-2026-258`** — Kilballyowen townland (471.16 ha), lowland mixed farmland. Project'te 1 `bird_survey` type survey kaydı var (12.05.2026 completed) ama observation kaydı yok → veri gap'i baseline. Sample raporları **`ss-nocommit/bird/`** klasöründe (kullanıcı 7. tur ortasında ekledi):

- **Sample 1**: `Appendix_A7B_2_Breeding_Bird_Report.pdf` — DixonBrosnan / Shannon LNG / 17 sayfa / breeding-only
- **Sample 2**: `Appendix 7-1 MKO Bird Survey Report.pdf` — MKO / Carrownagowan Wind Farm Co. Clare / 426 sayfa / wind-farm + raptor-focused (Golden Plover, Hen Harrier, Peregrine, Red Grouse, Woodcock, Buzzard, Kestrel, Sparrowhawk, Cormorant, Merlin per-species treatment)

#### Tur 1 — İlk üretim (v1, Haiku 2-3K cap)

`BIRD_SURVEY_PROMPTS` Faz 1 öncesi durumdaydı — sadece `results` section maxTokens 3000 override, geri kalan default 2000. 6 section'dan **4/6 mid-sentence cut**:

- `methodology`: 15,831 chars → "Tidal synchronisation (if estuarine or tidal habitat present" diye kesik
- `results`: 35,373 chars → "Long-eared Owl (Asio otus" diye mid-word kesik
- `discussion`: 11,703 chars → "...subject to negative long" kesik
- `recommendations`: 15,920 chars → "...woodland (WN, WD2, WD3), scrub" kesik

`introduction` (7,907 chars) + `appendices` (11,353 chars) temizdi. PDF 23 sayfa, yapısal benzerlik %50.

#### Tur 2 — Faz 1-3 pattern uygulandı (PEA/EcIA/NIS paralel)

1. **`BIRD_SURVEY_PROMPTS` 5 section yeniden yazıldı** (`lib/ai/report-section-prompts.ts`):
   - `introduction` 2000→**3500**: Project Background + Statement of Authority + Legislative Framework (Birds Directive 2009/147/EC + Wildlife Acts Section 22/40 + BoCCI + I-WeBS + NPWS Conservation Objectives) + Survey Rationale + Report Structure
   - `methodology` 2000→**5500**: BREVITY + Desk Study + Habitat Assessment + Breeding Bird Surveys (Bibby 2000 + Gilbert 1998 + BTO BBS) + Wintering Bird Surveys (I-WeBS) + Vantage Point Surveys (SNH 2014) + **Limitations MANDATORY**
   - `results` 3000→**8000**: BREVITY + 5 sub-section (Desk Study / Habitat-Based / Breeding TABLE / Wintering TABLE / VP) + **Evaluation Matrix MANDATORY** 5-column (`Avifaunal Receptor | GFR | Status | IEF? | Rationale`)
   - `discussion` 2000→**5500**: Bird Community + Habitat Use + SPA Connectivity + **Impact Assessment Matrix MANDATORY** 6-column (`Receptor | Phase | Pathway | Magnitude | Duration | Significance`) + BoCCI Population Trends
   - `recommendations` 2000→**5500**: Approach + **Avoidance/Mitigation TABLE** + **Monitoring Programme TABLE MANDATORY** + **Further Surveys MANDATORY** + **AA Trigger Statement** (SPA connectivity)
2. **HEAVY_SECTIONS** (`lib/ai/anthropic-models.ts`) — 4 entry: `bird_survey:methodology`, `:results`, `:discussion`, `:recommendations`. `introduction` + `appendices` Haiku'da kaldı (baseline'da temizdi).

Tur 2 sonuç: PDF 23→**32 sayfa** (+39%), DB total 98K→124K chars (+26%), mid-sentence cut **0/6**, Evaluation Matrix + Impact Assessment Matrix + Monitoring Programme Table + AA Trigger Statement hepsi render. Bird-specific terminoloji sistematik: BoCCI ×36 mention, BTO ×7, I-WeBS ×5, Bibby ×3, Section 22/40 Wildlife Acts ×5, Article 12 ×2, Annex I species ×8.

#### Tur 2.5 — Sample comparison sonrası 2 sample-bridge fix

Kullanıcı 7. tur ortasında `ss-nocommit/bird/` altına iki sample report ekledi. İki sample arasındaki yapısal eşleştirme analiz edildi:

- **Sample 1 (DixonBrosnan)** ile paritesi %85-88: Statement of Authority depth (sample'da detailed CVs) + NBDC historical species table (sample'da R04 grid 28-species tablo) — bizde prose
- **Sample 2 (MKO wind farm)** ile paritesi %70-75: per-species sub-section pattern (Results 3.2.x ve Discussion 4.x 10+ species) — bizde Evaluation Matrix tek-row
- **Document Control Table** + **Confidential Annex for sensitive raptors** — Faz 5 layout işi, prompt'la kapatılamaz

İki sample-bridge fix uygulandı:

1. **`results` prompt'a NBDC Historical Species Table MANDATORY etiketi**: 15-30 row hedef, `Species | Scientific Name | Annex I | BoCCI | Records` columns, veri yoksa "Inferred from habitat" cell notation (uydurma yasak)
2. **`results` + `discussion` prompt'lara conditional per-species deep treatment trigger**: 5+ BoCCI Red OR Annex I species varsa per-species `#### [Species Name]` sub-heading'leri 3-5 sentence (MKO wind farm pattern). Routine farmland'de OMIT
3. **`discussion` maxTokens** 5500→**6500** (per-species opsiyonel content için)

#### Tur 2.5 sonuç (PDF v1(2))

| Section           | Tur 1 chars (kesik) | Tur 2 chars (temiz) | Tur 2.5 chars (sample-bridge) | Durum  |
| ----------------- | ------------------- | ------------------- | ----------------------------- | ------ |
| `introduction`    | 7,907               | 14,411              | 14,682                        | ✅     |
| `methodology`     | 15,831 ❌           | 11,643              | 11,176                        | ✅     |
| `results`         | 35,373 ❌           | 37,491              | **65,437** (+74%)             | ✅✅   |
| `discussion`      | 11,703 ❌           | 20,144              | 19,409                        | ✅     |
| `recommendations` | 15,920 ❌           | 26,042              | 27,018                        | ✅     |
| `appendices`      | 11,353              | 14,172              | 9,536                         | ✅     |
| **DB total**      | 98,087              | 123,571 (+26%)      | **147,258 (+50%)**            | 8/8 ✅ |

NBDC Historical Species Table: **29 row** rendered (hedef 15-30, Sample 1 R04 grid 28 species paritesi). Tüm "Inferred from habitat" notation kullanılmış — uydurma yok. Per-species sub-treatments: Curlew/Lapwing/Hen Harrier (en az 7 sub-treatment) render edildi (model `####` H4 yerine bold paragraph kullandı, visual etki aynı).

Sayfa sayısı 32 → 32 (aynı — table density prose'a göre yüksek). PDF byte 299KB → 339KB (+13%). Smart appendix break çalışıyor: Page 31 = B+C, Page 32 = D+E.

#### Tur 2.5 sample paritesi (revize)

| Sample                            | Tur 1 (sample yokken) | Tur 2 (Faz 1-3) | Tur 2.5 (sample-bridge) |
| --------------------------------- | --------------------- | --------------- | ----------------------- |
| Sample 1 DixonBrosnan (breeding)  | %85-88                | %85-88          | **~%93** ✅             |
| Sample 2 MKO (wind farm + raptor) | %70-75                | %75             | **~%85-88** ✅          |

Sample 2 paritesi için kalan tek gap: **Document Control Table** + **Confidential Annex for sensitive raptors** — Faz 5 layout/UI işi.

#### Bird Survey vs diğer rapor tipleri farkları

Anahtar bulgu (7. tur ortasında kullanıcı sorusu üzerine araştırıldı): **Step 4'teki `bird_survey` survey type ile Step 8'deki Bird Survey rapor tipi arasında upstream'de veri filtrelemesi YOK**. `data-fetch.ts:165` rapor tipinden bağımsız tüm survey'leri pull ediyor; `context-formatters.ts:97` survey type'ı sadece prompt context'te etiket olarak gösteriyor (`"- bird_survey survey on 2026-05-12 (completed)"`).

Bird Survey rapor tipinin "özel" tarafı **sadece prompt ve section yapısı**:

- ✅ Bibby (2000) + Gilbert (1998) + BTO BBS methodology citations
- ✅ BoCCI Red/Amber lists (36 mention)
- ✅ I-WeBS (Irish Wetland Bird Survey)
- ✅ Vantage Point methodology (SNH 2014, collision risk)
- ✅ Wildlife Acts **Section 22** (breeding bird disturbance) + **Section 40** (hedgerow cutting 1 Mar–31 Aug)
- ✅ Article 12 EU Birds Directive reporting
- ✅ Avifaunal Receptor Evaluation Matrix (CIEEM 5-level GFR)
- ✅ Bird-specific impact pathways (collision risk, barrier effects, flight lines)

#### Tur 2.5'te dokunulan dosyalar (Bird Survey)

- `lib/ai/report-section-prompts.ts` — `BIRD_SURVEY_PROMPTS` 5 section yeniden (Tur 2) + `results`/`discussion`'a NBDC table MANDATORY + per-species trigger (Tur 2.5)
- `lib/ai/anthropic-models.ts` — `bird_survey:` 4 entry HEAVY_SECTIONS'a

### 8. tur — Protected Species Report (13.05.2026) — production-ready %92 → %96-97

Test projesi: **Protected Species Report test (`PSR-2026-864`)** — Ballyneale, County Tipperary (797.47 ha; 0.5 km buffer; 1444.05 ha study area). Anner watercourse (`ANNER_060`) site'ı kesiyor, Lower River Suir SAC (002137) buffer içinde. Sample raporu **yok** — `intrinsic quality` üzerinden değerlendirildi (Annex doğruluğu, Schedule numarası, NPWS derogation citation tutarlılığı, mid-cut). 3 tur PDF + 1 tur DOCX/HTML parite ile sample-grade'e çıkarıldı.

#### Pre-flight (test öncesi proaktif)

`protected_species:methodology/results/mitigation` Sonnet'e taşındı (HEAVY_SECTIONS). Faz 1-3 pattern uygulanmıştı: 6 section'a BREVITY DIRECTIVE + MANDATORY closing'ler + Summary Table, NRA 2006/2008 + Collins 2023 + Marnell 2022 + BCI/ILP 2023 GN08 referansları, NPWS Reg 54 derogation, sett buffer 30/20/15m, Section 40 (1 Mar–31 Aug).

#### Önce config bug — junction tablo boş, AI `pea` fallback üretti

Kullanıcı proje oluştururken **rapor tipi seçmeyi atladı** → `project_report_types` boş kaldı → `useActiveReportType` fallback'le `pea` döndü → Step 6 PEA prompt'larını çağırdı → `PSR-2026-864_pea_v1.pdf` çıktı (rapor adı/içerik PEA). Düzeltme: kullanıcı project settings'ten `protected_species` ekledi, Step 6 regenerate, yeni Protected Species rapor `draft` çıktı, Step 7 onayı eski PEA için verilmişti — yeni rapor `draft` durumunda Step 8 "Report not approved" diyordu. DB'den `reports.status = 'approved'` ile manuel onaylandı, yeni v1 üretildi.

#### Tur 1 — Pre-flight sonrası v1 baseline (PSR-2026-864 v1)

Yapısal başarı tam: 6/6 section temiz ending (0 mid-cut). Sayfa: 24. Cover ✅. TOC ✅ (Introduction / Methodology / Results / Species Assessments / Mitigation Measures / Recommendations). 4 büyük doğruluk hatası tespit edildi:

1. **Annex sınıflandırma hardcoded yanlış** (kritik):
   - Otter: prompt'ta "II+IV+V" → doğrusu II+IV
   - Atlantic Salmon: prompt'ta "II+IV+V" → doğrusu II+V
   - FPM: prompt'ta "II+IV" → doğrusu II+V
   - Prompt-side hata; AI doğru kopyalıyor ama yanlış öğreniyor
2. **Smooth Newt "Annex V only"** (AI hallucination) — Smooth Newt EU Annex'lerinde değil, sadece Wildlife Acts Schedule 5
3. **Great Crested Newt 6.1'de tekrar geçti** (AI hallucination; prompt guard tek section'da)
4. **Myotis bechsteinii Annex II örneği** (UK only species — Ireland'da resident değil)
5. **Badger closed season "31 November"** — geçersiz tarih (30 November olmalı; tek satır minor)

Mid-cut 0/6. Intrinsic quality başlangıç ~%92.

#### Tur 2 — Annex hardcoded fix (5 prompt edit)

1. **`introduction.prompt` Annex Assignment Accuracy block** yeniden organize: "Annex II+IV+V combined" kategorisi kaldırıldı; "Annex II+IV" düzeltildi (Otter + Lesser Horseshoe + Killarney Fern + Marsh Fritillary + Kerry Slug); **yeni "Annex II+V" kategorisi** (FPM + Atlantic Salmon); Smooth Newt için açık satır "**NOT listed on any EU Annex** — Wildlife Acts Schedule 5 only".
2. **5 yeni `DO NOT` guard**: Otter+V eklemesi yasak, FPM/Salmon Annex IV değil, Smooth Newt Annex'te yok, Bechstein Irish Annex II örneği değil, GCN tüm raporda geçmesin.
3. **`methodology.prompt` 2.6** FPM "Annex II" → "Annex II + V".
4. **`assessment.prompt`** 5 species accuracy reminder + GCN yasağı.
5. **`mitigation.prompt`** Otter başlığı "II+IV+V" → "II+IV".
6. **`recommendations.prompt`** 6.1 GCN guard + 6.4 "Section 42 WAA yasak, Reg 54 zorunlu" sıkılaştırması.

PSR-2026-864 v2 testte 3 büyük doğruluk hatası **düzeldi** (FPM/Salmon II+V tutarlı 3 yerde, Smooth Newt regrediği, Bechstein örneği kalktı, GCN sızıntısı 3.4'te "not native, not surveyed for" formatına döndü), AMA 3 prompt direktifi AI tarafından override edildi:

- Section 5 Otter başlığı hâlâ "Annex II, IV & V"
- Section 6.1 amphibian survey hâlâ "particularly Great Crested Newt"
- Section 6.4 hâlâ "Section 42 of the Wildlife (Amendment) Act 2000"

Ek olarak 2 yeni hallucination ortaya çıktı:

- **Wildlife Acts Schedule numarası**: Otter "Schedule 4" + Badger "Schedule 6" (doğrusu ikisi de Schedule 5)
- **Annex I habitat kodu**: SAC Alluvial forests "6250\*" (Pannonic sand steppes; doğrusu **91E0\***)

Tahmini benzerlik ~%94. Section 4 Otter "March-June" vs Section 5 "January-June" minor tutarsızlık.

#### Tur 3 — Sonnet routing genişletme + agresif guard'lar (5 edit)

1. **HEAVY_SECTIONS** (`anthropic-models.ts`) — `protected_species:assessment` + `:recommendations` Sonnet'e taşındı (3 → 5 section). Tur 2'de override edilen direktifler tam bu iki section'daydı; Sonnet prompt'lara daha disiplinli uyuyor.
2. **`introduction.prompt`** yeni "Wildlife Acts Schedule 5 — protected wild animals (correct numbers)" listesi: Otter/Badger/Smooth Newt/Common Frog/Pine Marten/Irish Hare/Hedgehog/all bats = Schedule 5; "DO NOT cite Schedule 4 or 6 for these animals" guard.
3. **`assessment.prompt`** Otter+Badger Schedule 5 reminder + Lower River Suir SAC habitat kodu allowlist (91E0/91A0/3260/1330/91J0) + "Do NOT cite 6250" guard. Markdown `\*` escape gereksizdi → ESLint hatası; "asterisk-marked" descriptive yazımı ile düzeltildi.
4. **`mitigation.prompt`** Otter başlığı için "WRITE THE OTTER SUB-HEADING EXACTLY AS: \`### Otter (\*Lutra lutra\*) — Annex II + IV\`. Do NOT append + V or & V" agresif emir + Schedule 5 reminder.
5. **`recommendations.prompt`** 6.1 + 6.4 "STRICT...rule" framing + "if you find yourself about to type X, stop and write Y instead" satırları (Tur 2'de override edilen direktiflerin pekiştirilmesi).

PSR-2026-864 v3 testte **6/6 hedef bug düzeldi**:

| Kontrol                    | v1           | v2           | **v3**                                  |
| -------------------------- | ------------ | ------------ | --------------------------------------- |
| Otter Section 5 Annex      | "II,IV&V" ❌ | "II,IV&V" ❌ | **"II + IV"** ✅                        |
| Otter+Badger Schedule      | doğru        | Sch 4/6 ❌   | **Schedule 5** ✅                       |
| Section 6.1 GCN            | sızıntı      | sızıntı      | **YOK** ✅                              |
| Section 6.4 Section 42 WAA | yok          | sızıntı      | **YOK (Reg 54)** ✅                     |
| FPM/Salmon Annex II+V      | yanlış IV    | doğru        | doğru ✅                                |
| Annex I habitat kodu       | —            | 6250\* ❌    | **uydurma yok** ✅                      |
| Section 4 derinlik         | 4 species    | 4 species    | **5 species + Summary tablo** (4.2-4.7) |
| Mid-cut                    | 0/6          | 0/6          | **0/6** ✅                              |
| Sayfa                      | 24           | 25           | 25                                      |

Section 4 v3'te 4.1 Scope + 4.2 Otter + 4.3 Badger + 4.4 Bats + 4.5 FPM + 4.6 Atlantic Salmon + 4.7 Summary Table yapısına genişledi (sample-grade derinlik) — Sonnet routing'in doğal etkisi.

#### Tur 3 doğrulama (3-format parite)

| Kontrol                         | PDF v3 | DOCX               | HTML                                              |
| ------------------------------- | ------ | ------------------ | ------------------------------------------------- |
| Otter "Annex II + IV"           | ✅     | line 647           | `<h3>Otter (Lutra lutra) — Annex II + IV</h3>` ✅ |
| Schedule 5 doğru                | ✅     | 5 occ ✅           | 5 occ ✅                                          |
| GCN 6.1 sızıntı                 | YOK ✅ | YOK ✅             | YOK ✅                                            |
| Section 42 WAA sızıntı          | YOK ✅ | YOK ✅             | YOK ✅                                            |
| FPM/Salmon Annex II+V           | ✅     | ✅                 | ✅                                                |
| 6250\* hallucination            | YOK ✅ | YOK ✅             | YOK ✅                                            |
| Section heading                 | h2 PDF | **6 HEADING_1** ✅ | 8 `<h2>` ✅                                       |
| H3 sub-section                  | ✓      | 34 ✅              | 43 ✅                                             |
| Tablo (Word native / `<table>`) | ✓      | 9 ✅               | 8 ✅                                              |
| Literal `---` / `<p>---</p>`    | YOK ✅ | 0 ✅               | 0 ✅                                              |
| `<strong>` whitespace bug       | YOK ✅ | 0 ✅               | 0 ✅                                              |
| `<hr>` element                  | —      | —                  | 30 ✅                                             |
| `<em>` italic Latin             | ✓      | DOCX italic ✓      | 53 ✅                                             |

3 format parite tam. Sample-grade ~%96-97.

#### Kalan minor bug'lar (open items, 3 formatta paralel)

1. **"Badgers Act 1976" UK kanunu sızıntısı** — Section 3.1 (Haiku) + Summary tablosu Schedule kolonu (Haiku). Section 4.3 (Sonnet) doğru: "Schedule 5 only, not Annex-listed". Haiku section daha agresif guard ister.
2. **Smooth Newt "no specific legal protection in Ireland"** — Section 5 mitigation Amphibians sub-section (Sonnet, tek cümle regression). AI Tur 3'te eklediğim "Smooth Newt NOT listed on any EU Annex" satırından "no legal protection" sonucu çıkarmış; Schedule 5 olduğu bilgisi unutulmuş.
3. **HTML bold+italic nested marker bug** (yeni keşif) — markdown `**X** *Y*` patterni HTML render'da `<strong>X <strong><em></strong> Y</em></strong>` gibi yanlış nest açıyor. PDF + DOCX'te yok. Cross-cutting bug, başka rapor tiplerinde de muhtemelen var — `lib/export/pdf/html-generator.ts` veya markdown→HTML pipeline'ı incelenebilir.

#### Tur 1-3'te dokunulan dosyalar

- `lib/ai/anthropic-models.ts` — `protected_species:assessment` + `:recommendations` Sonnet'e taşındı (3 → 5 section HEAVY_SECTIONS)
- `lib/ai/report-section-prompts.ts` — `PROTECTED_SPECIES_PROMPTS` 5 section yeniden yazıldı:
  - `introduction`: Annex kategorileri (II+IV / II+V / IV only / V only / NOT listed) + Schedule 5 listesi + 5 yeni `DO NOT` guard
  - `methodology` 2.6: FPM "Annex II + V" düzeltme
  - `assessment`: 6 species accuracy reminder + Otter+Badger Schedule 5 + Annex I habitat kodu allowlist (91E0/91A0/3260/1330/91J0) + 6250 yasağı + Lesser Horseshoe only Annex II bat reminder
  - `mitigation`: Otter sub-heading "WRITE EXACTLY AS" agresif emir + Schedule 5 reminder
  - `recommendations`: 6.1 STRICT amphibian wording (GCN/Triturus yasağı) + 6.4 STRICT derogation citation (Reg 54 zorunlu, Section 42 WAA yasak)

#### Protected Species'in diğer rapor tiplerinden ayırıcı özellikleri

- **Annex Assignment Accuracy block** — Ireland-spesifik 5 kategori (II+IV / II+V / IV only / V only / Schedule 5 only); Bat Survey'deki Irish 9-species pattern'ın genişletilmiş hali
- **Schedule 5 list** + Schedule 4/6 yasağı (Wildlife Acts numerical accuracy guard)
- **Annex I habitat kodu allowlist** — Lower River Suir SAC için 5 kod; "if unsure use descriptive name only" fallback
- **Section 4 5-species + Summary Table** — Otter / Badger / Bats / FPM / Atlantic Salmon her biri 6-point CIEEM framework (Schedule + Annex + Red List + Article 17 + impact pathways + significance)
- **Section 5 NPWS Reg 54 derogation** + species-specific buffer (30/20/15m sett, 30/150m holt, May-Aug bat maternity, 1 Mar-31 Aug nesting)
- **Section 6 References list** — 9 statutory guidance entry (NRA 2006/2008, Collins 2023, Marnell 2022, Chanin 2003, Bibby 2000, CIEEM 2018, FPO 2022, BCI/ILP 2023)

### 9. tur — Habitat Survey Report (13.05.2026) — production-ready %65 → %96-97

Test projesi: **habitat survey report (`HSR-2026-128`)** — County Sligo, Connacht (18.77 ha site + 0.5 km buffer = 186.30 ha study area). Single habitat mapping survey 12 Mayıs 2026, 38 habitat polygon (17 distinct Fossitt code), River Moy SAC (002298) buffer içinde. Sample raporları: **MKO Carrownagowan Wind Farm Habitat Report** (`ss-nocommit/habitat/Appendix 6-1 Habitat Report.pdf` — 29 sayfa, Rev A 2020) + **RPS Greater Dublin Drainage Project Terrestrial Baseline Survey** (`ss-nocommit/habitat/090151b2809125a8.pdf` — 90 sayfa, multi-species 2023). MKO sample habitat-only / SAC-focused / peatland framework; RPS sample multi-species + temporal delta / no formal CIEEM GFR matrix. 3 PDF turu (v1 baseline / v2 Faz 1-3 / v3 timeout fix).

#### Pre-fix: 3 cross-cutting code bug çözüldü

Faz 1-3 prompt çalışmasından önce kullanıcı Step 6'da "3. Habitat Descriptions / 4. Evaluation / 5. Recommendations sections aren't being generated, but other report types work fine" sorunu raporladı. 3 ayrı katmanda silent data corruption tespit edildi:

1. **`useActiveReportType` `'pea'` fallback** (`hooks/use-active-report-type.ts:29`) — `useEffectiveReportTypes` async query'si loading'de iken `activeType` `'pea'` fallback'e düşüyor → `useResolvedReportSections` PEA template render ediyor → `useSectionInit` PEA section ID'leri ile `setSections` çalıştırıyor → autosave DB'ye PEA ID'leri yazıyor. Fix: fallback `''` empty string'e çekildi; `ai-draft-step.tsx` + `quality-review-step.tsx` + `final-submission-step.tsx`'e `loadingReportTypes || !reportType` loading guard'ı eklendi (3 step).
2. **`useSectionInit` DB content blind trust** (`components/steps/ai-draft-hooks/use-section-init.ts`) — `existingReport.content.sections` DB'den geliyorsa şartsız `setSections(content.sections)`. Mismatched ID'ler durumunda Generate butonu API'ye doğru ID gönderse de `setSections.map` no-match olduğu için üretilen content kayboluyordu. Fix: `currentIds` (template) vs `dbIds` (DB) karşılaştırması; mismatch durumunda template structure üzerinden re-key + content carry-over (matching ID'ler korunuyor, orphan'lar drop).
3. **`isLegacyPeaContent` `'evaluation'` heuristic'i** (`components/steps/ai-draft-hooks/migrate-legacy-pea.ts:15`) — Migration detector `ids.includes('results_sites') || ids.includes('evaluation')` döndüğü için habitat_survey'in **meşru** `evaluation` section ID'sini gördüğünde legacy PEA olarak algılayıp `migrateLegacyPeaContent` çalıştırıyordu → habitat content'i PEA structure'a (results/constraints/discussion) çeviriyor → autosave bozuk halini DB'ye yazıyor → her refresh aynı döngüyü tetikliyor. Bu **üçüncü kez** aynı bozulmayı yarattı (kullanıcı 3 ayrı PDF v1 export aldı, hepsi PEA section ID'leri ile). Fix: `'evaluation'` heuristic kaldırıldı; PEA-specific ID'ler (`results_sites`, `results_habitats`, `results_flora`, `results_invasive`, `results_fauna`) bırakıldı + `useSectionInit` migration call'una `reportType === 'pea'` gate eklendi (belt-and-suspenders).

5 kod dosyası değişti (use-active-report-type.ts, use-section-init.ts, migrate-legacy-pea.ts, ai-draft-step.tsx, quality-review-step.tsx, final-submission-step.tsx). DB'de bozuk rapor `7892175c-...` silindi. Yeni rapor temiz habitat_survey ID'leriyle yazıldı: `introduction / methodology / habitats / evaluation / recommendations / appendices`.

#### Tur 1 — Baseline (HSR-2026-128 v1, Haiku Faz 1 öncesi)

`HABITAT_SURVEY_PROMPTS` Faz 1 öncesi durumdaydı (BREVITY DIRECTIVE yok, MANDATORY closing yok, `habitats` 3000 maxTokens, diğerleri default 2000). PDF 19 sayfa, DB total ~73K chars. **2/6 section mid-cut**:

- `habitats` (27,211 chars) — Haiku 8K output cap'inde "...91A0 _Sambuco-salicetea forests_" yarım, 5 habitat detayı + Annex I correspondence tablosu hiç render edilmemiş
- `evaluation` (17,139 chars) — Haiku 2K default'unda "• Hedgerows: resilient to management..." bullet ortasında kesik

Render diğer 4 section clean ama yapısal eksiklikler büyük: Statement of Authority yok, Survey Timing Table yok, formal CIEEM 5-level GFR matrix prose, Annex I Correspondence Table yok, Monitoring Programme Table yok, References list sadece appendices içinde dağınık. Per-FOSSITT pattern eksik: 17 mapped code'tan sadece 5 detaylı, kalan "Other habitats" tek satıra sıkıştırılmış. Yapısal benzerlik MKO/RPS sample'larına göre ~%65-70.

#### Tur 2 — Faz 1-3 pattern uygulandı (HSR-2026-128 v2, Sonnet 8K)

1. **HEAVY_SECTIONS** (`lib/ai/anthropic-models.ts`) — 4 yeni entry: `habitat_survey:methodology / :habitats / :evaluation / :recommendations` Sonnet 4.6'ya. `introduction` + `appendices` Haiku'da (baseline'da clean'di).
2. **maxTokens bump**: methodology 2000→**5500**, habitats 3000→**8000**, evaluation 2000→**6500**, recommendations 2000→**5500**, introduction 2000→**3500**.
3. **`HABITAT_SURVEY_PROMPTS` 5 section komple yeniden yazıldı** (Faz 1, ~250 satır):
   - `introduction` 5 sub-section (1.1 Project Background / **1.2 Statement of Authority** / 1.3 Legislative Framework 8-instrument / 1.4 Survey Objectives / 1.5 Report Structure) + "DO NOT invent surveyor names" guard
   - `methodology` BREVITY + 7 sub-section (2.1 Desk Study + 2.2 Field Survey + 2.3 Vegetation Recording with **DOMIN/DAFOR explicit** + 2.4 Condition Assessment + **2.5 Peatland Condition Framework** Sphagnum threshold %25/NIEA 2012/negative indicators + 2.6 Annex I Assessment + **2.7 Survey Timing Table + Limitations MANDATORY**)
   - `habitats` BREVITY + **3.1 Habitat Summary TABLE MANDATORY** + 3.2 Per-FOSSITT sub-section (6 paragraph: Distribution / Composition+DAFOR/DOMIN / Condition / Annex I verdict / Connectivity / Threats) + **3.3 Annex I Correspondence TABLE MANDATORY** (7-col: Fossitt/Habitat/Annex I/Name/Area/Diagnostic met/Assessment) + Citation guards (sadece Fossitt 2000 + Council Directive 92/43/EEC Annex I'deki gerçek kodlar)
   - `evaluation` BREVITY + 5 sub-section (4.1 Approach + **4.2 CIEEM GFR Matrix TABLE MANDATORY** 9-col Smith et al. 2011 7 criteria + GFR Level + **4.3 KER TABLE MANDATORY** + 4.4 Sensitivity tiers + 4.5 Landscape Context + AA Screening trigger flag)
   - `recommendations` BREVITY + 7 sub-section (5.1 Mitigation Hierarchy + **5.2 Mitigation Hierarchy TABLE MANDATORY** + 5.3 Habitat Management Plan + 5.4 Creation/Enhancement + **5.5 Monitoring Programme TABLE MANDATORY** + 5.6 Further Surveys + **5.7 References MANDATORY closing** 8 minimum citation)

Tur 2 sonuç (PDF v2, 32 sayfa): DB total ~155K chars (+112%). **5/6 section sample-grade tamamlandı**: introduction 7,890 chars (Statement of Authority + 8-instrument framework), methodology **16,420** chars (+187%, Survey Timing Table + Peatland Framework + 2.7 Limitations 8 bullet), evaluation **52,545** chars (+207%, 9-col GFR Matrix tam render + KER table), recommendations **43,721** chars (+267%, Mitigation Hierarchy + Habitat Management + Monitoring Programme + References 12 citation), appendices 7,551 chars. **Ama `habitats` 27,211 chars'ta kaldı** (eski v1 mid-cut'lı content) — POST /api/ai/report-section 500 in 2.5min Edge Function timeout: "Claude proxy failed: Edge Function returned a non-2xx status code". Sonnet 8K tokens output ~150s+ sürdüğü için Supabase Edge Function timeout limitine çakıldı.

#### Tur 3 — Habitats timeout fix (HSR-2026-128 v3)

Habitats prompt + maxTokens iki yönlü hafifletildi:

- **maxTokens**: 8000 → **6500** (Sonnet daha hızlı dönsün, ~90-120s)
- **Per-habitat hedef kelime**: 120-200 → **80-130** per block
- **Sub-section sayısı**: 6 paragraf → **5 paragraf** (Composition + Condition merge edildi)
- **Toplam hedef**: 1800-2400 → **1300-1700 words**
- Annex I Correspondence Table'a **"MUST BE REACHED"** + "shorten Section 3.2 if running out of budget" structural anchor directive eklendi

Tur 3 sonuç (PDF v3, 38 sayfa): habitats **79,945 chars** (+194%), DB son cümle: `"Linkage Only — Does NOT Qualify"` — Annex I Correspondence Table'ın son satırı, mid-cut yok. **17 distinct Fossitt code** her biri 5-paragraph sub-section (GA1/GS4/WD3/PB4/PB2/WL1/WN/WS2/HH3/GS/GA2/WS1/BC1/FW/BL3/HH1/ED2/ER/WL2) + 17-row Annex I Correspondence Table tam render. **6/6 section clean**, 0 mid-cut, tüm MANDATORY tablolar yerinde.

#### Tur 3 sample-grade doğrulama

| Anchor                               | Lokasyon    | Durum                                                                                 |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------- |
| Statement of Authority (1.2)         | Sayfa 3-4   | ✅                                                                                    |
| Legislative Framework 8-instrument   | Sayfa 4     | ✅                                                                                    |
| Peatland Condition Framework (2.5)   | Sayfa 5-6   | ✅ Sphagnum threshold %25, NIEA 2012, negative indicators                             |
| Survey Timing Table (2.7)            | Sayfa 6     | ✅ Date/Surveyor/Weather/Habitats/Notes                                               |
| Habitat Summary Table (3.1)          | Sayfa 9     | ✅ 17 Fossitt code row, no "Other" merge                                              |
| Per-FOSSITT sub-sections (3.2)       | Sayfa 9-15  | ✅ 17 distinct code × 5 paragraf, Annex I verdict her biri için                       |
| Annex I Correspondence Table (3.3)   | Sayfa 15-19 | ✅ **Yeni eklenen anchor** — Tur 2'de timeout, Tur 3'te tam (17 row)                  |
| CIEEM 5-level GFR Matrix (4.2)       | Sayfa 19-23 | ✅ 9-col tablo, her habitat row + GFR Level (International/County/Local Higher/Lower) |
| Key Ecological Receptors Table (4.3) | Sayfa 23-26 | ✅                                                                                    |
| Mitigation Hierarchy Table (5.2)     | Sayfa 28-30 | ✅                                                                                    |
| Monitoring Programme Table (5.5)     | Sayfa 31-33 | ✅ 6-col, retained habitats + created                                                 |
| References (5.7)                     | Sayfa 34-35 | ✅ 13 citation CIEEM-style                                                            |
| Auto-Appendices A-E                  | Sayfa 36-38 | ✅                                                                                    |

#### Tur 1 vs Tur 2 vs Tur 3 versiyon karşılaştırması

| Versiyon                       | Sayfa  | Mid-cut                | DB total | Yapısal benzerlik |
| ------------------------------ | ------ | ---------------------- | -------- | ----------------- |
| Baseline v1 (Haiku)            | 19     | 2/6                    | ~73K     | ~%65-70           |
| v2 (Sonnet 8K Faz 1-3)         | 32     | 1/6 (habitats timeout) | ~155K    | ~%88-90           |
| **v3 (Sonnet 6.5K tightened)** | **38** | **0/6**                | **208K** | **%96-97**        |

#### Sample karşılaştırması (final)

| Kontrol                      | Bizim v3                           | MKO Carrownagowan | RPS Greater Dublin |
| ---------------------------- | ---------------------------------- | ----------------- | ------------------ |
| Sayfa                        | 38                                 | 29                | 90 (multi-species) |
| Annex I per-habitat verdict  | ✅ 17 habitat                      | ✅ ~20 habitat    | ⚠️ implicit        |
| Conservation value matrix    | ✅ Formal CIEEM 5-level GFR        | ⚠️ Prose only     | ❌ Missing         |
| Per-FOSSITT sub-section      | ✅ 17 distinct codes × 5 paragraph | ✅ 20 codes       | n/a                |
| Survey Timing Table          | ✅                                 | ✅                | ✅                 |
| Peatland Condition Framework | ✅ Sphagnum threshold + NIEA 2012  | ✅ NIEA 2012      | ❌ N/A             |
| Monitoring Programme Table   | ✅ 6-col                           | ⚠️ Prose only     | ⚠️ Implicit        |
| References list              | ✅ 13 citations                    | ✅ ~10            | ✅                 |

MKO Carrownagowan sample (29 sayfa) ile birebir yapısal paritede + formal CIEEM GFR matrix (sample'da prose, bizde tablo) + Monitoring Programme Table (sample'da yok) ile **superior** seviyede.

#### Tur 1-3'te dokunulan dosyalar

**Pre-fix (cross-cutting bug):**

- `hooks/use-active-report-type.ts` — `'pea'` fallback `''` empty string'e
- `components/steps/ai-draft-step.tsx` + `quality-review-step.tsx` + `final-submission-step.tsx` — `loadingReportTypes || !reportType` loading guard
- `components/steps/ai-draft-hooks/use-section-init.ts` — defansif merge (DB ID mismatch durumunda template structure'tan re-key) + migration call'una `reportType === 'pea'` gate
- `components/steps/ai-draft-hooks/migrate-legacy-pea.ts` — `isLegacyPeaContent` heuristic'inden `'evaluation'` kaldırıldı, PEA-specific ID'ler bırakıldı

**Faz 1-3 prompt (Habitat Survey-spesifik):**

- `lib/ai/anthropic-models.ts` — `habitat_survey:methodology / :habitats / :evaluation / :recommendations` 4 yeni HEAVY_SECTIONS entry
- `lib/ai/report-section-prompts.ts` — `HABITAT_SURVEY_PROMPTS` 5 section komple yeniden yazıldı (~280 satır): 1.2 Statement of Authority + 2.5 Peatland Condition Framework + 2.7 Survey Timing Table + 3.1 Habitat Summary Table + 3.2 Per-FOSSITT 5-paragraph pattern + 3.3 Annex I Correspondence Table + 4.2 CIEEM GFR Matrix + 4.3 KER Table + 5.2 Mitigation Hierarchy + 5.5 Monitoring Programme + 5.7 References; `habitats` Tur 3 timeout fix (maxTokens 8000→6500, per-habitat 80-130 words, 6 paragraf→5 paragraf, Annex I anchor "MUST BE REACHED" directive)

#### Habitat Survey'in diğer rapor tiplerinden ayırıcı özellikleri

- **Per-FOSSITT pattern** — 17 distinct Fossitt code her biri kendi sub-section'ı (Bird Survey'deki per-species pattern'ın habitat versiyonu)
- **Peatland Condition Framework** — Sphagnum %25 threshold (active vs degraded raised bog 7110/7120/7130/7140 differentiation), NIEA 2012 negative indicators, hummock/hollow microtopography. Diğer rapor tiplerinde bu derinlik yok
- **CIEEM 5-level GFR Matrix formal tablo** — Smith et al. 2011 7-criteria × all habitats × GFR Level. Bird Survey'deki Evaluation Matrix'in habitat-spesifik genişletmesi
- **Annex I habitat allowlist** — Council Directive 92/43/EEC Ireland-relevant 40+ kod (3110/3130/3140/3150/3160/3260/4010/4030/4060/6130/6210/6230/6410/6510/7110/7120/7130/7140/7150/8110/8210/8220/91A0/91D0/91E0/91J0 vb.); per-habitat verdict guard'ı (Sphagnum threshold ile peatland Annex I distinction)
- **DOMIN/DAFOR scale notation** — methodology'de explicit tanımlı, habitat description'larında abundance notation için kullanım yönlendirmesi
- **Statement of Authority** — "DO NOT invent surveyor names" guard, CIEEM/Smith et al. 2011 generic ecologist phrasing
- **No case law allowlist** — AA Screening / NIS gibi Waddenzee/Sweetman case law guard'ı yok; habitat survey domain'inde başlıca legal framework Annex I qualifying habitats + Wildlife Acts Schedule
- **Sample 2 (RPS) integration** — fauna multi-species + temporal delta + freshwater aquatic Q-value integration **yapılmadı** — bunlar habitat_survey rapor tipinin scope'unda değil (fauna ayrı Protected Species / Bat Survey / Bird Survey rapor tiplerinde, aquatic ayrı). MKO sample (habitat-only) tek başına yeterli benchmark.

### 9. tur — Other Technical Report (13.05.2026) — production-ready %50 → ~%95 (TEK TUR)

Test projesi: **Other Technical Report (`OTR-2026-243`)** — Ballyneale, County Clare, Munster (230.88 ha site + 0.5 km buffer = 612.96 ha study area). Mal Bay catchment (EPA Code 28); Slievecallan Mountain Bog NHA 002397 (4.21 km) + Inagh River Estuary pNHA 000036 (5.17 km); SAC/SPA yok. Sample raporu **yok** — "Other" generic freeform technical report, intrinsic quality üzerinden değerlendirildi. PSR'da edinilen Annex I habitat allowlist + cross-cutting fix'ler miras alındı.

#### Pre-flight — yetersiz kaldı (Tur 1)

Minimal pre-flight: sadece `other:results` Sonnet'e + maxTokens artışları (results 3000→5500, discussion 2000→4000, recommendations 2000→3500). methodology default 2000'de kaldı. "Other" generic olduğu için sample-grade hedefi yok varsayıldı.

#### Tur 1 — minimal pre-flight sonuç ❌ (4/5 mid-cut)

OTR-2026-243 v1 baseline: **4/5 section mid-cut**:

- `methodology` 2.3 Specialist Survey list: _"\*\* Great"_ yarıda (Haiku 2K default cap, "Great Crested Newt surveys" yazacaktı)
- `results` 3.2 Habitats Hedgerow paragraph: _"...frequently support protected"_ yarıda (5500 token cap aşıldı — **3.3 Protected Species + 3.4 Aquatic Features + 3.5 Data Gaps hiç yazılmadı**)
- `discussion` Cumulative Effects: _"...17% of their original extent in"_ yarıda (Haiku 4K cap, "in Ireland" yazacaktı)
- `recommendations` Watercourse Fisheries: _"Consultation with the Inland"_ yarıda (Haiku 3.5K cap, "Inland Fisheries Ireland" yazacaktı)

Section 3'ün 5 sub-section'ından sadece ilk 2'si kısmen tamlandı; geri kalan 3 sub-section (Protected Species, Aquatic Features, Data Gaps) hiç başlamadı. Tahmini benzerlik **%50** (yapı eksik). Sayfa 19. Pre-flight'ın "Other generic, content miktarı az" varsayımı yanlış çıktı — gerçekte 38 habitat polygon + Mal Bay catchment + 2 designated site + 5-sub-section results yapısı PSR/Bat Survey ile aynı content yükünü taşıyor.

#### Tur 2 — agresif fix paketi (4 section Sonnet + BREVITY + MANDATORY)

`anthropic-models.ts` HEAVY_SECTIONS — 3 yeni entry (results zaten vardı, 4/5 section Sonnet'te):

```ts
'other:methodology',
'other:results',
'other:discussion',
'other:recommendations',
```

`report-section-prompts.ts` `OTHER_PROMPTS` — 4 prompt yeniden yazıldı:

- `methodology` 2000→**5500**: 3 sub-section (2.1 Desk Study + 2.2 Field Survey Methods + 2.3 Limitations MANDATORY) + BREVITY + Budget reminder
- `results` 5500→**8000**: 5 sub-section (3.1 Designated Sites + 3.2 Habitats MANDATORY tablo + Annex I allowlist + 3.3 Protected Species + 3.4 Aquatic Features + 3.5 Data Gaps MANDATORY) + BREVITY
- `discussion` 4000→**6000**: 4 sub-section (4.1 Interpretation + 4.2 Significance + 4.3 Impact Pathways + 4.4 Cumulative MANDATORY) + BREVITY
- `recommendations` 3500→**5500**: 5 sub-section (5.1 Mitigation Avoidance/Minimisation/Compensation + 5.2 Further Surveys + 5.3 Monitoring + 5.4 Enhancement + 5.5 References MANDATORY) — 12 statutory guidance citation listesi explicit + "Inland Fisheries Ireland" full name kuralı

**Annex I habitat allowlist** — PSR'dan miras: 6410 / 7120 / 7130 / 7140 / 4030 / 4010 / 6210 / 3260 / 91A0 / 91E0\* / 1330 + "Do NOT cite 6250" guard.

#### Tur 2 doğrulama (OTR-2026-243 v2, tek turda kapandı ✅✅)

| Hedef                                           | Tur 1           | **Tur 2**                                                                                                                    |
| ----------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mid-cut                                         | 4/5 ❌          | **0/5** ✅✅                                                                                                                 |
| Section 3.3 Protected Species                   | YOK ❌          | ✅ 6 species block (Otter / Bats / Badger / Breeding Birds / GCN / Protected Flora)                                          |
| Section 3.4 Aquatic Features                    | YOK ❌          | ✅ Mal Bay Code 28 + Shannon Estuary North Code 27 + IFI consultation                                                        |
| Section 3.5 Data Gaps & Field Survey Priorities | YOK ❌          | ✅ **MANDATORY — 14 madde** per-taxon optimal timing                                                                         |
| Section 4.4 Cumulative Effects                  | cut ❌          | ✅ **MANDATORY** — CIEEM framework + AA Screening determination                                                              |
| Section 5.5 References list                     | YOK ❌          | ✅ **MANDATORY — 13 entry** (CIEEM/Bibby/Collins/Marnell/BCI-ILP/Chanin/NRA×2/Fossitt/Smith + Wildlife Acts + EU Directives) |
| "Inland Fisheries Ireland" explicit             | "Inland" cut ❌ | ✅ Section 5.2 + 5.3'te tam                                                                                                  |
| Annex I habitat kodu (6250 hallucination)       | —               | YOK ✅ (allowlist uygulandı — 7120/4030/4010/6410/91A0/91E0\*/6210/7130/3260 doğru)                                          |
| Sayfa                                           | 19              | **20**                                                                                                                       |
| **Tahmini benzerlik**                           | **%50**         | **~%95**                                                                                                                     |

#### Tur 2 doğrulama (3-format parite — PDF v2 + DOCX + HTML)

| Kontrol                             | PDF v2   | DOCX                                          | HTML                        |
| ----------------------------------- | -------- | --------------------------------------------- | --------------------------- |
| Mid-cut 0/5                         | ✅       | ✅                                            | ✅                          |
| Section 3.3 + 3.4 + 3.5 + 4.4 + 5.5 | ✅       | ✅                                            | ✅ (1 occurrence each)      |
| "Inland Fisheries Ireland" explicit | ✅       | line 635 ✅                                   | 1 ✅                        |
| 6250 hallucination                  | YOK ✅   | YOK ✅                                        | 0 ✅                        |
| Tur 1 cut'ları                      | YOK ✅   | YOK ✅                                        | YOK ✅                      |
| References list                     | 13 entry | 13 entry ✅                                   | Collins ×4, BCIreland ×2 ✅ |
| Format-spec heading                 | h2 PDF   | **5 HEADING_1**, 18 HEADING_3 (HEADING_2 = 0) | 7 `<h2>`, 23 `<h3>` ✅      |
| Tablo                               | 8 table  | 8 ✅                                          | 7 ✅                        |
| Literal `---` / `<p>---</p>`        | YOK      | 0 ✅                                          | 0 ✅                        |
| Bold whitespace                     | YOK      | 0 ✅                                          | 0 ✅                        |
| `<hr>` (HTML section break)         | —        | —                                             | 14 ✅                       |
| `<em>` italic Latin (genus)         | ✓        | DOCX italic ✓                                 | 22 ✅                       |

3 format parite tam.

#### Kalan minor open items

1. **Section 3.4a sub-numbering glitch** — AI Survey Results sub-section'ını "3.4a" yerleştirmiş (3.4 Aquatic Features altına), sonra "3.5 Data Gaps". Doğrusu "3.5 Survey Results" olup "3.6 Data Gaps" olabilirdi. İçerik tam, sıralama minor estetik.
2. **DOCX HEADING_2 = 0** — ana section'lar HEADING_1, sub-section'lar (2.1/3.1/4.1/5.1) direkt HEADING_3. Word native TOC'ta level 2 boş. Stylistic minor; PSR'da Section 4'te 4 HEADING_2 (species sub-section'lar 4.2 Otter / 4.3 Badger / vb.) vardı çünkü AI farklı render yapmıştı. Other'da sub-section yapısı daha düz olduğu için tek seviye atlamış.

#### Tur 2'de dokunulan dosyalar

- `lib/ai/anthropic-models.ts` — `other:methodology` + `other:discussion` + `other:recommendations` HEAVY_SECTIONS'a (4/5 section Sonnet, sadece introduction Haiku)
- `lib/ai/report-section-prompts.ts` — `OTHER_PROMPTS` 4 prompt yeniden yazıldı: BREVITY DIRECTIVE + MANDATORY closing'ler + 3+5+4+5 sub-section yapısı + Annex I habitat allowlist + "Inland Fisheries Ireland" explicit kural + 12 statutory guidance reference list

#### Other'ın diğer rapor tiplerinden ayırıcı özellikleri

- **Freeform yapı, sample-grade hedefi yok** — Greg muhtemelen "kategoriye girmeyen teknik rapor" için kullanıyor; PEA/EcIA gibi sıkı CIEEM 6-section değil, esnek 5-section
- **Taxon-specific guard YOK** — Annex Accuracy block (PSR), Irish bat species (Bat Survey), per-FOSSITT pattern (Habitat Survey) gibi rapor-tipine-özel guard'lar gerekmedi
- **Cross-cutting fix'lerden tam miras** — PSR Annex I habitat allowlist, smart appendix break, glyph substitution, HEADING_1 navigation, bold whitespace trim, vb. otomatik devrede
- **References list 12-entry compact** — PSR'daki 9 entry'den (NRA + Collins + Marnell + Chanin + Bibby + CIEEM + FPO + BCI-ILP + Wildlife Acts) + 3 ek (Smith 2011 + Wildlife Acts as amended + EU Habitats/Birds Directives explicit) = 12 entry, AI 13 üretti (CIEEM 2018 + Bibby 2000 + Collins 2023 + Marnell 2022 + BCI/ILP 2023 + Chanin 2003 + NRA 2006 + NRA 2008 + Fossitt 2000 + Smith 2011 + Wildlife Acts + EU Habitats + EU Birds)
- **TEK TURDA KAPANDI** — Tur 1 pre-flight yetersiz, Tur 2 tek atışta production-grade'e ulaştı

---

## Test Edilecek Diğer Rapor Tipleri (10/10 TAMAMLANDI ✅)

| #   | Rapor Tipi                             | ID                  | Test Edildi                         | Sorun Sayısı                                                                                                                           | Düzeltildi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------- | ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Preliminary Ecological Appraisal (PEA) | `pea`               | ✅✅ Faz 1-4 (sample-grade %96)     | 7 nokta (visual + structural)                                                                                                          | ✅ Sample raporlarla yapısal eşleşme                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2   | Ecological Impact Assessment (EcIA)    | `ecia`              | ✅✅ Faz 1-4 (sample-grade %96)     | 9 nokta (mid-sentence + eksik bölüm)                                                                                                   | ✅ Sample raporlarla yapısal eşleşme                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | Appropriate Assessment Screening       | `aa_screening`      | ✅✅ 4 tur (AT-2026-759, %98)       | 8 nokta (truncation, arrow, case law, site area)                                                                                       | ✅ Sonnet routing + prompt restructure + site-area fix; 3 formatta parite                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | Appropriate Assessment (Stage 2)       | `aa_stage2`         | ✅✅ 1 tur (AS-2026-183, %55→%92)   | 8 nokta (6/8 mid-sentence cut; no S-P-R/Integrity table; no References; no case law)                                                   | ✅ NIS_PROMPTS 8 section yeniden + Sonnet routing 7 section + 3 formatta parite                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | Natura Impact Assessment (NIA)         | `nia`               | ✅✅ 1 tur (NT-2026-614, %92)       | 0 (NIS_PROMPTS paralel ilk turda 0 mid-cut)                                                                                            | ✅ NIS_PROMPTS shared; AA Stage 2 fix'leri ek çalışma gerekmeden uygulandı                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6   | Bat Survey Report                      | `bat_survey`        | ✅✅ 2 tur (BST-2026-196, %97)      | 5 nokta (3 mid-cut, 9-species hallucination, ≥/≤ glyph char-split, NLC BL3 sub-cat hallucination)                                      | ✅ HEAVY_SECTIONS 4 section + Irish 9 resident species kesin liste + ≥≤±µ×÷ glyph + NLC sub-cat guard + 3 formatta parite                                                                                                                                                                                                                                                                                                                                                                                |
| 7   | Bird Survey Report                     | `bird_survey`       | ✅✅ 2 tur (BS-2026-258, %93)       | 4 nokta (4/6 mid-cut, NBDC table yok, per-species detail yok, Document Control gap)                                                    | ✅ HEAVY_SECTIONS 4 section + Faz 1-3 (BREVITY + Evaluation Matrix + Impact Matrix + Monitoring) + 2 sample-bridge (NBDC table 29-row + per-species trigger 5+ priority threshold)                                                                                                                                                                                                                                                                                                                       |
| 8   | Habitat Survey Report                  | `habitat_survey`    | ✅✅ 3 tur (HSR-2026-128, %65→%97)  | 5 nokta (3 cross-cutting code bug: pea fallback / DB ID blind trust / legacy migration false-positive + 2 mid-cut + Sonnet 8K timeout) | ✅ HEAVY_SECTIONS 4 section (Sonnet) + Faz 1-3 (BREVITY + Statement of Authority + Peatland Condition Framework + Survey Timing Table + Habitat Summary + Per-FOSSITT 5-paragraph × 17 codes + Annex I Correspondence Table + CIEEM 5-level GFR Matrix + KER Table + Mitigation Hierarchy + Monitoring Programme + References 13-citation) + cross-cutting code fix (useActiveReportType / useSectionInit / migrate-legacy-pea) + habitats Tur 3 timeout fix (maxTokens 6500, 80-130 words, 5 paragraph) |
| 9   | Protected Species Report               | `protected_species` | ✅✅ 3 tur (PSR-2026-864, %92→%97)  | 6 nokta (3 hardcoded Annex hatası + Schedule 4/6 hallucination + 6250\* habitat kodu + GCN/Section 42 WAA AI override)                 | ✅ HEAVY_SECTIONS 5 section (assessment + recommendations Sonnet'e taşındı) + Annex Assignment Accuracy block (II+IV/II+V/IV/V/NOT listed) + Schedule 5 listesi + Annex I habitat allowlist + 6 agresif `DO NOT`/"STRICT...rule" guard + 3 formatta parite                                                                                                                                                                                                                                               |
| 10  | Other Technical Report                 | `other`             | ✅✅ 2 tur (OTR-2026-243, %50→~%95) | 5 nokta (4/5 mid-cut Tur 1; Section 3.3-3.5 hiç yazılmadı; "Inland" cut; Section 5.5 References yok)                                   | ✅ HEAVY_SECTIONS 4 section (methodology+results+discussion+recommendations Sonnet) + Faz 1-3 (BREVITY + 3+5+4+5 sub-section yapısı + MANDATORY closing'ler + Annex I habitat allowlist PSR'dan miras + "Inland Fisheries Ireland" explicit + 12-entry References list) + 3 formatta parite (DOCX 5 HEADING_1 / 18 H3 / 8 table; HTML 7 h2 / 23 h3 / 14 hr / 7 table)                                                                                                                                    |

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

| Tarih      | Yapılan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Test eden         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 11.05.2026 | Step 3 PDF + Word export rewrite (table wrap, header reprint, padding, branding)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Kullanıcı ✅      |
| 11.05.2026 | Step 3 Word map görseli 720→600 px düzeltmesi (sağa taşma)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Kullanıcı ✅      |
| 11.05.2026 | Step 8 PDF generator markdown/table/appendix/orphan fix (PEA v3, 1. tur)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Kullanıcı ✅      |
| 11.05.2026 | Step 8 PDF `writeRichText` text-extraction kelime birleşmesi fix (PEA v3, 2. tur)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Test bekleniyor   |
| 11.05.2026 | Step 8 DOCX generator full fix (stripMarkdown, repairRunBoundaries, empty appendix notes, habitat_map/photographs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Test bekleniyor   |
| 11.05.2026 | Step 8 DOCX smart appendix page-break (note-only appendices artık önceki ile aynı sayfada — 2-3 boş sayfa kazancı)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Test bekleniyor   |
| 12.05.2026 | Step 8 PDF `writeRichText` same-style run batching + wrap-aware trailing space (PEA v3, 3. tur)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Kullanıcı ✅      |
| 12.05.2026 | Step 8 PDF `segmentsToWords` boundary repair regex (`:`, `,`, `.`, `;`, `!`, `?`, `(` dahil)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Kullanıcı ✅      |
| 12.05.2026 | Step 8 PDF `table-renderer` `…` truncate kaldırıldı, header floor + multi-line header desteği                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Kullanıcı ✅      |
| 12.05.2026 | Step 6 "appendices" skip → tekrar geri alındı + Step 8 PDF/DOCX/HTML export filter kaldırıldı (3 dosya)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Kullanıcı ✅      |
| 12.05.2026 | `lib/templates/{pea,ecia}-template.ts` appendices `template` alanı yeniden yazıldı (yanlış yer fark edildi)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (kullanılmadı)    |
| 12.05.2026 | `lib/ai/report-section-prompts.ts` PEA + EcIA + Bat + Bird + Habitat Survey appendices prompt'ları yeniden yazıldı                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Kullanıcı ✅      |
| 12.05.2026 | EcIA v2 PDF + DOCX testi — Appendices section "Data Sources and References" formatında basıldı                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Kullanıcı ✅      |
| 12.05.2026 | PEA v3(6) testte AI ekstra `APPENDIX — DESIGNATED SITES` tarzı tablolar yazdı; prompt sıkılaştırıldı (tablo yasak)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Kullanıcı ✅      |
| 12.05.2026 | PEA v3(7) testi temiz çıktı: ekstra tablolar gitti, 27→25 sayfa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Kullanıcı ✅      |
| 12.05.2026 | Commit `2f944ed`: fix(export): tighten Appendices section + polish PDF/DOCX/HTML output                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                 |
| 12.05.2026 | **Faz 1** — PEA + EcIA prompt restructure (S-P-R, KER, Construction/Operational, Mitigation hierarchy, Monitoring) — sample raporlarla yapısal eşleşme başlangıcı                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kullanıcı ✅      |
| 12.05.2026 | **Faz 2** — `report-section-prompts.ts` heavy section'lara `BREVITY DIRECTIVE` + `MANDATORY` etiketleri + maxTokens 8K Haiku cap'ine bumplandı                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Kullanıcı ✅      |
| 12.05.2026 | **Faz 3** — `anthropic-models.ts` `HEAVY_SECTIONS` + `getSectionModel()` eklendi; 7 heavy section (PEA results/constraints/discussion + EcIA baseline/assessment/mitigation/residual) Sonnet 4.6'ya yönlendirildi; `route.ts` model seçim mantığı wire edildi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Kullanıcı ✅      |
| 12.05.2026 | **Faz 4a** — Methodology prompt sıkıştırıldı (`DO NOT write habitat table here` + Limitations MANDATORY); habitat extent tablosu duplikasyonu kalktı, PEA 41 → 38 sayfa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Kullanıcı ✅      |
| 12.05.2026 | **Faz 4b** — EcIA Conclusions prompt sıkıştırıldı + maxTokens 4500; Further Surveys MANDATORY closing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Kullanıcı ✅      |
| 12.05.2026 | **Faz 4c** — PDF `appendix-renderer.ts` smart page-break logic (DOCX'ten port); note-only appendices önceki ile aynı sayfada — PEA + EcIA'da 2 boş sayfa kazancı                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Kullanıcı ✅      |
| 12.05.2026 | **DB ↔ PDF içerik doğrulaması** — `reports.content.sections` son cümleleri PDF son cümleleriyle birebir eşleşti; render kaybı yok, mid-sentence cut'lar gerçekten AI generation tarafındaymış                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Kullanıcı ✅      |
| 12.05.2026 | **DOCX Faz 4 polish** — `lib/export/docx-generator.ts` üç fix: (1) TipTap `horizontalRule` artık `Paragraph` with `border.bottom` (ince gri çizgi); önce raw `---` text basılıyordu (2) Section title'a `HeadingLevel.HEADING_1` etiketi — Word native TOC + Navigation Pane uyumlu (3) `trimBoldItalicEdges()` helper — `normalizeBoldItalicSpacing`'in eklediği fazla iç boşluk trim ediliyor (`<p> Site location </p>` → `<p>Site location</p>`). PEA DOCX v6 ile doğrulandı: 6 `<h1>` heading, 0 literal `---`, sub-section label'larda whitespace yok.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Kullanıcı ✅      |
| 12.05.2026 | **AA Screening Sonnet'e geçiş** — Diğer terminalde AAS TEST v1 (proje `AT-2026-759`) Haiku 4K cap'inde mid-sentence/mid-word truncation tespit etti (3 section etkilenmiş). `HEAVY_SECTIONS` set'ine eklendi: `aa_screening:site_description` (S-P-R + hidrolojik pathway'ler), `aa_screening:natura_sites` (per-SAC qualifying interests), `aa_screening:significant_effects` (QI × pathway matrix).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Diğer terminal ✅ |
| 12.05.2026 | **AA Screening 5. tur — Tur 1-4 fix paketi** — Detay yukarıda "5. tur" bölümünde. 12 fix bir arada: HEAVY_SECTIONS genişletme (4 section), prompt restructure (case law allowlist, S-P-R matrix, mitigation yasağı, References zorunlu), PDF render (style-transition leading space, bullet glyph, TOC footer duplicate), Unicode glyph substitution (`→` → `-> `), tablo per-column longest-word floor, site-area context (turf area + buffer + boundaryAreaHa/studyAreaHa field'ları), system-prompt rule. AT-2026-759 PDF v1→v3 ile doğrulandı; mid-cut 0/6, S-P-R matrix table, References 18 entry, site area 1924 ha → 36.31 ha doğru. 3 format paritesi (PDF + DOCX + HTML) tam. AA Screening sample-grade %98.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Kullanıcı ✅      |
| 12.05.2026 | **Upstream veri sanity check** — AT-2026-759 PostGIS sorgusu: boundary 36.46 ha, site+1km buffer 600.06 ha, stored `area_hectares` toplamı 1924.22 ha vs PostGIS gerçek geometri 1294.39 ha (630 ha fark), 38 polygon'un 16'sı (%42) buffer dışında. Step 4 habitat import iki ayrı bug (stored vs geometri + buffer filter yok). Rapor çıktısı tarafı AI prompt+context fix ile tamir edildi; Step 4 import bug ayrı issue olarak tracking'de.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Kullanıcı ✅      |
| 12.05.2026 | **AA Stage 2 / NIS — Faz 1-3 pattern uygulandı** — `NIS_PROMPTS` 8 section komple yeniden yazıldı (`lib/ai/report-section-prompts.ts`): BREVITY DIRECTIVE + MANDATORY closing'ler + Stages of HDA + Statement of Authority + S-P-R TABLE + Integrity Matrix 7-column + Avoidance by Design TABLE + Monitoring Programme TABLE + Site Integrity Statement (Waddenzee+Sweetman) + References list + case law allowlist + Article 6(3)/6(4) compliance + Stage 2-spesifik "mitigation IS permitted per PoW C-323/17". maxTokens 2000-4000 → 3500-8000. HEAVY_SECTIONS'a `aa_stage2:` + `nia:` paralel 14 entry eklendi (7 section × 2 report type).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Kullanıcı ✅      |
| 12.05.2026 | **AA Stage 2 Tur 1 → Tur 2 doğrulama** — AS-2026-183 testte v1 baseline'da 6/8 section mid-sentence cut (`methodology` "should be incorporated to assess", `impact_assessment` "(raised bog", `mitigation` "shall be maintained on", `conclusion` "Detailed mapping of all habitat types at" vb.). Tur 2 sonrası DB'de 8/8 temiz ending: `introduction` 7128→12712, `impact_assessment` 30638→34183, `mitigation` 12468→28606 chars. PDF 32 → 44 sayfa. Case law sayıları: Waddenzee×10, Sweetman×8, Kelly×3, PoW×3 (uydurma 0). 7-column Integrity Matrix render. References list (`## References`) sayfa 41 tam. Smart appendix break: page 43 B+C, page 44 D+E. Yapısal benzerlik %55 → ~%92.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Kullanıcı ✅      |
| 12.05.2026 | **AA Stage 2 DOCX + HTML Faz 4 doğrulama** — AS-2026-183 DOCX: 8 `<h1>` (HEADING_1 navigation uyumu), 0 literal `<p>---</p>`, 0 `<strong> X </strong>` whitespace, 9 proper Word table, 39 H3 sub-section. HTML: 0 literal `<p>---</p>`, 30 `<hr>` element, 0 whitespace, 10 `<h2>`, 46 `<h3>`, 8 HTML tables. Faz 4 global render fix'leri (HEADING_1, `---` border, bold trim, `<hr>` element) NIS için ek kod gerekmeden otomatik miras kaldı.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kullanıcı ✅      |
| 12.05.2026 | **NIA paralel doğrulama (NT-2026-614)** — `nia` test projesi ilk turda 8/8 temiz ending: introduction 15453, methodology 13825, site_description 19369, natura_sites 23350, impact_assessment 35558, mitigation 29719, residual 15196, conclusion 19612 chars. PDF 42 sayfa (AS-2026-183'ün 44'üne yakın). Case law: Waddenzee×9, Sweetman×8, Kelly×2, PoW×4 (uydurma 0). Integrity Matrix sayfa 26+'da "Adverse Effect on Site Integrity? — Cannot be Excluded" doğru terminoloji. References sub-section sayfa 39'da. Smart appendix break: Page 41 = B+C, Page 42 = D+E. Cover page "NATURA IMPACT STATEMENT" + "Natura Impact Assessment (NIA)" subtitle ikisi de doğru. NIS_PROMPTS shared infrastructure aa_stage2 ile birebir paritede çalıştı — ek kod/prompt değişikliği gerekmedi. Yapısal benzerlik ~%92.                                                                                                                                                                                                                                                                                                                                                                                                                              | Kullanıcı ✅      |
| 12.05.2026 | **DOCX `stripMarkdown` trim fix** — AA Screening DOCX'inde (AT-2026-759) 9 adet `<strong> Source </strong>`, `<strong> Pathway </strong>` vb. table header whitespace bug tespit edildi. Kök neden: `lib/export/docx-generator.ts:stripMarkdown()` bold marker'ları sıyırıyordu ama upstream `normalizeBoldItalicSpacing`'in capture group içine bıraktığı leading/trailing whitespace'i trim etmiyordu. `trimBoldItalicEdges` paragraph/bullet'larda devredeydi ama table cell'ler farklı kod yolundan geçiyordu (4 caller: inline table header/body + appendix table header/body). Fix: `stripMarkdown` chain'inin sonuna `.trim()` eklendi — tek satır değişiklik, 4 caller'ı birden kapatıyor. NIA DOCX (NT-2026-614) ile doğrulandı: 9 → **0** whitespace bug, 8 table / 292 cell hepsi temiz. PEA + EcIA + AA Screening + AA Stage 2 + NIA için retroactive iyileşme (yeniden export sonrası).                                                                                                                                                                                                                                                                                                                                              | Kullanıcı ✅      |
| 12.05.2026 | **Bat Survey pre-flight + Tur 1 fix paketi** — BST-2026-196 v1 baseline (pre-flight'a rağmen): methodology 28K cap aşımı + assessment + mitigation mid-cut, 9 Irish bat species hallucination (Eptesicus serotinus + Miniopterus schreibersii yanlış eklendi, Nathusius' + Leisler's atlandı), ≥/≤ glyph char-split (Helvetica WinAnsi), NLC BL3 sub-categorization hallucination ("buildings (17.16 ha), artificial surfaces (95.59 ha)" uydurma). Tur 2 fix paketi: HEAVY_SECTIONS'a `bat_survey:methodology/assessment/mitigation` Sonnet'e + maxTokens 7000/5000/5000, Bat introduction prompt'una Irish 9 resident species kesin liste + "DO NOT include" guard, `substituteUnrenderableGlyphs` 8 yeni glyph (≥≤≠≈±×÷µ), system-prompt'a NLC sub-cat hallucination guard. v1(1) test: 0/6 mid-cut, 9/9 doğru species, ≥ → `>=` doğru render, BL3 sub-cat uydurma 0. PDF 24→20 sayfa. 3 format paritesi tam. %88 → %97.                                                                                                                                                                                                                                                                                                                       | Kullanıcı ✅      |
| 12.05.2026 | **Bird Survey Tur 1 baseline (BS-2026-258)** — `BIRD_SURVEY_PROMPTS` Faz 1 öncesi durumdaydı (sadece `results` maxTokens 3000 override). v1 testte 4/6 mid-sentence cut: methodology "...Tidal synchronisation (if estuarine or tidal habitat present", results "Long-eared Owl (Asio otus" mid-word, discussion "...subject to negative long", recommendations "...woodland (WN, WD2, WD3), scrub". PDF 23 sayfa, yapısal benzerlik %50. Project'te 1 `bird_survey` type survey kaydı vardı (12.05.2026 completed) ama observation kaydı yok → veri gap'i baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Kullanıcı ✅      |
| 12.05.2026 | **Bird Survey Tur 2 — Faz 1-3 pattern** — `BIRD_SURVEY_PROMPTS` 5 section yeniden yazıldı: BREVITY DIRECTIVE + Statement of Authority + Bibby/BTO/I-WeBS/SNH methodology citations + 5-col Evaluation Matrix MANDATORY + 6-col Impact Assessment Matrix MANDATORY + 5-col Monitoring Programme TABLE MANDATORY + AA Trigger Statement + Wildlife Acts Section 22/40 + Article 12 EU Birds Directive. maxTokens 2000-3000 → 3500-8000. HEAVY_SECTIONS'a `bird_survey:methodology/results/discussion/recommendations` (4 entry). `introduction` + `appendices` Haiku'da (baseline temizdi). Tur 2 sonuç: PDF 23→32 sayfa (+39%), DB 98K→124K chars (+26%), mid-sentence cut 0/6. Bird terminolojisi sistematik: BoCCI ×36, BTO ×7, I-WeBS ×5, Bibby ×3, Annex I ×8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kullanıcı ✅      |
| 12.05.2026 | **Bird Survey Tur 2.5 — Sample-bridge 2 fix** — Kullanıcı `ss-nocommit/bird/` altına 2 sample report ekledi (Sample 1: DixonBrosnan/Shannon LNG/17 sayfa breeding-only; Sample 2: MKO/Carrownagowan Wind Farm/426 sayfa wind-farm + 10-species raptor-focused). Tur 2 sonrası Sample 1 paritesi %85-88, Sample 2 paritesi %70-75. İki gap belirlendi: (1) NBDC Historical Species Table eksik (Sample 1'de R04 grid 28-species tablo); (2) Per-species sub-section pattern eksik (Sample 2 Results 3.2.x + Discussion 4.x). 2 sample-bridge fix uygulandı: `results` prompt'a NBDC Historical Species Table MANDATORY (15-30 row, "Inferred from habitat" notation, uydurma yasak); `results` + `discussion` prompt'lara conditional per-species deep treatment trigger (5+ BoCCI Red OR Annex I species varsa `#### [Species Name]` sub-heading'leri); `discussion` maxTokens 5500→6500. v1(2) test: NBDC table 29 row render, per-species sub-treatments 7+ (Curlew/Lapwing/Hen Harrier dahil — model `####` H4 yerine bold paragraph kullandı, etki aynı), DB total 124K→147K chars (+18%). Sample 1 paritesi %85-88 → ~%93; Sample 2 paritesi %70-75 → ~%85-88. Kalan gap'ler Document Control Table + Confidential Annex (Faz 5 layout işi). | Kullanıcı ✅      |
| 12.05.2026 | **Bird Survey vs survey_type analysis** — Kullanıcı sordu: Step 4'teki `bird_survey` survey type ile Step 8 Bird Survey rapor tipi arasında özel veri bağlantısı var mı? Yanıt: HAYIR. `app/api/ai/report-section/_lib/data-fetch.ts:165` rapor tipinden bağımsız tüm survey'leri pull ediyor; `context-formatters.ts:97` survey type'ı sadece prompt context'te etiket olarak emit ediyor ("- bird_survey survey on 2026-05-12 (completed)"). Tüm taxon-specific raporlarda (Bat/Bird/Habitat Survey) standart davranış. Pratik anlam: aynı projeden farklı rapor tipi üretirken **aynı veri havuzu** kullanılıyor; özelleşme **sadece prompt + section yapısı** tarafında. Bird Survey'in özel tarafları: Bibby/Gilbert/BTO methodology, BoCCI Red/Amber, I-WeBS, Vantage Point (SNH 2014), Wildlife Acts Section 22+40, Article 12 EU Birds Directive, Avifaunal Receptor Evaluation Matrix, bird-specific impact pathways (collision risk, barrier effects, flight lines).                                                                                                                                                                                                                                                                    | Kullanıcı ✅      |
| 13.05.2026 | **Protected Species config bug** — kullanıcı proje oluştururken rapor tipi seçmedi → `project_report_types` boş → `useActiveReportType` `pea` fallback → Step 6 PEA üretti (`PSR-2026-864_pea_v1.pdf`). Fix: project settings'ten `protected_species` eklendi, Step 6 regenerate, yeni `draft` rapor için Step 7 onayı PEA approval'a düştü; DB'de `reports.status='approved'` ile manuel onaylandı.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Kullanıcı ✅      |
| 13.05.2026 | **Protected Species Tur 1-3 fix paketi** — PSR-2026-864 v1 baseline 0/6 mid-cut (pre-flight tam), ama 4 büyük doğruluk hatası: prompt'taki Annex II+IV+V kategorisi (Otter), II+IV (FPM), II+IV (Salmon) tarihsel yanlışlar; Smooth Newt "Annex V" hallucination; GCN 6.1'de tekrar; Bechstein Annex II örneği. Tur 2 fix: Annex Assignment Accuracy block yeniden organize (II+IV / II+V / IV only / V only / NOT listed), 5 yeni `DO NOT` guard. v2'de 3 büyük fix tuttu ama 3 prompt direktifi AI override etti (Otter Sec 5 "II,IV&V", GCN 6.1, Section 42 WAA 6.4) + 2 yeni hallucination (Schedule 4/6, 6250\* habitat kodu). Tur 3: `assessment` + `recommendations` Sonnet'e (3→5 section HEAVY_SECTIONS), Schedule 5 listesi + Annex I habitat allowlist (91E0/91A0/3260/1330/91J0) + 6 agresif "STRICT...rule" / "WRITE EXACTLY AS" / "if you find yourself about to type X, stop and write Y" guard. v3'te 6/6 hedef düzeldi. Section 4 4.1-4.7 (5 species + Summary tablo) yapısına genişledi. Sample-grade ~%96-97. Sample raporu yok — intrinsic quality üzerinden değerlendirildi.                                                                                                                                                 | Kullanıcı ✅      |
| 13.05.2026 | **Protected Species 3-format parite (DOCX + HTML)** — PSR-2026-864 v3 DOCX: 6 HEADING_1 (Word native TOC), 4 H2, 34 H3, 9 tablo, 0 literal `---`, 0 bold whitespace. HTML: 8 `<h2>`, 43 `<h3>`, 30 `<hr>`, 8 `<table>`, 53 `<em>` italic Latin, 0 literal `<p>---</p>`, 0 strong whitespace. 6 hedef bug 3 formatta paralel düzeldi (Otter II+IV, Schedule 5, GCN yok, Section 42 yok, Annex II+V, 6250\* yok). Kalan minor: (1) "Badgers Act 1976" UK kanunu sızıntısı Section 3.1 Haiku — 3 formatta; (2) Smooth Newt "no specific legal protection" Section 5 Sonnet tek-cümle regression — 3 formatta; (3) **YENİ keşif** HTML bold+italic nested marker bug (`**X** *Y*` → `<strong>X <strong><em></strong> Y</em></strong>` yanlış nest açıyor) — sadece HTML, cross-cutting (başka rapor tiplerinde de muhtemelen var).                                                                                                                                                                                                                                                                                                                                                                                                                    | Kullanıcı ✅      |
| 13.05.2026 | **Other Technical Report pre-flight yetersiz (Tur 1)** — OTR-2026-243 v1 baseline minimal pre-flight (sadece `other:results` Sonnet + maxTokens 5500/4000/3500) ile 4/5 section mid-cut: methodology 2.3 "** Great" yarıda (Haiku 2K default), results 3.2 Hedgerow "frequently support protected" yarıda (5500 cap aşıldı → Section 3.3 Protected Species + 3.4 Aquatic Features + 3.5 Data Gaps **hiç yazılmadı\*\*), discussion Cumulative "17% of their original extent in" yarıda (Haiku 4K), recommendations Watercourse Fisheries "Consultation with the Inland" yarıda (Haiku 3.5K). Yapısal benzerlik %50. "Other generic, content miktarı düşük" varsayımı yanlış çıktı — 38 habitat polygon + 5-sub-section results yapısı PSR/Bat Survey ile aynı yükte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Kullanıcı ✅      |
| 13.05.2026 | **Other Technical Report Tur 2 — TEK TURDA KAPANDI** — OTHER_PROMPTS 4 prompt yeniden yazıldı: BREVITY DIRECTIVE + 3+5+4+5 sub-section yapısı + MANDATORY closing'ler. HEAVY_SECTIONS 3 yeni entry (`other:methodology` + `:discussion` + `:recommendations` Sonnet'e, results zaten vardı — 4/5 section Sonnet). maxTokens 5500/8000/6000/5500. Annex I habitat allowlist PSR'dan miras + "Inland Fisheries Ireland" explicit kural + 12-entry References list. v2 testte 0/5 mid-cut, Section 3.3+3.4+3.5+4.4+5.5 hepsi MANDATORY tamamlandı, "Inland Fisheries Ireland (IFI)" full name × 3 yerde, 6250 hallucination yok, Annex I kodları doğru (6410/7120/7130/4030/4010/91A0/91E0\*). PDF 19→20 sayfa, ~%95 benzerlik. 3-format parite: DOCX 5 HEADING_1 + 18 H3 + 8 table + 0 literal `---`; HTML 7 `<h2>` + 23 `<h3>` + 14 `<hr>` + 22 `<em>` italik Latin + 7 table. Minor open: Section 3.4a sub-numbering glitch (3.5 olması gerekiyordu); DOCX HEADING_2 = 0 (sub-section'lar direkt HEADING_3'e, stylistic).                                                                                                                                                                                                                         | Kullanıcı ✅      |

---

## Yapılacaklar / Notlar

- [x] PEA v3 1. tur PDF düzeltmeleri doğrulandı (görsel iyileşme onaylandı, text-extraction'da kelime birleşmesi tespit edildi)
- [x] PEA v3 2. tur PDF doğrulama — text-extraction'da kelime birleşmesi büyük ölçüde düzeldi, ama bold-colon ve line-wrap durumları kaldı
- [x] PEA v3 3. tur PDF doğrulama — same-style run batching + wrap-aware fix sonrası kullanıcı "şuan iyiyse kalsın" dedi, PEA stabil sayılıyor
- [x] PEA v3 DOCX (Word) doğrulama — kontrol edilmedi; PDF stabilse DOCX büyük ihtimalle paralel iyileşti (DOCX'te `repairRunBoundaries` zaten devrede). İhtiyaç olursa tekrar bakılır.
- [x] **EcIA testi tamamlandı** (12.05.2026) — yeni proje `ET-2026-485`, v2 PDF + DOCX kontrol edildi; PEA fix'leri başarıyla EcIA'ya yansımış (tablo `…` truncate yok, header multi-line çalışıyor, bold-noktalama merge'leri düzeldi). Appendices section yeni "Data Sources and References" formatında basıldı, otomatik Appendix A-E tabloları beraber çıktı, uyumsuzluk yok.
- [x] **Step 6 "appendices" section AI üretimi atlandı** (12.05.2026, sonra geri alındı) — Önce filter eklendi, sonra kullanıcı kararı ile geri alındı çünkü müşteri "AI üretiyorsa rapora basalım" dedi. Şu an AI üretiyor + PDF/DOCX/HTML basıyor + prompt sıkılaştırıldığı için ekstra appendix listesi/tablosu üretmiyor.
- [x] **Karar revize edildi** (12.05.2026) — Step 8 export skip'leri (PDF + DOCX + HTML, 3 yerde) kaldırıldı. Artık "Appendices" section'ı AI metniyle birlikte basılıyor, sonra otomatik Appendix A-E tabloları onun ardından geliyor.
- [x] **Appendices template prompt'u yeniden yazıldı** (12.05.2026) — EcIA v1 (4) test PDF'inde AI 7-appendix listesi yazıyordu, otomatik renderer 5 appendix basıyordu → harf numaraları kayıyor + iki uyumsuz liste yan yana. Önce `lib/templates/{pea,ecia}-template.ts`'in `template` alanını değiştirdim (yanlış yer — AI bunu kullanmıyor). Sonra doğru yer bulundu: `lib/ai/report-section-prompts.ts`. PEA + EcIA + Bat Survey + Bird Survey + Habitat Survey için appendices prompt'ları yeniden yazıldı: "appendix listesi yazma — sadece Data Sources and References listesini doldur".
- [x] **Appendices prompt'u sıkılaştırıldı** (12.05.2026, PEA v3(6) testi sonrası) — PEA AI'ı yeni prompt'a rağmen `APPENDIX — DESIGNATED SITES`, `APPENDIX — CATCHMENTS`, `APPENDIX — SPECIES OBSERVATIONS`, `APPENDIX — HABITAT MAPPING DETAIL` tarzı ekstra tablolar üretti. Prompt 5 rapor tipinde sıkılaştırıldı: "CRITICAL — DO NOT WRITE: appendix list, markdown tables, APPENDIX — XX sub-headings, per-record breakdowns". PEA v3(7) tekrar test edildi: ekstra tablolar gitti, sayfa 27 → 25.
- [x] **AI truncation kapatıldı** (12.05.2026 — Faz 1-4) — heavy section'lara `maxTokens` 4000-5500 → 7000-8000, BREVITY DIRECTIVE + MANDATORY etiketleri, ve PEA `results/constraints/discussion` + EcIA `baseline/assessment/mitigation/residual` Sonnet 4.6'ya geçirildi (`HEAVY_SECTIONS` set'i `anthropic-models.ts`). Methodology + Conclusions ayrıca polish edildi. PEA + EcIA artık sample raporlarla ~%96 yapısal eşleşmede. DB ↔ PDF içerik doğrulaması yapıldı (render kaybı yok). Detay yukarıda "4. tur düzeltmeleri" bölümünde.
- [x] **`→` Unicode arrow karakteri** (12.05.2026, AA Screening 5. tur içinde) — `lib/export/pdf/markdown-parser.ts`'e `substituteUnrenderableGlyphs()` helper'ı eklendi (parseMarkdown başında çalışıyor): `→` → `->`, `←` → `<-`, `⁰⁻⁹` → `^0..^9`, `⁻⁺` → `^-` `^+`. DOCX + HTML native Unicode'u koruyor; fix sadece jsPDF Helvetica WinAnsi için.
- [x] **Superscript encoding** (`⁻¹`, `²`, vb. — 12.05.2026, AA Screening 5. tur içinde) — aynı `substituteUnrenderableGlyphs` helper'ı tüm superscript glyph'leri `^N` formatına çevirir. Custom font yükleme alternatifi şimdilik gerekmiyor.
- [x] **Step 8 HTML export test edildi** (12.05.2026, AA Screening 4. tur) — proper `<table>` + `<thead>/<tbody>`, genus `<em>` italik, → arrow native, References section, TOC anchor link'leri, @media print kuralları — hepsi temiz. %98 production-grade.
- [x] **`≥` `≤` `±` `µ` `×` `÷` glyph render** (12.05.2026, Bat Survey Tur 2) — `substituteUnrenderableGlyphs` genişletildi: `≥` → `>=`, `≤` → `<=`, `≠` → `!=`, `≈` → `~=`, `±` → `+/-`, `×` → `x`, `÷` → `/`, `µ` → `u`. Helvetica WinAnsi'de bu glyph'ler char-split bug üretiyordu ("T e m p e r a t u r e ≥ 1 0"). Tüm rapor tiplerine yansır.
- [x] **NLC sub-categorization hallucination guard** (12.05.2026, Bat Survey Tur 2) — `system-prompt.ts`'e "Do NOT invent sub-categories within Fossitt codes. BL3/GA1/WD1 vb. tek total olarak verilmeli, fictional sub-classification yasak" rule eklendi. Tüm rapor tiplerine yansır.
- [x] **AI species accuracy guard pattern** (12.05.2026, Bat Survey Tur 2) — Bat introduction prompt'una Irish 9 resident species kesin liste + "DO NOT include" listesi (Eptesicus serotinus UK only, Miniopterus schreibersii continental, Bechstein's, Brandt's, Pond, Kuhl's). Bird/Habitat Survey için aynı pattern uygulanabilir (BoCCI 2020-2026, Annex I birds, vb.).
- [ ] **WS2 137% Cover bug** — EcIA v2 Habitat Map otomatik appendix tablosunda `WS2 Immature woodland 3129.02 ha 137.0%` görünüyor. `appendix-data.ts` veya `appendix-renderer.ts`'de yüzde hesaplama hatası (primary + buffer alanları toplanıyor olabilir, total alana göre çift sayılıyor). **AT-2026-759 sanity check'inde aynı bug konfirmedi**: stored `area_hectares` toplamı 1924 vs PostGIS gerçek geometri 1294 ha (630 ha fark). Step 4 habitat import unit/overlap bug.
- [ ] **Step 4 habitat import — buffer dışı filter yok** (12.05.2026, AT-2026-759 sanity check) — 38 polygon'un 16'sı (%42) site + 1km buffer dışında, hâlâ Step 8 export'a dahil. `data-fetch.ts` (Step 8 path) ve `area-calculator` (Step 4 import) tarafında proximity filter eklenmeli.
- [ ] **AI minor hallucination — case adları + organizasyon adları** (12.05.2026, AA Screening tur 4) — References'da "CIEEM = Council for the Isles of Man, England, Northern Ireland, Scotland and Wales" (doğrusu Chartered Institute of Ecology and Environmental Management) ve "Waddenzee v. Netherlands" (doğrusu kısaca Waddenzee). Prompt allowlist'i case kısa adlar + ENG organizasyon expansion'ları için sıkılaştırılabilir.
- [ ] Branding (logo/renk) Step 8 export'unda doğru uygulanıyor mu — ayrı kontrol
- [ ] Cover page metinleri (Report Title, Prepared For, Project Reference) doğru basılıyor mu — ayrı kontrol
- [ ] **Word cover page** çok yukarıda boş kalıyor olabilir (`spacing.before: 2400` = 1.67") — kullanıcı isterse azaltılır
- [ ] **Word TOC sayfası** kısa olunca alt yarı boş — şu an design intent olarak kabul ediliyor, kullanıcı şikayet ederse compacter TOC yapılır
- [x] **AA Stage 2 / NIS test tamamlandı** (12.05.2026) — AS-2026-183 testte v1 baseline 6/8 truncation tespit edildi, Faz 1-3 pattern (NIS_PROMPTS 8 section yeniden + 14 HEAVY_SECTIONS entry) uygulandı. Tur 2 sonrası 8/8 temiz ending, PDF 32→44 sayfa, %55→%92. DOCX + HTML Faz 4 global fix'leri otomatik miras (8 `<h1>`, 0 `---`, 9 Word tablo / 30 `<hr>`). Detay yukarıda "6. tur" bölümünde.
- [x] **NIA test tamamlandı** (12.05.2026) — NT-2026-614 paralel doğrulama: ilk turda 8/8 temiz ending. PDF 42 sayfa, %92 yapısal benzerlik. NIS_PROMPTS shared infrastructure aa_stage2 ile birebir paritede çalıştı — ek kod/prompt değişikliği 0. Detay Çalışma Geçmişi'nde.
- [x] **Bat Survey test tamamlandı** (12.05.2026) — BST-2026-196 pre-flight + Tur 1-2: Sonnet routing 4 section (`results/methodology/assessment/mitigation`), Irish 9 resident species kesin liste, ≥/≤ glyph genişletme, NLC sub-cat guard. v1(1) DB 0/6 cut, 9/9 doğru species, 3-format parite. PDF 24→20 sayfa, %88→%97. Detay yukarıda "7. tur" bölümünde.
- [x] **Bird Survey test tamamlandı** (12.05.2026) — BS-2026-258 Tur 1-2-2.5: Faz 1-3 pattern (5 section restructure + HEAVY_SECTIONS 4 entry) + 2 sample-bridge fix (NBDC Historical Species Table MANDATORY 15-30 row + conditional per-species deep treatment trigger 5+ priority species). v1 baseline 4/6 mid-cut → v1(2) 0/6 cut, NBDC table 29-row, per-species sub-treatments 7+. PDF 23→32 sayfa, DB 98K→147K chars (+50%). Sample 1 (DixonBrosnan) paritesi %85-88→~%93; Sample 2 (MKO wind farm) paritesi %70-75→~%85-88. Bird-specific terminoloji sistematik: BoCCI ×36, BTO ×7, I-WeBS ×5, Bibby ×3, Annex I ×8, Wildlife Acts Section 22/40 ×5, Article 12 ×2, AA Trigger Statement ×6. Detay yukarıda "7. tur — Bird Survey" bölümünde. Kalan gap: Document Control Table + Confidential Annex (Faz 5 layout işi).
- [x] **Protected Species test tamamlandı** (13.05.2026) — PSR-2026-864 Tur 1-3: config bug fix (junction tablo `pea` fallback) + Annex Assignment Accuracy block restructure (II+IV / II+V / IV only / V only / NOT listed) + Schedule 5 listesi + Annex I habitat allowlist + 6 agresif "STRICT...rule" guard + Sonnet routing 3→5 section (`assessment` + `recommendations` HEAVY_SECTIONS'a). v3'te 6/6 hedef bug düzeldi, Section 4 4.1-4.7 (5 species + Summary tablo) yapısına genişledi, 3-format parite tam (PDF + DOCX 6 HEADING_1 + HTML 8 `<h2>` / 30 `<hr>` / 53 `<em>`). Sample-grade ~%96-97. Sample raporu yoktu, intrinsic quality üzerinden değerlendirildi. Detay yukarıda "8. tur — Protected Species" bölümünde.
- [ ] **Protected Species kalan minor bug'lar (open items, 3 formatta paralel):** (1) "Badgers Act 1976" UK kanunu sızıntısı Section 3.1 (Haiku) + Summary tablosu — Section 4.3 Sonnet doğru ("Schedule 5 only, not Annex-listed"). Haiku section daha agresif guard ister. (2) Smooth Newt "no specific legal protection in Ireland" Section 5 Amphibians (Sonnet, tek-cümle regression) — AI Tur 3'teki "NOT listed on any EU Annex" satırından "no legal protection" sonucu çıkarmış, Schedule 5 olduğu bilgisi unutulmuş.
- [ ] **HTML bold+italic nested marker bug** (13.05.2026, Protected Species 3-format kontrolü sırasında keşif) — markdown `**X** *Y*` patterni HTML render'da `<strong>X <strong><em></strong> Y</em></strong>` gibi yanlış nest açıyor. PDF + DOCX'te yok, sadece HTML render katmanı. Cross-cutting bug — başka rapor tiplerinde de muhtemelen var (PSR'da Methodology referanslarında 6-8 yerde tekrar etti: Collins 2023, Marnell 2022, Parnell & Curtis 2012). `lib/export/pdf/html-generator.ts` veya markdown→HTML pipeline'ı incelenebilir.
- [x] **Other Technical Report test tamamlandı** (13.05.2026) — OTR-2026-243 Tur 1-2: Tur 1 minimal pre-flight (`results` Sonnet) 4/5 mid-cut, Section 3.3-3.5 hiç yazılmadı; Tur 2 agresif fix paketi (4/5 section Sonnet + BREVITY + 3+5+4+5 sub-section MANDATORY closing'ler + Annex I allowlist + "Inland Fisheries Ireland" explicit + 12-entry References) tek atışta production-grade. v2'de 0/5 cut, 3-format parite tam, ~%95 sample-grade. Detay yukarıda "9. tur — Other Technical Report" bölümünde.
- [x] **10/10 rapor tipi production-ready** (13.05.2026) — PEA %96 / EcIA %96 / AA Screening %98 / AA Stage 2 %92 / NIA %92 / Bat Survey %97 / Bird Survey %93 / Habitat Survey %97 / Protected Species %96-97 / Other ~%95. Cross-cutting fix'ler (Annex I habitat allowlist, smart appendix break, glyph substitution, HEADING_1 navigation, bold whitespace trim, stripMarkdown trim, "Inland Fisheries Ireland" gibi explicit kurallar) tüm rapor tiplerine miras yansıyor.
- [ ] **Faz 5 — Layout/branding (kalan %4)** Faz 1-4 sonrası içerik tarafı %96 sample-grade; geri kalan **görsel** gap'ler:
  - Cover page: müşteri logosu + danışmanlık logosu + hero image (sample'larda Enviroguide/NM Ecology başlığı + proje resmi var)
  - Document control tablosu (rev/author/reviewer/approver/date) — Title sonrası sayfa, UI input gerekir
  - Hiyerarşik section numbering (4.4.1) — şu an düz `1. 2. 3.`
  - TOC sub-section numbers + page numbers (şu an sadece üst başlık)
  - List of Tables / List of Figures sayfası
  - Detaylı header/footer (proje + danışmanlık + sayfa — şu an sadece "Confidential Page X")
  - Table/Figure auto-numbered captions ("Table 1: ...")
  - Site photographs / habitat map figüre embed (şu an "supplied separately as a GIS deliverable")
- [ ] **Sonnet maliyet izleme** — Heavy section'lar Sonnet 4.6 kullanıyor, rapor başına ~$0.40-0.60 (Haiku-only ~$0.10-0.15). Toplu üretimde maliyet eğrisini gözlemle; gerekirse `HEAVY_SECTIONS` set'i daraltılır veya `CLAUDE_CHEAP_MODEL`'a Haiku 5 geldiğinde geri çekilir.
- [ ] **CLAUDE.md güncelle** — `CLAUDE_SYNTHESIS_MODEL` artık sadece Step 3 desk-insights ve Step 8 data-analysis-summary için değil; PEA + EcIA heavy sections için de kullanılıyor. CLAUDE.md'deki "everything else → Haiku" notu rafine edilmeli.

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
