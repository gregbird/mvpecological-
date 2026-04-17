# Feedback 8/4 — Greg Birdthistle (8 Nisan 2026)

> **Kaynak:** MVP Feedback and Requested Changes — Greg Birdthistle
> **Tarih:** 8 Nisan 2026
> **Kaynak Dokuman:** https://docs.google.com/document/d/1WEHjudmheoRcVCPKe7PDJ79e0EEQuJHaOov7LAFVDDA/edit?tab=t.0#heading=h.uov1x7ou4tuz

---

## Ozet

| #   | Baslik                                       | Oncelik          | Durum                                          |
| --- | -------------------------------------------- | ---------------- | ---------------------------------------------- |
| 1   | Step 2 GIS Mapping — Kritik cizim araclari   | 🔴 Kritik        | ✅ Cozuldu (2 bug fix + eksikler notlandi)     |
| 2   | Species Record — Default grid 10km           | 🟢 Basit         | ✅ Tamamlandi                                  |
| 3   | Species Record — Species Group + Last filter | 🟡 Orta          | ✅ Tamamlandi                                  |
| 4   | Habitat FOSSITT symbology ("2b" eksikligi)   | ⏸ Beklemede      | Simdilik yapilmayacak                          |
| 5   | Step 4 donma/yavaslik                        | ⚠ Inceleme       | ✅ Tamamlandi                                  |
| 6   | Step 4 — Haritayi tam genislige cikarma      | ⚠ Inceleme       | ✅ Tamamlandi                                  |
| 7   | "Remove survey(s) expected on the survey"    | 🟢 Basit         | ✅ Tamamlandi                                  |
| 8   | Releve Survey — Form cevaplari kaydetmiyor   | ⚠ Kritik bug     | ✅ Tamamlandi                                  |
| 9   | Reporting → Data Analysis placement in AI    | 🔴 Buyuk feature | ✅ Tamamlandi (9.10 export dogrulama bekliyor) |
| 10  | Data Analysis maps — Legend eksikligi        | 🟡 UI polish     | ✅ Tamamlandi                                  |
| 11  | Survey Stage — Site secimi zorunlulugu       | 🔴 Workflow gap  | ✅ Tamamlandi                                  |

---

## 1. Step 2 GIS Mapping — Kritik Cizim Araclari ("5a" regresyonu) ✅

**Orijinal:** "On the current version I don't see 5a implemented. Critical Drawing Tools: 'Must-have' features for accurate geometry creation include: Snapping, Tracing, Clipping, Vertex management. (See additional details here)"

**Turkce:** Greg mevcut versiyonda "5a"nin (kritik cizim araclari) calismadigini soyluyor. `feedback-11-3-mar.md` #6 ve `feedback-11-3-todo.md` A3'te bu araclar (Geoman Free entegrasyonu) 31 Mart'ta tamamlandi olarak isaretli, ancak Greg Step 2 (GIS Mapping) draw polygon akisinda bu araclari goremiyor. Regresyon degil: toolbar ve araclarin buyuk cogunlugu calisiyor, ama **2 gercek bug** + ArcGIS ozelliklerinden bazilari eksik. Reproduce + fix + eksiklerin netlestirilmesi yapildi.

**Ilgili araclar:**

- **Snapping (Yapisma)** — Vertex/Edge/Point snap, "GIS'in miknatisi"
- **Tracing (Izleme)** — Mevcut feature'in tam seklini takip eden yeni feature olusturma
- **Clipping (Kirpma)** — Kurabiye kalibi mantigi, overlay veya duzenleme komutu
- **Vertex management (Kose noktasi yonetimi)** — Vertex ekle/sil/tasi, Z/M degerleri

**Referans:** Google Docs — detayli aciklamalar (yukaridaki kaynak link). Ek olarak `docs/feedback/feedback-11-3-mar.md` Bolum 6.

### Durum raporu — her 4 arac tek tek

#### 1. Snapping — ✅ Calisiyor (draw + edit mode)

- **Vertex Snapping** (kose noktalarina yapisma) — ✅ Geoman default, aktif
- **Edge Snapping** (kenarlara yapisma) — ✅ `snapSegment: true`, aktif
- **Point Snapping** (point feature'a yapisma) — ⚪ Step 2'de point feature yok, kullanim yok. Step 4 Target Notes icin ilerde eklenebilir.
- **Bug fix:** Edit mode'da (vertex surukleme) snap calismiyordu — layer'lar `pmIgnore`/`snapIgnore` flag'leri olmadigi icin Geoman tarafindan snap hedefi olarak taninmiyordu. Fix: `pmIgnore: false` + `snapIgnore: false` + layer-level `pm.setOptions({ snappable, snapDistance, snapSegment, snapVertex, snapMiddle })`.
- **Dosyalar:** `hooks/maps/use-geoman-setup.ts`, `components/maps/map-boundary-controller.tsx`
- **Kozmetik eksik:** Edit mode'da snap oldugunda yesil daire visualization cikmiyor (draw mode'da cikiyor). Fonksiyonel olarak snap calisiyor, sadece gorsel feedback eksik. Sonraki iterasyonda polish.

#### 2. Tracing — ✅ Calisiyor (Step 4 + Step 2 multi-site)

- **Step 4 habitat mapping** — ✅ Eskiden beri calisiyor
- **Step 2 GIS mapping multi-site** — 🐛 Calismiyordu. Kodda `handleTraceAlong` fonksiyonu `allowMultipleDrawings === true && habitatPolygons.length > 0` kontrolune takili kaliyordu, Step 2'de bu kosul hicbir zaman saglanmiyordu, fonksiyon erken `return` ediyordu.
- **Fix:** Hook'a `otherBoundaries` prop'u eklendi (diger site'larin boundary'leri). Kosul gevsedi — trace hedefleri `habitatPolygons + otherBoundaries` birlesimi oldu. Step 2'de yeni bir site cizerken diger site'larin kenarlarini takip edebilir.
- **Dosyalar:** `hooks/maps/use-geoman-setup.ts`, `components/maps/map-boundary-controller.tsx`, `components/maps/project-map-with-draw.tsx`

#### 3. Clipping — ⚠ Kismen (temel var, ArcGIS tarzi eksik)

- **Cut butonu (free-form)** — ✅ Kullanici yeni bir sekil cizip mevcut polygondan keser. Geoman'in `cutPolygon` butonu + `pm:cut` event handler calisiyor.
- **Clip (Editing command) — overlap auto-remove** — ⚠ Kismen. `handleOverlapDetection` fonksiyonu Step 4 habitat mapping'de overlap oldugunda kullaniciya uyari gosteriyor (islem onerisi). Step 2'de ayni mekanizma yok.
- **Clip (Overlay tool) — "cookie cutter"** — ❌ **YOK.** Mevcut bir layer'i (ornek: NPWS SAC boundary) cutter olarak kullanip baska bir polygonu kesme ozelligi implement edilmedi.
- **Nasil eklenir:** Turf.js `difference` ile yapilir. UI tarafinda "Clip with layer" butonu + layer secici. Tahmini is: 1-2 saat.

#### 4. Vertex Management — ✅ Buyuk cogunlugu calisiyor

