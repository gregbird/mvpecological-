# Feedback 6/3 — (6 Mart 2026)

> **Kaynak:** MVP feedback
> **Tarih:** 6 Mart 2026

---

## 1. Tür Kayıtları için Veri Çözünürlüğü ve Görüntüleme

**Orijinal:** "Data Resolution and Display for Species Records: advised that 10 km square is the most reliable resolution for data. On the application gets data by grid reference from Biodiversity Ireland. The application should show the list of species in tabular format with 1km/2km/10km top down. Only show data that has 'Designation'. Along with AI summary of Species based on name. For the application display, remove showing a dot for a specific location. The ideal approach is to allow the user to consolidate records from multiple intersecting 1 km or 10 km squares within a project's buffer into a single list."

**Yapılacaklar:**

- [x] **1.1** Tür verilerini tablo formatında göster — 1km, 2km, 10km çözünürlük sırasıyla yukarıdan aşağıya öncelikli
  > Veri kaynağı GBIF'ten NBDC grid reference'a taşındı — sebebi: GBIF bbox ile arama yapıyordu, bu yüzden DatasetName ve Date gibi alanlar eksik kalıyordu. NBDC grid reference ile sorgulayınca her kayıtta DatasetName, Date, TaxonGroup direkt geliyor, ek enrichment'a gerek kalmıyor. Ayrıca feedback'te istenen "grid reference ile veri çekme" gereksinimi bu şekilde karşılanmış oldu. `/api/nbdc/grid-records` proxy eklendi. 10km/2km/1km toggle mevcut (varsayılan 10km). 2km = 4 komşu 1km karenin paralel sorgulanıp birleştirilmesi. NBDC başarısız olursa GBIF'e fallback var. Dosyalar: `species-records-substep.tsx`, `nbdc.ts`, `app/api/nbdc/grid-records/route.ts`
- [x] **1.2** Yalnızca "Designation" (koruma statüsü) bulunan verileri filtrele ve göster
  > Varsayılan filtre `protected`. Filtre mantığı `filteredFindings` içine eklendi — `isProtected === true` veya `designations` alanı dolu olan türler gösterilir, diğerleri gizlenir. Kullanıcı "All Sources" ile tüm türleri görebilir. Dosya: `findings-list.tsx`
- [x] **1.3** Tablo sütunları: Tür grubu | Tür adı | Kayıt sayısı | Son kayıt tarihi | Veri seti başlığı
  > `species-table-view.tsx` oluşturuldu. 5 sütun: Species Group, Species Name, Record Count, Date of Last Record, Title of Dataset. Varsayılan görünüm tablo, kart görünümüne geçiş mümkün. Veriler NBDC'den geldiği için tüm sütunlar dolu.
- [x] **1.4** Her tür için yapay zeka tarafından oluşturulmuş özet ekle (tür adına göre)
  > NBDC enrichment bittikten sonra designated/protected türler için AI summary otomatik tetikleniyor (500ms aralıkla). Summary tablo görünümünde Species Name altında gösteriliyor. Endpoint: `/api/ai/species-summary`. Dosyalar: `species-records-substep.tsx` (autoEnrich sonrası trigger), `species-table-view.tsx` (summary gösterimi)
- [x] **1.5** Haritada belirli konum için nokta gösterimini kaldır (faydalı bulunmadı)
  > `finding-markers.tsx`'te `dataType === 'species_record'` olan findinglere `return null` eklendi. Not: Tablodan bir türe tıklayınca koordinatı varsa harita o bölgeye pan ediyor ama nokta göstermiyor. Koordinatı olmayan türlerde (NBDC sadece grid ref dönüp lat/lng vermeyenler) tıklama haritada hiçbir şey yapmıyor.
