# Feedback 28/2 — Greg Birdthistle (28 Subat 2026)

> **Kaynak:** MVP Feedback and Requested Changes — Greg Birdthistle
> **Tarih:** 28 Subat 2026

---

## 1. Deep Research & AI Summary

**Orijinal:** "Remove 'Regenerate AI Summary' option. Saving data in deep research must automatically save the associated summary."

**Analiz:**

- "Regenerate AI Summary" butonu deep research view'dan kaldirilacak
- Deep research kaydedildiginde AI summary de otomatik kaydedilecek (kullanici iki kez kaydetmek zorunda kalmayacak)

**Yapilacilar:**

- [x] **1.1** "Regenerate AI Summary" butonunu deep research view'dan kaldir (Designated Sites, Species Records, Aquatic Features)
- [x] **1.2** Deep research save isleminde AI summary'i de otomatik kaydet (tek save butonu)
- [x] **1.3** Save Research butonu AI analysis tamamlanmadan disabled
- [x] **1.4** Deep research save olunca kart save degilse otomatik save et (yesil yansın)
- [x] **1.5** Deep research save olunca kartin kisa AI summary'sini tetikle (deep research analizi degil, kisa ozet)
- [x] **1.6** Finding (kart) save edildiginde AI summary otomatik uretilsin
- [x] **1.7** Deep research modal'da markdown render hatasi duzeltildi (react-markdown)
- [x] **1.8** Designated sites filtre barinda yatay scroll hatasi duzeltildi
- [x] **1.9** DB'den restore sirasinda AI summary kayip sorunu duzeltildi

---

## 2. Rapor Ekleri icin Veri Tablolari (Appendix Tables)

**Orijinal:** "For saved NPWS Data Sites within the buffer zone, a table of designated sites must be generated for the report appendix. Species records should be presented in a table ordered by conservation status color."

**Analiz:**
Raporlama asamasinda (Step 8: AI Draft veya Step 10: Final Submission) otomatik appendix tablolari olusturulacak.

### 2a. NPWS Designated Sites Tablosu

| Kolon                  | Aciklama                        |
| ---------------------- | ------------------------------- |
| Name                   | Site adi (SAC/SPA/NHA/pNHA)     |
| Site Number            | NPWS site kodu (orn. IE0002301) |
| Distance from boundary | Proje sinirindan mesafe (km)    |
| AI Summary             | Otomatik olusturulan ozet       |

### 2b. Species Records Tablosu

Siralama: conservation status rengine gore (Red > Orange > Blue)

| Kolon             | Aciklama                                   |
| ----------------- | ------------------------------------------ |
| Name              | Bilimsel + yaygin ad                       |
| AI Summary        | Tur hakkinda ozet                          |
| Protection Status | Koruma durumu (Protected/Invasive/Regular) |

**Yapilacilar:**

- [x] **2.1** NPWS designated sites appendix tablosu olustur (saved findings'den)
- [x] **2.2** Species records appendix tablosu olustur (conservation status siralama: Red > Orange > Blue)
- [x] **2.3** Tablolari rapor PDF/DOCX export'una entegre et

---

## 3. Species Record Arama/Filtreleme

**Orijinal:** "Implement a search function that allows users to filter species records based on proximity to the site boundary."

**Analiz:**
Species Records substep'inde (Step 2.3) mesafeye gore filtreleme ozeligi. Kullanici "0-2km", "2-5km", "5-10km" gibi araliklar secebilmeli.

**Yapilacilar:**

- [x] **3.1** Species records listesine mesafe filtresi ekle (proximity to site boundary)
- [x] **3.2** Filtre secildiginde harita senkronize olsun (sadece eslesen turler gorunsun)
- [x] **3.3** Filtrelenmis sonuc sayisi gosterilsin (orn. "4 / 50 results")
- [x] **3.4** 0 sonuc durumunda UI kirilmasi duzeltildi

---

## 4. Habitat Data Entegrasyonu (National Land Cover 2018)

**Orijinal:** "Use the new national land cover dataset. Extract LEVEL_1_VALUE (Fossitt level 1) and LEVEL_2_VALUE (Fossitt level 2) and convert them to include the official Fossitt Codes. Create a table for the report appendix."

**Dataset:** https://data-osi.opendata.arcgis.com/datasets/osi::high-value-dataset-national-land-cover-2018/explore

**Analiz:**
OSI National Land Cover 2018 dataseti ArcGIS FeatureServer olarak mevcut. LEVEL_1_VALUE ve LEVEL_2_VALUE alanlarini FOSSITT kodlarina cevirmek gerekiyor. Sonuc olarak proje boundary + buffer zone icindeki habitatlari gosteren bir tablo olusturulacak.

### Habitat Tablosu (Rapor Appendix)

| Kolon                     | Aciklama           |
| ------------------------- | ------------------ |
| Fossitt Codes             | Orn. GA1, WS1      |
| Habitat Categories & Code | Habitat adi + kodu |

**Yapilacilar:**

- [x] **4.1** OSI National Land Cover 2018 ArcGIS endpoint'ini arastir ve test et
- [x] **4.2** LEVEL_1_VALUE / LEVEL_2_VALUE -> FOSSITT kod donusturme mapping'i olustur (36 NLC Level 2 → Fossitt)
- [x] **4.3** Proje boundary + buffer zone icindeki habitat verilerini fetch et (pagination + aggregation)
- [x] **4.4** Habitat tablosunu rapor appendix'ine ekle (PDF + HTML export)
- [x] **4.5** Data Gathering wizard'ina "Habitat Data" substep eklendi (Step 2, Aquatic'ten sonra)

