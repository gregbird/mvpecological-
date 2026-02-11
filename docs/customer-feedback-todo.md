# Dulra MVP - Müşteri Geri Bildirimleri ve Yapılacaklar Listesi

> **Tarih:** 3 Şubat 2026
> **Versiyon:** 3.0 (11 Şubat 2026 güncellemesi)
> **Durum:** Geliştirme Aşaması

---

## İçindekiler

0. [Adım Adım Akış ve UX İyileştirmeleri (YENİ)](#0-adım-adım-akış-ve-ux-i̇yileştirmeleri)
1. [GIS ve Haritalama İyileştirmeleri ✅](#1-gis-ve-haritalama-i̇yileştirmeleri)
2. [Designated Sites Araştırması ve Deep Research ✅](#2-designated-sites-araştırması-ve-deep-research)
3. [Değerlendirici İş Akışı ve Sonuç Yönetimi](#3-değerlendirici-i̇ş-akışı-ve-sonuç-yönetimi)
4. [Tür Kaydı ve GBIF Entegrasyonu](#4-tür-kaydı-ve-gbif-entegrasyonu)
5. [Sonuçlar ve Harita Etkileşimi](#5-sonuçlar-ve-harita-etkileşimi)
6. [Admin Dashboard ve Demo Akışı](#6-admin-dashboard-ve-demo-akışı)
7. [Arama ve Denetim Yetenekleri](#7-arama-ve-denetim-yetenekleri)
8. [Yeni Proje Başlatma](#8-yeni-proje-başlatma)
9. [Findings Summary ve Etkileşim (YENİ)](#9-findings-summary-ve-etkileşim)
10. [Deep Research Panel - Stage 5 (YENİ)](#10-deep-research-panel---stage-5)
11. [Caspio Bird Database Entegrasyonu (YENİ - 8 Şubat)](#11-caspio-bird-database-entegrasyonu)
12. [Automated Web Search - Ecological Reports (YENİ - 8 Şubat)](#12-automated-web-search---ecological-reports)
13. [Ecological Summary Auto-Generation (YENİ - 8 Şubat)](#13-ecological-summary-auto-generation)
14. [~~Smart Scoping~~ ❌ İPTAL](#14-smart-scoping---field-survey-önerileri)
15. [Photo & Asset Management (YENİ - 8 Şubat)](#15-photo--asset-management)
16. [Relevé Survey Entegrasyonu (YENİ - 8 Şubat)](#16-relevé-survey-entegrasyonu)
17. [Desk Assessment İşlevsellik İyileştirmeleri (YENİ - 11 Şubat)](#17-desk-assessment-i̇şlevsellik-i̇yileştirmeleri)
18. [Field Survey Sayfa Düzenlemeleri (YENİ - 11 Şubat)](#18-field-survey-sayfa-düzenlemeleri)
19. [Habitat Mapping Araç Güncellemeleri (YENİ - 11 Şubat)](#19-habitat-mapping-araç-güncellemeleri)
20. [Target Notes ve Species Observations Güncellemeleri (YENİ - 11 Şubat)](#20-target-notes-ve-species-observations-güncellemeleri)
21. [Reporting ve Data Analysis Kapsamlı Erişim (YENİ - 11 Şubat)](#21-reporting-ve-data-analysis-kapsamlı-erişim)
22. [AI Reporting - Uygulama İçi Rapor Düzenleme (YENİ - 11 Şubat)](#22-ai-reporting---uygulama-i̇çi-rapor-düzenleme)

---

## 0. Adım Adım Akış ve UX İyileştirmeleri (YENİ)

> **Kaynak:** Müşteri feedback dokümanının "Step 1-5" akış açıklaması. Bu bölüm feedback'te detaylı olarak tarif edilen uçtan uca kullanıcı akışını içerir.

### 0.1 Satellite Layer Bug Fix

**Müşteri İsteği (Orijinal):**

> A persistent bug is noted: when the satellite layer is active during this step, the application incorrectly reverts the map view back to the streets layer. This must be fixed to ensure layer persistence and a consistent user experience.

**Müşteri İsteği (Türkçe):**
Buffer zone adımında satellite katmanı aktifken uygulama yanlışlıkla haritayı streets katmanına geri döndürüyor. Katman kalıcılığı ve tutarlı kullanıcı deneyimi sağlanmalı.

**Yapılacaklar:**

- [x] ~~**0.1.1** Bug'ı tespit et ve reprodüce et~~

  ✅ **TAMAMLANDI (11 Şubat 2026):**
  - Kök neden: react-leaflet `TileLayer` `url` prop değiştiğinde tile'ları güncellemiyordu
  - `key={currentStyle}` prop'u eklenerek `TileLayer` katman değişiminde yeniden mount ediliyor
  - Dosyalar: `project-map-with-draw.tsx`, `project-map.tsx`

- [x] ~~**0.1.2** Harita katman seçimini adımlar arası persist et~~

  ✅ **TAMAMLANDI (11 Şubat 2026):**
  - `baseMapStyle` state'i zaten parent'ta substep'ler arası korunuyordu
  - SessionStorage ile sayfa navigasyonlarında da persist ediliyor (`gis-map-style-{projectId}`)
  - Dosya: `gis-mapping-step.tsx`

---

### 0.2 Otomatik Veri Katmanı Açılması

**Müşteri İsteği (Orijinal):**

> Upon completing Step 2 (clicking "next"), the application must automatically enable and display the data sets layer.

**Müşteri İsteği (Türkçe):**
Step 2 (Buffer Zone) tamamlanıp "next" butonuna tıklandığında uygulama otomatik olarak veri katmanlarını açıp göstermeli.

**Yapılacaklar:**

- [x] ~~**0.2.1** Buffer adımından Layers adımına geçişte otomatik layer aktivasyonu~~

  ✅ **TAMAMLANDI (zaten mevcut):**
  - `goNext()` fonksiyonu `buffers` → `layers` geçişinde `getDefaultVisibleLayers()` ile NPWS katmanlarını (SAC, SPA, NHA, pNHA) otomatik aktif ediyor
  - `layers` adımına geçildiğinde `fetchLayerData()` otomatik tetikleniyor
  - Tüm veri tipleri (NPWS + Rivers + Lakes + Catchments) paralel çekiliyor
  - Arama alanı: boundary + en büyük buffer (seçilmediyse varsayılan 5km)
  - Dosya: `components/steps/gis-mapping-step.tsx` (satır 626-643, 430-434, 360-427)

---

### 0.3 Veri Katmanı Yan Panel (Side UI)

**Müşteri İsteği (Orijinal):**

> The UI must introduce a dedicated column or side panel to display the available data layers and their details. The user should be able to review the available information from the data layers in a side UI and explicitly save or select the relevant ones for the subsequent analysis.

**Müşteri İsteği (Türkçe):**
Mevcut veri katmanlarını ve detaylarını göstermek için ayrılmış bir kolon veya yan panel eklenmeli. Kullanıcı katmanları inceleyip sonraki analiz için ilgili olanları seçip kaydedebilmeli.

**Yapılacaklar:**

- [x] ~~**0.3.1** Layers adımında veri katmanları yan paneli güncelle~~

  ✅ **TAMAMLANDI (zaten mevcut):**
  - 320px yan panel zaten layers substep'te mevcut (`gis-mapping-step.tsx`)
  - 4 kategori (NPWS, Rivers, Lakes, Catchments) collapsible sections
  - Her item'da: isim, tip, alan/uzunluk, WFD durumu, count badge
  - Toggle, ignore (göz), delete (X) butonları
  - Tıklayınca haritada fly-to, NPWS/EPA linkleri
  - `visibleLayers` veritabanına persist ediliyor (`project.visible_layers`)

---

### 0.4 Core Database Search (Data Gathering Otomasyonu)

**Müşteri İsteği (Orijinal):**

> Once the user clicks "save" and proceeds by clicking "next," the application must initiate a comprehensive search of the core environmental database. This lookup will be executed for each data layer saved in Step 3.

**Müşteri İsteği (Türkçe):**
Kullanıcı "kaydet" edip "next" tıkladığında uygulama, Step 3'te kaydedilen her veri katmanı için kapsamlı veritabanı araması başlatmalı.

**Yapılacaklar:**

- [ ] **0.4.1** GIS Mapping'den Data Gathering'e otomatik geçiş ve arama tetikleme
  - GIS Mapping tamamlandığında Data Gathering'e geçerken otomatik arama başlat
  - Seçili katmanlar için sırayla NPWS, GBIF, EPA sorgularını çalıştır

---

### 0.5 Harita-Bulgu Etkileşimli Senkronizasyon

**Müşteri İsteği (Orijinal):**

> A crucial feature is the interactive link between the map and the findings panel: As the user scrolls or hovers the map cursor over a highlighted area, the corresponding data entry in the UI side panel must highlight simultaneously.

**Müşteri İsteği (Türkçe):**
Harita ve bulgular paneli arasında etkileşimli bağlantı kurulmalı. Kullanıcı haritada bir alana tıkladığında/hover ettiğinde, UI yan panelindeki ilgili veri girişi eşzamanlı olarak vurgulanmalı.

**Yapılacaklar:**

- [ ] **0.5.1** Harita → Bulgular paneli senkronizasyonu
  - Haritada bir feature'a hover/click → ilgili finding kartını highlight et ve scroll-into-view yap
- [ ] **0.5.2** Bulgular paneli → Harita senkronizasyonu
  - Finding kartına hover/click → haritada ilgili feature'ı highlight et ve zoom yap
- [ ] **0.5.3** Pulse animasyonu ve geçici highlight efekti ekle

---

### 0.6 "Move to Next Stage" Butonu

**Müşteri İsteği (Orijinal):**

> To improve the flow, a clear, persistent "Move to Next Stage" button should be placed in the bottom left corner of the screen to guide the user to the next analytical phase.

**Müşteri İsteği (Türkçe):**
Akışı iyileştirmek için ekranın sol alt köşesine kullanıcıyı bir sonraki analitik aşamaya yönlendirecek kalıcı "Bir Sonraki Aşamaya Geç" butonu yerleştirilmeli.

**Yapılacaklar:**

- [ ] **0.6.1** Sabit "Move to Next Stage" butonu ekle
  - Sol alt köşe, tüm adımlarda görünür
  - Mevcut adım durumuna göre aktif/pasif
  - Dosya: `components/steps/` - ortak footer bileşeni

---

### 0.7 Satellite Layer Varsayılan Yapma

**Müşteri İsteği (Orijinal):**

> The satellite layer must be the default map view for all subsequent stages of the analysis.

**Müşteri İsteği (Türkçe):**
Analizin sonraki tüm aşamalarında (Stage 4+) satellite katmanı varsayılan harita görünümü olmalı.

**Yapılacaklar:**

- [ ] **0.7.1** Data Gathering ve sonraki adımlar için varsayılan harita katmanını satellite yap
  - Dosya: `components/maps/project-map.tsx`, `components/maps/project-map-with-draw.tsx`
  - Step numarasına göre koşullu: Step 1-3 streets, Step 4+ satellite

---

## 1. GIS ve Haritalama İyileştirmeleri

### 1.1 Çoklu Katman Seçenekleri

**Müşteri İsteği (Orijinal):**

> Implement the capability for the assessor to toggle and view various data layers on the GIS map. This should include Satellite Imagery as a primary base layer option, and other relevant base layers (e.g., Ordnance Survey mapping, administrative boundaries).

**Müşteri İsteği (Türkçe):**
Değerlendiricinin GIS haritasında çeşitli veri katmanlarını açıp kapatabileceği ve görüntüleyebileceği özellik eklenmeli. Birincil temel katman seçeneği olarak uydu görüntüsü ve diğer ilgili temel katmanlar (Ordnance Survey haritaları, idari sınırlar vb.) bulunmalı.

**Yapılacaklar:**

- [x] ~~**1.1.1** Harita bileşenine temel katman değiştirici (base layer switcher) ekle~~

  ✅ Layers butonu eklendi, Boundary Info sol alta taşındı

- [x] ~~**1.1.2** Uydu görüntüsü katmanı ekle~~

  ✅ 4 katman eklendi: Streets, Satellite, Hybrid (uydu+etiket), Topographic

- [x] ~~**1.1.3** Ordnance Survey Ireland (OSi) harita katmanı ekle~~

  ✅ **TAMAMLANDI (4 Şubat 2026):**
  - OSi Mart 2023'te kapatıldı, **Tailte Éireann**'a devredildi
  - Premium MapGenie servisi ücretli ve auth gerektiriyor
  - Alternatif olarak **GeoHive** ve **data.gov.ie** ücretsiz veri kaynakları kullanıldı
  - Mevcut base layer'lar (OSM, ESRI Satellite, Topo) yeterli görüldü

- [x] ~~**1.1.4** İdari sınırlar katmanı ekle (county, townland)~~

  ✅ **TAMAMLANDI (4 Şubat 2026):**

  **County Sınırları:**
  - data.gov.ie'den 31 county sınırı indirildi ve optimize edildi (68MB → 2.2MB)
  - Dosya: `public/data/counties-ireland.geojson`
  - Province bazlı renklendirme: Leinster (mavi), Munster (yeşil), Connacht (turuncu), Ulster (kırmızı)
  - Popup: County adı (İngilizce/İrlandaca), province, attribution

  **Townland Sınırları:**
  - Tailte Éireann ArcGIS REST API entegrasyonu
  - API: `/api/boundaries/townlands?bbox=...`
  - On-demand loading: Sadece zoom 12+ seviyesinde yüklenir (performans için)
  - ~51,000 townland, mor renk kesikli çizgi ile gösterim

  **Eklenen Dosyalar:**
  - `public/data/counties-ireland.geojson`
  - `lib/config/boundary-layers.ts`
  - `components/maps/county-boundaries-layer.tsx`
  - `app/api/boundaries/townlands/route.ts`

  **Güncellenen Dosyalar:**
  - `lib/config/dataset-layers.ts` - Boundaries grubu
  - `components/maps/project-map.tsx` - Layer entegrasyonu
  - `components/maps/project-map-with-draw.tsx` - Layer entegrasyonu

  **Attribution:** © Tailte Éireann (CC-BY 4.0)

---

### 1.2 Buffer Zone Uygulama Netliği

**Müşteri İsteği (Türkçe):**
Değerlendirici haritada bir buffer zone seçtiğinde ne olduğu netleştirilmeli.

**Yapılanlar:**

- [x] ~~**1.2.1** Buffer zone açıklamalarını güncelle~~

  ✅ Her buffer mesafesi için detaylı açıklama eklendi (lib/gis/buffer.ts)

**❓ Müşteriye Sorular:**

> **1. Buffer'a göre farklı aramalar:**
> Şu an tüm buffer mesafeleri aynı aramayı yapıyor. Farklı buffer'lar için farklı aramalar mı istiyorsunuz?
>
> - Örnek: 2km → NPWS+GBIF+EPA, 15km → Sadece NPWS Natura 2000
> - Yoksa mevcut hali (sadece alan büyüklüğü farklı) yeterli mi?
>
> **2. Buffer seçimi nerede yapılsın:**
> Şu an buffer seçimi iki farklı yerde var (GIS Mapping ve Data Gathering). Bunlar birbirinden bağımsız çalışıyor. Nasıl olmasını istersiniz?
>
> - A) GIS Mapping'de seçilen buffer otomatik olarak Data Gathering'e taşınsın
> - B) Her adımda ayrı buffer seçimi kalsın
> - C) Tek bir yerde olsun (hangisi?)

---

### 1.3 Veri Katmanı Bilgi Erişimi

**Müşteri İsteği (Orijinal):**

> When a data layer is displayed on the map, enable the assessor to click on the data layer itself (or an associated legend item) to open a link that provides further details, metadata, and background information about the data source, methodology, and relevance.

**Müşteri İsteği (Türkçe):**
Haritada bir veri katmanı görüntülendiğinde, değerlendirici katmana veya lejant öğesine tıklayarak veri kaynağı, metodoloji ve ilgililik hakkında daha fazla ayrıntı, metadata ve arka plan bilgisi sağlayan bir link açabilmeli.

**Yapılacaklar:**

- [x] ~~**1.3.1** Katman metadata yapısı oluştur~~
- [x] ~~**1.3.2** NPWS katmanları için metadata tanımla~~
- [x] ~~**1.3.3** EPA katmanları için metadata tanımla~~
- [x] ~~**1.3.4** Lejant bileşenine bilgi butonu ekle~~
- [x] ~~**1.3.5** Katman bilgi modal/panel bileşeni oluştur~~

✅ **TAMAMLANDI (4 Şubat 2026):**

**Katman Metadata Sistemi:**

- Detaylı metadata yapısı oluşturuldu: `lib/config/layer-metadata.ts`
- Her katman için: name, nameIrish, source, sourceUrl, description, methodology, lastUpdated, coverage, license, attribution, relevance, dataFormat, updateFrequency, contactInfo

**NPWS Katmanları (4 adet):**

- SAC: Special Areas of Conservation - EU Habitats Directive (92/43/EEC)
- SPA: Special Protection Areas - EU Birds Directive (2009/147/EC)
- NHA: Natural Heritage Areas - Wildlife (Amendment) Act 2000
- pNHA: Proposed Natural Heritage Areas
- Her biri için NPWS resmi dokümantasyon linki ve AA/EcIA ilgililik bilgisi

**EPA Katmanları (4 adet):**

- Rivers: WFD River Water Bodies
- Lakes: WFD Lake Water Bodies
- Catchments: WFD Catchment Boundaries
- WFD River Status: Ecological status sınıflandırması (High/Good/Moderate/Poor/Bad)

**Boundaries Katmanları (2 adet):**

- Counties: data.gov.ie / OSi kaynaklı county sınırları
- Townlands: Tailte Éireann kaynaklı townland sınırları

**Bilgi Butonu ve Modal:**

- Her katman satırında (i) bilgi ikonu eklendi
- Tıklandığında detaylı modal açılıyor:
  - Description, Methodology, Relevance for Projects
  - Technical Details (Coverage, Last Updated, Update Frequency, Data Format)
  - License bilgisi ve link
  - Contact info (email)
  - "Go to Source" butonu ile resmi kaynağa yönlendirme

**Harita Popup'ları - Site-Specific Linkler:**

- **NPWS:** Her site için direkt link → `npws.ie/protected-sites/sac/000191`
- **EPA Rivers:** Catchments.ie direkt link → `catchments.ie/data/#/waterbody/IE_SH_26B080100`
- **EPA Lakes:** Catchments.ie direkt link → `catchments.ie/data/#/waterbody/IE_SH_26_159`
- **EPA Catchments:** Catchments.ie direkt link → `catchments.ie/data/#/catchment/26A`

**EPA Popup Zenginleştirme:**

- Rivers: Code, Basin, Length (km), Type, Local Authority
- Lakes: Code, Basin, Area (ha), Catchment, Local Authority
- Catchments: ID, Area (km²), District
- EPA WFS API field mapping düzeltildi (LENGTHKM, MS_CD, AreaHectare, vb.)

**Data Layers Panel Temizliği:**

- Administrative Boundaries (Counties, Townlands) kaldırıldı
- Bu katmanlar zaten harita üzerinde "Layers" dropdown'unda mevcut

**Eklenen Dosyalar:**

- `lib/config/layer-metadata.ts` - Tüm katman metadata tanımları
- `components/gis/layer-info-modal.tsx` - Modal bileşeni ve LayerInfoButton

**Güncellenen Dosyalar:**

- `components/gis/dataset-layers-panel.tsx` - Bilgi butonu entegrasyonu
- `components/maps/npws-layer-overlay.tsx` - Site-specific NPWS linki
- `components/maps/epa-layer-overlay.tsx` - Catchments.ie linkleri, zengin popup
- `lib/external-apis/epa.ts` - Doğru field mapping (LENGTHKM, MS_CD, URL, vb.)
- `lib/config/dataset-layers.ts` - Boundaries grubu kaldırıldı

---

## 2. Designated Sites Araştırması ve Deep Research

### 2.1 Veri Setlerinin Veritabanına Entegrasyonu

**Müşteri İsteği (Orijinal):**

> For the NPWS Designated Sites Search, the application must automatically retrieve the official data. The data layers will provide the site name & code. The application will do an enhanced search for the habitats in ANNEX 1 AND FOSSITT classification along with the type of species conditions of the site using 3 data files in the application's database. For SAC & SPA: Site name and code should be taken from the data layers based on the radius of the search. Look up the Excel files with the name & code and search for the habitats and species and get a summary (4 lines of text) of the condition of the site with the SSCO URL.

**Müşteri İsteği (Türkçe):**
NPWS Koruma Alanları Araması için uygulama resmi verileri otomatik olarak almalı. Veri katmanları site adı ve kodunu sağlayacak. Uygulama, veritabanındaki 3 veri dosyasını kullanarak ANNEX 1 habitatları VE FOSSITT sınıflandırması ile birlikte türlerin site koşullarını içeren geliştirilmiş bir arama yapacak. SAC & SPA için site adı/kodu arama yarıçapına göre alınmalı, habitatlar ve türler bulunmalı, sitenin durumu hakkında 4 satırlık özet + SSCO URL'si alınmalı.

**Yapılacaklar:**

- [x] ~~**2.1.1** Müşteriden Excel dosyalarını al~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - SAC Excel (441 site, 1496 habitat, 365 tür) + SPA Excel (167 site, 913 kuş SCI)
  - Dosyalar müşteriden alındı ve işlendi

- [x] ~~**2.1.2** Excel dosyalarını parse et ve JSON/TypeScript'e dönüştür~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - Birleştirilmiş JSON: `lib/data/npws-sites-data.json` (608 site toplam)
  - Lookup modülü: `lib/data/npws-site-lookup.ts`
  - Fonksiyonlar: `getNPWSSiteData()`, `getSiteHabitats()`, `getSiteSpecies()`, vb.

- [x] ~~**2.1.3** Veritabanına entegrasyon~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - JSON tabanlı lokal veri yaklaşımı kullanıldı (Supabase tabloları yerine)
  - Deep Research modal ve AI endpoint'leri bu verileri kullanıyor

- [x] ~~**2.1.4** Site arama sorgusunu güncelle~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - NPWS'den site kodu alındığında lokal JSON'dan zenginleştirme yapılıyor
  - `deep-research-modal.tsx` bu verileri QIs sekmesinde gösteriyor

- [x] ~~**2.1.5** Site özeti oluşturma fonksiyonu~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - AI endpoint: `/api/ai/deep-research`
  - SSCO PDF indirilip `unpdf` ile parse edilip OpenAI'a gönderiliyor
  - Excel verileri + SSCO PDF metni birlikte analiz ediliyor

- [x] ~~**2.1.6** SSCO URL yapısı~~

  ✅ **TAMAMLANDI (6 Şubat 2026):**
  - Format: `https://www.npws.ie/sites/default/files/protected-sites/synopsis/SY{SITECODE}.pdf`
  - Excel verilerinden Statutory Instrument linkleri de alınıyor
  - Resources sekmesinde gösteriliyor

---

### 2.2 Deep Research İşlevselliği

**Müşteri İsteği (Orijinal):**

> Introduce an optional button labeled "Deep Research" for each designated site. Clicking this button should initiate a comprehensive, targeted search using both the site's official area name and the retrieved Qualifying Interests (QIs) as key search terms. The results must be displayed in a structured, categorized format. This deep research should specifically include a search for NPWS Article 17 reports.

**Müşteri İsteği (Türkçe):**
Her koruma alanı için "Deep Research" etiketli isteğe bağlı bir buton eklenmeli. Bu butona tıklamak, hem sitenin resmi alan adını hem de Qualifying Interests (QI'ler) anahtar arama terimleri olarak kullanarak kapsamlı, hedefli bir arama başlatmalı. Sonuçlar yapılandırılmış, kategorize formatta görüntülenmeli. Article 17 raporları için arama içermeli.

**Yapılacaklar:**

- [x] ~~**2.2.1** Deep Research butonunu UI'a ekle~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - `components/steps/data-gathering/findings-list.tsx` dosyasına eklendi
  - Her designated site satırına "Deep Research" butonu (FlaskConical ikonu)
  - Sadece SAC, SPA, NHA, pNHA türleri için görünür

- [x] ~~**2.2.2** Deep Research modal/panel bileşeni oluştur~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - Dosya: `components/desk-research/deep-research-modal.tsx`
  - 4 sekmeli yapılandırılmış görünüm:
    - **Overview:** Site bilgileri, koruma durumu açıklaması
    - **Status:** Article 17 koruma durumu özeti (FV/U1/U2), trendler
    - **Habitats:** QI habitatları detaylı listesi
    - **Resources:** NPWS linkleri (Synopsis, Conservation Objectives, Article 17)
  - Loading durumu ve hata yönetimi

- [x] ~~**2.2.3** Article 17 rapor arama fonksiyonu oluştur~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - Dosya: `lib/data/article17-habitats.ts`
  - NPWS Article 17 Report 2025 verileri lokal olarak eklendi
  - ~50 Annex I habitat için: Conservation Status, Trend, Pressures, Threats, Priority habitat bilgisi
  - Helper fonksiyonlar: `getArticle17Data()`, `getHabitatsSummary()`, `getStatusDisplay()`, `getTrendDisplay()`

  **⚠️ Kısıtlama:** NPWS'nin Article 17 için public API'si yok. Veriler statik olarak eklendi. Yeni Article 17 raporu yayınlandığında manuel güncelleme gerekir.

  **🔧 Çözüm Önerisi - Hibrit Yaklaşım:**
  - Önce lokal `article17-habitats.ts` verilerine bak (hızlı, ücretsiz)
  - Veri yoksa veya kullanıcı "Refresh" tıklarsa → OpenAI web search ile canlı çek
  - Sonucu 24 saat cache'le

- [x] ~~**2.2.4** Deep Research arama mantığı~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - QI araması için SSCO lookup eklendi: `lib/data/ssco-lookup.ts`
  - `getHabitatsBySiteCode()`: Site koduna göre habitat listesi
  - `normalizeHabitatCode()`: Kirli veri temizliği
  - Habitat kodları Article 17 verileriyle zenginleştiriliyor

  **⚠️ Veri Kalitesi Sorunu:** ~158 site hiç habitat verisi yok (SSCO'da gerçekten boş)

  **🔧 Çözüm Önerileri:**

  | Seçenek               | Açıklama                         | Avantaj             | Dezavantaj            |
  | --------------------- | -------------------------------- | ------------------- | --------------------- |
  | **NPWS Excel Import** | Müşteriden güncel SSCO Excel al  | En doğru resmi veri | Manuel süreç          |
  | **OpenAI Web Search** | Boş siteler için otomatik doldur | Otomatik, hızlı     | API maliyeti (~$1.58) |

- [x] ~~**2.2.5** Sonuç kategorileri tanımla~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - 4 tab ile kategorize: Overview, Status, Habitats, Resources

- [x] ~~**2.2.6** Deep Research sonuçlarını veritabanına kaydet~~

  ✅ **TAMAMLANDI (5 Şubat 2026):**
  - Tablo: `deep_research_results` (Supabase migration uygulandı)
  - Query fonksiyonları: `lib/supabase/queries/deep-research.ts`
  - React Query hooks: `useProjectDeepResearch()`, `useSiteDeepResearch()`, `useSaveDeepResearch()`
  - UI: Modal'da "Save Research" butonu

**📁 Eklenen/Güncellenen Dosyalar:**

- `components/desk-research/deep-research-modal.tsx` (YENİ)
- `lib/data/article17-habitats.ts` (YENİ)
- `lib/data/ssco-lookup.ts` (GÜNCELLENDİ)
- `lib/supabase/queries/deep-research.ts` (YENİ)
- `hooks/use-project-data.ts` (GÜNCELLENDİ)
- `components/steps/data-gathering/findings-list.tsx` (GÜNCELLENDİ)

---

**❌ YAPILAMAYANLAR:**

| İstek                               | Durum         | Neden                                                                          | Çözüm Önerisi                                                           |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Site ismi ile web araması**       | ❌ Yapılmadı  | Müşteri "site name" ile arama istedi, biz sadece modal başlığında gösteriyoruz | OpenAI web search ile site adı kullanarak ek bilgi çekilebilir          |
| **Article 17 gerçek zamanlı arama** | ❌ Yapılmadı  | Müşteri "search for Article 17 reports" istedi, biz statik veri kullanıyoruz   | OpenAI web search ile NPWS'den güncel Article 17 verisi çekilebilir     |
| **~158 site için habitat verisi**   | ❌ Eksik veri | SSCO kaynak verisinde bu siteler için habitat bilgisi yok (boş/null)           | OpenAI ile NPWS sitesinden çekilebilir veya müşteriden Excel alınabilir |

**📋 ~158 Site Eksik Habitat Verisi - Detaylı Açıklama:**

Habitat verisi `lib/data/ssco-lookup.ts` dosyasından çekiliyor (lokal statik veri).

```
SSCO Kaynak Verisi Durumu:
┌─────────────────────────────────────────────────┐
│ Durum                      │ Site Sayısı        │
├────────────────────────────┼────────────────────┤
│ Habitat verisi var         │ ~270 site ✅       │
│ Kirli veri (düzeltildi)    │ ~173 site ✅       │
│ Tamamen boş (null/"")      │ ~158 site ❌       │
└─────────────────────────────────────────────────┘
```

**Neden boş?** SSCO kaynak Excel/CSV'sinde bu siteler için habitat kolonu boş veya null. Bizim kodumuz değil, kaynak veri sorunu.

**Ne yaptık:**

- `normalizeHabitatCode()` ile kirli veriyi temizledik ("Potential 1330" → "1330", "1310 / 1330" → ["1310", "1330"])
- Ama kaynak veride hiç veri yoksa yapacak bir şey yok

**Çözüm seçenekleri:**

1. Müşteriden güncel SSCO Excel dosyası almak (en doğru)
2. OpenAI web search ile NPWS sitesinden her site için habitat çekmek (~$1.58 maliyet)

**🔧 Site İsmi Araması İçin Çözüm:**

Müşteri isteği: "...using both the site's official area name and the retrieved Qualifying Interests (QIs) as key search terms"

Şu an:

- ✅ QI'ler → SSCO lookup ile habitat kodları
- ❌ Site ismi → Sadece başlıkta gösteriliyor, arama yapılmıyor

Öneri: OpenAI web search ile site adı kullanarak ek bilgi çekmek:

- Conservation news/updates
- Management plans
- Recent assessments
- Local ecological reports

---

## 3. Değerlendirici İş Akışı ve Sonuç Yönetimi

### 3.1 Bulgu Yönetim Seçenekleri

**Müşteri İsteği (Orijinal):**

> On the results or findings page, the assessor must have the following options: Removal - The ability to permanently remove irrelevant findings from the current view. Saving (for Desk Assessment) - An option to save the current set of findings for later review.

**Müşteri İsteği (Türkçe):**
Sonuçlar veya bulgular sayfasında değerlendirici şu seçeneklere sahip olmalı: Kaldırma - İlgisiz bulguları kalıcı olarak kaldırma. Kaydetme - Mevcut bulgu setini daha sonra incelemek üzere Desk Assessment için kaydetme.

**Yapılacaklar:**

- [ ] **3.1.1** Mevcut bulgu yönetimi durumunu incele
  - Dosya: `components/steps/data-gathering/findings-list.tsx`
  - Mevcut: `is_saved` boolean flag var
  - Eksik: Kalıcı silme/kaldırma

- [ ] **3.1.2** Bulgu kaldırma (dismiss) özelliği ekle
  - Veritabanı: `is_dismissed` boolean kolonu ekle
  - UI: Her bulgu satırına "Kaldır" butonu (X ikonu)
  - Onay modal'ı: "Bu bulguyu kaldırmak istediğinizden emin misiniz?"

- [ ] **3.1.3** Toplu seçim ve işlem özelliği ekle
  - Checkbox ile çoklu seçim
  - "Seçilenleri Kaydet" butonu
  - "Seçilenleri Kaldır" butonu

- [ ] **3.1.4** Filtreleme seçenekleri ekle
  - "Tümü" | "Kaydedilenler" | "Kaldırılanlar"
  - Kaynak bazlı filtre: NPWS, GBIF, EPA, NBDC

- [ ] **3.1.5** Supabase query'lerini güncelle
  - Dosya: `lib/supabase/queries/findings.ts`

  ```typescript
  // Kaldırılan bulgular hariç getir
  async function getActiveFindings(projectId: string) {
    return supabase
      .from('desk_research_findings')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_dismissed', false)
  }

  // Bulguyu kaldır
  async function dismissFinding(findingId: string) {
    return supabase
      .from('desk_research_findings')
      .update({ is_dismissed: true, dismissed_at: new Date() })
      .eq('id', findingId)
  }
  ```

- [ ] **3.1.6** Migration dosyası oluştur
  ```sql
  ALTER TABLE desk_research_findings
  ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN dismissed_at TIMESTAMPTZ,
  ADD COLUMN dismissed_by UUID REFERENCES profiles(id);
  ```

---

## 4. Tür Kaydı ve GBIF Entegrasyonu

### 4.1 Türler için Deep Research

**Müşteri İsteği (Orijinal):**

> Each individual species finding retrieved from GBIF should have an associated automated "Deep Research" function. This function should execute a precise search using the defined area and the specific species type. The result should be a highly concise, two-line summary presenting the most critical contextual information about the species in that area. The UX/UI must prioritize these detailed findings, giving them more prominence than the general map view.

**Müşteri İsteği (Türkçe):**
GBIF'den alınan her bireysel tür bulgusu için ilişkili otomatik "Deep Research" işlevi olmalı. Bu işlev, tanımlanan alan ve belirli tür tipini kullanarak kesin bir arama yürütmeli. Sonuç, o alandaki tür hakkında en kritik bağlamsal bilgiyi sunan iki satırlık özet olmalı. UX/UI bu detaylı bulgulara öncelik vermeli, genel harita görünümünden daha fazla önem verilmeli.

**Yapılacaklar:**

- [ ] **4.1.1** Species Deep Research butonu ekle
  - Dosya: `components/steps/data-gathering/species-records-substep.tsx`
  - Her tür satırına "Deep Research" butonu

- [ ] **4.1.2** Species Deep Research servisi oluştur
  - Dosya: `lib/services/species-deep-research.ts`

  ```typescript
  interface SpeciesDeepResearchResult {
    scientificName: string
    commonName: string
    twoLineSummary: string // Kritik!
    protectionStatus: {
      wildlife_act: boolean
      eu_habitats_directive: boolean
      eu_birds_directive: boolean
      red_list_status: string
    }
    localContext: {
      recordCount: number
      lastSeen: Date
      typicalHabitat: string
    }
  }
  ```

- [ ] **4.1.3** İki satırlık özet oluşturma mantığı

  ```typescript
  // Örnek çıktı:
  // "Lutra lutra (Otter) - Annex II/IV species, strictly protected under Wildlife Act.
  //  12 records within 2km since 2015, associated with FW2 river habitats."

  function generateTwoLineSummary(species: SpeciesData, context: AreaContext): string {
    const line1 = `${species.scientificName} (${species.commonName}) - ${getProtectionSummary(species)}`
    const line2 = `${context.recordCount} records within ${context.bufferKm}km since ${context.startYear}, associated with ${context.habitats.join(', ')} habitats.`
    return `${line1}\n${line2}`
  }
  ```

- [ ] **4.1.4** NBDC entegrasyonunu güçlendir
  - Dosya: `lib/external-apis/nbdc.ts`
  - Koruma durumu bilgisini zenginleştir
  - Red List durumu ekle

- [ ] **4.1.5** UI/UX yeniden tasarımı - Bulgular öncelikli
  - Dosya: `components/steps/data-gathering/species-records-substep.tsx`
  - Mevcut layout'u değiştir:
    - Önce: Harita büyük, liste küçük
    - Sonra: Liste/detay büyük, harita küçük veya toggle
  - Split view: Sol taraf detaylı bulgular, sağ taraf mini harita

- [ ] **4.1.6** Species card bileşeni oluştur
  - Dosya: `components/species/species-detail-card.tsx`
  - 2 satırlık özet prominent şekilde göster
  - Koruma rozetleri (badges)
  - "Haritada Göster" butonu
  - "Deep Research" butonu

---

## 5. Sonuçlar ve Harita Etkileşimi

### 5.1 Güvenilir "Haritada Görüntüle" İşlevi

**Müşteri İsteği (Orijinal):**

> The "View on Map" function must be fully reliable. Currently, for some results, clicking this option fails to correctly pinpoint or highlight the location on the map. This must be resolved.

**Müşteri İsteği (Türkçe):**
"Haritada Görüntüle" işlevi tamamen güvenilir olmalı. Şu anda bazı sonuçlar için bu seçeneğe tıklamak, konumu haritada doğru şekilde işaretlemiyor. Bu çözülmeli.

**Yapılacaklar:**

- [ ] **5.1.1** Mevcut "View on Map" implementasyonunu incele
  - Dosya: `components/steps/data-gathering/findings-list.tsx`
  - Hangi durumlarda çalışmıyor tespit et

- [ ] **5.1.2** Koordinat validasyonu ekle

  ```typescript
  function isValidCoordinate(lat: number, lng: number): boolean {
    // İrlanda sınırları içinde mi?
    const IRELAND_BOUNDS = {
      minLat: 51.4,
      maxLat: 55.5,
      minLng: -10.5,
      maxLng: -5.5,
    }
    return (
      lat >= IRELAND_BOUNDS.minLat &&
      lat <= IRELAND_BOUNDS.maxLat &&
      lng >= IRELAND_BOUNDS.minLng &&
      lng <= IRELAND_BOUNDS.maxLng
    )
  }
  ```

- [ ] **5.1.3** Geometri türüne göre zoom/focus mantığı
  - Point: Doğrudan zoom + marker highlight
  - Polygon: `fitBounds()` ile sığdır + polygon highlight
  - Null koordinat: Uyarı mesajı göster

- [ ] **5.1.4** Harita-bulgu senkronizasyonu
  - Bulgular listesinden haritaya event emit
  - Harita bileşeninde highlight state
  - Scroll-into-view + pulse animasyon

- [ ] **5.1.5** Koordinatı olmayan bulgular için fallback
  - Grid reference'dan koordinat hesapla
  - Site adından geocoding
  - "Konum bilgisi mevcut değil" mesajı

---

### 5.2 Geliştirilmiş Harita Konum Detayları

**Müşteri İsteği (Orijinal):**

> When an assessor clicks on a location or finding on the map, the resulting display needs to provide more information than the initial summary data. This should include an additional two lines of detailed summary.

**Müşteri İsteği (Türkçe):**
Değerlendirici haritada bir konuma veya bulguya tıkladığında, ortaya çıkan görüntü ilk özet verilerinden daha fazla bilgi sağlamalı. Ek iki satırlık detaylı özet içermeli.

**Yapılacaklar:**

- [ ] **5.2.1** Mevcut popup içeriğini incele
  - Dosya: `components/maps/project-map.tsx`
  - Şu anda ne gösteriliyor?

- [ ] **5.2.2** Zenginleştirilmiş popup bileşeni oluştur
  - Dosya: `components/maps/finding-popup.tsx`

  ```tsx
  interface FindingPopupProps {
    finding: Finding
    onSave: () => void
    onDismiss: () => void
    onDeepResearch: () => void
  }

  // İçerik yapısı:
  // ┌─────────────────────────────────┐
  // │ 🏛️ Site Adı / Tür Adı          │
  // │ Kaynak: NPWS | Tip: SAC        │
  // ├─────────────────────────────────┤
  // │ Detaylı özet satır 1...        │
  // │ Detaylı özet satır 2...        │
  // ├─────────────────────────────────┤
  // │ [💾 Kaydet] [🔍 Deep Research]  │
  // └─────────────────────────────────┘
  ```

- [ ] **5.2.3** Popup genişliği ve stil ayarları
  - Min-width: 300px
  - Max-width: 400px
  - Scroll için max-height

- [ ] **5.2.4** Popup'tan aksiyonlar
  - Kaydet butonu
  - Kaldır butonu
  - Deep Research butonu
  - "Daha Fazla" linki (tam detay modal)

---

### 5.3 Sonuç Kaydetme Özelliği

**Müşteri İsteği (Orijinal):**

> There is a critical requirement missing: the ability to save individual search results. This must be implemented. Each individual search result must also feature an option to initiate a "Deep Research" function.

**Müşteri İsteği (Türkçe):**
Eksik kritik bir gereksinim var: bireysel arama sonuçlarını kaydetme yeteneği. Bu uygulanmalı. Her bireysel arama sonucu da "Deep Research" işlevini başlatma seçeneği içermeli.

**Yapılacaklar:**

- [ ] **5.3.1** Mevcut kaydetme mekanizmasını incele
  - `desk_research_findings.is_saved` kolonu mevcut
  - Toggle fonksiyonu: `useToggleFindingSaved` hook'u mevcut
  - Sorun: UI'da yeterince belirgin değil mi?

- [ ] **5.3.2** Her sonuç satırına kaydet/kaldır butonları ekle
  - Kaydedilmemiş: ☆ (boş yıldız) → "Kaydet"
  - Kaydedilmiş: ★ (dolu yıldız) → "Kaydedildi"
  - Animasyonlu geçiş

- [ ] **5.3.3** Kaydetme durumu göstergesi
  - Badge: "Kaydedildi ✓"
  - Liste filtreleme: Sadece kaydedilenler

- [ ] **5.3.4** Deep Research butonu her sonuca ekle
  - Sonuç tipine göre farklı Deep Research:
    - Designated Site → Site Deep Research
    - Species Record → Species Deep Research
    - Water Body → Hydrology Research

---

### 5.4 Baseline Conditions Report Çıktısı

**Müşteri İsteği (Orijinal):**

> The outcome for the Desk research should be organized into a Baseline Conditions Report. This serves as the "Control". It follows this hierarchy:
>
> 1. Designated Sites Matrix
> 2. Biological Records Map
> 3. Habitat Inventory
> 4. Hydrology & Connectivity Analysis

**Müşteri İsteği (Türkçe):**
Desk Research çıktısı Baseline Conditions Report olarak organize edilmeli. Bu "Kontrol" görevi görür. Şu hiyerarşiyi takip eder:

1. Designated Sites Matrix: 2-15km yarıçapında yasal ve yasal olmayan koruma alanları tablosu
2. Biological Records Map: Son 10 yıldan korunan tür gözlemleri haritası
3. Habitat Inventory: Hava fotoğrafı ve tarihsel verilerle ön habitat haritası
4. Hydrology & Connectivity Analysis: Su yolları ve yeşil koridorlar

**Yapılacaklar:**

- [ ] **5.4.1** Baseline Conditions Report veri yapısı
  - Dosya: `types/baseline-report.ts`

  ```typescript
  interface BaselineConditionsReport {
    projectId: string
    generatedAt: Date

    designatedSitesMatrix: {
      statutory: DesignatedSite[] // Natura 2000, NHA
      nonStatutory: DesignatedSite[] // pNHA, Local Wildlife Sites
      zoneOfInfluence: string // "2km - 15km"
    }

    biologicalRecordsMap: {
      protectedSpecies: SpeciesRecord[]
      dateRange: { start: Date; end: Date } // Son 10 yıl
      layerConfig: MapLayerConfig
    }

    habitatInventory: {
      preliminaryHabitats: HabitatPolygon[]
      dataSource: string // "Aerial photography + historical land-use"
      confidenceLevel: 'preliminary' | 'verified'
    }

    hydrologyConnectivity: {
      watercourses: Watercourse[]
      greenCorridors: Corridor[]
      connectivityAssessment: string
    }
  }
  ```

- [ ] **5.4.2** Designated Sites Matrix bileşeni
  - Dosya: `components/reports/designated-sites-matrix.tsx`
  - Tablo formatı: Site Adı, Kodu, Tipi, Mesafe, Durum
  - Yasal / Yasal Olmayan gruplandırma

- [ ] **5.4.3** Biological Records Map bileşeni
  - Dosya: `components/reports/biological-records-map.tsx`
  - Çok katmanlı GIS haritası
  - Son 10 yıl filtresi
  - Sadece korunan türler

- [ ] **5.4.4** Habitat Inventory bileşeni
  - Dosya: `components/reports/habitat-inventory.tsx`
  - Ön habitat haritası görünümü
  - FOSSITT kodları ile renklendirme

- [ ] **5.4.5** Hydrology & Connectivity bileşeni
  - Dosya: `components/reports/hydrology-connectivity.tsx`
  - Su yolları görselleştirme
  - Yeşil koridor analizi
  - Bağlantı değerlendirmesi metni

- [ ] **5.4.6** Baseline Report export fonksiyonu
  - PDF export
  - Word document export
  - GeoJSON export (harita verileri)

---

## 6. Admin Dashboard ve Demo Akışı

### 6.1 Logo Güncelleme

**Müşteri İsteği (Orijinal):**

> Can you update the logo and symbol to the following -> [Google Drive Link]

**Müşteri İsteği (Türkçe):**
Logo ve sembolü verilen linkteki ile güncelleyin.

**Yapılacaklar:**

- [ ] **6.1.1** Google Drive'dan logo dosyasını indir
  - Link: `https://drive.google.com/file/d/1heM2-RINehnpDOOP4tBc-rGbWm70o7cu/view`

- [ ] **6.1.2** Logo dosyalarını optimize et
  - SVG formatına dönüştür (mümkünse)
  - Farklı boyutlar: favicon, header, splash
  - Dark/light mode varyantları

- [ ] **6.1.3** Mevcut logo kullanımlarını güncelle
  - `public/logo.svg` veya `public/logo.png`
  - `app/layout.tsx` - favicon
  - `components/layout/sidebar.tsx` - sidebar logo
  - `components/layout/header.tsx` - header logo
  - `app/(auth)/layout.tsx` - auth sayfaları

---

### 6.2 Ana Admin Dashboard

**Müşteri İsteği (Orijinal):**

> The initial view must be the main Admin Dashboard, which serves as the central hub for all project-related information. This dashboard must clearly display:
>
> - Projects and Their Geographic Location
> - Project Status (On Track, At Risk, Delayed, Completed)
> - Workflow Status
> - Timeline Health

**Müşteri İsteği (Türkçe):**
İlk görünüm, tüm projeyle ilgili bilgiler için merkezi hub görevi gören ana Admin Dashboard olmalı. Dashboard şunları açıkça göstermeli:

- Projeler ve coğrafi konumları (harita veya gruplandırılmış liste)
- Proje durumu (Yolunda, Risk Altında, Gecikmiş, Tamamlandı)
- İş akışı durumu (darboğazlar, dikkat gerektiren aşamalar)
- Zaman çizelgesi sağlığı (planlanan programlara uyum)

**Yapılacaklar:**

- [ ] **6.2.1** Dashboard sayfasını yeniden tasarla
  - Dosya: `app/(dashboard)/dashboard/page.tsx`
  - Grid layout: 2x2 veya responsive

- [ ] **6.2.2** Proje Haritası widget'ı
  - Dosya: `components/dashboard/projects-map-widget.tsx`
  - Tüm projeleri haritada göster
  - Cluster markers for dense areas
  - Tıklanabilir markers → proje detayı

- [ ] **6.2.3** Proje Durumu özet kartları
  - Dosya: `components/dashboard/status-summary-cards.tsx`

  ```
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ 🟢 45    │ │ 🟡 12    │ │ 🔴 5     │ │ ✅ 3     │
  │ On Track │ │ At Risk  │ │ Delayed  │ │Completed │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
  ```

- [ ] **6.2.4** Workflow Status widget'ı
  - Dosya: `components/dashboard/workflow-status-widget.tsx`
  - Her adım için kaç proje o aşamada
  - Darboğaz göstergesi (5+ proje aynı adımda bekliyor)
  - Stacked bar chart veya funnel

- [ ] **6.2.5** Timeline Health widget'ı
  - Dosya: `components/dashboard/timeline-health-widget.tsx`
  - Gantt chart mini görünümü
  - Deadline yaklaşan projeler listesi
  - Ortalama gecikme süresi metriği

- [ ] **6.2.6** Quick Actions bölümü
  - "Yeni Proje Oluştur" butonu
  - "Bekleyen Onaylar" linki
  - "Son Aktiviteler" feed

---

### 6.3 Demo için 65 Proje

**Müşteri İsteği (Orijinal):**

> For the demo, ensure the platform displays 65 projects that are intentionally positioned at random, different stages in their life cycle.

**Müşteri İsteği (Türkçe):**
Demo için platformun yaşam döngülerinde rastgele, farklı aşamalarda konumlandırılmış 65 proje gösterdiğinden emin olun.

**Yapılacaklar:**

- [ ] **6.3.1** Seed data script oluştur
  - Dosya: `scripts/seed-demo-projects.ts`
  - 65 proje oluştur
  - Rastgele workflow aşamaları
  - Rastgele durumlar (on_track, at_risk, delayed)
  - İrlanda genelinde dağıtılmış konumlar

- [ ] **6.3.2** Proje adları için İrlanda lokasyonları kullan

  ```typescript
  const locations = [
    'Ballymun Residential Development',
    'Cork Harbour Industrial Estate',
    'Galway Bay Wind Farm',
    'Shannon Estuary Port Extension',
    // ... 65 adet
  ]
  ```

- [ ] **6.3.3** Gerçekçi tarihler oluştur
  - Başlangıç: Son 6 ay içinde
  - Deadline: Gelecek 3 ay içinde
  - Bazıları geçmiş deadline (delayed için)

- [ ] **6.3.4** Workflow adımları dağılımı
  - Step 1-3 (Desk Research): 20 proje
  - Step 4-6 (Field Research): 25 proje
  - Step 7-10 (Reporting): 15 proje
  - Completed: 5 proje

- [ ] **6.3.5** Demo verilerini kolayca sıfırlama scripti
  ```bash
  npm run seed:demo      # Demo verileri oluştur
  npm run seed:reset     # Demo verilerini sil
  ```

---

### 6.4 Detaylı Proje Görünümü

**Müşteri İsteği (Orijinal):**

> The presenter should click into one specific project from the main dashboard. This action must transition to a detailed project view that clearly shows Completion Status and Pending Status.

**Müşteri İsteği (Türkçe):**
Sunucu ana dashboard'dan bir projeye tıklamalı. Bu, tamamlanmış ve bekleyen öğeleri açıkça gösteren detaylı proje görünümüne geçiş yapmalı.

**Yapılacaklar:**

- [ ] **6.4.1** Proje detay sayfasını güncelle
  - Dosya: `app/(dashboard)/projects/[id]/page.tsx`
  - Hero section: Proje adı, durum, ilerleme yüzdesi

- [ ] **6.4.2** Completion Status bileşeni
  - Dosya: `components/project/completion-status.tsx`
  - Tamamlanan adımlar listesi ✅
  - Her adım için tamamlanma tarihi
  - Sorumlu kişi

- [ ] **6.4.3** Pending Status bileşeni
  - Dosya: `components/project/pending-status.tsx`
  - Bekleyen adımlar listesi ⏳
  - Tahmini tamamlanma
  - Blocker varsa göster

- [ ] **6.4.4** Progress visualization
  - Circular progress indicator
  - Veya horizontal stepped progress bar
  - Fazlar arası geçiş göstergesi

---

## 7. Arama ve Denetim Yetenekleri

### 7.1 Geçmiş Proje Arama

**Müşteri İsteği (Orijinal):**

> The system must allow administrators to efficiently search and retrieve information on past, archived, or completed projects. The enhancement should prioritize user-centric search filters, faster indexing, and more relevant result presentation.

**Müşteri İsteği (Türkçe):**
Sistem, yöneticilerin geçmiş, arşivlenmiş veya tamamlanmış projeler hakkında bilgileri verimli bir şekilde aramasına izin vermeli. Kullanıcı odaklı arama filtreleri, daha hızlı indeksleme ve daha ilgili sonuç sunumu önceliklendirilmeli.

**Yapılacaklar:**

- [ ] **7.1.1** Harici feedback dokümanını incele
  - Link: Google Docs (müşteriden alınacak)
  - Gereksinimleri çıkar

- [ ] **7.1.2** Gelişmiş arama UI'ı
  - Dosya: `components/search/advanced-search.tsx`
  - Filtreler:
    - Proje tipi (PEA, EcIA, AA, NIS)
    - Tarih aralığı
    - Durum (completed, archived)
    - Lokasyon (county)
    - Ekip üyesi
    - Müşteri

- [ ] **7.1.3** Full-text search implementasyonu
  - Supabase full-text search kullan
  - Veya Algolia/Meilisearch entegrasyonu

- [ ] **7.1.4** Arama sonuçları sayfası
  - Dosya: `app/(dashboard)/search/page.tsx`
  - Sayfalama
  - Sıralama seçenekleri
  - Sonuç önizleme kartları

- [ ] **7.1.5** "Son Aramalar" özelliği
  - Kullanıcı bazlı arama geçmişi
  - Hızlı erişim için kayıtlı aramalar

---

### 7.2 Denetim İzi (Audit Trail)

**Müşteri İsteği (Orijinal):**

> A complete and unalterable Audit Trail must be accessible to track all significant system activities, user actions, and data changes. The audit log must be comprehensive, time-stamped, and easily filterable.

**Müşteri İsteği (Türkçe):**
Tüm önemli sistem aktivitelerini, kullanıcı eylemlerini ve veri değişikliklerini takip etmek için tam ve değiştirilemez bir Denetim İzi erişilebilir olmalı. Denetim günlüğü kapsamlı, zaman damgalı ve kolayca filtrelenebilir olmalı.

**Yapılacaklar:**

- [ ] **7.2.1** Mevcut audit_log tablosunu incele
  - Yapı mevcut mu?
  - Hangi aksiyonlar loglanıyor?

- [ ] **7.2.2** Audit log trigger'ları ekle/güncelle

  ```sql
  -- Örnek trigger
  CREATE OR REPLACE FUNCTION audit_trigger()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      user_id,
      old_data,
      new_data,
      created_at,
      ip_address
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      auth.uid(),
      row_to_json(OLD),
      row_to_json(NEW),
      NOW(),
      current_setting('request.headers')::json->>'x-forwarded-for'
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **7.2.3** Audit Trail UI sayfası
  - Dosya: `app/(dashboard)/admin/audit/page.tsx`
  - Zaman çizelgesi görünümü
  - Filtreleme: Kullanıcı, tarih, aksiyon tipi, tablo

- [ ] **7.2.4** Audit log detay modal
  - Old vs New karşılaştırma (diff view)
  - Kullanıcı bilgisi
  - IP adresi ve tarayıcı bilgisi

- [ ] **7.2.5** Export fonksiyonu
  - CSV export
  - PDF rapor

- [ ] **7.2.6** Retention policy
  - Log saklama süresi belirleme
  - Otomatik arşivleme

---

## 8. Yeni Proje Başlatma

### 8.1 Proje Oluşturma İş Akışı

**Müşteri İsteği (Orijinal):**

> The process for initiating a new project should leverage the existing user interface component. For the demo, select "PEA" from the dropdown list to initiate the specific workflow for that project type.

**Müşteri İsteği (Türkçe):**
Yeni proje başlatma süreci mevcut kullanıcı arayüzü bileşenini kullanmalı. Demo için "PEA" seçilerek proje tipi bazlı iş akışı başlatılmalı.

**Yapılacaklar:**

- [ ] **8.1.1** Mevcut proje oluşturma akışını incele
  - Dosya: `app/(dashboard)/projects/new/page.tsx`
  - Proje tipi seçimi mevcut mu?

- [ ] **8.1.2** Proje tipi seçici ekle/güncelle
  - Dropdown veya radio button grup
  - Seçenekler:
    - PEA (Preliminary Ecological Appraisal)
    - EcIA (Ecological Impact Assessment)
    - AA Screening (Appropriate Assessment)
    - NIS (Natura Impact Statement)

- [ ] **8.1.3** Proje tipine göre workflow konfigürasyonu
  - Her tip için farklı adım seti?
  - Veya aynı 10 adım, farklı gereksinimler?

- [ ] **8.1.4** Quick-create modal
  - Dashboard'dan hızlı proje oluşturma
  - Minimum bilgi: Ad, tip, lokasyon
  - Detaylar sonra doldurulabilir

---

## 9. Findings Summary ve Etkileşim (YENİ)

> **Kaynak:** Müşteri feedback - "Stage 4: Findings Summary and Interaction"

### 9.1 Half-Screen Findings Summary Layout

**Müşteri İsteği (Orijinal):**

> The UI should adopt a half-screen map / half-screen summary panel layout. The summary panel serves as a high-level reminder and grouping of the findings.

**Müşteri İsteği (Türkçe):**
UI yarı-ekran harita / yarı-ekran özet paneli düzeni kullanmalı. Özet paneli bulguların üst düzey hatırlatıcısı ve gruplandırması görevi görmeli.

**Yapılacaklar:**

- [ ] **9.1.1** Findings Summary sayfası/görünümü oluştur
  - Half-map / half-panel layout
  - Satellite varsayılan katman

- [ ] **9.1.2** Bulgu gruplandırma paneli
  - Gruplar ve sayılar:
    - **Habitat/s** (farklı habitat tipi sayısı)
    - **Species** (korunan tür kaydı sayısı)
    - **Designated Sites** (benzersiz koruma alanı sayısı)
    - **Aquatic** (nehir, su kütlesi sınıflandırması sayısı)
  - Her gruba tıklanınca detay listesi açılır

---

### 9.2 Bireysel Bulgu Kartları ve AI Özet

**Müşteri İsteği (Orijinal):**

> A list with each individual finding is displayed, each contained within its own dedicated box/card. Clicking a prominent arrow icon on the finding's card will trigger the display of an AI-generated 3-line summary. This summary must provide key, actionable information about that specific finding.

**Müşteri İsteği (Türkçe):**
Her bulgu kendi kutu/kartı içinde gösterilmeli. Kartın üzerindeki ok ikonuna tıklamak AI üretimi 3 satırlık özeti görüntülemeli. Bu özet bulgu hakkında anahtar, eyleme geçirilebilir bilgi sağlamalı.

**Yapılacaklar:**

- [ ] **9.2.1** Bulgu kart bileşenini güncelle
  - Ok ikonu → AI 3-satır özet göster/gizle
  - AI özet: koruma durumu, ana tehditler, AOI'ye ilgililik

- [ ] **9.2.2** AI 3-satır özet endpoint'i
  - Mevcut `/api/ai/site-summary` endpoint'ini genişlet
  - Tüm bulgu tipleri için (site, species, habitat, aquatic) özet üret

---

### 9.3 Bulgu Aksiyonları

**Müşteri İsteği (Orijinal):**

> For each finding, the user must have options to: Save a target note, Share the specific data point, Download/dataload the raw data.

**Müşteri İsteği (Türkçe):**
Her bulgu için kullanıcı şu seçeneklere sahip olmalı: Target note kaydetme, veri noktasını paylaşma, ham veriyi indirme.

**Yapılacaklar:**

- [ ] **9.3.1** Target note kaydetme butonu ekle
  - Her bulgu kartında "Save Target Note" butonu
  - Target notes tablosuna kayıt (mevcut `target_notes` tablosu kullanılabilir)
  - Not içeriği: Kişisel açıklama veya planlama talimatı

- [ ] **9.3.2** Paylaşma butonu ekle
  - Clipboard'a link kopyalama
  - Veya email ile paylaşma

- [ ] **9.3.3** Ham veri indirme butonu ekle
  - JSON/CSV formatında export
  - GeoJSON formatında konum verisi

---

## 10. Deep Research Panel - Stage 5 (YENİ)

> **Kaynak:** Müşteri feedback - "Stage 5: Deep Research and Reporting"

### 10.1 Half-Map / Half-Deep Research Panel

**Müşteri İsteği (Orijinal):**

> This stage will also use the half-map / half-deep research panel screen configuration. The focus shifts to providing in-depth, structured research on the key findings.

**Müşteri İsteği (Türkçe):**
Bu aşama da yarı-harita / yarı-deep research panel ekran yapılandırmasını kullanacak. Odak, anahtar bulgular üzerinde derinlemesine, yapılandırılmış araştırma sunmaya kayar.

**Yapılacaklar:**

- [ ] **10.1.1** Deep Research panel görünümü oluştur
  - Half-map / half-research panel layout
  - Satellite varsayılan katman
  - Buffer zone içindeki tüm koruma alanlarını listele

---

### 10.2 Designated Sites Deep Dive (NPWS Data)

**Müşteri İsteği (Orijinal):**

> For each identified site, the report must clearly list: Associated habitats and species, The condition or conservation status, An option to save. Key Documentation: Qualifying Interests AI 2-line summary, Site Synopsis AI 2-line summary, Conservation Objectives display.

**Müşteri İsteği (Türkçe):**
Her tanımlanan site için rapor şunları açıkça listeler: İlişkili habitatlar ve türler, Koruma durumu/koşulu, Kaydetme seçeneği. Temel dokümantasyon: QI'ler için AI 2-satır özeti, Site Synopsis AI 2-satır özeti, Koruma Hedefleri gösterimi.

**Yapılacaklar:**

- [ ] **10.2.1** Site detay kartı bileşeni (Deep Research paneli için)
  - İlişkili habitatlar + türler listesi (mevcut Excel verisinden)
  - Koruma durumu/koşulu gösterimi
  - "Save" butonu

- [ ] **10.2.2** AI Özetleri entegrasyonu
  - QI'ler için AI 2-satır özeti (mevcut deep-research API genişletilir)
  - Site Synopsis için AI 2-satır özeti
  - Conservation Objectives gösterimi

- [ ] **10.2.3** Batch araştırma butonu
  - Buffer zone içindeki tüm SAC/SPA/NHA/pNHA için toplu deep research başlat

---

## Eski Öncelik Matrisi (8 Şubat 2026 - Arşiv)

> **Not:** Bu matris 11 Şubat güncellemesi öncesi referans olarak saklanmaktadır. Güncel matris dokümanın sonundadır.

<details>
<summary>Eski matrisi göster (tıkla)</summary>

### ✅ Tamamlanan Görevler

| #   | Görev                    | Durum         | Tamamlanma   |
| --- | ------------------------ | ------------- | ------------ |
| 1.1 | Çoklu harita katmanları  | ✅ Tamamlandı | 4 Şub 2026   |
| 1.2 | Buffer zone açıklamaları | ✅ Tamamlandı | 4 Şub 2026   |
| 1.3 | Katman metadata          | ✅ Tamamlandı | 4 Şub 2026   |
| 2.1 | NPWS veri entegrasyonu   | ✅ Tamamlandı | 6 Şub 2026   |
| 2.2 | Deep Research (Sites)    | ✅ Tamamlandı | 5-6 Şub 2026 |
| 0.1 | Satellite layer bug fix  | ✅ Tamamlandı | 11 Şub 2026  |

### 🔧 Devam Eden / Yapılacak Görevler

| # | Görev | Öncelik | Efor | Bağımlılık |
| 0.2 | Otomatik veri katmanı açılması | 🔴 Yüksek | Düşük | - |
| 0.4 | Core DB search otomasyonu | 🔴 Yüksek | Orta | 0.2 |
| 0.5 | Harita-bulgu senkronizasyonu | 🔴 Yüksek | Yüksek | - |
| 0.6 | "Move to Next Stage" butonu | 🟡 Orta | Düşük | - |
| 0.7 | Satellite varsayılan yapma | 🟡 Orta | Düşük | - |
| 3.1 | Bulgu yönetimi (dismiss/toplu) | 🔴 Yüksek | Orta | - |
| 4.1 | Deep Research (Species) iyileştir | 🔴 Yüksek | Yüksek | - |
| 5.1 | View on Map düzeltmesi | 🟡 Orta | Düşük | - |
| 5.2 | Gelişmiş popup | 🟡 Orta | Orta | - |
| 5.3 | Sonuç kaydetme | 🔴 Yüksek | Düşük | - |
| 5.4 | Baseline Report | 🟡 Orta | Yüksek | 3.1, 4.1 |
| 6.1 | Logo güncelleme | 🟢 Düşük | Düşük | - |
| 6.2 | Admin Dashboard | 🔴 Yüksek | Yüksek | - |
| 6.3 | 65 demo proje | 🔴 Yüksek | Orta | 6.2 |
| 6.4 | Proje detay görünümü | 🟡 Orta | Orta | - |
| 7.1 | Gelişmiş arama | 🟡 Orta | Orta | - |
| 7.2 | Audit Trail | 🟡 Orta | Orta | - |
| 8.1 | Proje oluşturma | 🟢 Düşük | Düşük | - |
| 9.1 | Findings Summary layout | 🔴 Yüksek | Orta | - |
| 9.2 | AI 3-satır özet kartları | 🔴 Yüksek | Orta | 9.1 |
| 9.3 | Bulgu aksiyonları (note/share/dl) | 🟡 Orta | Orta | 9.1 |
| 10.1 | Deep Research panel layout | 🔴 Yüksek | Orta | - |
| 10.2 | Designated sites deep dive | 🔴 Yüksek | Orta | 10.1, 2.1 |

</details>

---

## Notlar

- [x] ~~Müşteriden Excel dosyalarını al (2.1.1)~~ ✅ Alındı ve entegre edildi
- [ ] Google Drive'dan logo indir (6.1.1)
- [ ] Harici feedback dokümanını incele (7.1.1)
- [ ] Demo tarihi belirle ve timeline oluştur
- [ ] ~158 site için eksik habitat verisi çözümü (OpenAI veya müşteriden ek veri)

---

## 11. Caspio Bird Database Entegrasyonu (YENİ - 8 Şubat 2026)

> **Kaynak:** Greg'in yeni feedback'i - "Species Bird Database Integration and Localised Search"

### 11.1 Kuş Veritabanı Entegrasyonu

**Müşteri İsteği (Orijinal):**

> This step introduces a dedicated functionality to query and integrate data from a comprehensive species bird database. The search mechanism must allow for highly granular location-based filtering. Within the selected site, the system should execute a final search to identify all bird species records. The ultimate goal is to retrieve the mean number and name for the species (i.e., the common or standardized name) for all recorded bird species within the defined area.
>
> URL: https://c0cre470.caspio.com/dp/4BAE30005dbe20614b404564be88

**Müşteri İsteği (Türkçe):**
Kapsamlı bir kuş veritabanından veri sorgulamak ve entegre etmek için özel işlevsellik eklenmeli. Arama mekanizması yüksek granüler lokasyon tabanlı filtreleme yapabilmeli. Seçilen site içinde tüm kuş türü kayıtlarını bulmak için son bir arama yapılmalı. Amaç, tanımlanan alan içindeki tüm kaydedilmiş kuş türleri için **ortalama sayı (mean number)** ve **tür adını** almak.

**❓ Belirsiz Noktalar - Greg'e Sorulacak:**

1. GBIF zaten kuş kayıtları getiriyor. Caspio'dan ek olarak **mean number** mı istiyorsunuz?
2. Caspio API'si nasıl çalışıyor? Authentication gerekiyor mu?
3. Bu ayrı bir substep mi olsun, yoksa mevcut Species Records içine mi entegre edelim?

**Yapılacaklar:**

- [ ] **11.1.1** Caspio API'yi incele ve dokümantasyonunu bul
  - URL: `https://c0cre470.caspio.com/dp/4BAE30005dbe20614b404564be88`
  - API endpoints, auth, query parameters

- [ ] **11.1.2** Caspio entegrasyonu için karar ver
  - **Seçenek A:** Ayrı substep (`bird-records-substep.tsx`)
  - **Seçenek B:** Mevcut `species-records-substep.tsx` içine "Birds (Caspio)" tab'ı ekle ✅ Önerimiz

- [ ] **11.1.3** Caspio API client oluştur
  - Dosya: `lib/external-apis/caspio.ts`
  - Bbox/koordinat ile kuş araması
  - Mean number + species name döndürme

- [ ] **11.1.4** UI entegrasyonu
  - Kuş kayıtlarını listele
  - Mean number gösterimi (GBIF'den farklı olan bu)
  - Findings'e kaydetme

---

## 12. Automated Web Search - Ecological Reports (YENİ - 8 Şubat 2026)

> **Kaynak:** Greg'in yeni feedback'i - "Automated Web Search and Report Identification"

### 12.1 Otomatik Web Araması

**Müşteri İsteği (Orijinal):**

> This step focuses on performing automated, targeted desk research to gather relevant ecological reports and contextual information from the public web. The application must initiate a search on the web for reports that are relevant to the defined location. The search query should be dynamically constructed using critical data points extracted from the "Create a project" phase. These search parameters must include: location area name, known habitats within the area, identified species, and relevant water features.

**Standart Prompt Yapısı (Orijinal):**

> "Find an ecological report that is relevant to this area [INSERT LOCATION/SITE NAME], is associated with these habitats [INSERT HABITAT TYPES], and relates to the report sector '[INSERT REPORT SECTOR, e.g., Wind farm]'."

**Müşteri İsteği (Türkçe):**
Bu adım, kamuya açık web'den ilgili ekolojik raporları ve bağlamsal bilgileri toplamak için otomatik, hedefli desk research yapmaya odaklanır. Uygulama, tanımlanan lokasyonla ilgili raporlar için web'de arama başlatmalı. Arama sorgusu, proje oluşturma aşamasından çıkarılan kritik veri noktaları kullanılarak dinamik olarak oluşturulmalı: lokasyon adı, alan içindeki habitatlar, tanımlanan türler ve ilgili su özellikleri.

**❓ Belirsiz Noktalar - Greg'e Sorulacak:**

1. Hangi kaynaklardan arama yapılacak?
   - Genel Google Search mi?
   - Planning portals (ABP, County Councils) mı?
   - Specific databases mi?
2. Raporlar genelde PDF formatında. Bunları nasıl işleyeceğiz?
3. "Report sector" bilgisi nereden gelecek? Proje oluştururken mı sorulacak?

**Yapılacaklar:**

- [ ] **12.1.1** Web search stratejisi belirle
  - Google Custom Search API?
  - OpenAI web search?
  - Planning portal scraping?

- [ ] **12.1.2** Report sector field'ı ekle
  - Proje oluşturma formuna "Sector" dropdown ekle
  - Seçenekler: Wind farm, Housing, Infrastructure, Port, Industrial, etc.

- [ ] **12.1.3** Web search API endpoint oluştur
  - Dosya: `app/api/search/ecological-reports/route.ts`
  - Input: location, habitats, species, sector
  - Output: report listesi (title, URL, snippet)

- [ ] **12.1.4** UI substep oluştur
  - Dosya: `components/steps/data-gathering/ecological-reports-substep.tsx`
  - Bulunan raporları listele
  - Kaydetme ve Deep Research seçenekleri

---

## 13. Ecological Summary Auto-Generation (YENİ - 8 Şubat 2026)

> **Kaynak:** Greg'in yeni feedback'i - "Ecological Summary Generation"

### 13.1 Otomatik Ekolojik Özet Üretimi

**Müşteri İsteği (Orijinal):**

> Upon the successful completion of the desk research (Steps 1 and 2), the application must automatically synthesize the collected findings into a structured and comprehensive Ecological Summary. The summary should be presented in a clear, easily digestible format, utilizing either bullet points or a concise text summary. The summary must ensure the inclusion of detailed findings for the following mandatory categories:
>
> - Habitats: Description and condition of primary habitat types found.
> - Species (Bird, Fauna, and Flora): A list of key species identified.
> - Aquatic Features: Details regarding significant water features, including their ecological status.
> - Designated Areas: A comprehensive list of all conservation designation areas relevant to the site.

**Müşteri İsteği (Türkçe):**
Desk research başarıyla tamamlandığında, uygulama toplanan bulguları yapılandırılmış ve kapsamlı bir Ekolojik Özet'e otomatik olarak sentezlemeli. Özet, bullet points veya özlü metin formatında sunulmalı. Zorunlu kategoriler:

- **Habitats:** Bulunan birincil habitat tiplerinin açıklaması ve durumu
- **Species:** Tanımlanan anahtar türlerin listesi (kuş, fauna, flora)
- **Aquatic Features:** Önemli su özelliklerinin detayları ve ekolojik durumu
- **Designated Areas:** Site ile ilgili tüm koruma alanlarının kapsamlı listesi

**📝 Mevcut Durum:**
Bu özellik **kısmen mevcut**. Step 3 (Desk Assessment) → "Generate AI Insights" butonu benzer bir iş yapıyor. Ancak:

- Mevcut format Greg'in istediği yapıda değil
- Otomatik değil, manuel butona tıklamak gerekiyor

**Yapılacaklar:**

- [ ] **13.1.1** Mevcut AI Insights çıktısını Greg'in formatına uyarla
  - 4 zorunlu kategori: Habitats, Species, Aquatic, Designated Areas
  - Bullet points formatı

- [ ] **13.1.2** Otomatik tetikleme ekle
  - Data Gathering (Step 2) tamamlandığında otomatik özet üret
  - Veya Step 3'e geçişte otomatik çalıştır

- [ ] **13.1.3** Ecological Summary panel bileşeni
  - Dosya: `components/desk-research/ecological-summary-panel.tsx`
  - 4 kategori collapsible sections
  - Export seçeneği (PDF/Word)

---

## ~~14. Smart Scoping - Field Survey Önerileri~~ ❌ İPTAL (11 Şubat 2026)

> **⚠️ İPTAL EDİLDİ:** Müşterinin 11 Şubat feedback'inde "The existing Smart Scoping section should be removed entirely" denilmiştir. Bu bölümdeki görevler iptal edilmiştir. Yerine **Bölüm 18.1 (Survey Targets kutusu)** uygulanacaktır.
>
> **Kaynak (eski):** Greg'in yeni feedback'i - "Field Survey & Digital Collection - Smart Scoping"

### ~~14.1 Akıllı Saha Araştırması Önerileri~~ ❌ İPTAL

**Müşteri İsteği (Orijinal):**

> Smart Scoping: The system must recommend specific protected species for field verification based on the findings of the initial Desk Research.

**Müşteri İsteği (Türkçe):**
Sistem, ilk Desk Research bulgularına dayalı olarak saha doğrulaması için belirli korunan türleri önermeli.

**📝 Mevcut Durum:**
Bu özellik **şu an yok**. Field survey'e geçildiğinde ecologist kendi kararıyla neyi arayacağına karar veriyor. Sistem öneri sunmuyor.

**Yapılacaklar:**

- ~~[ ] **14.1.1** Habitat-Species mapping oluştur~~ ❌ İPTAL
- ~~[ ] **14.1.2** Smart Scoping algoritması~~ ❌ İPTAL
- ~~[ ] **14.1.3** Smart Scoping UI paneli~~ ❌ İPTAL
- ~~[ ] **14.1.4** Survey checklist entegrasyonu~~ ❌ İPTAL

---

## 15. Photo & Asset Management (YENİ - 8 Şubat 2026)

> **Kaynak:** Greg'in yeni feedback'i - "Photo & Asset Management"

### 15.1 Geotagged Photo Archiving

**Müşteri İsteği (Orijinal):**

> Geotagged Photo Archiving: Photos taken in the field must be automatically geotagged and synced to the specific project record.
>
> Streamlined Retrieval: Unlike "clunky" existing solutions (e.g., Survey 123), the system must provide a lightweight gallery view that allows ecologists to quickly tag and retrieve photos for report writing without high latency or storage friction.

**Müşteri İsteği (Türkçe):**

- Sahada çekilen fotoğraflar otomatik olarak geotag'lenmeli ve proje kaydına senkronize edilmeli
- Survey 123 gibi "hantal" çözümlerin aksine, sistem hafif bir galeri görünümü sunmalı
- Ekolojistler, yüksek gecikme veya depolama sürtünmesi olmadan fotoğrafları hızlıca tag'leyip alabilmeli

**Yapılacaklar:**

- [ ] **15.1.1** Supabase Storage bucket oluştur
  - `project-photos` bucket
  - RLS policies: proje üyeleri erişebilir

- [ ] **15.1.2** Photo upload bileşeni
  - Dosya: `components/field-surveys/photo-capture.tsx`
  - Kameradan çekim veya galeri seçimi
  - Otomatik EXIF geotag okuma
  - Manuel konum düzeltme seçeneği

- [ ] **15.1.3** Photo metadata tablosu

  ```sql
  CREATE TABLE project_photos (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    survey_id UUID REFERENCES surveys(id),
    file_path TEXT NOT NULL,
    latitude DECIMAL,
    longitude DECIMAL,
    taken_at TIMESTAMPTZ,
    tags TEXT[], -- ['habitat', 'species', 'damage']
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **15.1.4** Lightweight gallery bileşeni
  - Dosya: `components/field-surveys/photo-gallery.tsx`
  - Grid view (hızlı yükleme, lazy loading)
  - Tag filtreleme
  - Haritada görüntüleme (geotag'e göre)
  - Rapor yazarken drag & drop

- [ ] **15.1.5** Relevé Survey entegrasyonu
  - Mevcut prototip: `https://dulraecological.bolt.host/admin/projects/:projectId/releve-survey`
  - Fotoğrafları survey kaydına bağlama

---

## 16. Relevé Survey Entegrasyonu (YENİ - 8 Şubat 2026)

> **Kaynak:** Greg'in yeni feedback'i - "Use the Habitat Survey here and the Relevé Survey structure"

### 16.1 Relevé Survey Yapısı

**Müşteri İsteği (Orijinal):**

> Use the Habitat Survey here and the Relevé Survey structure here from the existing prototype. See the link here to the Releve Survey fields: https://dulraecological.bolt.host/admin/projects/:projectId/releve-survey
> The ecologists will have to do many of the releve surveys on the site: https://dulraecological.bolt.host/admin/habitat-mapping

**Müşteri İsteği (Türkçe):**
Mevcut prototipteki Habitat Survey ve Relevé Survey yapısını kullan. Ekolojistler sahada birçok relevé survey yapacak.

**❓ Belirsiz Noktalar - Greg'e Sorulacak:**

1. Mevcut prototipteki Relevé Survey field'ları neler?
2. Bu bizim mevcut Habitat Mapping step'inin yerine mi geçecek, yoksa ek mi olacak?

**Yapılacaklar:**

- [ ] **16.1.1** Mevcut Relevé Survey prototipini incele
  - URL: `https://dulraecological.bolt.host/admin/projects/:projectId/releve-survey`
  - Field listesini çıkar

- [ ] **16.1.2** Relevé Survey form bileşeni
  - Dosya: `components/field-surveys/releve-survey-form.tsx`
  - Prototipteki field'ları uygula

- [ ] **16.1.3** Habitat Mapping ile entegrasyon
  - Her habitat polygon'u için Relevé Survey kaydı
  - Çoklu survey desteği (bir sahada birden fazla relevé)

---

## 17. Desk Assessment İşlevsellik İyileştirmeleri (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "Desk Assessment Functionality Improvements" ve "Desk Assessment UI/UX Changes"

### 17.1 AI Insights Düzenlenebilirlik

**Müşteri İsteği (Orijinal):**

> AI-Generated Insights: The AI Insights should be editable by the ecologist. Once saved, these insights need to be stored in the "Reporting Data Analysis" section under a new dedicated tab titled "Desk Assessments."

**Müşteri İsteği (Türkçe):**
AI üretimi Insights ekolojist tarafından düzenlenebilir olmalı. Kaydedildikten sonra, Reporting Data Analysis bölümünde yeni bir "Desk Assessments" tab'ında saklanmalı.

**Yapılacaklar:**

- [ ] **17.1.1** AI Insights içeriğini düzenlenebilir hale getir
  - Dosya: `components/steps/desk-assessment-step.tsx`
  - Mevcut read-only AI çıktısını editable textarea/rich-text editor'e dönüştür
  - "Edit" / "Save" toggle butonu ekle

- [ ] **17.1.2** Düzenlenen insights'ı veritabanına kaydet
  - Mevcut `reports` veya yeni `desk_assessments` tablosuna persist et
  - Versiyon takibi (orijinal AI çıktısı + düzenlenmiş hali)

- [ ] **17.1.3** Reporting Data Analysis (Step 7) sayfasına "Desk Assessments" tab'ı ekle
  - Dosya: `components/steps/data-analysis-step.tsx`
  - Yeni tab: kaydedilmiş desk assessment insights'ları göster
  - Düzenleme imkanı burada da olmalı

---

### 17.2 Desk Assessment UI/UX Değişiklikleri

**Müşteri İsteği (Orijinal):**

> Tab Removal: The "Assessment" and "Field Plan" tabs should be removed from the Desk Assessment view.
> Feature Relocation: Relocate the "Survey Recommendations" and the "Complete & Continue to Field Survey" green button to the "AI INSIGHTS" tab.

**Müşteri İsteği (Türkçe):**
Desk Assessment görünümünden "Assessment" ve "Field Plan" tab'ları kaldırılmalı. "Survey Recommendations" ve "Complete & Continue to Field Survey" yeşil butonu "AI INSIGHTS" tab'ına taşınmalı.

**Yapılacaklar:**

- [ ] **17.2.1** "Assessment" ve "Field Plan" tab'larını kaldır
  - Dosya: `components/steps/desk-assessment-step.tsx`
  - Bu tab'lardaki gerekli içerikleri başka yerlere taşı veya tamamen kaldır

- [ ] **17.2.2** "Survey Recommendations" bölümünü AI Insights tab'ına taşı
  - Dosya: `components/steps/desk-assessment-step.tsx`
  - Survey recommendations AI Insights tab'ının alt bölümü olacak

- [ ] **17.2.3** "Complete & Continue to Field Survey" yeşil butonunu AI Insights tab'ına taşı
  - Mevcut konumundan kaldır ve AI Insights tab'ının sonuna yerleştir

---

### 17.3 Veri Kaynaklarına Direkt Linkler

**Müşteri İsteği (Orijinal):**

> Data Sources: Ensure that all data sources are easily accessible via direct links.

**Müşteri İsteği (Türkçe):**
Desk Assessment'ta tüm veri kaynaklarına direkt linklerle kolayca erişilebilmeli.

**Yapılacaklar:**

- [ ] **17.3.1** Desk Assessment görünümünde her veri kaynağına direkt link ekle
  - Dosya: `components/steps/desk-assessment-step.tsx`
  - NPWS, GBIF, NBDC, EPA kaynak linkleri her bulgu kartında görünür olmalı

---

## 18. Field Survey Sayfa Düzenlemeleri (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "Field Survey Page Adjustments" ve "Survey Creation Updates"

### 18.1 Survey Targets Kutusu (Habitats)

**Müşteri İsteği (Orijinal):**

> New Box Requirement: Create a new display box on the Field Survey page to list the "Survey Targets" derived from "Desk Research" specifically for "Habitats."
> Style Consistency: The background for this new box should be updated to match the style of the existing "Smart Scoping" section.
> Section Removal: The existing "Smart Scoping" section should be removed entirely.

**Müşteri İsteği (Türkçe):**
Field Survey sayfasında Desk Research'ten gelen "Habitats" için yeni "Survey Targets" kutusu oluşturulmalı. Stil mevcut Smart Scoping bölümüyle eşleşmeli. Mevcut Smart Scoping bölümü tamamen kaldırılmalı.

**⚠️ ÖNEMLİ: Bu madde bölüm 14 (Smart Scoping) ile ÇELİŞİYOR!**
Müşteri Smart Scoping'i kaldırmamızı istiyor. Bölüm 14'teki Smart Scoping geliştirme görevleri İPTAL EDİLMELİ. Yerine bu Survey Targets kutusu gelecek.

**Yapılacaklar:**

- [ ] **18.1.1** Mevcut Smart Scoping bölümünü Field Survey sayfasından kaldır
  - Dosya: `components/steps/field-survey-step.tsx`
  - İlgili bileşenler: `components/field-surveys/smart-scoping-panel.tsx` (varsa kaldır)

- [ ] **18.1.2** Yeni "Survey Targets (Habitats)" kutusu oluştur
  - Dosya: `components/field-surveys/survey-targets-box.tsx`
  - Desk Research'ten gelen habitat bulgularını listele
  - Smart Scoping arka plan stili ile eşleşen tasarım
  - Field Survey sayfasının üst kısmına yerleştir

---

### 18.2 Survey Oluşturma Güncellemeleri

**Müşteri İsteği (Orijinal):**

> Simplify Scheduling: Remove the "Weather conditions" section and the "start time" / "end time" fields.
> Add Expected Volume: Introduce a new section titled "Number of surveys expected."
> Template Navigation: Upon selecting "create survey," users should be directed to a template page specific to the chosen survey type, based on the existing Releve Survey template.
> After it is created the ecologists can edit it by clicking the 3 buttons

**Müşteri İsteği (Türkçe):**
Survey oluşturma formunu basitleştir: Weather conditions, start/end time kaldır. "Number of surveys expected" alanı ekle. "Create survey" tıklandığında survey tipine özel template sayfasına yönlendir. Oluşturulduktan sonra 3 butonla düzenlenebilmeli.

**Yapılacaklar:**

- [ ] **18.2.1** Survey formundan gereksiz alanları kaldır
  - Dosya: `components/field-surveys/survey-form.tsx` (veya ilgili form bileşeni)
  - Kaldır: "Weather conditions" bölümü
  - Kaldır: "Start time" / "End time" alanları

- [ ] **18.2.2** "Number of surveys expected" alanı ekle
  - Survey oluşturma formuna sayısal input ekle
  - Label: "Number of surveys expected"

- [ ] **18.2.3** Survey tipi bazlı template navigasyonu
  - "Create survey" tıklandığında seçilen survey tipine göre template sayfasına yönlendir
  - Relevé Survey template referansı: Google Sheets link
  - Her survey tipi için template yapısı

- [ ] **18.2.4** Survey oluşturulduktan sonra 3 aksiyon butonu
  - Survey kartı/satırında 3 butonlu düzenleme menüsü
  - Butonlar: Edit, View, Delete (veya müşteriden detay alınacak)

---

## 19. Habitat Mapping Araç Güncellemeleri (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "Habitat Mapping Tool"

### 19.1 Habitat Mapping Sayfa Düzeni ve Butonlar

**Müşteri İsteği (Orijinal):**

> The primary function of the Habitat Mapping page is to assist the ecologist in estimating habitats within the project boundary.
> The map should be positioned to the bottom of the page.
> An "Add Habitat" and edit buttons is required.

**Müşteri İsteği (Türkçe):**
Habitat Mapping sayfasının birincil işlevi, proje sınırı içindeki habitatları tahmin etmede ekolojiste yardımcı olmaktır. Harita sayfanın alt kısmına konumlanmalı. "Add Habitat" ve edit butonları gerekli.

**Yapılacaklar:**

- [ ] **19.1.1** Habitat Mapping sayfa düzenini yeniden organize et
  - Dosya: `components/steps/habitat-mapping-step.tsx`
  - Haritayı sayfanın alt kısmına taşı
  - Üst kısım: Habitat listesi, ekleme/düzenleme araçları

- [ ] **19.1.2** "Add Habitat" butonu ekle
  - Belirgin "Add Habitat" butonu (sayfanın üst kısmında)
  - Tıklandığında habitat ekleme formu/modalı açılır
  - FOSSITT kodu seçimi, alan çizimi workflow'u

- [ ] **19.1.3** Habitat düzenleme butonları ekle
  - Her habitat kartında edit butonu
  - Mevcut habitat verilerini düzenleme imkanı

---

## 20. Target Notes ve Species Observations Güncellemeleri (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "Target Notes and Species Observations"

### 20.1 Haritada Tıklama ile GPS Otomatik Kayıt

**Müşteri İsteği (Orijinal):**

> Ecologists must be able to click on an area of interest, automatically saving the GPS coordinates to a list along with an ecologist-provided note.

**Müşteri İsteği (Türkçe):**
Ekolojistler haritada bir ilgi alanına tıklayarak GPS koordinatlarını otomatik olarak bir listeye kaydetmeli ve not ekleyebilmeli.

**Yapılacaklar:**

- [ ] **20.1.1** Haritada tıklama → otomatik GPS kayıt mekanizması
  - Dosya: `components/steps/target-notes-step.tsx`
  - Haritada tıklanan noktanın koordinatlarını otomatik yakala
  - Target notes listesine yeni satır olarak ekle
  - Not giriş alanı (popup veya yan panel)

- [ ] **20.1.2** GPS koordinat listesi bileşeni
  - Kaydedilen noktaların listesi (koordinat + not + zaman)
  - Düzenleme ve silme imkanı
  - Field survey kaydına bağlama

---

### 20.2 Species Observations - NBDC Verilerinden Ön Doldurma

**Müşteri İsteği (Orijinal):**

> Species observations should be derived from saved map areas collected during the data gathering stage, utilizing datasets such as those from the NBDC.
> These notes should be saved to the field survey for the ecologists.

**Müşteri İsteği (Türkçe):**
Species observations, data gathering aşamasında toplanan harita alanlarından ve NBDC veri setlerinden türetilmeli. Notlar field survey'e kaydedilmeli.

**Yapılacaklar:**

- [ ] **20.2.1** Data Gathering → Field Survey veri aktarımı
  - Data Gathering'de kaydedilen NBDC species verilerini Field Survey'e aktar
  - Species observations listesini otomatik ön doldur

- [ ] **20.2.2** Ön doldurulmuş species listesini göster
  - Dosya: `components/steps/target-notes-step.tsx` veya `field-survey-step.tsx`
  - NBDC kaynaklı türleri "Desk Research'ten" etiketi ile göster
  - Ekolojist saha gözlemleriyle güncelleyebilmeli

- [ ] **20.2.3** Notes'ları field survey kaydına kaydet
  - Target notes ve species observations → surveys tablosuna bağla
  - Ekolojistlerin rapor yazarken erişebilmesi için

---

## 21. Reporting ve Data Analysis Kapsamlı Erişim (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "Reporting and Data Analysis"

### 21.1 Tüm Aşamalardan Veri Erişimi

**Müşteri İsteği (Orijinal):**

> The reporting/data analysis page must give ecologists comprehensive access to all data and findings from every project stage.
> The system requires a tab for each stage, allowing ecologists to easily edit and add report data.
> The User Interface (UI) must reflect this structure, including maps for each dataset utilized, such as those for habitat mapping and target notes.

**Müşteri İsteği (Türkçe):**
Reporting/Data Analysis sayfası ekolojistlere her proje aşamasından tüm veri ve bulgulara kapsamlı erişim sağlamalı. Her aşama için ayrı tab olmalı. UI, habitat mapping ve target notes gibi her dataset için harita içermeli.

**Yapılacaklar:**

- [ ] **21.1.1** Data Analysis sayfasını (Step 7) yeniden tasarla
  - Dosya: `components/steps/data-analysis-step.tsx`
  - Tab yapısı: Her proje aşaması için ayrı tab

- [ ] **21.1.2** Aşama tab'ları oluştur
  - Tab 1: **GIS Mapping** - Site boundary, buffer zone bilgileri
  - Tab 2: **Data Gathering** - NPWS, GBIF, NBDC, EPA bulguları
  - Tab 3: **Desk Assessment** - AI insights, kaydedilmiş değerlendirmeler (17.1.3 ile bağlantılı)
  - Tab 4: **Field Survey** - Survey kayıtları, gözlemler
  - Tab 5: **Habitat Mapping** - Habitat haritası ve verileri
  - Tab 6: **Target Notes** - Saha notları ve species observations

- [ ] **21.1.3** Her tab'da düzenleme ve veri ekleme imkanı
  - Tab içindeki verileri inline edit edebilme
  - Yeni veri/not ekleyebilme
  - Rapor'a dahil etme/çıkarma toggle'ı

- [ ] **21.1.4** Her dataset için harita görünümü
  - Habitat mapping haritası → Habitat tab'ında
  - Target notes haritası → Target Notes tab'ında
  - Designated sites haritası → Data Gathering tab'ında
  - Mini harita bileşeni (her tab'da ilgili verileri gösterir)

---

## 22. AI Reporting - Uygulama İçi Rapor Düzenleme (YENİ - 11 Şubat 2026)

> **Kaynak:** MVP Feedback Summary - "AI reporting: In-Application Editing and Finalizing Reports"

### 22.1 Uygulama İçi Rapor Düzenleme ve Tamamlama

**Müşteri İsteği (Orijinal):**

> AI reporting: In-Application Editing and Finalizing Reports. Following the existing prototype, here the structure of the report for this demo is what I shared with you already in the upwork chat.

**Müşteri İsteği (Türkçe):**
AI raporları uygulama içinde düzenlenebilir ve tamamlanabilir olmalı. Rapor yapısı müşterinin paylaştığı prototipe uygun olmalı.

**Yapılacaklar:**

- [ ] **22.1.1** In-app rapor editörü oluştur
  - Dosya: `components/steps/ai-draft-step.tsx` (güncelle)
  - Rich text editor entegrasyonu (TipTap, Slate, veya benzer)
  - Bölüm bazlı düzenleme (section collapse/expand)
  - Markdown veya WYSIWYG modu

- [ ] **22.1.2** Müşteri rapor yapısını uygula
  - Müşterinin Upwork chat'te paylaştığı rapor yapısı baz alınacak
  - PEA report template'i: Introduction, Methodology, Results, Constraints, Discussion, Appendices
  - Her bölüm ayrı düzenlenebilir blok

- [ ] **22.1.3** Rapor versiyon yönetimi
  - AI draft → düzenlenmiş versiyonlar takibi
  - Önceki versiyona geri dönme
  - Değişiklik geçmişi (diff view)

- [ ] **22.1.4** Rapor tamamlama ve export
  - "Finalize Report" butonu
  - PDF export
  - Word document export
  - Onay workflow'u (Quality Review step ile entegre)

---

## ⚠️ Bölüm 14 - Smart Scoping GÜNCELLEME

> **DİKKAT:** Bölüm 14 (Smart Scoping) müşterinin son feedback'i ile **ÇELİŞMEKTEDİR**.
>
> - **Eski feedback (8 Şubat):** Smart Scoping sistemi oluştur, habitat-species mapping yap
> - **Yeni feedback (11 Şubat):** "The existing Smart Scoping section should be removed entirely."
>
> **Karar:** Bölüm 14'teki görevler (14.1.1 - 14.1.4) **İPTAL**. Yerine Bölüm 18.1 (Survey Targets kutusu) uygulanacak.
> Smart Scoping'in temel konsepti (Desk Research'ten field survey önerileri) Survey Targets kutusunda daha basit formda yaşayacak.

---

## Güncellenmiş Öncelik Matrisi

### ✅ Tamamlanan Görevler

| #   | Görev                    | Durum         | Tamamlanma   |
| --- | ------------------------ | ------------- | ------------ |
| 1.1 | Çoklu harita katmanları  | ✅ Tamamlandı | 4 Şub 2026   |
| 1.2 | Buffer zone açıklamaları | ✅ Tamamlandı | 4 Şub 2026   |
| 1.3 | Katman metadata          | ✅ Tamamlandı | 4 Şub 2026   |
| 2.1 | NPWS veri entegrasyonu   | ✅ Tamamlandı | 6 Şub 2026   |
| 2.2 | Deep Research (Sites)    | ✅ Tamamlandı | 5-6 Şub 2026 |
| 0.1 | Satellite layer bug fix  | ✅ Tamamlandı | 11 Şub 2026  |
| 0.3 | Veri katmanı yan panel   | ✅ Tamamlandı | Zaten mevcut |

### ❌ İptal Edilen Görevler

| #    | Görev                           | Durum    | Neden                                                                    |
| ---- | ------------------------------- | -------- | ------------------------------------------------------------------------ |
| 14.1 | Smart Scoping (14.1.1 - 14.1.4) | ❌ İPTAL | Müşteri Smart Scoping kaldırılmasını istiyor. Yerine 18.1 Survey Targets |

### 🆕 Yeni Eklenen Görevler (8 Şubat 2026)

| #    | Görev                    | Öncelik     | Efor   | Belirsizlik |
| ---- | ------------------------ | ----------- | ------ | ----------- |
| 11.1 | Caspio Bird Database     | ❓ Belirsiz | Orta   | 🔴 Yüksek   |
| 12.1 | Automated Web Search     | ❓ Belirsiz | Yüksek | 🔴 Yüksek   |
| 13.1 | Ecological Summary       | 🟡 Orta     | Düşük  | 🟢 Düşük    |
| 15.1 | Photo & Asset Management | 🟡 Orta     | Yüksek | 🟢 Düşük    |
| 16.1 | Relevé Survey            | ❓ Belirsiz | Orta   | 🟡 Orta     |

### 🆕 Yeni Eklenen Görevler (11 Şubat 2026)

| #    | Görev                                               | Öncelik   | Efor   | Bağımlılık |
| ---- | --------------------------------------------------- | --------- | ------ | ---------- |
| 17.1 | AI Insights düzenlenebilirlik                       | 🔴 Yüksek | Orta   | -          |
| 17.2 | Desk Assessment UI değişiklikleri (tab kaldır/taşı) | 🔴 Yüksek | Düşük  | -          |
| 17.3 | Veri kaynaklarına direkt linkler                    | 🟡 Orta   | Düşük  | -          |
| 18.1 | Survey Targets kutusu + Smart Scoping kaldır        | 🔴 Yüksek | Orta   | -          |
| 18.2 | Survey oluşturma güncellemeleri                     | 🔴 Yüksek | Orta   | -          |
| 19.1 | Habitat Mapping düzen + butonlar                    | 🟡 Orta   | Düşük  | -          |
| 20.1 | Target Notes GPS otomatik kayıt                     | 🔴 Yüksek | Orta   | -          |
| 20.2 | Species observations NBDC ön doldurma               | 🔴 Yüksek | Orta   | -          |
| 21.1 | Reporting tüm aşamalar tab yapısı                   | 🔴 Yüksek | Yüksek | 17.1       |
| 22.1 | In-app rapor düzenleme ve tamamlama                 | 🔴 Yüksek | Yüksek | 21.1       |

### Güncellenmiş Önerilen Geliştirme Sırası

**Sprint 1 - Kritik Bug ve UX (1-2 gün):**

- ~~0.1 Satellite layer bug fix~~ ✅
- 0.2 Otomatik veri katmanı
- 0.6 Move to Next Stage butonu
- 0.7 Satellite varsayılan

**Sprint 2 - Desk Assessment Yenileme (2-3 gün):**

- 17.2 Tab kaldırma ve taşıma (Assessment, Field Plan kaldır; Survey Rec → AI Insights)
- 17.1 AI Insights düzenlenebilirlik + Desk Assessments tab
- 17.3 Veri kaynaklarına direkt linkler

**Sprint 3 - Findings ve Etkileşim (3-4 gün):**

- 0.5 Harita-bulgu senkronizasyonu
- 9.1 Findings Summary layout
- 9.2 AI 3-satır özet kartları
- 3.1 Bulgu yönetimi (dismiss/toplu)

**Sprint 4 - Field Survey Yenileme (3-4 gün):**

- 18.1 Smart Scoping kaldır + Survey Targets kutusu
- 18.2 Survey oluşturma güncellemeleri (form sadeleştirme, template)
- 20.1 Target Notes GPS otomatik kayıt
- 20.2 Species observations NBDC ön doldurma

**Sprint 5 - Habitat Mapping ve Target Notes (2-3 gün):**

- 19.1 Habitat Mapping düzen + butonlar
- 5.1 View on Map düzeltmesi
- 5.2 Gelişmiş popup

**Sprint 6 - Deep Research ve Species (3-4 gün):**

- 4.1 Species Deep Research iyileştirme
- 10.1 Deep Research panel layout
- 10.2 Designated sites deep dive

**Sprint 7 - Reporting Overhaul (4-5 gün):**

- 21.1 Data Analysis tüm aşamalar tab yapısı + haritalar
- 22.1 In-app rapor düzenleme (rich text editor, export)
- 5.4 Baseline Conditions Report

**Sprint 8 - Admin Dashboard (3-4 gün):**

- 6.2 Admin Dashboard
- 6.3 65 demo proje
- 6.4 Proje detay görünümü

**Sprint 9 - Ek Özellikler (3-4 gün):**

- 11.1 Caspio Bird Database
- 12.1 Automated Web Search
- 13.1 Ecological Summary Auto-Generation
- 7.1 Gelişmiş arama
- 7.2 Audit Trail
- 9.3 Bulgu aksiyonları

### Greg'e Sorulacak Sorular

1. **Caspio Bird DB:** GBIF zaten kuş kayıtları getiriyor. Caspio'dan ek olarak "mean number" mı istiyorsunuz? API dokümantasyonu var mı?

2. **Web Search:** Hangi kaynaklardan arama yapılacak? (Google, Planning portals, specific databases?) "Report sector" bilgisi nereden gelecek?

3. **Relevé Survey:** Mevcut prototipteki field'ların listesini paylaşabilir misiniz?

4. **Survey Oluşturma 3 Buton:** "After it is created the ecologists can edit it by clicking the 3 buttons" - Bu 3 buton neler? (Edit/View/Delete mi yoksa başka aksiyonlar mı?)

5. **Rapor Yapısı:** Upwork chat'te paylaşılan rapor yapısını tekrar paylaşabilir misiniz? (Demo için hangi bölümler olmalı?)

---

_Son güncelleme: 11 Şubat 2026_
