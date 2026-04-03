# Feedback 11/3 — Yapilacaklar Listesi

> **Kaynak:** Greg Birdthistle — 11 Mart 2026
> **Durum:** Devam ediyor (Faz 1 + Faz 2 + Faz 3 + E1 + E2 tamamlandi)
> **Toplam:** 72 madde, 6 grup

---

## Icindekiler

- [Grup A: GIS Altyapi](#grup-a-gis-altyapi) — Shapefile, coklu site, cizim araclari, attribute, Geoman UX (39 madde)
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
| A: GIS Altyapi    | 39     | 38         | ██████████ 97%     |
| B: Habitat Veri   | 11     | 11         | ██████████ 100% ✅ |
| C: Desk Temizlik  | 6      | 6          | ██████████ 100% ✅ |
| D: Field Research | 9      | 9          | ██████████ 100% ✅ |
| E: Raporlama      | 20     | 11         | █████░░░░░ 55%     |
| F: Bagimsiz       | 5      | 0          | ░░░░░░░░░░ 0%      |
| **Toplam**        | **80** | **75**     | █████████░ **94%** |

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

- [x] **A3.1** ~~Snapping (yapisma)~~ ✅ (31 Mart 2026) — Geoman Free `project-map-with-draw.tsx`'e entegre edildi. `snappable: true`, `snapDistance: 15px`, `snapMiddle: true`. Snap noktasinda yesil marker gosteriliyor (`pm:snap`/`pm:unsnap` event'leri). leaflet-draw tamamen kaldirildi
- [x] **A3.2** ~~Tracing (izleme)~~ ✅ (31 Mart 2026) — `trace-along-feature.ts` fonksiyonlari `pm:create` post-processing'e baglandi. Habitat mapping modunda yeni polygon cizildiginde, mevcut habitat kenarinin 50m icindeki vertex'ler otomatik hizalanir. Dosya: `project-map-with-draw.tsx`
- [x] **A3.3** ~~Clipping (kirpma)~~ ✅ (31 Mart 2026) — Geoman toolbar'da makas ikonu (`cutPolygon: true`). Ek: `polygon-operations.ts` overlap tespiti `pm:create`'e baglandi — habitat mapping'de cakisma otomatik tespit edilir ve `onOverlapDetected` callback ile bildirilir. Auto-clip icin polygon verileri callback'te mevcut
- [x] **A3.4** ~~Vertex management~~ ✅ (31 Mart 2026) — Geoman `editMode: true` ile toolbar'da kalem ikonu. Vertex ekle/sil/tasi. Ek: `dragMode: true` ile tum poligonu tasima. Edit/drag sonrasi `isEdit=true` flag'i ile mevcut site guncellenir (yeni site olusturmaz)
- [x] **A3.5** ~~Poligon cizim zoom bug'ini duzelt~~ ✅ (31 Mart 2026) — leaflet-draw tamamen kaldirildi, Geoman'da bu bug yok. CSS de temizlendi (`leaflet-draw/dist/leaflet.draw.css` kaldirildi)

### A3-EXT. Ek Cizim Iyilestirmeleri (31 Mart 2026)

> Geoman entegrasyonu sirasinda eklenen UX iyilestirmeleri

- [x] **A3.6** ~~Undo/Redo~~ ✅ — Custom history stack. Ctrl+Z geri al, Ctrl+Shift+Z ileri al. Her `pm:create`, `pm:remove`, `pm:cut`, edit-mode-exit'te snapshot kaydedilir
- [x] **A3.7** ~~Silme onay dialog'u~~ ✅ — `pm:remove`'da polygon dim edilir, "Delete polygon?" dialog gosterilir. Cancel ile geri alinir, Delete ile silinir
- [x] **A3.8** ~~Keyboard shortcuts~~ ✅ — Escape: aktif modu iptal (cizim/edit/cut/drag/delete). Map container'a `keydown` listener + `tabindex`
- [x] **A3.9** ~~Toolbar tooltips~~ ✅ — `map.pm.setLang()` ile buton aciklamalari: "Draw polygon boundary", "Edit vertices", "Move entire polygon", "Cut / clip polygon", "Delete polygon"
- [x] **A3.10** ~~Cizim sirasinda canli alan/cevre gosterimi~~ ✅ — `pm:vertexadded` event'i ile 3+ vertex sonrasi "Area: X ha | Perimeter: Y m" overlay. `lib/gis/draw-area-calculator.ts` (turf.area + turf.length). Kucuk alan m², buyuk cevre km olarak gosterilir
- [x] **A3.11** ~~Cakisma tespiti (habitat mapping)~~ ✅ — `pm:create` handler'da `polygonsOverlap()` ile mevcut habitat'larla karsilastirilir. `onOverlapDetected` callback: overlap alan (m²), habitat adi, her iki polygon verisi (auto-clip icin hazir)
- [x] **A3.12** ~~Stale closure bug fix'leri~~ ✅ — `allowMultipleDrawingsRef`, `onBoundaryChangeRef`, `onOverlapDetectedRef`, `habitatPolygonsRef` ile Geoman event handler'lardaki stale closure sorunu cozuldu
- [x] **A3.13** ~~DB'den yuklenen boundary'ler Geoman ile duzenlenebilir~~ ✅ — `LoadExistingBoundary`'de FeatureGroup'a eklenen layer'lara `pm.setOptions({ snappable: true })` uygulanir

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

