# Feedback 11/3 — Greg Birdthistle (11 Mart 2026)

> **Kaynak:** MVP Feedback and Requested Changes — Greg Birdthistle
> **Tarih:** 11 Mart 2026

---

## 1. Data Gathering — Planning Policy Kaldirilmasi

**Orijinal:** "The data gathering stage should no longer include the planning policy analysis. The intended outcome was to provide a concise summary of the most recent planning applications located within the site boundary's buffer zone. Can you remove the planning policy stage."

**Turkce:** Data gathering asamasindan planning policy analizi tamamen kaldirilacak. Asil amac sadece site siniri buffer zone'u icindeki en guncel planlama basvurularinin kisa bir ozetini saglamakti.

**Yapilacilar:**

- [ ] **1.1** Planning policy substep'ini Data Gathering'den kaldir
- [ ] **1.2** Ilgili API endpoint ve servislerini temizle

---

## 2. Katman Kaydetme ve Desk Assessment/Data Analysis Entegrasyonu

**Orijinal:** "We need to allow the user to save the layers and to add the saved layers map to the desk assessment and also include it for the data analysis stage."

**Turkce:** Kullanici harita katmanlarini kaydedebilmeli. Kaydedilen katmanlar haritasi Desk Assessment ve Data Analysis asamalarinda da gosterilmeli.

**Yapilacilar:**

- [ ] **2.1** Harita katmanlarini kaydetme ozelligi ekle (kullanicinin sectigi katmanlar persist edilsin)
- [ ] **2.2** Kaydedilen katman haritasini Desk Assessment (Step 3) gorunumune ekle
- [ ] **2.3** Kaydedilen katman haritasini Data Analysis (Step 7) gorunumune ekle

---

## 3. Habitat Verisi (NLC) — Otomatik Kaydetme ve Gosterim

**Orijinal:** "The habitat data (NLC) — The habitats within the site boundary should be saved automatically during the data gathering process — displayed for the desk assessment section. Habitats inside the boundary (most important) -> 3. Preliminary Habitat Inventory. Habitats outside the boundary within 100m or 0.1km should be displayed. Not sure if this is possible but depending on the fossitt code returned by NLC can we have the option to display the habitats on the map with the following here."

**Turkce:** NLC habitat verileri data gathering sirasinda otomatik kaydedilmeli ve Desk Assessment'ta gosterilmeli. Site siniri icindeki habitatlar en onemli (Preliminary Habitat Inventory). Sinir disinda 100m icindeki habitatlar da gosterilmeli. NLC'den donen FOSSITT koduna gore habitatlar haritada renklendirilebilmeli.

**Referans:** Heritage Council — _Habitat Survey Guidelines_ (Draft No.2, April 2005), Appendix 6: Standard Habitat Colour Coding.
Dosya: `docs/link/HeritageCouncilHabitatSymbologyRecommendations (1).pdf`

FOSSITT koduna gore standart renk eslestirmesi (Heritage Council):