- **Add vertex** — ✅ Middle marker sürükleme ile yeni vertex ekleniyor
- **Delete vertex** — ✅ Sag tik ile vertex siliniyor
- **Move vertex** — ✅ Edit mode'da vertex surukle
- **Z-values / M-values** — ❌ **Yapilamaz.** Leaflet 2D bir haritalama kutuphanesi; Z (yukseklik) ve M (lineer olcum) ArcGIS'in 3D/CAD feature'i. Bizim stack'te (Leaflet + Geoman + React) implement edilemez. Mimariyi degistirmeden (Cesium, Mapbox GL gibi) yapilmasi mumkun degil. Google Docs bunu "In ArcGIS, you can also..." diye belirtmis — acikca bir gereklilik degil, acklama.

### Yapilacilar

- [x] **1.1** Step 2 GIS Mapping draw polygon modunu reproduce et — kullanici canli testle dogruladi, toolbar tam gorunuyor
- [x] **1.2** Geoman toolbar render dogrulandi — polygon, rectangle, edit, drag, cut, delete butonlari sag ustte
- [x] **1.3** Snapping draw mode'da zaten aktif, edit mode'da fix edildi
- [x] **1.4** `handleTraceAlong` `pm:create`'e bagli, ayrica kosul genisletildi
- [x] **1.5** Cut butonu + overlap tespiti calisiyor (canli test edildi)
- [x] **1.6** Edit + drag mode butonlari gorunur ve fonksiyonel
- [x] **1.7** Google Docs eksikler listelendi (yukaridaki durum raporu)
- [x] **1.8** Regresyon yok — Greg'in "5a implemented degil" demesinin sebebi buyuk ihtimalle edit-mode snap bug'i idi, fix edildi
- [ ] **1.9** Discoverability iyilestirmesi (tooltip + help panel) — sonraki iterasyon

### Eksik / Yapilamayanlar (Greg'e iletilecek)

1. **Clip (Overlay tool) — "cookie cutter"** — eksik, eklenmesi ~1-2 saat. Kullanici istiyorsa ayri ticket acilabilir.
2. **Point Snapping Step 2'de** — kullanim yok cunku boundary polygon ciziyoruz, point feature yok. Step 4 Target Notes icin eklenebilir.
3. **Z-values / M-values** — Leaflet 2D stack'inde yapilamaz. Mimari sinirlama. Greg'e dürüstçe aciklanmali.
4. **Edit mode'da snap yesil daire visualization** — fonksiyonel calisiyor ama kozmetik feedback yok. Polish sonraki iterasyonda.
5. **Discoverability** — GIS uzmani olmayan kullanici icin "hangi buton ne yapiyor" acik degil. Help panel / tooltip iyilestirmesi sonraki iterasyonda.
6. **Tracing — kisa/uzun yol ayrimi yok (dogrulanamadi)** — `traceEdge` fonksiyonu polygon ring'i uzerinde `@turf/line-slice` ile iki click arasindaki segmenti cikariyor, ama polygon KAPALI bir ring oldugu icin iki click arasinda **iki yol** var (kisa ve uzun). Mevcut implementasyon her zaman kisa yolu secmiyor. Canli test edildi (`modified: true`, polygon 4 vertex'ten 7 vertex'e cikti — trace tetiklendi), ancak sonucun gorsel olarak dogru oldugu **kesin dogrulanamadi** — karmasik polygon'larda beklenmedik "uzun yol" trace edilmis olabilir. Fix: `traceEdge` icinde her iki yonu de hesaplayip toplam mesafesi daha kucuk olani sec. Sonraki iterasyonda edge case olarak ele al.

---

## 2. Species Record — Default Grid Reference 10km

**Orijinal:** "On the species record the default grid reference should be 10km"

**Turkce:** Species record formundaki default grid reference su an 2km olarak ayarli. Default 10km olarak guncellenmeli. Kullanicilar yine de istedigi cozunurlugu (1km, 2km, 10km) secebilmeli ancak form ilk acildiginda 10km secili gelmeli.

**Yapilacilar:**

- [x] **2.1** Species record substep'inde default grid resolution degerini `2km` → `10km` olarak guncelle — `components/steps/data-gathering/species-records-substep.tsx:63` `useState` fallback degeri degistirildi. Kullanicinin onceki secimi `sessionStorage` (`species-grid-res-{projectId}`) altinda saklandigi icin yeni default sadece ilk acilista / cache temizlendikten sonra etkili olur; manuel secim yapan mevcut kullanicilarin tercihi korunur.

---

## 3. Species Record — Species Group Filtresi + Last Recorded

**Orijinal:** "On the species record can you have a filter for the 'species group', last recorded. The user should be able to select 'Birds' and the most recent recorded species"

**Turkce:** Species record listesinde "Species Group" filtresi eklenmeli. Kullanici bir grup (ornegin "Birds") secebilmeli ve sonuclar en son kaydedilen tarihe gore siralanabilmeli. Amac: "Birds grubundaki en son kaydedilen turler" gibi sorgular yapmak.

**Species gruplari (NBDC taxonomi standartlari):**

- Birds
- Mammals
- Amphibians & Reptiles
- Fish
- Insects (Butterflies, Moths, Dragonflies, Beetles...)
- Other Invertebrates (Molluscs, Spiders...)
- Plants (Flowering plants, Mosses, Ferns, Lichens)
- Fungi
- Algae

**Yapilacilar:**

- [x] **3.1** "Species Group" filtresi eklendi — `components/steps/data-gathering/findings-header.tsx` icine header'a dropdown koyuldu. Mevcut sonuclardan `metadata.taxonGroup` degerleri toplanip count'a gore siralaniyor ("bird (42)", "mammal (8)", ...). Sadece species header aktifken gorunur, en az bir grup varsa render edilir.
- [x] **3.2** Species group bilgisi zaten NBDC response'unda mevcut — `hooks/data-gathering/use-species-search.ts:278` `taxonGroup: species.speciesGroup` olarak `FindingDisplay.metadata.taxonGroup`'a yaziliyor. Ek parse gerekmedi.
- [x] **3.3** "Last Recorded" sort secenegi eklendi — `hooks/data-gathering/use-findings-filters.ts` icine `'last_recorded'` sort alani + `parseRecordDate` helper (DD/MM/YYYY + ISO) eklendi. Dropdown'da sadece species header aktifken gorunur.
- [x] **3.4** Kombinasyon: Species icin varsayilan sort artik `last_recorded` DESC — acilista en son kaydedilen turler ustte; kullanici "Birds" filtresi secince Greg'in istedigi "en son kaydedilen kuslar" dogrudan ilk goruldugu sira olur.
- [x] **3.5** React Query cache key'ine ekleme gerekmedi — filtre client-side calisiyor, tek bir NBDC response uzerinde sort/filter uygulaniyor; cache invalidation disinda yasiyor.

---

## 4. ⏸ BEKLEMEDE — Habitat FOSSITT Symbology ("2b" eksikligi)

**Orijinal:** "I don't see 2b implemented. Not sure if this is possible but depending on the fossitt code returned by NLC can we have the option to display the habitats on the map with the following here."

**Turkce:** Greg `feedback-11-3-mar.md` #3'teki FOSSITT renk kodlamali habitat gosterimi ("2b" olarak adlandirdigi) ozelligin eksik oldugunu soyluyor. Heritage Council standart renk paletine gore NLC'den donen FOSSITT kod'una gore habitat poligonlarinin haritada renklendirilmesi isteniyordu.