- [x] **C1.1** ~~Planning policy substep'ini Data Gathering'den kaldir~~ ✅ (30 Mart 2026) — WIZARD_STEPS, WizardStep type, render blogu, import kaldirildi
- [x] **C1.2** ~~Statik data dosyasini (`lib/data/county-development-plans.ts`) ve component'i (`planning-policy-substep.tsx`) temizle~~ ✅ (30 Mart 2026) — her iki dosya + `.claude/rules/step2-planning-policy.md` silindi

### C2. Desk Assessment Birlestirme + Export (Feedback #7)

- [x] **C2.1** ~~Baseline report ve ecological summary'i tek sayfa gorunumunde birlestir~~ ✅ (30 Mart 2026) — 3 tab → 2 tab ("Desk Assessment" birlestik + "Deep Research"). AI Summary + Data Summary + Baseline Report bolumleri tek scrollable view'da
- [x] **C2.2** ~~Birlestirilen sayfayi HTML, PDF ve Word formatlarinda export et~~ ✅ (30 Mart 2026) — Header'a Export dropdown eklendi (HTML/PDF/Word). `desk-assessment-exporter.ts` yeni dosya: PDF (jsPDF) + DOCX (docx). `baseline-report-exporter.ts` AI insights destegi eklendi
- [x] **C2.3** ~~Export'a tum ilgili haritalari dahil et~~ ✅ (30 Mart 2026) — HTML zaten destekliyordu. PDF'e `jsPDF.addImage()`, DOCX'e `ImageRun` ile harita screenshot'lari eklendi
- [x] **C2.4** ~~AI analiz ciktisindan "Survey Recommendation" bolumunu kaldir~~ ✅ (30 Mart 2026) — Survey Recommendations + Optimal Survey Timing kartlari silindi, kullanilmayan import'lar (Calendar, Lightbulb, CardHeader, CardTitle) temizlendi

---

## Grup D: Field Research Yeniden Yapi

> **Oncelik:** 🟡 Yuksek — A ve B'nin ciktilarina bagimli
> **Bagimlilik:** A (coklu site) + B (habitat verisi) tamamlanmali
> **Feedback maddeleri:** #8, #9

### D1. Field Survey Planlama Duzenlemeleri (Feedback #8)

- [x] **D1.1** ~~"Survey Targets from Desk Research" bolumunu Step 4'ten kaldir~~ ✅ (30 Mart 2026) — Collapsible kart, showFindings state, useSavedFindings hook, surveyRecommendations memo, getRawData callback ve kullanilmayan importlar (Bug, Waves, Shield, Target, ChevronDown, ChevronUp, AlertCircle, Collapsible) kaldirildi
- [x] **D1.2** ~~Survey Schedule'dan "start the survey" secenegini kaldir~~ ✅ (30 Mart 2026) — `planned` status tamamen kaldirildi (type, UI, DB migration). Yeni survey'ler direkt `in_progress` olarak basliyor. DB migration D1.4 ile birlestirildi: `20260330_simplify_survey_status.sql`. ⚠️ **Mobile:** `planned` status'u kullanan sorgular/UI bozulacak
- [x] **D1.3** ~~Survey olusturulurken otomatik doldur: site name, releve code (REL 101+), recorder = atanan ekolog~~ ✅ (30 Mart 2026) — `survey-form.tsx`: surveyor default olarak current user. `releve-survey-form.tsx`: site_name=projectName, releve_code=REL 101+ (mevcut kayit sayisina gore), recorder=current user full_name
- [x] **D1.4** ~~Survey Schedule'dan "Approved" statusunu kaldir~~ ✅ (30 Mart 2026) — `approved` status tamamen kaldirildi. Survey akisi artik: `in_progress → completed`. DB migration D1.2 ile birlestirildi: `20260330_simplify_survey_status.sql`. ⚠️ **Mobile:** `approved` status kullanan sorgular/UI bozulacak
- [x] **D1.5** ~~Coklu site projelerinde survey'i ilgili site'a bagla~~ ✅ (30 Mart 2026) — SiteSelector'dan secilen site `site_id` olarak survey'e kaydediliyor. Survey listesi secili site'a gore filtreleniyor. DB'de `surveys.site_id` zaten mevcuttu, sadece UI baglandi. **Bug fix'ler:** (1) `groupSurveysByVisit` filtrelenmis survey'lerle calisiyor — baska site'a ait bos grup basliklari artik gorunmuyor. (2) Multi-site projede "All Sites" modundayken survey olusturma engellendi — `site_id = null` orphan survey sorunu cozuldu. (3) SiteSelector sag uste tasinip Badge'in ustune yerlestirildi. ⚠️ **Mobile:** `site_id` filtreleme mantigi mobile'da da uygulanmali