**Ek Iyilestirmeler (15 Mart 2026):**

- [x] **4.6** CORINE veri kaynagi tamamen kaldirildi, NLC 2018 tek kaynak olarak kullaniliyor
- [x] **4.7** `finding_data_type` enum'una `'habitat'` eklendi — habitat finding'ler artik ayri tip olarak tanimlaniyor
- [x] **4.8** Polygon highlight: 3 alanli yedekli eslestirme (nlc_id, nlc_label, fossitt_code) + secili olmayan polygon'lar tamamen gizleniyor
- [x] **4.9** Polygon pagination: tum polygon'lar cekiliyordu (max 15K, onceden sadece ilk 2000)
- [x] **4.10** Save akisi: otomatik AI summary tetikleme, DB'ye persist, deep research ayri kaydediliyor (raw_data.deepResearch)
- [x] **4.11** Deep research: habitat tipine ozel prompt (singleHabitat flag), modal state sifirlama
- [x] **4.12** Preliminary Habitat Inventory (Step 3 Baseline Report) artik NLC verisinden — CORINE kaldirildi
- [x] **4.13** Rapor context builder'da tum tipler icin AI summary + deep research extract ediliyor
- [x] **4.14** Aquatic features appendix export'a eklendi (PDF + HTML + Final Submission secenegi)
- [x] **4.15** Overall AI Analysis workflow step metadata'ya persist ediliyor (sayfa yenilemede kaybolmuyor)

---

## 5. Isimlendirme ve Veri Dogrulugu (SAC Matching)

**Orijinal:** "Stricter naming conventions. EPA data pulls Finnhy_020 river, but SAC data includes 'River Finn SAC' and 'Fin Lough SAC' as matches — both geographically incorrect (other side of the country)."

**Analiz:**
Mevcut SAC eslestirme sistemi isim benzerligine dayaniyor (`aquatic-sac-lookup.ts`). Bu fuzzy matching yanlis pozitifler uretiyor. Cozum: **isim eslestirmesini cografi yakinlik filtresiyle birlestirmek**. SAC eslestirme sadece isim degil, ayni zamanda proje sinirina yakinlik kontrolu de yapmali.

