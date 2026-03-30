# Feedback 11/3 — Yapilacaklar Listesi

> **Kaynak:** Greg Birdthistle — 11 Mart 2026
> **Durum:** Devam ediyor (Faz 1 + Faz 2 + Faz 3 tamamlandi)
> **Toplam:** 60 madde, 6 grup

---

## Icindekiler

- [Grup A: GIS Altyapi](#grup-a-gis-altyapi) — Shapefile, coklu site, cizim araclari, attribute (19 madde)
- [Grup B: Habitat Veri Akisi](#grup-b-habitat-veri-akisi) — Katman kaydetme, NLC, buffer, etiketler (11 madde)
- [Grup C: Desk Research Temizlik](#grup-c-desk-research-temizlik) — Planning policy kaldir, desk assessment birlestir (6 madde)
- [Grup D: Field Research Yeniden Yapi](#grup-d-field-research-yeniden-yapi) — Survey planlama, field research tab yapisi (9 madde)
- [Grup E: Raporlama Zinciri](#grup-e-raporlama-zinciri) — Data analysis, AI draft, quality review, final submission (20 madde)
- [Grup F: Bagimsiz](#grup-f-bagimsiz) — Bug fix, branding, kullanici kilavuzu (5 madde)

### Bagimlilik Akisi

```
A: GIS Altyapi ──────────┐
                          ├──→ D: Field Research ──→ E: Raporlama Zinciri
B: Habitat Veri Akisi ───┘                                ↑
                                                           │
C: Desk Temizlik ─────────────────────────────────────────┘

F: Bagimsiz ──→ paralel yapilabilir
```

### Ilerleme Ozeti

| Grup              | Madde  | Tamamlanan | Ilerleme           |
| ----------------- | ------ | ---------- | ------------------ |
| A: GIS Altyapi    | 31     | 27         | █████████░ 87%     |
| B: Habitat Veri   | 11     | 11         | ██████████ 100% ✅ |
| C: Desk Temizlik  | 6      | 0          | ░░░░░░░░░░ 0%      |
| D: Field Research | 9      | 0          | ░░░░░░░░░░ 0%      |
| E: Raporlama      | 20     | 1          | █░░░░░░░░░ 5%      |
| F: Bagimsiz       | 5      | 0          | ░░░░░░░░░░ 0%      |
| **Toplam**        | **72** | **39**     | █████░░░░░ **54%** |

---

## Grup A: GIS Altyapi

> **Oncelik:** 🔴 Kritik — diger gruplarin temeli
> **Bagimlilik:** Yok (ilk baslanacak)
> **Feedback maddeleri:** #4, #5, #6, #14.1

### A1. Shapefile Upload (Feedback #4)

- [x] **A1.1** ~~Shapefile upload sorununu test et ve tani~~ ✅ (29 Mart 2026) — `proj4` ile ITM/Irish Grid → WGS84 otomatik CRS donusumu eklendi. MultiPolygon parcalanir, tum polygon'lar dondurulur. Dosyalar: `lib/gis/coordinate-transform.ts`, `lib/gis/shapefile-parser.ts`, `lib/gis/validation.ts`

### A2. Coklu Site Siniri Destegi (Feedback #4)

- [x] **A2.1** ~~Tek projede birden fazla site siniri cizme destegi~~ ✅ (29 Mart 2026) — DB: `project_sites` tablosu, `site_id` FK'lar, sync trigger, RPC'ler, RLS. UI: GIS Mapping Step wizard "Sites" adimiyla refactor edildi, `SiteListPanel` sidebar, `SiteInfoCard`, `useSiteManagement` hook. Dosyalar: `gis-mapping-step.tsx`, `use-gis-wizard.ts`, `site-list-panel.tsx`, `site-info-card.tsx`, `use-site-management.ts`, `project-sites.ts`, `use-site-hooks.ts`
- [x] **A2.2** ~~Her site icin proje adindan turetilen otomatik alt isimlendirme~~ ✅ (29 Mart 2026) — `generateSiteCodePrefix()` ve `generateSiteCode()` fonksiyonlari. "Tralee Bay Wind Farm" → "TBWF 00101". Dosya: `use-site-management.ts`
- [x] **A2.3** ~~Her site sinirinin data gathering'de bagimsiz islenmesi~~ ✅ (29 Mart 2026) — `SiteSelector` bileseni eklendi, data-gathering-step site'a gore boundary/buffer kullanir. Dosyalar: `site-selector.tsx`, `data-gathering-step.tsx`
- [x] **A2.4** ~~Her site icin bagimsiz field survey destegi~~ ✅ (29 Mart 2026) — Steps 4, 5, 6'ya SiteSelector eklendi. Dosyalar: `field-survey-step.tsx`, `habitat-mapping-step.tsx`, `target-notes-step.tsx`

### A3. Cizim Araclari (Feedback #6)

> Referans: `docs/feedback/feedback-11-3-mar.md` — Bolum 6, detayli aciklamalar

- [x] **A3.1** ~~Snapping (yapisma)~~ ✅ (29 Mart 2026) — `@geoman-io/leaflet-geoman-free` kuruldu. `GeomanControls` bileseni: point, vertex, edge snapping (snapDistance: 15px). Dosya: `components/maps/geoman-controls.tsx`
- [x] **A3.2** ~~Tracing (izleme)~~ ✅ (29 Mart 2026) — Custom implementasyon: `findNearestEdgePoint()`, `traceEdge()`, `findNearestPolygonEdge()` (turf.nearestPointOnLine + lineSlice). Dosya: `lib/gis/trace-along-feature.ts`
- [x] **A3.3** ~~Clipping (kirpma)~~ ✅ (29 Mart 2026) — `polygon-operations.ts` ile `clipPolygon()`, `polygonsOverlap()`, `getOverlapArea()` (turf.js). Geoman cut mode da aktif. Dosya: `lib/gis/polygon-operations.ts`
- [x] **A3.4** ~~Vertex management~~ ✅ (29 Mart 2026) — Geoman Free'de native: vertex ekle/sil/tasi, editMode aktif
- [x] **A3.5** ~~Poligon cizim zoom bug'ini duzelt~~ ✅ (29 Mart 2026) — Geoman'da bu bug yok (leaflet-draw spesifik sorundu). Geoman gecisiyle otomatik cozuldu

### A4. Attribute (Oznitelik) Yonetimi (Feedback #5)

- [x] **A4.1** ~~Shapefile upload sirasinda oznitelik verilerini okuma ve gosterme~~ ✅ (29 Mart 2026) — shapefile-parser zaten attribute extraction yapiyor, useSiteManagement upload'da attributes'u site'a aktariyor
- [x] **A4.2** ~~Her site sinirina oznitelik atama UI'i~~ ✅ (29 Mart 2026) — `AttributeEditor` bileseni: 12 predefined alan + shapefile'dan gelen custom alanlar. `SiteAttributeField` config. Dosyalar: `components/gis/attribute-editor.tsx`, `lib/config/site-attributes.ts`
- [x] **A4.3** ~~Target note'lari oznitelik olarak isleme~~ ✅ (29 Mart 2026) — Maps tab export butonu target notes'u shapefile'a point layer olarak dahil ediyor (NOTE_NUM, CATEGORY, LABEL, COMMENT, DATE). Dosya: `maps-tab.tsx`
- [x] **A4.4** ~~Shapefile export — attribute + target note dahil~~ ✅ (29 Mart 2026) — `shapefile-export.ts` boundary properties'e site attributes dahil ediyor. Target notes point layer builder hazir

### A5. Shapefile Export (Feedback #6)

- [x] **A5.1** ~~Eksiksiz shapefile export (.shp, .shx, .dbf, .prj)~~ ✅ (29 Mart 2026) — `shp-write` ile boundary + attributes export. Step 7 Maps tab'ina "Export Shapefile" butonu eklendi. Dosyalar: `lib/gis/shapefile-export.ts`, `types/shp-write.d.ts`, `maps-tab.tsx`
- [x] **A5.2** ~~Greg'in sagladigi shapefile ile test~~ ✅ (30 Mart 2026) — `LH_ExportSampleSiteBoundaries` (21 site, Co. Louth) basariyla yuklendi. ITM→WGS84 donusumu, MultiPolygon split, attribute okuma calisiyor

### A6. Multi-Site UX Duzeltmeleri (30 Mart 2026)

> Test sirasinda tespit edilen bug'lar ve iyilestirmeler

- [x] **A6.1** ~~Site'a tiklaninca harita o site'a ucmuyor~~ ✅ — `flyToBounds` ile animasyonlu gecis
- [x] **A6.2** ~~Boundary Info paneli titriyor (layout bounce)~~ ✅ — her zaman mount, opacity ile gizle/goster
- [x] **A6.3** ~~Sadece aktif site haritada gorunuyor~~ ✅ — `otherBoundaries` prop'u ile inaktif site'lar gri kesikli cizgi
- [x] **A6.4** ~~"unsaved" badge kafa karistirici~~ ✅ — kaldirildi, site numarasi eklendi
- [x] **A6.5** ~~Polygon cizince yeni site olusturmuyor~~ ✅ — aktif site boundary'si varsa otomatik yeni site olusur
- [x] **A6.6** ~~"Add Site" butonu gereksiz~~ ✅ — kaldirildi, "draw polygon to add" yazisi eklendi
- [x] **A6.7** ~~Button-in-button hydration hatasi~~ ✅ — outer element `div[role=button]` yapildi
- [x] **A6.8** ~~Buffer sadece aktif site'i kapsiyor~~ ✅ — `turf.union` ile tum site'larin buffer'lari birlestiriliyor
- [x] **A6.9** ~~Rectangle cizim ilk seferde bozuk~~ ✅ — `lastLoadedBoundaryRef` handleCreated'da guncelleniyor
- [x] **A6.10** ~~Shapefile upload'da bos ilk site~~ ✅ — upload oncesi `addSite()` kaldirildi, boundary'siz site'lar filtreleniyor
- [x] **A6.11** ~~Layer data (NPWS/EPA) sadece aktif site'i kapsıyor~~ ✅ — per-site fetch + dedup + `batchAsync` concurrency limiter (max 3)
- [ ] **A6.12** Multi-site layer data tam dogru calismiyor — WIP, ayrica debug gerekiyor

---

## Grup B: Habitat Veri Akisi

> **Oncelik:** 🔴 Yuksek — habitat verisi field research ve raporlamaya akar
> **Bagimlilik:** Yok (A ile paralel baslanabilir)
> **Feedback maddeleri:** #2, #3, #14.2, #14.3, #14.4

### B1. Katman Kaydetme (Feedback #2)

- [x] **B1.1** Kullanicinin sectigi harita katmanlarini kaydetme ozelligi (persist) — zaten `projects.visible_layers` ile calisiyor
- [x] **B1.2** Kaydedilen katman haritasini Desk Assessment (Step 3) gorunumune ekle — `project-map.tsx`'e `useNPWSLayers` hook eklendi, `habitat-inventory-section.tsx` uzerinden `npwsVisibleLayers` prop gecirildi
- [x] **B1.3** Kaydedilen katman haritasini Data Analysis (Step 7) gorunumune ekle — `maps-tab.tsx`'e `npwsVisibleLayers` prop eklendi

### B2. NLC Habitat Otomatik Kaydetme (Feedback #3)

> Referans: Heritage Council — _Habitat Survey Guidelines_ Appendix 6
> Dosya: `docs/link/HeritageCouncilHabitatSymbologyRecommendations (1).pdf`

- [x] **B2.1** Site siniri icindeki NLC habitat verilerini data gathering sirasinda otomatik kaydet — `habitat-data-substep.tsx`'e auto-save effect eklendi, arama tamamlaninca unsaved habitatlar otomatik kaydediliyor
- [x] **B2.2** Kaydedilen habitatlari Desk Assessment "Preliminary Habitat Inventory" bolumunde goster — auto-save ile `data_type='habitat'` findings otomatik gorunuyor, `habitat-inventory-section.tsx` zaten bu filtreyi kullaniyor
- [x] **B2.3** Site siniri disinda 100m icindeki habitatlari da goster — `calculateDistanceFromBoundary` ile mesafe hesaplaniyor, Step 3'te "Within Boundary" / "Adjacent (100m)" / "Beyond 100m" olarak 3 gruba ayrildi
- [x] **B2.4** FOSSITT koduna gore habitat poligonlarini Heritage Council standart renk kodlamasiyla goster — `fossitt-codes.json` tamamen guncellendi (G=sari, H=kahve, P=mor, E=kirmizi, B=gri, C=turuncu, M=lavanta), `HERITAGE_COUNCIL_COLORS` constant eklendi, `NLC_LEVEL1_COLORS` bu constant'tan okuyor
- [x] **B2.5** Her habitat poligonuna FOSSITT kodu + adi etiket olarak ekle — `project-map.tsx`'e `bindTooltip(permanent: true)` eklendi, `.habitat-fossitt-label` CSS stili olusturuldu

### B3. UX Bug Fix'ler (Feedback #14.2, #14.3, #14.4)

- [x] **B3.1** Scroll ile kesisen kaydetme sorununu duzelt — `findings-list.tsx`'de save buton container'ina `relative z-10` eklendi, `e.stopPropagation()` ile event bubbling engellendi
- [x] **B3.2** Habitat arama buffer'ina 100m ve "Boundary only" secenek eklendi — `habitat-data-substep.tsx` dropdown'a `0` (Boundary only) ve `0.1` (100m) sabit secenekleri eklendi
- [x] **B3.3** Habitat poligonlarina gorsel iyilestirme — fill opacity 0.2→0.35, stroke weight 0.3→1.5, dark stroke rengi `#1e293b`, highlighted'da `#000000` + 2.5 weight

---

## Grup C: Desk Research Temizlik

> **Oncelik:** 🟡 Orta — kucuk, hizli yapilabilir
> **Bagimlilik:** Yok (paralel baslanabilir)
> **Feedback maddeleri:** #1, #7

### C1. Planning Policy Kaldirma (Feedback #1)

- [ ] **C1.1** Planning policy substep'ini Data Gathering'den kaldir
- [ ] **C1.2** Statik data dosyasini (`lib/data/county-development-plans.ts`) ve component'i (`planning-policy-substep.tsx`) temizle — API endpoint yok

### C2. Desk Assessment Birlestirme + Export (Feedback #7)

- [ ] **C2.1** Baseline report ve ecological summary'i tek sayfa gorunumunde birlestir
- [ ] **C2.2** Birlestirilen sayfayi HTML, PDF ve Word formatlarinda export et
- [ ] **C2.3** Export'a tum ilgili haritalari dahil et
- [ ] **C2.4** AI analiz ciktisindan "Survey Recommendation" bolumunu kaldir

---

## Grup D: Field Research Yeniden Yapi

> **Oncelik:** 🟡 Yuksek — A ve B'nin ciktilarina bagimli
> **Bagimlilik:** A (coklu site) + B (habitat verisi) tamamlanmali
> **Feedback maddeleri:** #8, #9

### D1. Field Survey Planlama Duzenlemeleri (Feedback #8)

- [ ] **D1.1** "Survey Targets from Desk Research" bolumunu Step 4'ten kaldir
- [ ] **D1.2** Survey Schedule'dan "state the survey" secenegini kaldir
- [ ] **D1.3** Survey olusturulurken otomatik doldur: site name, releve code (REL 101+), recorder = atanan ekolog
- [ ] **D1.4** Survey Schedule'dan "Approved" statusunu kaldir
- [ ] **D1.5** Coklu site projelerinde survey'i ilgili site'a bagla — ⚠️ **A2 (coklu site destegi) tamamlanmadan yapilamaz**

### D2. Field Research Yapi Degisikligi (Feedback #9)

- [ ] **D2.1** Field Research bolumunu ardisik asamali tab yapisiyla guncelle (data gathering gibi tab bar)
- [ ] **D2.2** Habitat Mapping'i Field Survey alt kategorisi olarak yeniden yapilandir
- [ ] **D2.3** Data gathering stage 5'ten habitat verisini otomatik cek ve duzenlenebilir yap
- [ ] **D2.4** Target Notes'u Field Survey alt kategorisi olarak yeniden yapilandir

---

## Grup E: Raporlama Zinciri

> **Oncelik:** 🟡 Yuksek — sirali bagimlilik var (10 → 11 → 12 → 13)
> **Bagimlilik:** C (desk temizlik) + D (field research) tamamlanmali
> **Feedback maddeleri:** #10, #11, #12, #13

### E1. Data Analysis Tab Yeniden Yapilandir (Feedback #10)

- [ ] **E1.1** GIS Mapping ve Data Gathering tab'larini kaldir
- [ ] **E1.2** Desk Assessment tab — baseline report + tum analizler, "Add to Report" ve "Create a Summary" butonlari
- [ ] **E1.3** Field Survey tab — saha verisi + tamamlanmis survey template
- [ ] **E1.4** Habitats tab — guncellenmis habitat mapping verisi
- [ ] **E1.5** Target Notes tab — tum target note listesi
- [ ] **E1.6** Harita lejantini guncelle/iyilestir — legend zaten var (`maps-tab.tsx`: interactive checkboxlar, katman toggle, AI legend), Greg'in istegi farkli bir gosterim olabilir

### E2. AI Draft Fix + Autosave (Feedback #11)

- [ ] **E2.1** Kaydetme sirasinda rapor metninin degismesi sorununu duzelt
- [ ] **E2.2** AI metin dilini Irlanda Ingilizcesi (en-IE) olarak ayarla
- [ ] **E2.3** Autosave ozelligi ekle
- [x] **E2.4** ~~Versiyon kontrolu~~ — **MEVCUT**: `version-history-panel.tsx` ile view/compare/restore calisiyor. Greg'e gosterip onay al
- [ ] **E2.5** Appendix'e data gathering'den toplanan tum link ve kaynaklari ekle

### E3. Quality Review Yeni Akis (Feedback #12)

- [ ] **E3.1** Mevcut checkbox akisini kaldir
- [ ] **E3.2** Raporu inceleyiciye tam gorunur yap (appendix dahil)
- [ ] **E3.3** Bolum bazli not ekleme ozelligi
- [ ] **E3.4** Genel not ekleme ozelligi
- [ ] **E3.5** Inceleme imza/onay mekanizmasi ekle
- [ ] **E3.6** AI tarafindan olusturulan metni her bolumde pembe ile vurgula

### E4. Final Submission (Feedback #13)

- [ ] **E4.1** Her harita icin oznitelikli shapefile export
- [ ] **E4.2** Field survey verilerini CSV formatinda export
- [ ] **E4.3** Her survey icin AI ozet rapor olusturma

---

## Grup F: Bagimsiz

> **Oncelik:** 🟢 Dusuk — herhangi bir zamanda yapilabilir
> **Bagimlilik:** Yok
> **Feedback maddeleri:** #14.5, #15, #16

### F1. Bug Fix (Feedback #14.5)

- [ ] **F1.1** Company Reports sorununu test et ve tani — kod calisiyor (`company-reports-substep.tsx`: Dropbox hybrid search + OpenAI AI answer), sorun muhtemelen Dropbox indexing yapilanmamasi veya API key sorunu

### F2. Branding (Feedback #15)

- [ ] **F2.1** Branding kilavuzunu Greg'den al
- [ ] **F2.2** Renk paletini guncelle (CSS variables / Tailwind theme)
- [ ] **F2.3** Font'lari guncelle

### F3. Kullanici Kilavuzu (Feedback #16)

- [ ] **F3.1** Online kullanici dokumantasyonu/kilavuzu olustur
- [ ] **F3.2** Her adim icin kullanilan veri kaynaklarini dokumante et

---

## Referanslar

| Dosya                                                              | Icerik                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| `docs/feedback/feedback-11-3-mar.md`                               | Tam feedback cevirisi ve detaylar                 |
| `docs/link/HeritageCouncilHabitatSymbologyRecommendations (1).pdf` | FOSSITT habitat renk kodlamasi (Heritage Council) |
| Greg'in Google Drive'i                                             | Test shapefile + branding kilavuzu                |