### D2. Field Research Yapi Degisikligi (Feedback #9)

- [x] **D2.1** ~~Field Research bolumunu tab yapisiyla guncelle~~ ✅ (30 Mart 2026) — Step 4+5+6 tek step'e birlestirildi (Step 4: Field Research). 10 step → 8 step. `FieldResearchStep` wrapper bileseni 3 tab: Field Survey, Habitat Mapping, Target Notes. Tum step numaralari guncellendi (7→5, 8→6, 9→7, 10→8). DB migration: step 5+6 silinir, 7-10 → 5-8 kaydirılır. Etkilenen dosyalar: `workflow.ts`, `workflow queries`, `page.tsx`, `sidebar.tsx`, `seed-data.ts`, `index.ts`, tum step heading'leri ve hata mesajlari. ⚠️ **Mobile:** Workflow step numaralari tamamen degisti (10→8 step). Mobile'da `step_number` referanslari, sidebar, completion mantigi guncellenmeli
- [x] **D2.2** ~~Habitat Mapping'i Field Survey alt kategorisi olarak yeniden yapilandir~~ ✅ (30 Mart 2026) — Header, Badge, "Complete Step" butonu, `handleComplete`, `completeStep` hook, `onComplete` prop kaldirildi. Wrapper tek "Complete Step" yonetiyor
- [x] **D2.3** ~~Data gathering stage 5'ten habitat verisini otomatik cek ve duzenlenebilir yap~~ ✅ (31 Mart 2026) — Habitat Mapping tab acildiginda `desk_research_findings` (data_type='habitat') otomatik olarak `habitat_polygons` tablosuna aktariliyor. NLC polygon geometrisi dahil (GeometryCollection → Polygon donusumu), default condition='moderate', site_id korunuyor. Ekolog her habitati duzenleyebilir (FOSSITT kodu, condition, boundary, notlar). ⚠️ **Tespit edilen A grubu bug'lari:** (1) `useProjectBoundary` fallback'i "All Sites" modunda `effectiveSiteId`'yi Site 1'e atiyordu → `data-gathering-step.tsx`'de `siteId={selectedSite?.id ?? null}` olarak duzeltildi. (2) `getSavedFinding` site_id'ye bakmiyordu → ayni NLC ID farkli site'larda "zaten kaydedilmis" saniliyordu → site-scoped hale getirildi. Dosyalar: `habitat-mapping-step.tsx`, `data-gathering-step.tsx`, `habitat-data-substep.tsx`
- [x] **D2.4** ~~Target Notes'u Field Survey alt kategorisi olarak yeniden yapilandir~~ ✅ (30 Mart 2026) — D2.2 ile ayni: Header, Badge, "Complete Step" kaldirildi, wrapper yonetiyor

---

## Grup E: Raporlama Zinciri

> **Oncelik:** 🟡 Yuksek — sirali bagimlilik var (10 → 11 → 12 → 13)
> **Bagimlilik:** C (desk temizlik) + D (field research) tamamlanmali
> **Feedback maddeleri:** #10, #11, #12, #13

### E1. Data Analysis Tab Yeniden Yapilandir (Feedback #10)