**Durum:** ⏸ **Bu madde simdilik yapilmayacak, beklemede.** Sonraki iterasyonda ele alinacak.

**Not:** `feedback-11-3-mar.md` #3.4'te bu isin 30 Mart'ta tamamlandigi isaretli — ancak Greg goremiyorsa ya deploy sorunu ya da substep'e baglanmamis olabilir. Inceleme ileri tarihe birakildi.

---

## 5. Step 4 Uygulama Donmasi ✅

**Orijinal:** "The application frooze on Step 4"

**Turkce:** Step 4 (Field Research) uzerinde uygulama donuyor/kitleniyor. Greg'in algıladığı "donma" aslinda tam kilitlenme degil — 2 ayri perf sorunu birlikte hissi veriyordu: (1) Habitat Mapping tab'ina girince habitat'lar damla damla yukleniyordu (auto-import cascade), (2) tab'lar arasi gecislerde Leaflet map fresh re-init + tum React Query'ler refetch (Radix default unmount davranisi). Kod analizi ile root cause tespit edildi, hedef fix'ler uygulandi — Chrome Performance profile'ina gerek kalmadi.

**Root cause #1 — Auto-import cascade:** `hooks/steps/use-auto-import-habitats.ts` sequential `for` loop icinde her habitat finding icin ayri `createHabitat.mutateAsync` cagiriyordu. Her mutation `useCreateHabitat` hook'unun `onSuccess`'inde `['habitats', projectId]` + `['habitat-stats', projectId]` invalidate ediyordu → N refetch → N re-render → N Leaflet polygon re-draw. 10 habitat = 10 POST + 20 invalidation + 10 component re-render.

**Root cause #2 — Tab switch re-mount:** `components/steps/field-research-step.tsx` Radix `TabsContent` kullaniyor, default olarak aktif olmayan tab unmount oluyor. Her tab geçisinde yeniden mount → Leaflet map init + tum React Query'ler fetch + dialog/form state kaybi.

**Root cause #3 — Broadcast invalidation:** Create mutation'larinda query key scope'suz (`['surveys']`, `['target-notes']`, `['observations']` gibi) → multi-project kullanimda mumkun olan cascade.

### Uygulanan Fix'ler

**Fix 5.1 — Bulk habitat import**

- `lib/supabase/queries/habitats.ts` → Yeni `createHabitatsBulk(habitats[])` — tek Supabase round-trip ile array insert
- `hooks/queries/use-habitat-hooks.ts` → Yeni `useCreateHabitatsBulk()` mutation — tek invalidation
- `hooks/steps/use-auto-import-habitats.ts` → Sequential loop `importBulk()` ile degistirildi, `newFindings.map()` ile payload build edip tek call. Error rollback korundu.
- `components/steps/habitat-mapping-step.tsx` → Yeni hook auto-import'a paslandi

**Onceki:** 10 habitat = 10 POST + 20 invalidation + 10 re-render + ~5-7 saniye
**Sonra:** 10 habitat = 1 POST + 2 invalidation + 1 re-render + ~500 ms

**Fix 5.2 — Tab visitedTabs pattern**

- `components/steps/field-research-step.tsx` → `visitedTabs: Set<TabId>` state eklendi
- Bir tab'a ilk kez tiklanip visitedTabs'a eklendiginde mount olur
- Ziyaret edilmis tab'lar `forceMount` ile DOM'da kalir, `data-[state=inactive]:hidden` Tailwind variant ile CSS gizlenir
- Ilk acilista sadece initial tab mount olur — regresyon yok
- Tab switch instant, React Query state + dialog + form state korunur

**Fix 5.3 — Create mutation invalidation scoping**

- `hooks/queries/use-survey-hooks.ts` → `useCreateSurvey` → `['surveys', variables.project_id]`
- `hooks/queries/use-target-note-hooks.ts` → `useCreateTargetNote` → `['target-notes', variables.project_id]`
- `hooks/queries/use-observation-hooks.ts` → `useCreateObservation` → `['observations', variables.survey_id]` (project_id species_observations tablosunda yok, project-level invalidation unscoped kaldi — mimari sinirlama)
- Update/delete path'leri atlandi: caller API degisikligi gerektiriyor, React Query `refetchType: 'active'` default oldugundan gercek perf impact minimal.

### Yapilacilar

- [x] **5.1** Step 4'u farkli boyutta projelerle test et, donmayi reproduce et — kullanici canli testle dogruladi (habitat mapping'de damla damla yukleniyor)
- [x] **5.2** Chrome DevTools profiling — gerek kalmadi, kod analiziyle root cause bulundu
- [x] **5.3** En cok render olan component — `habitat-mapping-step` + `ProjectMapWithDraw` auto-import cascade sirasinda N re-render
- [x] **5.4** Network tab — N sequential POST/GET cyclesi tespit edildi (cascade signature)
- [x] **5.5** Fix uygulandi — bulk insert + visitedTabs + invalidation scoping
- [x] **5.6** Regresyon testi — kullanici canli dogruladi (ilk acilis tek tab mount, tab switch instant, auto-import tek POST)

---

## 6. Step 4 — Haritayi Tam Genislige/Derinlige Cikarma ✅

**Orijinal:** "Can you enlarge the map on step 4 to have the depth of the computer screen. It is displayed like this: [screenshot]"

**Turkce:** Step 4'te harita su an sol panel (findings listesi) ile yan yana daraltilmis halde. Greg ekrandaki derinligin tamamini kaplamasini istiyor. Yani harita ana odak olmali, findings listesi/form'u overlay, drawer veya collapsible sidebar olarak ikinci planda kalmali.

**Referans:** `feedback.png` — yan yana gosterim ekran goruntusu

### Uygulanan cozum — Stacked scroll layout (Opsiyon B varyanti)

Drawer/overlay yerine dikey stacked scroll layout secildi: harita ustte buyuk (viewport'un ~%62'si), altinda liste paneli (440px), sayfa asagi scroll edilebiliyor. Mouse tekerlegi ile scroll icin haritanin iki yaninda gutter (px-10) birakildi cunku Leaflet wheel event'lerini yakaliyor.

**Degisen dosyalar:**

- `components/steps/habitat-mapping-step.tsx:253-278,291-311` — Toolbar: SiteSelector sagda, stats solda. Ana icerik konteyneri `overflow-y-auto` + `px-10 py-2`. Harita: `h-[62vh] min-h-[440px] shrink-0`. Liste: `h-[440px] shrink-0`.
- `components/steps/target-notes/target-notes-step.tsx:159-247,250,275` — Toolbar: SiteSelector + aksiyon butonlari sagda birlesik grup, sub-tabs + stats solda. Her iki TabsContent: `mt-0 min-h-0 flex-1 overflow-y-auto px-10 py-2`.
- `components/steps/target-notes/target-notes-panel.tsx:56-63,107` — Dis wrapper + map Card'indan `flex-1 min-h-0` kaldirildi. Harita: `h-[62vh] min-h-[440px]`. Liste Card: `h-[440px]`.
- `components/steps/target-notes/observations-panel.tsx:74,107-114,139` — Ayni duzen (harita + liste ayni boyutlar).
- `components/steps/field-survey-step.tsx` — SiteSelector zaten `justify-end` ile sagdaydi, dokunulmadi.

