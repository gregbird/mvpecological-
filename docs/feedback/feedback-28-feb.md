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

- [ ] **1.1** "Regenerate AI Summary" butonunu deep research view'dan kaldir
- [ ] **1.2** Deep research save isleminde AI summary'i de otomatik kaydet (tek save butonu)

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

- [ ] **2.1** NPWS designated sites appendix tablosu olustur (saved findings'den)
- [ ] **2.2** Species records appendix tablosu olustur (conservation status siralama: Red > Orange > Blue)
- [ ] **2.3** Tablolari rapor PDF/DOCX export'una entegre et

---

## 3. Species Record Arama/Filtreleme

**Orijinal:** "Implement a search function that allows users to filter species records based on proximity to the site boundary."

**Analiz:**
Species Records substep'inde (Step 2.3) mesafeye gore filtreleme ozeligi. Kullanici "0-2km", "2-5km", "5-10km" gibi araliklar secebilmeli.

**Yapilacilar:**

- [ ] **3.1** Species records listesine mesafe filtresi ekle (proximity to site boundary)

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

- [ ] **4.1** OSI National Land Cover 2018 ArcGIS endpoint'ini arastir ve test et
- [ ] **4.2** LEVEL_1_VALUE / LEVEL_2_VALUE -> FOSSITT kod donusturme mapping'i olustur
- [ ] **4.3** Proje boundary + buffer zone icindeki habitat verilerini fetch et
- [ ] **4.4** Habitat tablosunu rapor appendix'ine ekle

---

## 5. Isimlendirme ve Veri Dogrulugu (SAC Matching)

**Orijinal:** "Stricter naming conventions. EPA data pulls Finnhy_020 river, but SAC data includes 'River Finn SAC' and 'Fin Lough SAC' as matches — both geographically incorrect (other side of the country)."

**Analiz:**
Mevcut SAC eslestirme sistemi isim benzerligine dayaniyor (`aquatic-sac-lookup.ts`). Bu fuzzy matching yanlis pozitifler uretiyor. Cozum: **isim eslestirmesini cografi yakinlik filtresiyle birlestirmek**. SAC eslestirme sadece isim degil, ayni zamanda proje sinirina yakinlik kontrolu de yapmali.

**Screenshot'tan:** FINNIHY_020 nehri icin "River Finn SAC" (IE0002301, Donegal'da) ve "Fin Lough SAC" (Offaly'da) oneriliyor — ikisi de Kerry'deki proje alanindan cok uzak.

**Yapilacilar:**

- [ ] **5.1** SAC eslestirme algoritmasina cografi yakinlik filtresi ekle (isim + mesafe)
- [ ] **5.2** Eslestirme skoru hesaplamasina mesafe agirligini dahil et
- [ ] **5.3** Cografi olarak uzak eslestirmeleri otomatik ele veya uyari goster

---

## 6. Aquatic Data Mesafe Olcum Hatasi

**Orijinal:** "The distance of aquatic data from the site boundary is currently being measured incorrectly. The application shows 1.7km but it is actually located directly alongside the site boundary. Distance should be from the boundary of the aquatic data itself, not the site."

**Analiz:**
Mesafe hesaplamasi muhtemelen nehrin/golun **centroid noktasindan** proje sinirina olcuyor. Bunun yerine nehrin/golun **en yakin geometri noktasindan** proje sinirina mesafe olculmeli.

**Screenshot'tan:** FINNIHY_020 nehri haritada proje sinirinin hemen yaninda gecerken, uygulama 1.7km gosteriyor.

**Yapilacilar:**

- [ ] **6.1** Aquatic feature mesafe hesaplamasini duzelt: centroid yerine en yakin geometri noktasi kullan
  - Dosya: `lib/gis/distance.ts` veya `calculateDistanceFromBoundary` fonksiyonu
  - LineString/MultiLineString geometrileri icin en yakin noktayi bul

---

## 7. Aquatic Feature Mesafesi: Nehir Mesafesi vs Kus Ucusu

**Orijinal:** "When measuring the site boundary via an Aquatic Feature it should be via the river distance measurement rather than as the crow flies."
**Referans:** https://gis.epa.ie/EPAMaps/AAGeoTool

**Analiz:**
Greg, nehir mesafesini (nehir yatagi boyunca) istiyor, duz cizgi (kus ucusu) degil. EPA'nin AAGeoTool'u bunu yapiyor. Bu karmasik bir ozellik — nehir network'u uzerinde rota hesaplamasi gerektirir.

**Not:** Bu madde 6 ile birlikte degerlendirilmeli. Oncelik: once #6'yi duzelt (geometri-bazli mesafe), sonra #7 icin nehir network mesafesini degerlendirt.

**Yapilacilar:**

- [ ] **7.1** EPA AAGeoTool API'sini arastir — nehir mesafesi hesaplama endpoint'i var mi?
- [ ] **7.2** Alternatif: WFD river network geometrisi uzerinde nearest-point-on-line hesaplamasi

---

## 8. Data Analysis Harita Sekmesi Gelistirmeleri

**Orijinal:** "Legend Selection, Default View and Orientation (portgrid layout, landscape option), Map Size Options (A5, A4, A3)."

**Analiz:**
Step 7 (Data Analysis) harita sekmesinde rapor icin harita ciktisi ozellikleri:

- **Legend Selection:** Kullanici haritada hangi lejant(lar)i gostermek istedigini secer
- **Default View:** Varsayilan gorunum "portrait" grid tabanlii layout, landscape secenegi de olacak
- **Map Size:** A5, A4, A3 kagit boyutu secimi (harita export/print icin)

**Yapilacilar:**

- [ ] **8.1** Harita legend secim paneli (hangi katmanlarin lejanti gosterilecek)
- [ ] **8.2** Portrait/Landscape orientation secimi
- [ ] **8.3** Kagit boyutu secimi (A5, A4, A3) ve harita boyutlandirma

---

## Oncelik Tablosu

| #   | Konu                             | Oncelik | Efor   | Bagimliilik |
| --- | -------------------------------- | ------- | ------ | ----------- |
| 6   | Aquatic mesafe olcum hatasi      | Kirmizi | Dusuk  | -           |
| 5   | SAC eslestirme dogrulugu         | Kirmizi | Orta   | -           |
| 1   | Deep Research save/regenerate    | Kirmizi | Dusuk  | -           |
| 3   | Species proximity filtresi       | Sari    | Dusuk  | -           |
| 2   | Rapor appendix tablolari         | Sari    | Orta   | -           |
| 4   | National Land Cover habitat data | Sari    | Yuksek | -           |
| 7   | Nehir mesafesi (river distance)  | Sari    | Yuksek | 6           |
| 8   | Data Analysis harita ozellikleri | Sari    | Yuksek | -           |

---

_Son guncelleme: 9 Mart 2026_