| Kategori                         | FOSSITT Kodlari           | Bilgisayar Rengi  | Kalem Rengi                     |
| -------------------------------- | ------------------------- | ----------------- | ------------------------------- |
| Freshwater (Goller)              | FL1–FL8                   | Sky blue          | Light blue (1283)               |
| Freshwater (Akarsular)           | FW1–FW2                   | Indigo / Sky blue | Blue (1274) / Light blue (1283) |
| Freshwater (Kanallar, Hendekler) | FW3–FW4                   | Indigo            | Blue (1274)                     |
| Freshwater (Kaynaklar)           | FP1–FP2                   | Sky blue          | Light blue (1283)               |
| Freshwater (Bataklik)            | FS1–FS2                   | Indigo            | Blue (1274)                     |
| Grassland & Marsh                | GA1–GA2, GS1–GS4, GM1     | Yellow            | Yellow (1279)                   |
| Heath & Dense Bracken            | HH1–HH4, HD1              | Brown             | Brown (1273)                    |
| Peatlands                        | PB1–PB5, PF1–PF3          | Violet            | Purple (1282)                   |
| Woodland (Dogal)                 | WN1–WN7                   | Green             | Green (1278)                    |
| Woodland (Karisik)               | WD1–WD5                   | Bright green      | Light green (1284)              |
| Woodland (Scrub, Immature)       | WS1–WS5                   | Green             | Green (1278)                    |
| Hedgerows                        | WL1                       | Green             | Green (1278)                    |
| Treelines                        | WL2                       | Brown             | Brown                           |
| Exposed Rock                     | ER1–ER4, EU1–EU2, ED1–ED5 | Red               | Scarlet red (1297)              |
| Cultivated & Built Land          | BC1–BC4, BL1–BL3          | Grey (50%)        | Light grey (1290)               |
| Coastland (Kayalik)              | CS1–CS3                   | Orange            | Orange (1295)                   |
| Coastland (Gelgit)               | CW1–CW2, CM1–CM2          | Orange            | Orange (1295)                   |
| Coastland (Kumsal)               | CB1, CD1–CD6              | Tan               | Flesh (1287)                    |
| Coastland (Yapay)                | CC1–CC2                   | —                 | —                               |
| Littoral Rock                    | LR1–LR5                   | Pink              | Pink (1288)                     |
| Littoral Sediments               | LS1–LS5                   | Gold              | Canary yellow (1294)            |
| Sublittoral Rock                 | SR1–SR6                   | Pink              | Pink (1288)                     |
| Sublittoral Sediments            | SS1–SS8                   | Gold              | Canary yellow (1294)            |
| Marine Water Body                | MW1–MW4                   | Lavender          | Lavender (1293)                 |

**Yapilacilar:**

- [ ] **3.1** Site siniri icindeki NLC habitat verilerini data gathering sirasinda otomatik kaydet
- [ ] **3.2** Kaydedilen habitatlari Desk Assessment (Step 3) "Preliminary Habitat Inventory" bolumunde goster
- [ ] **3.3** Site siniri disinda 100m (0.1km) icindeki habitatlari da goster
- [ ] **3.4** FOSSITT koduna gore habitat poligonlarini haritada Heritage Council standart renk kodlamasiyla goster (yukaridaki tablo referans)
- [ ] **3.5** Her habitat poligonuna FOSSITT kodu + adi etiket olarak ekle

---

## 4. GIS Mapping — Shapefile Upload ve Coklu Site Siniri

**Orijinal:** "Shapefile Upload Issue: The feature for uploading shapefiles is currently non-functional. Multiple Site Boundary Support: The platform must be updated to allow for the drawing of multiple site boundaries within a single project. Each site must have a sub name from the project name. Example: Tralee Bay Wind Farm with 4 sites — TBWF 00101, TBWF 00102, TBWF 00103, TBWF 00104."

**Turkce:** Shapefile yukleme ozelligi calismıyor, duzeltilmeli. Platform tek projede birden fazla site siniri cizilmesine izin vermeli. Her site, proje adindan turetilen bir alt isme sahip olmali (orn. TBWF 00101, TBWF 00102...).

**Yapilacilar:**

- [x] **4.1** ~~Shapefile upload ozelligini duzelt~~ ✅ (29 Mart 2026) — `proj4` ile ITM (EPSG:2157) ve Irish Grid (EPSG:29903) → WGS84 otomatik CRS donusumu eklendi. MultiPolygon parcalanarak tum polygon feature'lar dondurulur. Dosyalar: `lib/gis/coordinate-transform.ts` (yeni), `lib/gis/shapefile-parser.ts` (guncellendi), `lib/gis/validation.ts` (CRS reject → warning)
- [ ] **4.2** Tek projede birden fazla site siniri cizme destegi ekle — ✅ DB altyapisi tamamlandi (29 Mart 2026): `project_sites` tablosu, downstream tablolara `site_id` FK, sync trigger (`projects.boundary` senkron), RPC'ler (`upsert_project_site`, `get_project_sites_with_geojson`, `delete_project_site`), mevcut projeler migrate edildi. UI bekliyor
- [ ] **4.3** Her site icin proje adindan turetilen otomatik alt isimlendirme (orn. TBWF 00101)
- [ ] **4.4** Her site sinirinin data gathering'de bagimsiz islenmesini sagla (ayri buffer zone, ayri veri toplama)
- [ ] **4.5** Her site icin bagimsiz field survey destegi (farkli siteler farkli anketler gerektirir)

