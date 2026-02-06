# Dulra MVP - Müşteri Geri Bildirimleri ve Yapılacaklar Listesi

> **Tarih:** 3 Şubat 2026
> **Versiyon:** 2.0 (6 Şubat 2026 güncellemesi)
> **Durum:** Geliştirme Aşaması

---

## İçindekiler

0. [Adım Adım Akış ve UX İyileştirmeleri (YENİ)](#0-adım-adım-akış-ve-ux-i̇yileştirmeleri)
1. [GIS ve Haritalama İyileştirmeleri](#1-gis-ve-haritalama-i̇yileştirmeleri)
2. [Designated Sites Araştırması ve Deep Research](#2-designated-sites-araştırması-ve-deep-research)
3. [Değerlendirici İş Akışı ve Sonuç Yönetimi](#3-değerlendirici-i̇ş-akışı-ve-sonuç-yönetimi)
4. [Tür Kaydı ve GBIF Entegrasyonu](#4-tür-kaydı-ve-gbif-entegrasyonu)
5. [Sonuçlar ve Harita Etkileşimi](#5-sonuçlar-ve-harita-etkileşimi)
6. [Admin Dashboard ve Demo Akışı](#6-admin-dashboard-ve-demo-akışı)
7. [Arama ve Denetim Yetenekleri](#7-arama-ve-denetim-yetenekleri)
8. [Yeni Proje Başlatma](#8-yeni-proje-başlatma)
9. [Findings Summary ve Etkileşim (YENİ)](#9-findings-summary-ve-etkileşim)
10. [Deep Research Panel - Stage 5 (YENİ)](#10-deep-research-panel---stage-5)

---

## 0. Adım Adım Akış ve UX İyileştirmeleri (YENİ)

> **Kaynak:** Müşteri feedback dokümanının "Step 1-5" akış açıklaması. Bu bölüm feedback'te detaylı olarak tarif edilen uçtan uca kullanıcı akışını içerir.

### 0.1 Satellite Layer Bug Fix

**Müşteri İsteği (Orijinal):**

> A persistent bug is noted: when the satellite layer is active during this step, the application incorrectly reverts the map view back to the streets layer. This must be fixed to ensure layer persistence and a consistent user experience.

**Müşteri İsteği (Türkçe):**
Buffer zone adımında satellite katmanı aktifken uygulama yanlışlıkla haritayı streets katmanına geri döndürüyor. Katman kalıcılığı ve tutarlı kullanıcı deneyimi sağlanmalı.

**Yapılacaklar:**

- [ ] **0.1.1** Bug'ı tespit et ve reprodüce et
  - Dosya: `components/steps/gis-mapping-step.tsx`
  - Buffer adımına geçişte harita state'i sıfırlanıyor olabilir
- [ ] **0.1.2** Harita katman seçimini adımlar arası persist et
  - SessionStorage veya parent state ile seçili base layer'ı sakla
  - Adım geçişlerinde harita layer state'ini koru

---

### 0.2 Otomatik Veri Katmanı Açılması

**Müşteri İsteği (Orijinal):**

> Upon completing Step 2 (clicking "next"), the application must automatically enable and display the data sets layer.

**Müşteri İsteği (Türkçe):**
Step 2 (Buffer Zone) tamamlanıp "next" butonuna tıklandığında uygulama otomatik olarak veri katmanlarını açıp göstermeli.

**Yapılacaklar:**

- [ ] **0.2.1** Buffer adımından Layers adımına geçişte otomatik layer aktivasyonu
  - Dosya: `components/steps/gis-mapping-step.tsx`
  - `onNext` handler'ında NPWS + EPA katmanlarını otomatik aç

---

### 0.3 Veri Katmanı Yan Panel (Side UI)

**Müşteri İsteği (Orijinal):**

> The UI must introduce a dedicated column or side panel to display the available data layers and their details. The user should be able to review the available information from the data layers in a side UI and explicitly save or select the relevant ones for the subsequent analysis.

**Müşteri İsteği (Türkçe):**
Mevcut veri katmanlarını ve detaylarını göstermek için ayrılmış bir kolon veya yan panel eklenmeli. Kullanıcı katmanları inceleyip sonraki analiz için ilgili olanları seçip kaydedebilmeli.

**Yapılacaklar:**

- [ ] **0.3.1** Layers adımında veri katmanları yan paneli güncelle
  - Dosya: `components/gis/dataset-layers-panel.tsx`
  - Katman detayları göster (site sayısı, kapsam)
  - Kullanıcının hangi katmanları sonraki adıma taşıyacağını seçebilmesi

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

## Öncelik Matrisi

### ✅ Tamamlanan Görevler

| #   | Görev                    | Durum         | Tamamlanma   |
| --- | ------------------------ | ------------- | ------------ |
| 1.1 | Çoklu harita katmanları  | ✅ Tamamlandı | 4 Şub 2026   |
| 1.2 | Buffer zone açıklamaları | ✅ Tamamlandı | 4 Şub 2026   |
| 1.3 | Katman metadata          | ✅ Tamamlandı | 4 Şub 2026   |
| 2.1 | NPWS veri entegrasyonu   | ✅ Tamamlandı | 6 Şub 2026   |
| 2.2 | Deep Research (Sites)    | ✅ Tamamlandı | 5-6 Şub 2026 |

### 🔧 Devam Eden / Yapılacak Görevler

| #    | Görev                             | Öncelik   | Efor   | Bağımlılık |
| ---- | --------------------------------- | --------- | ------ | ---------- |
| 0.1  | Satellite layer bug fix           | 🔴 Yüksek | Düşük  | -          |
| 0.2  | Otomatik veri katmanı açılması    | 🔴 Yüksek | Düşük  | -          |
| 0.3  | Veri katmanı yan panel            | 🟡 Orta   | Orta   | -          |
| 0.4  | Core DB search otomasyonu         | 🔴 Yüksek | Orta   | 0.2        |
| 0.5  | Harita-bulgu senkronizasyonu      | 🔴 Yüksek | Yüksek | -          |
| 0.6  | "Move to Next Stage" butonu       | 🟡 Orta   | Düşük  | -          |
| 0.7  | Satellite varsayılan yapma        | 🟡 Orta   | Düşük  | -          |
| 3.1  | Bulgu yönetimi (dismiss/toplu)    | 🔴 Yüksek | Orta   | -          |
| 4.1  | Deep Research (Species) iyileştir | 🔴 Yüksek | Yüksek | -          |
| 5.1  | View on Map düzeltmesi            | 🟡 Orta   | Düşük  | -          |
| 5.2  | Gelişmiş popup                    | 🟡 Orta   | Orta   | -          |
| 5.3  | Sonuç kaydetme                    | 🔴 Yüksek | Düşük  | -          |
| 5.4  | Baseline Report                   | 🟡 Orta   | Yüksek | 3.1, 4.1   |
| 6.1  | Logo güncelleme                   | 🟢 Düşük  | Düşük  | -          |
| 6.2  | Admin Dashboard                   | 🔴 Yüksek | Yüksek | -          |
| 6.3  | 65 demo proje                     | 🔴 Yüksek | Orta   | 6.2        |
| 6.4  | Proje detay görünümü              | 🟡 Orta   | Orta   | -          |
| 7.1  | Gelişmiş arama                    | 🟡 Orta   | Orta   | -          |
| 7.2  | Audit Trail                       | 🟡 Orta   | Orta   | -          |
| 8.1  | Proje oluşturma                   | 🟢 Düşük  | Düşük  | -          |
| 9.1  | Findings Summary layout           | 🔴 Yüksek | Orta   | -          |
| 9.2  | AI 3-satır özet kartları          | 🔴 Yüksek | Orta   | 9.1        |
| 9.3  | Bulgu aksiyonları (note/share/dl) | 🟡 Orta   | Orta   | 9.1        |
| 10.1 | Deep Research panel layout        | 🔴 Yüksek | Orta   | -          |
| 10.2 | Designated sites deep dive        | 🔴 Yüksek | Orta   | 10.1, 2.1  |

### Önerilen Geliştirme Sırası

**Sprint 1 - Kritik Bug ve UX (1-2 gün):**

- 0.1 Satellite layer bug fix
- 0.2 Otomatik veri katmanı
- 0.6 Move to Next Stage butonu
- 0.7 Satellite varsayılan

**Sprint 2 - Findings ve Etkileşim (3-4 gün):**

- 0.5 Harita-bulgu senkronizasyonu
- 9.1 Findings Summary layout
- 9.2 AI 3-satır özet kartları
- 3.1 Bulgu yönetimi (dismiss/toplu)

**Sprint 3 - Deep Research ve Species (3-4 gün):**

- 4.1 Species Deep Research iyileştirme
- 10.1 Deep Research panel layout
- 10.2 Designated sites deep dive
- 5.1 View on Map düzeltmesi

**Sprint 4 - Admin Dashboard (3-4 gün):**

- 6.2 Admin Dashboard
- 6.3 65 demo proje
- 6.4 Proje detay görünümü

**Sprint 5 - Rapor ve İleri (3-4 gün):**

- 5.4 Baseline Conditions Report
- 7.1 Gelişmiş arama
- 7.2 Audit Trail
- 9.3 Bulgu aksiyonları

---

## Notlar

- [x] ~~Müşteriden Excel dosyalarını al (2.1.1)~~ ✅ Alındı ve entegre edildi
- [ ] Google Drive'dan logo indir (6.1.1)
- [ ] Harici feedback dokümanını incele (7.1.1)
- [ ] Demo tarihi belirle ve timeline oluştur
- [ ] ~158 site için eksik habitat verisi çözümü (OpenAI veya müşteriden ek veri)

---

_Son güncelleme: 6 Şubat 2026_