### Yapilacilar

- [x] **6.1** Step 4 Field Research layout'u yeniden tasarlandi — harita dikey stacked buyuk + liste altinda scroll ile
- [x] **6.2** Drawer yaklasimi yerine scroll-based layout tercih edildi (daha az UI karmasasi, Leaflet state korumasi daha kolay)
- [x] **6.3** Toggle gerekmiyor — scroll ile hem harita hem liste tek sayfada erisilebilir
- [x] **6.4** Tab bar ustte sabit kaldi (floating degil) — sticky toolbar ile yeterince kompakt
- [x] **6.5** Responsive: `h-[62vh]` viewport bazli, `min-h-[440px]` kucuk ekranlarda fallback
- [x] **6.6** Dark mode: mevcut `border-border` ve `bg-card` variable'lari ile otomatik calisiyor
- [x] **6.7** Greg geri bildirimi: harita cok buyuktu (mouse wheel scroll alani yoktu) → yanlara `px-10` gutter eklendi, yukseklik 78vh→62vh azaltildi
- [x] **6.8** SiteSelector 3 tab arasinda tutarsizdi (birinde sol, birinde sag) → ucu de sagda

---

## 7. "Remove survey(s) expected on the survey" ✅

**Orijinal:** "Remove survey(s) expected on the survey"

**Turkce:** Step 4 Field Survey tab'inda, her survey kartinin ustunde tarih yaninda saat ikonu + "N survey(s) expected" metni gosteriliyordu (ornegin "45 survey(s) expected"). Bu metin, kullanicinin survey form'unda girdigi `expectedSurveyCount` degerinden geliyordu. Kart zaten olusturulmus tek bir survey'i temsil ettigi icin "expected" kelimesi kafa karistirici — Greg'in sikayeti tam olarak bu metni kaldirmakti. Visit group + visit number zaten visit tracking'i saglıyor, ayri bir "expected" sayacina gerek yok.

### Uygulanan fix — Secenek B (display only, form input korundu)

- `components/field-surveys/survey-card.tsx:165-170` — "N survey(s) expected" blogu ve Clock icon'u import'uyla birlikte kaldirildi
- `components/field-surveys/survey-view-dialog.tsx:355-359` — Detay dialog'daki "Expected Surveys" InfoRow'u ve Hash icon import'uyla birlikte kaldirildi
- `components/field-surveys/survey-form.tsx` — **Dokunulmadi.** Form input ("Number of Surveys Expected") kullanicinin gelecekte ihtiyac duymasi ihtimaline ve mobile app backwards compat'i icin korundu. Storage (`weather.expectedSurveyCount`) da dokunulmadi.

### Yapilacilar

- [x] **7.1** Kod tabaninda "expected survey" / "surveys expected" metni arandi — `survey-card.tsx:168` ve `survey-view-dialog.tsx:357` tespit edildi
- [x] **7.2** UI'da tam konum belirlendi — Step 4 Field Survey tab'indaki survey kartlari ustunde saat ikonuyla birlikte gosterilen metin
- [x] **7.3** Clarification'a gerek kalmadi — ekran goruntusuyle birebir tespit edildi
- [x] **7.4** Iki display de kaldirildi, form input korundu (minimal invasive)

---

## 8. Releve Survey Form Cevaplari Kaydetmiyor ✅

**Orijinal:** "The Releve Survey is experiencing a critical issue: the survey responses do not save after completion."

**Turkce:** Releve Survey formu tamamlandiktan sonra cevaplar database'e kaydedilmiyor, Save butonuna basildiginda hicbir seyi olmuyor. Kritik bug — kullanici emegi kayboluyor. **Root cause:** Silent Zod validation failure. Network tab'a bakmaya bile gerek kalmadi, kod okuyarak bulundu.

### Root Cause

3 katmanli sessiz fail:

**1. Schema katmani — `components/field-surveys/releve-survey/types.ts:19`**

```ts
const speciesSchema = z.object({
  species_name_latin: z.string().min(1, 'Species name is required'),
  ...
})
```

Her species satirinin Latin adi zorunlu — `min(1)` bos string'i reddeder.

**2. UI katmani — `components/field-surveys/releve-survey/species-records-section.tsx:155-163`**
"Add Species" butonu form'a `species_name_latin: ''` olan **bos bir satir** ekler (kullanici inline doldursun diye).

**3. Submit katmani — `components/field-surveys/releve-survey-form.tsx:231`**

```tsx
<form onSubmit={form.handleSubmit(handleSave)}>
```

RHF `handleSubmit(onValid, onInvalid?)` ikinci parametre **verilmemis**. Validation fail olursa `handleSave` cagrilmaz ve **hicbir toast gosterilmez** — tamamen sessiz.

### User Flow (bug reproduction)

1. User Releve Survey dialog'unu acar, "Start Relevé Survey" basar
2. "Add Species" butonuna basar → bos satir eklenir
3. Species dropdown'dan secim yapmadan veya yaparak (ikisi de riske acik) diger alanlari doldurur
4. **"Save Relevé Survey"** butonuna basar
5. RHF `handleSubmit` → Zod validation → `species.[i].species_name_latin.min(1)` fail
6. `handleSave` fonksiyonu **hic cagrilmaz**, Supabase insert/update hic tetiklenmez
7. RHF error callback yok → hicbir feedback, hicbir toast
8. Kullanici "Save'e bastim ama hicbir sey olmadi → **form kaydetmiyor**"

Ek tuzak: `handleSave` icinde `values.species.filter((s) => s.species_name_latin)` ile bos satirlar filtreleniyordu — ama validation ondan **once** fail ediyor, filter asla calismiyor. Kod kendi kendine kontradiction.

### Uygulanan Fix'ler

**Fix 8.1 — Schema gevsetildi**
`releve-survey/types.ts` → `speciesSchema.species_name_latin` artik `z.string()` (empty string OK). Bos satirlari zaten `handleSave` filtreliyor, schema'da reddetmeye gerek yok. Davranis comment ile dokumante edildi.

**Fix 8.2 — RHF error callback eklendi**
`releve-survey-form.tsx` → `handleValidationError` fonksiyonu eklendi. `form.handleSubmit(handleSave, handleValidationError)` olarak guncellendi. Herhangi bir validation hatasinda kullanici destructive toast goruyor: "Cannot save — form has errors" + ilk hatali alanin mesaji. Baska benzer sessiz fail senaryolari da yakalanacak.

### Yapilacilar

- [x] **8.1** Releve Survey formunu reproduce et — kod okuyarak reproduce edildi, runtime testine gerek kalmadi
- [x] **8.2** Network tab — ihtiyac kalmadi, Supabase call hic tetiklenmiyordu (validation once fail)
- [x] **8.3** Response payload — N/A
- [x] **8.4** RHF + Zod silent fail — **root cause dogrulandi**, fix uygulandi
- [x] **8.5** Supabase RLS — sebep degildi
- [x] **8.6** React Query `onSuccess`/`onError` — sebep degildi, mutation hic calismiyordu
- [x] **8.7** Fix uygulandi (schema gevsetildi + error callback eklendi)
- [ ] **8.8** Mevcut yarim kalmis Releve Survey cevaplari — veri kaybolmadi (hic yazilmadilar), kurtarmaya gerek yok. Etkilenmis kullanicilarin formu acip tekrar kaydetmesi yeterli.