- [x] **E1.1** ~~GIS Mapping ve Data Gathering tab'larini kaldir~~ ✅ (31 Mart 2026) — 8 tab → 6 tab. GIS + Data Gathering icerigi yeni Desk Assessment combined tab'a absorbe edildi. Dosyalar: `gis-summary-tab.tsx`, `data-gathering-tab.tsx`, `desk-assessment-tab.tsx` silindi. Yeni: `desk-assessment-combined-tab.tsx`, `desk-assessment-findings-section.tsx`, `desk-assessment-analysis-section.tsx`
- [x] **E1.2** ~~Desk Assessment tab — baseline report + tum analizler, "Add to Report" ve "Create a Summary" butonlari~~ ✅ (31 Mart 2026) — Combined tab: collapsible project context + source stats + findings table (Switch toggle = "Add to Report") + BaselineReportTab (Step 3 sub-components reuse) + AI insights. "Create a Summary" butonu AI ozet olusturuyor (`/api/ai/data-analysis-summary`), metadata'ya kaydediyor. Dosyalar: `desk-assessment-combined-tab.tsx`, `create-summary-button.tsx`, `app/api/ai/data-analysis-summary/route.ts`
- [x] **E1.3** ~~Field Survey tab — saha verisi + tamamlanmis survey template~~ ✅ (31 Mart 2026) — siteId filtresi + "Create a Summary" butonu eklendi
- [x] **E1.4** ~~Habitats tab — guncellenmis habitat mapping verisi~~ ✅ (31 Mart 2026) — siteId filtresi + "Create a Summary" butonu eklendi
- [x] **E1.5** ~~Target Notes tab — tum target note listesi~~ ✅ (31 Mart 2026) — siteId filtresi + "Create a Summary" butonu eklendi
- [x] **E1.6** ~~Harita lejantini guncelle/iyilestir~~ ✅ (31 Mart 2026) — Legend zaten mevcut (interactive checkboxlar, katman toggle, AI legend), siteId filtresi eklendi. Maps tab verileri artik secili site'a gore filtreleniyor

### E2. AI Draft Fix + Autosave (Feedback #11)

- [x] **E2.1** ~~Kaydetme sirasinda rapor metninin degismesi sorununu duzelt~~ ✅ (3 Nisan 2026) — Kok neden: `tiptap-markdown` extension'i `getMarkdown()` ile serialize ederken markdown'i normalize ediyordu (bosluklar, satir araları, liste biçimleri degisiyor). Cozum: icerik artik ProseMirror document JSON olarak saklanıyor (`editor.getJSON()` / `JSON.stringify`). JSON round-trip kayipsiz — bosluklar, bos paragraflar, format birebir korunuyor. Eski markdown raporlar geriye uyumlu: ilk yuklemede tiptap-markdown parse eder, ilk duzenleme veya save'de otomatik JSON'a donusur. Dosya: `section-editor.tsx`
- [x] **E2.2** ~~AI metin dilini Irlanda Ingilizcesi (en-IE) olarak ayarla~~ ✅ (3 Nisan 2026) — Iki katmanli cozum: (1) System prompt guclendirildi — 25+ ornek kelime ile detayli Irish English talimati eklendi (`route.ts`). (2) Post-processing sozlugu — `lib/ai/irish-english.ts` dosyasinda `toIrishEnglish()` fonksiyonu, 170+ American→Irish/British donusum kurali (ize→ise, or→our, er→re, ense→ence, og→ogue, double-L, bilimsel terimler). AI ciktisi dondukten sonra otomatik uygulanir, ~1ms ek sure. Buyuk/kucuk harf korunur
- [x] **E2.3** ~~Autosave ozelligi ekle~~ ✅ (3 Nisan 2026) — `hooks/use-autosave.ts` hook'u: son duzenlemenin 30sn sonrasinda otomatik DB'ye kaydeder (Google Docs ile ayni yaklasim). Durumlar: idle → unsaved → saving → saved/error. Top bar'da status gostergesi (Cloud ikonu + "Saved at HH:MM" / "Unsaved changes" / "Saving..."). `beforeunload` ile sayfa kapatirken kaydedilmemis degisiklik uyarisi. Manuel Save butonu hala aktif (`autosave.saveNow()` ile entegre). Not: Elektrik kesilmesi gibi edge case'ler icin localStorage recovery eklenebilir (su an kapsam disi). Dosyalar: `use-autosave.ts`, `ai-draft-step.tsx`, `ai-draft-tab.tsx`, `document-top-bar.tsx`
- [x] **E2.4** ~~Versiyon kontrolu~~ — **MEVCUT**: `version-history-panel.tsx` ile view/compare/restore calisiyor. Greg'e gosterip onay al
- [x] **E2.5** ~~Appendix'e data gathering'den toplanan tum link ve kaynaklari ekle~~ ✅ (3 Nisan 2026) — `buildReportContext` fonksiyonuna "DATA SOURCES AND REFERENCES" bolumu eklendi. `desk_research_findings.source` enum'undan (NPWS, GBIF, NBDC, EPA, Catchments, FPO) + deep research + aquatic research'ten kaynak URL'leri ve detaylar (site kodlari, su kutleleri) otomatik toplanir. NLC 2018 ve standart referanslar (Fossitt 2000, CIEEM 2018, Smith et al. 2011) her zaman dahil. Tum rapor tiplerinin (PEA, EcIA, AA, Bat, Bird, Habitat) appendix prompt'lari guncellendi — "Part 2: Data Sources and References" talimati eklendi. Dosyalar: `route.ts`, `report-section-prompts.ts`

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