---

## 5. Oznitelik (Attribute) Yonetimi — Geospatial Veri

**Orijinal:** "The system must support the management of attribute data associated with geospatial files (e.g., shapefiles) upon both upload and download after project completion. Users must be able to assign attributes to each defined site boundary. Target Notes: Target notes should be treated as attributes. Final Submission: All associated data, including attributes and target notes, must be downloadable within the shapefile format."

**Turkce:** Sistem, shapefile gibi mekansal dosyalara bagli oznitelik verilerini hem yukleme hem indirme sirasinda yonetebilmeli. Her site sinirina oznitelik atanabilmeli. Target note'lar da oznitelik olarak islenmeli. Final submission'da tum veri (oznitelikler + target note'lar) shapefile formatinda indirilebilmeli.

**Ornek Oznitelik Alanlari:**

| Alan        | Aciklama                                                             |
| ----------- | -------------------------------------------------------------------- |
| OBJECT_ID   | Her feature icin benzersiz numara (polygon, polyline, point)         |
| FOSS_CODE   | FOSSITT habitat kodu (alfanumerik)                                   |
| ANNEX_CODE  | Habitats Directive Annex I habitat kodu (alfanumerik)                |
| FOSS_NAME   | FOSSITT habitat adi                                                  |
| COMMENT     | Serbest metin yorum                                                  |
| SITE_NAME   | Serbest metin site adi                                               |
| LABEL       | Serbest metin etiket                                                 |
| NOTE_NUMBER | Not numarasi                                                         |
| LABEL (TN)  | Target note etiketi (N1, N2 vb.)                                     |
| CATEGORY    | Dropdown: Damage, Fauna, Flora, Invasive Species, Management, Access |
| DATA_QUAL   | Saha veri kalitesi gostergesi                                        |
| DATE        | Saha anketi tarihi                                                   |
| PHOTO_ID    | Fotograf ID numarasi/numaralari                                      |

**Yapilacilar:**

- [ ] **5.1** Shapefile upload sirasinda oznitelik verilerini okuma ve gosterme
- [ ] **5.2** Her site sinirina oznitelik atama UI'i
- [ ] **5.3** Target note'lari oznitelik olarak isleme
- [ ] **5.4** Final submission'da shapefile export'una oznitelik + target note dahil etme (.shp, .shx, .dbf, .prj)

---

## 6. Harita Cizim Araclari ve GIS Export

**Orijinal:** "The mapping component requires robust drawing tools and high interoperability for data export. Critical Drawing Tools: Snapping, Tracing, Clipping, Vertex management. Data Interoperability: Mapping data must be exportable as a complete shapefile (.shp, .shx, .dbf, .prj)."

**Turkce:** Harita bileseni guclu cizim araclarina ve yuksek veri uyumluluguna ihtiyac duyuyor. Kritik araclar: Snapping (yapisma), Tracing (izleme), Clipping (kirpma), Vertex management (kose noktasi yonetimi). Veri eksiksiz shapefile olarak export edilebilmeli.

**Test dosyasi:** Google Drive link mevcut (Greg'den)

### Cizim Araclari Detaylari

**6a. Snapping (Yapisma) — "GIS'in Miknatisi"**
Kullanici bir feature'a yakin tikladiginda imleç otomatik olarak belirli bir noktaya (vertex, kenar veya uc nokta) atlar. Insan hatasini ortadan kaldirir.

- **Point Snapping:** Nokta feature'a yapisma
- **Vertex Snapping:** Cizgi/poligonun kose veya ara noktalarina yapisma
- **Edge Snapping:** Cizgi veya sinirin herhangi bir yerine yapisma

**6b. Tracing (Izleme) — "Lideri Takip Et"**
Mevcut bir feature'in tam seklini takip eden yeni feature olusturma. Karmasik bir nehir kenari veya parsel sinirinda tek tek her bukumu tiklamak yerine, bir kez tiklanir ve arac yolu otomatik izler.

- **Faydasi:** Yan yana iki poligonun tam ayni siniri paylasmasi garanti edilir — bosluk veya cakisma olmaz.

**6c. Clipping (Kirpma) — "Kurabiye Kaliplama"**
Bir feature'in baska bir feature tarafindan sekillendirilmesi gerektiginde kullanilir:

- **Clip (Overlay araci):** Bir katmani "kurabiye kalıbi" olarak kullanip diger katmandan veri cikartma
- **Clip (Duzenleme komutu):** Cakisan poligonlarda, alttaki feature'in cakisan kismini atarak verilerin "planar" olmasini (iki feature'in ayni alanda bulunmamasi) saglama

**6d. Vertex Management (Kose Noktasi Yonetimi) — "Geometrinin DNA'si"**
Her vektor feature, cizgilerle baglanan koordinat noktalari serisidir. Bu noktalar = vertex'ler. Bunlari yonetmek, sekilleri ince ayarlamanin yoludur.

- **Vertex ekleme/silme:** Bir egriyi yeniden sekillendirme veya tirtiksiz bir kenari sadlestirme
- **Vertex tasima:** Tum nesneyi hareket ettirmeden belirli bir kosenin konumunu degistirme
- **Vertex ozellikleri:** Z-degerleri (yukseklik) veya M-degerleri (lineer olcum) her bir vertex icin ayri ayri yonetilebilir

### Karsilastirma Tablosu

| Arac            | Temel Amac                    | Gercek Dunya Benzetmesi                                |
| --------------- | ----------------------------- | ------------------------------------------------------ |
| Snapping        | Baglanti ve hassasiyet        | Iki parcayi hizalamak icin miknatıs kullanma           |
| Tracing         | Sinirlar boyunca tutarlilik   | Harita cizgisini kopyalamak icin kopya kagidi kullanma |
| Clipping        | Istenmeyen cakismayi kaldirma | Kurabiye kalıbi veya makas kullanma                    |
| Vertex Yonetimi | Yapiyi ince ayarlama          | Tel kafes modelde eklemi ayarlama                      |

**Yapilacilar:**

- [ ] **6.1** Snapping (yapisma) araci ekle — point, vertex ve edge snapping destegi
- [ ] **6.2** Tracing (izleme) araci ekle — mevcut feature sinirini otomatik takip
- [ ] **6.3** Clipping (kirpma) araci ekle — overlay ve edit clip modlari
- [ ] **6.4** Vertex management (kose noktasi duzenleme) araci ekle — ekleme, silme, tasima
- [x] **6.5** ~~Eksiksiz shapefile export (.shp, .shx, .dbf, .prj)~~ ✅ (29 Mart 2026) — `shp-write` ile boundary + attributes + target notes + habitats export. `downloadShapefile()` browser download tetikler. Step 7 Maps tab'ina "Export Shapefile" butonu eklendi. Dosyalar: `lib/gis/shapefile-export.ts` (yeni), `types/shp-write.d.ts` (yeni), `components/steps/data-analysis/maps-tab.tsx` (guncellendi)
- [ ] **6.6** Test: Greg'in sagladigi shapefile ile test et

---

## 7. Desk Assessment AI Analiz Iyilestirmeleri

**Orijinal:** "Combine the baseline report and the ecological summary into a single-page view for the Desk Assessment AI Analysis. Ensure the combined page supports export to HTML, PDF, and Word formats, with the inclusion of all relevant maps in the export. Remove the 'Survey Recommendation' section from the AI analysis output."

**Turkce:** Desk Assessment AI analizinde baseline rapor ve ekolojik ozet tek sayfada birlestirilmeli. Birlestirilen sayfa HTML, PDF ve Word formatlarinda export edilebilmeli, tum ilgili haritalar dahil. AI analiz ciktisindan "Survey Recommendation" bolumu kaldirilmali.

**Yapilacilar:**

- [ ] **7.1** Baseline report ve ecological summary'i tek sayfa gorunumunde birlestir
- [ ] **7.2** Birlestirilen sayfayi HTML, PDF ve Word formatlarinda export destegiyle donat
- [ ] **7.3** Export'a tum ilgili haritalari dahil et
- [ ] **7.4** AI analiz ciktisindan "Survey Recommendation" bolumunu kaldir

---

## 8. Field Survey Planlama Duzenlemeleri

**Orijinal:** "Remove the 'Survey Targets from Desk Research' section from Step 4. For the Survey Schedule step, the option to 'state the survey' should be removed. The Survey should be automatically populated with known data (site name, releve code based on REL 101, recorder = assigned ecologist). Remove the 'Approved' status on the Survey Schedule. The survey must be tied to the site if there are multi sites."

**Turkce:** Step 4'ten "Survey Targets from Desk Research" bolumunu kaldir. Survey Schedule'dan "state the survey" secenegini kaldir. Survey otomatik olarak bilinen verilerle doldurulmali: site adi, releve kodu (ilk survey REL 101'den baslar), recorder = atanan ekolog. Survey Schedule'dan "Approved" statusunu kaldir. Coklu site varsa survey ilgili site'a baglanmali.

**Yapilacilar:**

- [ ] **8.1** "Survey Targets from Desk Research" bolumunu Step 4'ten kaldir
- [ ] **8.2** Survey Schedule'dan "state the survey" secenegini kaldir
- [ ] **8.3** Survey olusturulurken bilinen verilerle otomatik doldur (site name, releve code REL 101+, recorder = atanan ekolog)
- [ ] **8.4** Survey Schedule'dan "Approved" statusunu kaldir
- [ ] **8.5** Coklu site projelerinde survey'i ilgili site'a bagla

---

## 9. Field Research Yapisi Guncellemesi

**Orijinal:** "The structure of the 'Field Research' section should be updated to include the following four sequential stages: Field Survey (with changes), Habitat Mapping (sub-category, auto-pull habitat data from stage 5 data gathering, editable), Target Notes (sub-category, record notes before main survey)."

**Turkce:** Field Research bolumu su 4 ardisik asamayi icermeli (sayfa ustunde data gathering gibi tab bar):

1. **Field Survey** — mevcut, degisikliklerle
2. **Habitat Mapping** — Field Survey alt kategorisi. Data gathering stage 5'ten habitat verisini otomatik ceksin, ekolog duzenleyebilsin
3. **Target Notes** — Field Survey alt kategorisi. Ekologun ana survey oncesi site hakkinda not almasi icin

**Yapilacilar:**

- [ ] **9.1** Field Research bolumunu 4 ardisik asamali tab yapisiyla guncelle
- [ ] **9.2** Habitat Mapping'i Field Survey alt kategorisi olarak yeniden yapilandir
- [ ] **9.3** Data gathering stage 5'ten habitat verisini otomatik cek ve duzenlenebilir yap
- [ ] **9.4** Target Notes'u Field Survey alt kategorisi olarak yeniden yapilandir

---

## 10. Data Analysis Guncellemeleri

**Orijinal:** "Remove: GIS mapping and Data gathering tabs. Desk Assessment Tab: combined data from baseline report + all analyses, with 'add to report' and 'create a summary' options. Field Survey Tab: field data + completed survey template. Habitats Tab: updated habitat mapping data. Target Notes Tab: list of all target notes. Maps: updated with legend."

**Turkce:** Data Analysis (Step 7) guncellemeleri:

- GIS Mapping ve Data Gathering tab'larini kaldir
- **Desk Assessment Tab:** Baseline report + tum analizlerin birlestirildigi veri. "Add to Report" ve "Create a Summary" butonlari
- **Field Survey Tab:** Sahada toplanan veri + tamamlanmis survey template
- **Habitats Tab:** Guncellenmis habitat mapping verisi
- **Target Notes Tab:** Tum target note'larin listesi
- **Maps:** Gosterilen veri icin lejant (legend) iceren guncel harita

**Yapilacilar:**

- [ ] **10.1** GIS Mapping ve Data Gathering tab'larini Data Analysis'ten kaldir
- [ ] **10.2** Desk Assessment tab'ini baseline report + tum analizlerle birlestir, "Add to Report" ve "Create a Summary" butonlari ekle
- [ ] **10.3** Field Survey tab'i — saha verisi + tamamlanmis survey template goster
- [ ] **10.4** Habitats tab'i — guncellenmis habitat mapping verisi
- [ ] **10.5** Target Notes tab'i — tum target note listesi
- [ ] **10.6** Harita gorunumune lejant (legend) ekle

---

## 11. AI Draft Islevselligi

**Orijinal:** "Issue: The report text changes upon saving. Can you set the text created by AI to be English Ireland. Required Fixes: autosave and version control. In the Appendix all links and sources collected in data gathering should be shown."

**Turkce:** Sorun: Rapor metni kaydederken degisiyor. AI'in olusturdugu metin Irlanda Ingilizcesi olmali. Otomatik kaydetme (autosave) ve versiyon kontrolu gerekli — ekolog raporu gunlerce calisabilir, son kaydedilen versiyon her zaman erisilebilir olmali. Appendix'te data gathering'de toplanan tum link ve kaynaklar gosterilmeli.

**Yapilacilar:**

- [ ] **11.1** Kaydetme sirasinda rapor metninin degismesi sorununu duzelt
- [ ] **11.2** AI metin dilini Irlanda Ingilizcesi (en-IE) olarak ayarla
- [ ] **11.3** Autosave ozelligi ekle
- [ ] **11.4** Versiyon kontrolu — her kayit yeni versiyon, en son kaydedilen her zaman erisilebilir
- [ ] **11.5** Appendix'e data gathering'den toplanan tum link ve kaynaklari ekle

---

## 12. Quality Review Is Akisi

**Orijinal:** "Purpose: allow a colleague to review the report with appendices. Remove the checkbox flow. The report must be visible to the reviewer with ability to add section-specific notes and general notes. Include ability to sign that it has been reviewed. Each section should highlight in pink the text created by AI."

**Turkce:** Amac: Bir meslektasin raporu ekleriyle birlikte incelemesine izin vermek. Checkbox akisini kaldir. Rapor inceleyiciye gorunur olmali; her bolume ozel not ve genel not ekleyebilmeli. Incelendigine dair imza/onay mekanizmasi olmali. AI tarafindan olusturulan metin her bolumde pembe ile vurgulanmali.

**Yapilacilar:**

- [ ] **12.1** Mevcut checkbox akisini kaldir
- [ ] **12.2** Raporu inceleyiciye tam gorunur yap (appendix dahil)
- [ ] **12.3** Bolum bazli not ekleme ozelligi
- [ ] **12.4** Genel not ekleme ozelligi
- [ ] **12.5** Inceleme imza/onay mekanizmasi ekle
- [ ] **12.6** AI tarafindan olusturulan metni her bolumde pembe ile vurgula

---

## 13. Final Submission

**Orijinal:** "Must include shapefiles with attributes of each map. Field surveys in CSV format with AI-created summary report for each survey."

**Turkce:** Final submission icerigi:

- Her haritanin ozniteliklerini iceren shapefile'lar
- CSV formatinda field survey verileri
- Her survey icin AI tarafindan olusturulmus ozet rapor

**Yapilacilar:**

- [ ] **13.1** Her harita icin oznitelikli shapefile export
- [ ] **13.2** Field survey verilerini CSV formatinda export
- [ ] **13.3** Her survey icin AI ozet rapor olusturma

---

## 14. Kullanici Geri Bildirimleri (UX Sorunlari)

**Orijinal:** Mapping/Drawing glitchy, saving scroll issue, habitat buffer customization, polygon labels, company reports non-functional.

**Turkce:** Kullanicilarin bildirdigi sorunlar:

### 14.1 Harita Cizim Sorunlari

Poligon cizme islemi ozellikle zoom in/out yaparken takiliyor ve cogu zaman tamamlanamiyor.

- [ ] **14.1.1** Poligon cizim islemindeki zoom bug'ini duzelt

### 14.2 Kaydetme Scroll Sorunu

Su ozellikleri (gol vb.) kaydederken scroll sorunu — scroll cizgisi ustunde baska bir ozellik zaten kaydedilmisse alttakileri kaydedememe.

- [ ] **14.2.1** Scroll ile kesisen kaydetme sorununu duzelt

### 14.3 Habitat Buffer Ozellestirme

Sabit 1km yerine habitat veri buffer'ini ozellestirme istegi (orn. site siniriyla cakisma veya 100m icinde). Site'a yakin veya bitisik habitatlar genellikle en onemli.

- [ ] **14.3.1** Habitat buffer mesafesini ozellestirilebilir yap (1km yerine kullanici secimi)

### 14.4 Poligon Etiketleri

Habitat poligonlari Street View veya Satellite View'da zor goruluyor. Poligonlara etiket eklenmesi oneriliyor.

- [ ] **14.4.1** Habitat poligonlarina gorsel etiket ekle

### 14.5 Company Reports Calismiyor

"Company Reports" ozelligi calismıyor/yanit vermiyor.

- [ ] **14.5.1** Company Reports ozelligini duzelt

---

## 15. Uygulama Gorunumu Guncelleme (Branding)

**Orijinal:** "Update the Application look and feel: see the following branding guideline for colours & fonts."

**Turkce:** Uygulama gorunumunu branding kilavuzundaki renk ve font'lara gore guncelle.

**Yapilacilar:**

- [ ] **15.1** Branding kilavuzunu Greg'den al
- [ ] **15.2** Renk paletini guncelle (CSS variables / Tailwind theme)
- [ ] **15.3** Font'lari guncelle

---

## 16. Kullanici Kilavuzu

**Orijinal:** "Create a user guide for the application. The online user documentation/guide needs to clearly explain how to use the application, including detailed information about the data sources utilized at each stage."

**Turkce:** Uygulama icin online kullanici kilavuzu olustur. Her asamada kullanilan veri kaynaklari hakkinda detayli bilgi icermeli.

**Yapilacilar:**

- [ ] **16.1** Online kullanici dokumantasyonu/kilavuzu olustur
- [ ] **16.2** Her adim icin kullanilan veri kaynaklarini dokumante et

---

## Ozet

| #   | Konu                                 | Oncelik    | Karmasiklik |
| --- | ------------------------------------ | ---------- | ----------- |
| 1   | Planning policy kaldir               | Orta       | Dusuk       |
| 2   | Katman kaydetme + paylas             | Yuksek     | Orta        |
| 3   | NLC habitat otomatik kaydet          | Yuksek     | Orta        |
| 4   | Shapefile upload + coklu site        | **Kritik** | **Yuksek**  |
| 5   | Attribute yonetimi                   | Yuksek     | Yuksek      |
| 6   | Cizim araclari (snap/trace/clip)     | Yuksek     | **Yuksek**  |
| 7   | Desk Assessment birlestir + export   | Orta       | Orta        |
| 8   | Field Survey planlama duzelt         | Orta       | Orta        |
| 9   | Field Research yapi degisikligi      | Yuksek     | Yuksek      |
| 10  | Data Analysis tab yeniden yapilandir | Yuksek     | Orta        |
| 11  | AI Draft fix + autosave              | Yuksek     | Orta        |
| 12  | Quality Review yeni akis             | Orta       | Orta        |
| 13  | Final Submission shapefile + CSV     | Orta       | Orta        |
| 14  | UX bug fix'ler                       | Yuksek     | Dusuk-Orta  |
| 15  | Branding guncelleme                  | Dusuk      | Dusuk       |
| 16  | Kullanici kilavuzu                   | Dusuk      | Orta        |