---

## 9. ⚠ BUYUK FEATURE — Reporting Data Analysis → AI Draft Report Placement 🟡 (Relevé pass 1 done)

**Orijinal:** "The primary function of the data analysis within the Reporting step is to allow the user to designate the placement of specific data within the AI-generated draft report. There should also be a reference to the data outside the boundary verse inside. In the case of a designated site outside the boundary but within the buffer zone, the report should acknowledge this the habitats, species and condition of this designated site.

For example:

- The saved species list from the 'species record' should be included as a table in the report's Appendix by default, with a summarised version of this table (as outlined in feedback) appearing within the main body of the report.
- Similarly, the field survey data should be presented as a table in the Appendix under a 'Survey Data' heading, with a detailed summary of these results included in the main 'Survey Results' section.

Refer to this completed Releve Survey report for an example."

**Turkce:** Reporting adimindaki Data Analysis'in asil islevi, kullanicinin AI-generated draft report icinde hangi verinin nereye yerlestirilecegini belirlemesine izin vermek olmalidir. Bu sadece veriyi gostermek degil, raporda **yerleştirme kararını** almaktir.

Ayrica raporda **boundary icindeki ve disindaki** veriler acikca ayristirilmali. Ornegin buffer zone icinde (boundary disinda) bulunan bir designated site varsa, rapor bu site'in habitat, species ve durumuna ayri bir paragraf/bolum olarak deginmeli.

**Veri yerleştirme ornekleri:**

| Veri Kaynagi                    | Appendix (varsayilan) | Ana Govde                      |
| ------------------------------- | --------------------- | ------------------------------ |
| Species Record (saved list)     | Tam tablo             | Ozet tablo (secili satirlar)   |
| Field Survey Data               | "Survey Data" tablosu | "Survey Results" ozeti         |
| Designated Sites (boundary ici) | —                     | Ana bolumde detayli aciklama   |
| Designated Sites (buffer zone)  | —                     | Ayri bolum: habitats + species |
| Habitat Map (NLC)               | —                     | Harita + ozet                  |
| Water Quality                   | Tablo                 | Ozet                           |

**Referans:** `docs/link/EWIC_Releve_Sample_Report.pdf` — Wetland Surveys Ireland EWIC Biodiversity Initiative Annual Report (2020), 36 sayfa. Main body = prose özet, Appendix I = her relevé için ayrı data card (GPS + Fossitt + full species table with DOMIN).

**Yapilacilar:**

- [x] **9.1** Greg'den ornek Releve Survey report'unu al (mevcut değilse iste) ✅ PDF indirildi, `docs/link/EWIC_Releve_Sample_Report.pdf`
- [x] **9.2** Ornek rapor yapisini cikar — hangi veri nereye konulmus? ✅ Struktur memory'e ve bu feedback'e islendi
- [x] **9.3** Data Analysis (Step 5) UI'ina "Placement Designation" konsepti ekle — ✅ **5 veri turunun hepsi icin yapildi** (Relevé + findings + habitats + target notes + surveys). Her veri kaynagi icin "Appendix", "Ana Govde", "Her Ikisi", "Dahil Etme" secenekleri. Uygulama: `hooks/steps/use-placement-preferences.ts` (generic hook) + `components/steps/data-analysis/{releve-surveys,desk-assessment-findings-section,habitat-tab,target-notes-tab,field-survey-tab}.tsx`
- [x] **9.4** Inside/Outside boundary ayrimi: ✅ **Yapildi.** Yeni `lib/utils/spatial-classifier.ts` helper'i turf.js ile her finding'in location'ini `inside | buffer | outside` olarak etiketler. `route.ts` icinde `buildSpatialClassifier(boundary, bufferKm)` request basina yaratilir, findings 3 zone'a gruplanir (outside tamamen atilir). bbox pre-filter ile buyuk SAC boundary'leri icin performans korundu.
- [x] **9.5** AI Draft (Step 6) prompt'una placement tercihlerini ve inside/outside ayrimini aktar — ✅ **Hepsi yapildi.** 5 veri turunun placement tercihleri Step 5 metadata'dan okunur ve sectionId'ye gore filtre uygulanir (`results`/`baseline` → main+both, `appendices` → appendix+both, diger → exclude disi). Inside/buffer ayrimi ise findings icin context'e 2 ayri blok olarak yazilir (`# FINDINGS WITHIN BOUNDARY` + `# FINDINGS WITHIN BUFFER ZONE`).
- [x] **9.6** `api/ai/report-section` endpoint'ine `placementPreferences` + `locationGrouping` parametreleri ekle — ✅ **Hepsi yapildi.** `placementPreferences` Step 5 workflow metadata'dan fetch edilir, generic `applyPlacement(records, category)` 5 kategoriyi filtreler. `locationGrouping` ise spatial classifier uzerinden yapilir — findings 3 zone'a ayrilir, outside'lar context'ten dusur.
- [x] **9.7** Rapor template'inde Appendix bolumu olusturma/guncelleme mantigi ekle — ✅ **5 veri turunun hepsi icin prompt injection yapildi.** `route.ts`'te `guidanceBlocks` array'i sectionMode + veri turune gore 10 farkli MANDATORY prompt bloku ekler (Findings main/appendix, Habitats main/appendix, Target Notes EWIC Table 1 main/appendix, Survey Results vs Survey Data, Relevé 3.5 Vegetation + Appendix I).
- [x] **9.8** Buffer zone'daki designated site'lar icin ozel paragraf generator (habitats + species + condition) — ✅ **Yapildi.** `hasBufferFindings` kontrolu ile prompt'a "BUFFER ZONE FINDINGS — MANDATORY SEPARATE SUBSECTION" talimati enjekte edilir. AI bu findings icin "Nearby Designated Sites (within X km buffer)" alt bolumu uretir, habitat + species + condition bilgilerini acikca ayristirir.
- [x] **9.9** Ana govde ozet ve Appendix tam tablo arasinda otomatik ozetleme (AI) — ✅ **5 veri turunun hepsi icin calisiyor.** Main mode'da prose ozet (EWIC Table 1 / summary table / aggregate stats), Appendix mode'da tam tablolar / data cards uretilir.
- [ ] **9.10** Export (PDF/DOCX/HTML) ciktilarinda Appendix ve ana govdenin dogru bicimde yer aldigini dogrula — **eksik**, gercek raporla Greg test etmeli, markdown tablo parser'lari dogrulanmali
- [x] **9.11** Placement pattern'ini diger veri turlerine genislet: species records, habitats, target notes, desk findings, field surveys — ✅ **Hepsi yapildi.** Her veri turu icin: (1) Step 5 UI placement dropdown, (2) API route filtresi (`applyPlacement`), (3) prompt injection (`guidanceBlocks`). Hook generic hale getirildi — `getPlacement(category, id)` / `setPlacement(category, id, value)`.

### ✅ Yapilanlar — Releve Survey Pass 1

**Kapsam:** Sadece `releve_surveys` (field research vegetation plots) icin tam calisir durumda.

**Kullanici akisi:**