**Screenshot'tan:** FINNIHY_020 nehri icin "River Finn SAC" (IE0002301, Donegal'da) ve "Fin Lough SAC" (Offaly'da) oneriliyor — ikisi de Kerry'deki proje alanindan cok uzak.

**Yapilacilar:**

- [x] **5.1** SAC eslestirme algoritmasina cografi yakinlik filtresi ekle (isim + mesafe)
- [x] **5.2** Eslestirme skoru hesaplamasina mesafe agirligini dahil et (haversine distance penalty)
- [x] **5.3** Cografi olarak uzak eslestirmeleri otomatik ele (>200km: -50 puan → esik altina duser)

---

## 6. Aquatic Data Mesafe Olcum Hatasi

**Orijinal:** "The distance of aquatic data from the site boundary is currently being measured incorrectly. The application shows 1.7km but it is actually located directly alongside the site boundary. Distance should be from the boundary of the aquatic data itself, not the site."

**Analiz:**
Mesafe hesaplamasi muhtemelen nehrin/golun **centroid noktasindan** proje sinirina olcuyor. Bunun yerine nehrin/golun **en yakin geometri noktasindan** proje sinirina mesafe olculmeli.

**Screenshot'tan:** FINNIHY_020 nehri haritada proje sinirinin hemen yaninda gecerken, uygulama 1.7km gosteriyor.

**Yapilacilar:**

- [x] **6.1** Aquatic feature mesafe hesaplamasini duzelt: centroid yerine en yakin geometri noktasi kullan
  - Dosya: `lib/gis/distance.ts` — `lineDistanceToPolygon()` eklendi
  - LineString/MultiLineString + Polygon/MultiPolygon icin en yakin noktayi buluyor

---

## 7. Aquatic Feature Mesafesi: Nehir Mesafesi vs Kus Ucusu

**Orijinal:** "When measuring the site boundary via an Aquatic Feature it should be via the river distance measurement rather than as the crow flies."
**Referans:** https://gis.epa.ie/EPAMaps/AAGeoTool

**Analiz:**
Greg, nehir mesafesini (nehir yatagi boyunca) istiyor, duz cizgi (kus ucusu) degil. EPA'nin AAGeoTool'u bunu yapiyor. Bu karmasik bir ozellik — nehir network'u uzerinde rota hesaplamasi gerektirir.

**Not:** Bu madde 6 ile birlikte degerlendirilmeli. Oncelik: once #6'yi duzelt (geometri-bazli mesafe), sonra #7 icin nehir network mesafesini degerlendirt.

**Durum: TAMAM** (15 Mart 2026)

EPA WATER_RIVNETROUTES WFS katmani (116K segment) + Catchments.ie downstream baglantisi kullanilarak nehir agi uzerinde mesafe hesaplaniyor. Deep Research modalinda SAC tab'inda ve overview'da gosteriliyor — downstream path breadcrumb'i ve "Within 15km ZoI" uyarisi ile birlikte.

- [x] **7.1** EPA RIVNETROUTES WFS segmentleri + CQL_FILTER ile veri cekimi
- [x] **7.2** Snap-to-nearest-segment + Z koordinatlari ile akis yonu belirleme
- [x] **7.3** Catchments.ie downstream connectivity ile su kutlesi zincirleme
- [x] **7.4** SAC tab'inda river distance card + downstream path breadcrumb

---

## 8. Data Analysis Harita Sekmesi Gelistirmeleri

**Orijinal:** "Legend Selection, Default View and Orientation (portgrid layout, landscape option), Map Size Options (A5, A4, A3)."

**Durum: TAMAM** (15 Mart 2026)

Maps tab'ina 3 ozellik eklendi: legend checkbox secimi, A5/A4/A3 sayfa boyutu ve landscape/portrait yon secici. Screenshot ciktisi secilen boyuta gore olusturuluyor. Species observations katmani da haritaya eklendi.

- [x] **8.1** Harita legend secim paneli (checkbox'lar ile lejant item secimi)
- [x] **8.2** Portrait/Landscape orientation secimi
- [x] **8.3** Kagit boyutu secimi (A5, A4, A3) ve screenshot boyutlandirma
- [x] **8.4** Species observations katmani haritaya eklendi

---

## Oncelik Tablosu

| #   | Konu                             | Oncelik           | Efor   | Bagimliilik |
| --- | -------------------------------- | ----------------- | ------ | ----------- |
| 6   | Aquatic mesafe olcum hatasi      | ~~Kirmizi~~ Tamam | Dusuk  | -           |
| 5   | SAC eslestirme dogrulugu         | ~~Kirmizi~~ Tamam | Orta   | -           |
| 1   | Deep Research save/regenerate    | ~~Kirmizi~~ Tamam | Dusuk  | -           |
| 3   | Species proximity filtresi       | ~~Sari~~ Tamam    | Dusuk  | -           |
| 2   | Rapor appendix tablolari         | ~~Sari~~ Tamam    | Orta   | -           |
| 4   | National Land Cover habitat data | ~~Sari~~ Tamam    | Yuksek | -           |
| 7   | Nehir mesafesi (river distance)  | ~~Sari~~ Tamam    | Yuksek | 6           |
| 8   | Data Analysis harita ozellikleri | ~~Sari~~ Tamam    | Yuksek | -           |

---

_Son guncelleme: 15 Mart 2026_
