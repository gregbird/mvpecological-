# Feedback 20/4 — Greg Birdthistle (20 Nisan 2026)

> **Kaynak:** Greg Birdthistle — Google Docs ekran goruntuleri (4 screenshot, 23 Nisan'da iletildi)
> **Greg'in basligi:** "Feedback 20/4"
> **Iletim tarihi:** 23 Nisan 2026

---

## Ozet

| #   | Baslik                                                         | Oncelik          | Durum             |
| --- | -------------------------------------------------------------- | ---------------- | ----------------- |
| 1   | National Biodiversity Data Centre (NBDC) verisi missing        | 🔴 Kritik        | ⏸ Triage bekliyor |
| 2   | National Land Cover Map — Inside/Buffer/Outside view secenegi  | 🟡 Feature       | ⏸ Triage bekliyor |
| 2.B | National Land Cover map screenshot alma opsiyonu yok           | 🟢 UI gap        | ⏸ Triage bekliyor |
| 3   | Field survey habitat mapping — Boundary disindaki habitat'lar  | 🔴 Yanlis goster | ⏸ Triage bekliyor |
| 4   | (eksik — screenshot bolundu)                                   | —                | ⏸ Greg'den iste   |
| 5   | Step 5 Data Analysis — "Releve Survey" tab Field Survey'e tasi | 🟡 Mimari yer    | ⏸ Triage bekliyor |
| 6   | AI Draft step — Data/Maps/Photos tab'lari sticky olsun         | 🟡 UX polish     | ⏸ Triage bekliyor |

**Greg'in chat ek notu (screenshot 2):** "it didn't work for the 1st project but did for the 2nd" — onceki bir feedback iciin proje-bazli tutarsizlik bildirimi. Hangi maddeyle ilgili oldugu belirsiz, netlestirilmeli.

---

## 1. National Biodiversity Data Centre (NBDC) verisi missing 🔴

**Orijinal (Greg, vurgulu):**

> "Data from the National Biodiversity Data Centre is currently missing during the data gathering process."

**Turkce:** Step 2 (Data Gathering) sirasinda NBDC verisi gelmiyor. Greg "missing" diyor — yani bos sonuc mu donuyor, yoksa NBDC sorgusu hic atilmiyor mu netlestirilmeli.

**Triage notlari:**

- NBDC entegrasyonu yakin gecmiste GBIF'in yerine gecirilmis (`.claude/rules/step2-species-records.md` notu).
- Endpoint: `nbdc-report-api` POST + form data (CLAUDE.md "Known gotchas").
- Olası nedenler: API timeout, rate limit, response parsing degisikligi, RLS/cors, veya tek bir specific finding turunde fail.
- Greg "data gathering process" diyor — sadece species mi tum NBDC veri turleri mi belirsiz.

**Sorulacak / arastirilacak:**

- [ ] Hangi proje? Repro adimlari? (Greg "1st project" "2nd project" demis — proje-bazli bug olabilir)
- [ ] Network tab — NBDC POST atiliyor mu? Status code? Response payload?
- [ ] `lib/external-apis/` icindeki NBDC client kodu son commit'te değişti mi?
- [ ] Gercek site boundary'leriyle vs Ireland-default bbox ile sonuc karsilastir.

---

## 2. National Land Cover (NLC) Map — Inside / Buffer / Outside view 🟡

**Orijinal:**

> "A National Land Cover Map: Display the habitat data within the site boundary by default. Provide the user with an option to select and view data for the buffer zone separately. And outside the buffer separately."

**Turkce:** NLC haritasi su an habitat data'sini bbox'ta veya tum proje genisliginde gosteriyor. Greg uc ayri view istiyor:

1. **Default:** Sadece site boundary icindeki habitat'lar
2. **Buffer:** Sadece buffer zone'daki (boundary disinda, buffer yaricapinda) habitat'lar
3. **Outside:** Buffer'in disindaki habitat'lar

Toggle veya 3-state radio segment olarak UI'da yer almali.

**Triage notlari:**

- Inside/buffer/outside ayrımı zaten `lib/utils/spatial-classifier.ts` icinde var (feedback-8-4-apr #9.4'te eklendi). NLC habitat'lara da uygulanabilir.
- NLC habitat layer Step 2 + Step 5 maps tab'inda render ediliyor (`hooks/data-gathering/`, `components/steps/data-analysis/maps-tab.tsx`).
- 3-state filter UI'i halihazirda yok — eklenmesi gerekli.

**Screenshot:** Greg NLC habitat'larin tum proje yayilimini gosteriyor (sari poligonlar yatay olarak yayilmis, site boundary kirmizi cerceve).

### 2.B — Screenshot opsiyonu eksik

**Orijinal:**

> "Also the option to take a screenshot of the National land cover map is not showing"

**Turkce:** NLC haritasi gosterildigi yerde "Screenshot" butonu yok. Diger haritalarda var (Step 5 maps tab'inda screenshot capture gallery'si).

**Triage:**

- `hooks/use-map-screenshot.ts` (html-to-image) zaten kullanilabilir.
- NLC'nin gosterildigi component'e screenshot butonu eklenmesi gerek.
- Screenshot `map_screenshots` tablosuna gidecek (mevcut altyapi).

---

## 3. Field survey habitat mapping — Boundary disindaki habitat'lar gosteriliyor 🔴

**Orijinal:**

> "During the field survey stage for habitat mapping, the habitat data being displayed includes habitats from outside the site boundary. The user specifically requires that the system only present habitat data that falls within the designated site boundary. (Refer to the screenshot for clarification)."

**Turkce:** Step 4 (Field Research → Habitat Mapping) tab'inda harita auto-imported habitat'lari gosterirken site boundary'nin DISINDA olanlari da goruyor. Kullanici sadece boundary'nin ICINDE kalanları istiyor.

**Triage notlari:**

- Multi-site refactor sonrasi habitat'lar `site_id`'ye bagli ama spatial filter uygulanmiyor olabilir.
- `hooks/steps/use-habitat-map-data.ts` veya auto-import logic'i (`hooks/steps/use-auto-import-habitats.ts`) habitat'lari clip etmeden cekiyor olabilir.
- `useSpatialFilter` (`hooks/shared/use-spatial-filter.ts`) varsa burada clip uygulanabilir.
- CLAUDE.md kurali: "Always clip geometries to project boundary with `turf.intersect` before calculating areas". Burada display tarafinda da geçerli.
- Auto-import sirasinda da `turf.booleanIntersects(boundary, habitat)` filter uygulanip sadece intersect edenler import edilebilir.

**Sorular:**

- Sadece display'de mi filter, yoksa import sirasinda da boundary disi habitat'lari atlasin mi? (Greg'in dediği "only present" — display yetebilir, ama import etmemek daha temiz)
- Multi-site projelerde "All Sites" view'inde tum sitelerin union'u mu kullanilacak?

---

## 4. (eksik madde — Greg'den net iste)

Greg'in 3. screenshot'inda madde 3 bittikten sonra dogrudan madde 5'e gecti gibi gozukuyor — arada 4. madde var mi bilinmiyor. Olabilir ki Greg numara atlayip 5'ten devam etti.

**Aksiyon:** Greg'e dogrula — "Feedback 20/4'te madde 4 var mi yoksa direkt 5'ten devam mi ettin?"

---

## 5. Step 5 Data Analysis — "Releve Survey" tab Field Survey'e tasinmali 🟡

**Orijinal:**

> "Step 5: Data Analysis — The 'Releve Survey' tab should be removed from the data analysis section. The releve survey is part of the field survey and should appear under the 'Field Survey' tab instead."

**Turkce:** Step 5 (Data Analysis) icinde su an 6 tab var: Desk Assessment, Field Survey, Releve Surveys, Habitats, Target Notes, Maps, Photographs. Greg "Releve Surveys" tab'inin **kaldirilmasini** ve Field Survey tab'inin **icinde** alt sekme olarak veya birlesik bir liste olarak gosterilmesini istiyor.

**Triage notlari:**

- Releve placement (feedback-8-4-apr #9.11) tasinma sirasinda gozetilmeli — placement dropdown'u Field Survey altinda da kalmali.
- `components/steps/data-analysis-step.tsx` icinde tab listesi tanimli, `releve-surveys-tab.tsx` ayri component.
- Field Survey tab (`field-survey-tab.tsx`) zaten generic survey listesi — releve'leri buraya gomelim mi yoksa 2'li sub-tab mi yapalim?

**Tasarim sorulari:**

- Field Survey tab'i icinde "Generic Surveys" + "Relevés" alt-tab seklinde mi?
- Yoksa tek liste icinde survey type'a gore filterable bir tablo mu?
- Releve'nin ayri detayli card'i (Latin/DOMIN tablosu) korunmali — collapse edilebilir bir bolum olarak.

---

## 6. AI Draft step — Data/Maps/Photos tab'lari sticky olsun 🟡

**Orijinal:**

> "On the AI draft step — The 'Data,' 'Maps,' and 'Photos' tabs on the AI draft step should remain visible when scrolling down with the user as they navigate the page content."

**Turkce:** Step 6 (AI Draft) sag tarafindaki Data / Maps / Photos secici sekmeleri (kirmizi okla isaretli) sayfa scroll edildiginde **stickly** kalmali. Su an scroll asagi indikce kullanici bu sekmeleri kaybediyor.

**Triage notlari:**

- `components/steps/ai-draft-step.tsx` veya `components/steps/ai-draft/asset-panel-*.tsx` icinde tab grup tanimli.
- Cozum: Tab container'a `sticky top-0 z-10 bg-background` veya `sticky top-{header-height}`. Parent overflow scroll ise sticky calismaz — overflow ayarini kontrol et.
- Right panel kendi kaydiriciliyor mu yoksa tum sayfa mi scroll oluyor? Buna gore strateji degisir.

---

## Greg'in Chat Mention'i (Ek)

> "@baltabdurrahim@gmail.com — it didn't work for the 1st project but did for the 2nd"

**Yorum:** Onceki bir feedback maddesi (muhtemelen survey templates seed veya benzer bir fix) ICin proje-bazli tutarsizlik bildiriyor. Bir projede ise yarmadi, digerinde yaradi.

**Aksiyon:** Greg'e dogrula — hangi feature'dan bahsediyor? Iki proje hangileri?
**Olası adaylar:**

- Survey template seeding (yeni org icin uygulandı, mevcut proje listede degişlik)
- NBDC verisi (madde 1) — projeye gore farkli sonuc
- Habitat boundary clip (madde 3) — bir projede dogru clip ediyor olabilir

---

## Inceleme Sirasi (Onerilen)

### Faz 1 — Kritik (data missing / yanlis veri)

1. **#1 NBDC missing** — Veri kaybi, repro adimlari ile baslamak
2. **#3 Habitat outside boundary** — Yanlis veri gösterimi, kullanici raporlarinı bozar

### Faz 2 — Hizli Kazanimlar

3. **#6 AI Draft sticky tabs** — CSS-only fix
4. **#2.B NLC screenshot opsiyonu** — Mevcut altyapi kullanilabilir

### Faz 3 — Tasarim Gerektiren

5. **#2 NLC inside/buffer/outside view** — UI tasarim + spatial filter integration
6. **#5 Releve Survey tab tasinması** — Mimari karar (sub-tab vs filterable list)

### Acik Sorular

7. **#4 eksik madde** — Greg'e dogrula
8. **Chat note "1st vs 2nd project"** — Greg'e dogrula

---

## Notlar

- Bu feedback'i ele almadan once Greg'e madde 4'un eksik olup olmadigini ve "1st/2nd project" notunu netlestirme sormak gerekiyor.
- NBDC missing (#1) ve Habitat outside boundary (#3) kullanicinin canli rapor uretmesini etkiler — onceliklendirme nedeni.
- Madde #5 (Releve tab tasinma) feedback-8-4-apr #9 (placement) ile koordineli ele alinmali — placement dropdown'u Field Survey'in icinde de gorunecek.