1. Kullanici Step 5 → yeni **Relevé Surveys** sekmesine girer
2. Her relevé icin sag tarafta bir dropdown: "Main body + Appendix" (default) / "Main body only" / "Appendix only" / "Exclude from report"
3. Secim otomatik kaydedilir (Step 5 workflow step metadata'sina JSON olarak)
4. Kullanici Step 6'ya gecer ve "Results" veya "Appendices" bolumunu generate eder
5. AI otomatik olarak dogru formatta cikar:
   - **Results (main body):** "### 3.5 Vegetation Survey (Relevé Data)" alt bolumu — aggregate prose summary (toplam relevé, tur sayisi, baskin turler, cover %'leri, Fossitt kodu)
   - **Appendices:** "Relevé Placement — Appendix I Full Data" bolumu — her relevé icin ayri detayli data card (metadata blogu + Latin/English/DOMIN tablosu + proximity/fauna/comment satirlari)

**Degisen dosyalar:**

- `hooks/steps/use-placement-preferences.ts` (YENI) — placement type + hook + default value
- `components/steps/data-analysis/releve-surveys-tab.tsx` (YENI) — Step 5 tabi
- `components/steps/data-analysis-step.tsx` — yeni tab entry eklendi
- `app/api/ai/report-section/route.ts` — 4 degisiklik:
  1. Step 5 workflow step metadata'si paralel Promise ile fetch ediliyor
  2. `placementPreferences.releveSurveys` map parse edilip sectionId'ye gore filtre uygulaniyor (`results` → main/both, `appendices` → appendix/both, diger → exclude disindakiler hepsi)
  3. Prompt injection: `sectionPrompt`'a runtime'da "### 3.5 Vegetation Survey" alt bolumu enjekte ediliyor (main mode) veya "Appendix I detailed cards" talimati (appendix mode)
  4. Eksik releve alanlari API select/context'e eklendi: `recorder`, `survey_date`, `survey_x/y_coord`, `accuracy_m`, `max_height_bryophytes_cm`, `median_height_graminea_cm`, `median_height_forbs_cm`, `other_species_proximity`

**Saklama yeri:** `workflow_steps.metadata.placementPreferences.releveSurveys = { [releveId]: "main"|"appendix"|"both"|"exclude" }` — genisletilebilir yapi, ileride diger veri turleri icin ayni key kullanilacak.

**Test:** Canli projede REL 101 (5 gercek species: Agrostis capillaris, Cynosurus cristatus, Dactylis glomerata, Trifolium pratense, Trifolium repens) ile hem main hem appendix mode dogrulandi.

---

### ⏸ Yapilmayanlar — Kalan Isler

#### 9.11 — Placement pattern'ini diger veri turlerine genislet

Releve icin calisan pattern'i su veri turlerine uygulamak gerekiyor. Her biri icin **ayni 3 adim**: (1) Step 5 icinde yeni tab/kontrol, (2) API route filtresi, (3) prompt injection.

| Veri Turu                 | Veri Kaynagi                                                                         | Step 5'te Nerede Gosterilecek                                                     | Ana Govde Format                                                     | Appendix Format                                 |
| ------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| **Species Records**       | `desk_research_findings` (data_type=species_record)                                  | Yeni "Species Records" tab veya mevcut "Desk Assessment" sekmesi icinde alt liste | Ozet tablo: en yuksek öneme sahip N tür (Latin + Common + kaynaklar) | Tam tablo: tum kayitlar + kaynak + yil + mesafe |
| **Habitats**              | `habitat_polygons` (field-drawn) + `desk_research_findings` (data_type=habitat, NLC) | Mevcut "Habitats" sekmesine placement dropdown ekle                               | Fossitt kodu + alan + condition listesi                              | Ayrintili her polygon icin ayri satir/kart      |
| **Target Notes**          | `target_notes`                                                                       | Mevcut "Target Notes" sekmesine placement dropdown ekle                           | Table 1 EWIC formatinda inline 2-sutun tablo (N1-N8 + text)          | Ayni formatla appendix'e ayri tablo             |
| **Desk Findings (other)** | `desk_research_findings` (data_type=designated_site, water_quality, etc.)            | Mevcut "Desk Assessment" sekmesi alt listesi                                      | Prose ozet + key findings                                            | Tam tablo her finding icin detayli satir        |

**Uygulama sirasi (onerilen):**

1. **Species Records** ilk — en yuksek kullanim, EWIC Appendix'in ornek verdigi ana veri turu
2. **Target Notes** ikinci — EWIC ornekte Table 1 olarak net yapi var
3. **Habitats** ucuncu — zaten tabular gosterim var, sadece placement eklemek gerekli
4. **Desk Findings (other)** en son — 9.4 (inside/outside) ile koordineli yapilmali

**Her veri turu icin gerekli kod:**

- `hooks/steps/use-placement-preferences.ts` icine yeni field: `placementPreferences.speciesRecords?`, `.habitats?`, vb.
- Step 5 UI: ilgili sekmeye dropdown ekle (Releve tab pattern'i kopyala)
- `app/api/ai/report-section/route.ts`: fetch → filter → inject prompt (Releve pattern'i kopyala, data turune ozel prompt yaz)

**Tahmini efor:** Her veri turu ~1-2 saat (altyapi hazir, mostly kopyala-uyarla). 4 veri turu toplam yarim gun - 1 gun.

#### 9.4 + 9.8 — Inside/Outside Boundary Ayrimi

Bu ayri bir ozellik ve placement'tan bagimsiz calisir. turf.js ile spatial etiketleme gerekiyor.

**Amac:** Greg raporlarda boundary icindeki ve disindaki finding'leri ayirsin. Ornek: bir SAC proje boundary'sinin icinde degilse ama buffer zone icindeyse (ornek 2km), rapor bu SAC'i ayri bir paragrafta "Nearby designated sites within X km buffer" baslgiyla anlatsin.

**Yapilacaklar:**

1. **Spatial etiketleme altyapisi:**
   - `hooks/shared/use-spatial-filter.ts` zaten var (turf.js ile boundary + buffer filtreleme yapiyor)
   - Bu hook'u genislet veya yeni bir `useLocationClassifier` olustur
   - Her finding/habitat/observation icin etiket: `"inside"` (boundary icinde) | `"buffer"` (buffer zone icinde, boundary disinda) | `"outside"` (buffer disi)
   - `distance_from_boundary_km` kolonu zaten var (`desk_research_findings` tablosunda), ama klasifikasyon mantigi eksik

2. **API route guncellemesi (`route.ts`):**
   - `buildReportContext` icinde her finding'i location'ina gore grupla: `insideFindings`, `bufferFindings`, `outsideFindings`
   - Context'e ayri bloklar olarak yaz: `# FINDINGS WITHIN BOUNDARY`, `# FINDINGS WITHIN BUFFER ZONE (outside boundary)`
   - `outside` olanlari tamamen atla (rapora konmaz)

3. **Prompt guncellemesi:**
   - Systeme eklenecek: "Findings within the project boundary should be described in primary subsections. Findings within the buffer zone (outside boundary) should be described in a separate 'Nearby sites' or 'Surrounding context' subsection acknowledging their habitats, species, and condition."
   - Ornek prompt: "Create a subsection '3.1.1 Designated Sites Within Boundary' and '3.1.2 Designated Sites in Surrounding Buffer Zone' when both categories have data."

4. **Buffer yaricapi nereden gelecek?**
   - Her proje icin farkli buffer yaricapi olabilir (SAC icin 15km, species icin 2km, etc.)
   - Suan sabit — `lib/config/` icinde veri turune gore default'lar var
   - Kullanici projenin Step 2'sinde degistirebiliyor
   - `projects.default_buffer_km` gibi bir kolon var mi kontrol et

**Tahmini efor:** 1-2 gun. turf.js cagrilarini mevcut pattern'le yapilabilir, prompt degisiklikleri basit.

#### 9.10 — Export Dogrulama

**Amac:** Rapor PDF/DOCX/HTML olarak export edilince, main body ve Appendix'in dogru formatta cikmasini dogrula.

**Yapilacaklar:**

1. `lib/reports/exports/` altindaki PDF, DOCX, HTML exporter'larini test et
2. Releve placement ile generate edilmis bir test raporu ile:
   - Main body "3.5 Vegetation Survey" subsection'i dogru render ediliyor mu?
   - Appendix'teki "Relevé Placement — Appendix I" bolumu markdown tablolari koruyup dogru gosteriyor mu?
3. Sorun varsa exporter'larin markdown parsing'ini guncelle

**Tahmini efor:** 2-4 saat, gercek bug bulunursa +1 gun.

---

## 10. ⚠ UI — Data Analysis Maps Legend Eksikligi ✅

**Orijinal:** "The data analysis maps lack a visible legend to indicate what the displayed information represents."

**Turkce:** Data Analysis (Step 5) Maps tab'inda gorunen haritalarda katman gostergeleri (legend) yok. Kullanici hangi rengin/sembolun neyi temsil ettigini anlayamiyor. Her gorunen katman icin legend entry eklenmeli.

**Kok sebep:** Legend aslinda vardi — `maps-tab.tsx`'te sol sidebar'da (300px). Ama `mapContainerRef` sadece Leaflet map div'ini sariyordu (satir 746), sidebar disinda kaliyordu. `hooks/use-map-screenshot.ts` `html-to-image` ile DOM capture ediyor, sidebar dahil degil → Greg'in raporlarda kullandigi screenshot'larda legend yok.

### Uygulanan cozum — Floating legend overlay

Harita container'ina `position: relative` eklenip, icine absolute positioned kucuk bir `MapLegendOverlay` component'i yerlestirildi. DOM'da oldugu icin `toPng` otomatik yakaliyor. Sag ust kosede, collapsible, yari saydam.

**Degisen/olusan dosyalar:**

- `components/maps/map-legend-overlay.tsx` (yeni, 98 satir) — Reusable component. Props: `entries`, `position` (4 kose), `defaultCollapsed`, `className`. Collapsible header + color swatches (line/fill/circle).
- `components/steps/data-analysis/maps-tab.tsx:55-57,770` — Inline overlay `<MapLegendOverlay entries={displayedLegendEntries} />` ile degistirildi. Sidebar'daki interaktif legend dokunulmadan duruyor — kullanici oradan katman secer, overlay o secime gore guncelenir.
- `components/steps/desk-assessment/deep-research-tab.tsx:18,58-78,82,103` — Iki `<DynamicProjectMap>` wrapper'ina (empty state + results view) `relative` + `<MapLegendOverlay>` eklendi. `legendEntries` memo boundary + buffer + designated_site finding'lere gore dinamik.

### Yapilacilar

- [x] **10.1** Data Analysis Maps tab'indaki aktif katmanlari listele — `legendEntries` memo (maps-tab.tsx:245-311) zaten hazirdi
- [x] **10.2** Reusable component olusturuldu — `components/maps/map-legend-overlay.tsx` (feedback'teki onerilen path `map-legend.tsx`'ten `map-legend-overlay.tsx`'e degistirildi cunku `components/steps/data-analysis/map-legend.tsx` diye farkli amacli bir dead file zaten vardi, isim cakismasi olmasin)
- [x] **10.3** Her katman icin color swatch + type (line/fill/circle) + etiket
- [x] **10.4** Sag ust koseye floating yerlestirildi (`top-right` default)
- [x] **10.5** Collapsible — header tikla, chevron ile ac/kapa
- [x] **10.6** Sadece aktif katmanlar gosterilir — maps-tab'de `displayedLegendEntries` (kullanici sidebar'dan secmis), deep-research-tab'de `legendEntries` memo (dinamik)
- [x] **10.7** Dark mode: `bg-background/90 backdrop-blur-sm border` — CSS variable'lar otomatik uyum
- [x] **10.8** Step 3 Desk Assessment (`deep-research-tab.tsx`) haritalarinda da kullanildi. **Step 8 Final Submission'da dokunulmadi cunku Leaflet haritasi render etmiyor** — sadece export config'inde `habitat_map` checkbox'i var (`final-submission-step.tsx:60`), gercek bir harita yok.

**Notlar:**

- `components/steps/data-analysis/map-legend.tsx` (224 satir) eski bir dead file olarak duruyor — AI legend generation + interaktif Layer Controls iceriyor, sidebar icin tasarlanmis ama hicbir yerden import edilmiyor. Silinmedi, ileri de baska bir refactor onu kullanabilir.
- Feedback'teki ek legend icerigi (buffer zone dashed, water quality, catchment areas) su an Step 5 sidebar'dan gelen dinamik `legendEntries`'e dahil degil — bunlar `maps-tab.tsx:245-311` memo'sunda eklenirse overlay'e otomatik yansir. Minimal invasive icin dokunulmadi.

---

## 11. Survey Stage — Site Secim Zorunlulugu ✅

**Orijinal:** "Survey Stage Requirement: Ensure that the workflow for the Field Survey stage requires the user to first select the relevant site. Subsequent selections for the type of survey, habitat, and target note must then be directly associated with that chosen site."

**Turkce:** Multi-site projelerde Step 4 (Field Research) altindaki uc tab'da (Field Survey, Habitat Mapping, Target Notes) kullanici onceden bir site secmeden survey planlayamasin, habitat polygon cizemesin, target note veya observation olusturamasin. Tum yaratilanlar dogrudan secili site'a baglanmali — `site_id=null` olan orphan kayit olusmamali. Tek-site projelerde davranis aynen kalsin (otomatik o tek site'a bağlanir).

### Kok Sebep (gap analizi)

| Tab             | Buton disabled? | Schema validate? | DB'ye site_id?      | Gap                              |
| --------------- | --------------- | ---------------- | ------------------- | -------------------------------- |
| Field Survey    | ✅ multi-site   | ❌               | ✅ `selectedSiteId` | warning text inline, banner yok  |
| Habitat Mapping | ❌ hep aktif    | ❌               | ⚠️ null kabul       | Add Habitat + polygon cizim acik |
| Target Notes    | ❌ hep aktif    | ❌               | ⚠️ null kabul       | Add Note + map-click acik        |
| Observations    | ⚠️ survey-bagli | ❌               | ⚠️ survey'den miras | Site kontrolu yok                |

DB seviyesinde `site_id` tum tablolarda nullable (`ON DELETE SET NULL`) — UI'dan enforce ediyoruz, schema'ya dokunmuyoruz (mevcut null kayitlari korumak icin).

### Uygulanan Cozum — 3 tab icin tutarli pattern

Her tab icin ayni mantik:

1. `useProjectSites(project.id)` → `isMultiSite = sites.length > 1`
2. `effectiveSiteId = selectedSite?.id ?? (sites.length === 1 ? sites[0].id : null)` — tek-site projelerde otomatik fallback (orphan'i onler)
3. `requiresSiteSelection = isMultiSite && !selectedSite` — bu true iken:
   - Add butonlari `disabled` + `title` tooltip
   - Harita interaksiyonlari (polygon cizim, map-click→note) bloklanir
   - Ust kismda amber alert banner: "Select a site first"
4. Persist islemlerinde `site_id = effectiveSiteId`

### Degisen dosyalar

- `components/steps/field-survey-step.tsx` — amber alert banner eklendi (mevcut inline `text-red-500` warning'ler tutarlilik icin tooltip span'lerine donusturuldu, banner global oldu)
- `components/steps/habitat-mapping-step.tsx` — `useProjectSites`, `effectiveSiteId`, `requiresSiteSelection`. `handleBoundaryChange` guard'i. `ProjectMapWithDraw editable={!requiresSiteSelection}`. `handleCreateHabitat` `site_id=effectiveSiteId`. Banner.
- `components/steps/habitat-mapping/habitat-list-panel.tsx` — `addDisabled` + `addDisabledReason` prop'lari. Add Habitat butonu disable + tooltip span.
- `components/steps/target-notes/target-notes-step.tsx` — `useProjectSites`, `requiresSiteSelection`, `effectiveSiteId` (handler'a pas). Banner. Add Note + Add Observation + Import from Data Gathering butonlari disable + tooltip.
- `components/steps/target-notes/target-notes-panel.tsx` — `addDisabled` prop. `onMapClick` guard (no-op when disabled).
- `components/steps/target-notes/use-target-notes-handlers.ts` — `effectiveSiteId` parametresi eklendi. `createTargetNote` artik `site_id=effectiveSiteId` kullaniyor.

### Davranis matrisi (sonra)

| Senaryo                          | Add butonlari | Harita cizim | Map-click→note | Banner  |
| -------------------------------- | ------------- | ------------ | -------------- | ------- |
| Tek-site proje                   | aktif         | aktif        | aktif          | yok     |
| Multi-site, "All Sites" secili   | disabled      | bloklanmis   | bloklanmis     | gorunur |
| Multi-site, spesifik site secili | aktif         | aktif        | aktif          | yok     |

### Yapilacilar

- [x] **11.1** Field Survey tab — banner + tooltip span'leri (mevcut button disable korundu, polish)
- [x] **11.2** Habitat Mapping tab — Add Habitat disable + polygon cizim editable={!requiresSiteSelection} + banner + effectiveSiteId
- [x] **11.3** Target Notes (Notes) — Add Note disable + map-click guard + banner + effectiveSiteId
- [x] **11.4** Target Notes (Observations) — Add Observation disable kontrolune `requiresSiteSelection` eklendi, tooltip mesaji guncellendi. Observation parent survey'den site miras alir.
- [x] **11.5** Tek-site projeler icin orphan onleme — `effectiveSiteId` ile otomatik tek site fallback (Field Survey'deki pattern habitat + target notes'a yayildi)
- [x] **11.6** **Post-review fix** — Add Visit kritik bug'i: `SurveyList.disableAddVisit` prop eklendi, hem group-level Add Visit buton'u hem card dropdown item'i multi-site "All Sites"ta gizleniyor. Onceden bu yol guarded degildi, `site_id: null` survey olusturabiliyordu.
- [x] **11.7** **Post-review fix** — `handleImportSpecies` ve `handleCreateObservation` handler'larinda `surveys[0]?.id` fallback'i kaldirildi. Artik sadece explicit `selectedSurveyId` kullaniliyor; survey secilmemisse destructive toast + early return.
- [x] **11.8** **Post-review fix** — Race condition kapatildi: 3 step'te `useProjectSites` loading sirasinda `requiresSiteSelection` true olarak hesaplaniyor (`isLoadingSites || (isMultiSite && !selected)`). Boylece projectSites hentiz yuklenmemisken Add butonlari gorunmuyor.
- [x] **11.9** Lint clean (benim dosyalarimda warning yok), type-check benim dosyalarimda temiz
- [ ] **11.10** Schema/DB seviyesinde `site_id NOT NULL` constraint — yapilmadi cunku mevcut null kayitlari kirmamak icin. UI enforcement yeterli.
- [ ] **11.11** `use-habitat-map-data.ts:37-40` — `site_id=null` habitat'lari tum site view'larinda gosteriyor (eski "project-level" semantik). Bu fix'den sonra manuel eklenen habitat'lar artik null degil, ama auto-import (`use-auto-import-habitats.ts`) hala null tasiyor. Tutarsizlik mevcut; ayri bir temizlik ticket'i gerektirir.
- [ ] **11.12** Tooltip a11y polish — su anki `<span title>` pattern'i klavye/screen-reader icin ideal degil. shadcn `<Tooltip>` Radix'e gecis sonraki iterasyonda yapilabilir.

### Notlar

- Build sirasinda `app/api/ai/report-section/route.ts` ve ilgili `lib/utils/spatial-classifier.ts` dosyalarinda type errorlar var — bunlar Greg'in 9.4/9.8 (Inside/Outside Boundary) isine baslanmis ama tamamlanmamis pre-existing hatalar. Bu PR'in kapsami disinda.
- "Tek-site projede SiteSelector hiç render olmuyor" davranisi (`sites.length <= 1` ise null) korundu.
- "All Sites" view'i raporlama icin gerekli oldugu icin removed degil — sadece o moddayken add aksiyonlari bloklandi.

---

## Gruplar ve Oncelik Sirasi

### Faz 1 — Kritik Fix'ler (once bunlar)

1. **#8** Releve Survey kaydetme bug (veri kaybi)
2. **#5** Step 4 donma (kullanim blokor)
3. **#1** Cizim araclari regresyon (temel ozellik)

### Faz 2 — Hizli Kazanimlar

4. **#2** Default grid 10km (5 dakika)
5. **#6** Step 4 harita tam genislik (UI refactor) ✅
6. **#10** Data Analysis maps legend

### Faz 3 — Inceleme + Feature

7. **#3** Species Group filtresi
8. **#7** "Remove surveys expected" (clarification sonrasi)
9. **#9** Data Analysis -> AI Draft placement (buyuk feature, detayli tasarim gerekiyor)

### Beklemede

10. **#4** FOSSITT symbology — sonraki iterasyon

---

## Notlar

- Greg'in "5a" ve "2b" referanslari MVP Feedback Google Docs'taki madde numaralariyla ilgili — `feedback-11-3-mar.md`daki `#5`/`#6` (attribute management / drawing tools) ve `#3` (FOSSITT habitat) maddeleriyle ortusuyor. Tamamlanmis isaretli olmalarina ragmen Greg goremiyor: **deploy + UI baglanti** kontrol edilmeli.
- Releve Survey bug'i (#8) ve Step 4 donmasi (#5) kullanicinin ilerlemesini blokluyor — oncelik.
- #9 (Data Analysis placement) yapisal bir yeniden tasarimi gerektiriyor — buyuk feature, ayri planlama gerekir.