- [x] **1.6** Birden fazla kesişen 1km veya 10km karelerden gelen kayıtları projenin tampon alanı içinde tek listede birleştirme özelliği ekle
  > Buffer bbox'ındaki tüm grid kareleri ITM koordinatlarıyla hesaplanıyor (10km: max 20, 2km: max 40, 1km: max 30 kare). Her kare için NBDC'ye paralel istek atılıyor (5'erli batch, 200ms aralık). Aynı tür farklı karelerden geldiyse tek satırda birleştiriliyor — kayıt sayıları toplanır, en yeni tarih ve en yaygın dataset seçilir. Dosya: `species-records-substep.tsx`

---

## 2. Proje Başına Birden Fazla Rapor ve Anket Girişi

**Orijinal:** "One project often requires multiple reports (e.g., an appropriate assessment screening and an ecological impact assessment), that one report might pull data from several different surveys (e.g., walkover, mammal, bat), and another report might use only a subset of those surveys. Confirmed that they assign a single project manager who then decides which technical staff will perform the required surveys."

**Yapılacaklar:**

- [ ] **2.1** Proje kurulumu sırasında birden fazla rapor türü seçimine izin ver (örn. AA Screening + EcIA aynı anda)
- [ ] **2.2** Bir raporun birden fazla farklı anketten veri çekebilmesini sağla
- [ ] **2.3** Raporlama aşamasında yeni rapor eklemeye izin ver
- [ ] **2.4** Proje yöneticisi atama ve anket sorumluluğu dağıtma yapısını düzenle

---

## 3. Anket Raporlama Yapısı

**Orijinal:** "There is a need for survey results, such as habitat and vegetation data, to be associated with and displayed within the relevant report. A single survey, like a bat survey or breeding bird survey, might involve multiple visits or sample records, meaning one survey could comprise multiple records or survey dates. The application needs to be flexibility to handle this one-to-many relationship, and that reports and surveys need to be defined clearly to manage these different data outputs."

**Yapılacaklar:**

- [ ] **3.1** Anket sonuçlarını (habitat, vejetasyon verileri) ilgili raporla ilişkilendir ve rapor içinde görüntüle
- [ ] **3.2** Tek bir anketin birden fazla ziyaret/kayıt/tarih içerebilmesini destekle (bire-çok ilişkisi)
- [ ] **3.3** Rapor ve anket tanımlarını netleştir — farklı veri çıktılarını yönetecek yapıyı oluştur

---

## 4. Anketler için Kullanıcı Etkileşimi ve Veri Akışı

**Orijinal:** "The system when conducting multi-day surveys for the same site — it was determined that while field staff usually start fresh for subsequent visits, they might want access to previous data. The consensus was that the site survey record should only be completed after all associated field work, such as multiple days of surveying and quadrat records, has been finalized by the user."

**Yapılacaklar:**

- [ ] **4.1** Çok günlü anketlerde önceki günün verilerine erişim sağla (ekolojist yeni gün başlatsa bile eski veriyi görebilmeli)
- [ ] **4.2** Anket kaydını ancak tüm ilişkili saha çalışması (birden fazla gün, quadrat kayıtları dahil) tamamlandıktan sonra "tamamlandı" olarak işaretlemeye izin ver

---

## 5. Anketler için Kullanıcı Rolleri ve Üçüncü Taraf Erişimi

**Orijinal:** "The need for different user roles was identified, particularly the need for field workers who only require access to the survey element of the application, not the reporting side."

**Yapılacaklar:**

- [ ] **5.1** Mevcut rol sistemini genişlet — 3 rol yerine 5 rol:
  - **Admin:** Tam yetki
  - **Proje Yöneticisi:** Proje oluşturma/yönetme, anket ve rapor şablonlarını düzenleme, projeye kullanıcı ekleme
  - **Ekolojist:** Bir projeyi uçtan uca yönetebilir
  - **Junior:** Bir projenin farklı aşamalarına sınırlı erişim
  - **3. Taraf:** Belirli bir ankete erişim ve düzenleme, isteğe bağlı rapor oluşturma
- [ ] **5.2** Saha çalışanlarının yalnızca anket kısmına erişimini sağla (raporlama tarafını gizle)
- [ ] **5.3** Üçüncü taraf danışmanlara (örn. yarasa ekolojistleri) firma uygulamasında login atayarak veri gönderimi yapabilmelerini sağla
- [ ] **5.4** Rol bazlı erişim kontrolünü proje sayfasında uygula (şu an permission matrix tanımlı ama UI'da kullanılmıyor)
