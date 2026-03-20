# Feedback 6/3 — (6 Mart 2026)

> **Kaynak:** MVP feedback
> **Tarih:** 6 Mart 2026

---

## 1. Tür Kayıtları için Veri Çözünürlüğü ve Görüntüleme

**Orijinal:** "Data Resolution and Display for Species Records: advised that 10 km square is the most reliable resolution for data. On the application gets data by grid reference from Biodiversity Ireland. The application should show the list of species in tabular format with 1km/2km/10km top down. Only show data that has 'Designation'. Along with AI summary of Species based on name. For the application display, remove showing a dot for a specific location. The ideal approach is to allow the user to consolidate records from multiple intersecting 1 km or 10 km squares within a project's buffer into a single list."

**Yapılacaklar:**

- [x] **1.1** Tür verilerini tablo formatında göster — 1km, 2km, 10km çözünürlük sırasıyla yukarıdan aşağıya öncelikli
  > **v2 (20 Mart 2026):** Veri kaynağı tamamen NBDC rapor üretme API'sine taşındı (`/api/services/app/reportService/GenerateReport`). GBIF ve eski NBDC grid records API kaldırıldı. Yeni akış: buffer bbox'ından Irish Grid kareleri hesaplanır (ITM→ING offset dönüşümü), her kare için NBDC'ye rapor isteği yapılır, dönen XLSX parse edilir. Sonuç: 2000+ tür (eski GBIF: 71). Rapor doğrudan Greg'in istediği 5 sütunu veriyor (Species Group, Species Name, Record Count, Date of Last Record, Title of Dataset, Designation). 10km/2km/1km toggle mevcut, varsayılan 10km. Her çözünürlük kendi sessionStorage cache'ine sahip. Buffer içindeki tüm grid kareleri aranır (yapay limit yok). Haritada "Show Grid" butonu ile aranan grid kareleri görselleştirilebilir.
  > Dosyalar: `species-records-substep.tsx`, `nbdc.ts` (`fetchNBDCGridReport`), `app/api/nbdc/grid-records/route.ts`
- [x] **1.2** Yalnızca "Designation" (koruma statüsü) bulunan verileri filtrele ve göster
  > Varsayılan filtre `Protected Only`. Filtre seçenekleri: All Species, Protected Only, Invasive Only, Threatened Only. Designation bilgisi doğrudan NBDC raporundan geliyor, ek enrichment'a gerek yok. `parseDesignation()` fonksiyonu designation string'ini parse ederek `isProtected`, `isInvasive`, `isThreatened` flag'lerini belirliyor. Dosya: `findings-list.tsx`, `species-records-substep.tsx`
- [x] **1.3** Tablo sütunları: Tür grubu | Tür adı | Kayıt sayısı | Son kayıt tarihi | Veri seti başlığı
  > `species-table-view.tsx` — 5 veri sütunu + her satırda action butonları (Save, AI Summary, Deep Research, Note). Tablo ve kart görünümü arasında geçiş mevcut, varsayılan tablo. Save All butonu ile filtrelenmiş tüm türler toplu kaydedilebilir. Not ekleme inline editor ile yapılır (kayıtlı türlerde). Designation `||` ayırıcıyla `·` olarak okunabilir formatta gösterilir.
- [x] **1.4** Her tür için yapay zeka tarafından oluşturulmuş özet ekle (tür adına göre)
  > Save yapıldığında AI summary otomatik tetikleniyor (fire-and-forget). Save All yapıldığında tüm kaydedilen türler için sırayla AI summary üretiliyor (300ms aralık). Manuel olarak da "AI Summary" butonu ile tetiklenebilir. Summary tablo ve kart görünümünde Species Name altında gösterilir. İlk 15 designated tür için arama sonrası otomatik üretilir. Endpoint: `/api/ai/species-summary` (GPT-4o-mini). Deep Research açıldığında NBDC taxon enrichment on-demand yapılır (totalIrishRecords, gridSquares10km).
- [x] **1.5** Haritada belirli konum için nokta gösterimini kaldır (faydalı bulunmadı)
  > `finding-markers.tsx`'te `dataType === 'species_record'` → `return null`. Nokta yerine haritada aranan grid kareleri görselleştirilebilir: "Show Grid" / "Hide Grid" toggle butonu ile kontrol edilir, varsayılan kapalı. Grid kareleri mor kesikli çizgili dikdörtgenler olarak çizilir, hover'da grid kodu tooltip olarak gösterilir. Dosyalar: `project-map.tsx` (`gridOverlay` prop), `data-gathering-substep-shell.tsx` (toggle state)
- [x] **1.6** Birden fazla kesişen 1km veya 10km karelerden gelen kayıtları projenin tampon alanı içinde tek listede birleştirme özelliği ekle
  > Buffer bbox'ındaki tüm Irish Grid kareleri hesaplanır (ITM→ING offset: `easting - 400000, northing - 500000`). Her kare için NBDC rapor API'si çağrılır (3'erli batch, paralel). Aynı tür farklı karelerden geldiyse `speciesMap` ile tek satırda birleştirilir — kayıt sayıları toplanır, en yeni tarih alınır, en yaygın dataset seçilir. Kare sayısı limiti yok — buffer'a denk gelen tüm kareler dahil edilir. FPO ve Article 17 ek kaynaklar olarak her zaman çalışır. Dosya: `species-records-substep.tsx`

---

## 2. Proje Başına Birden Fazla Rapor ve Anket Girişi

**Orijinal:** "One project often requires multiple reports (e.g., an appropriate assessment screening and an ecological impact assessment), that one report might pull data from several different surveys (e.g., walkover, mammal, bat), and another report might use only a subset of those surveys. Confirmed that they assign a single project manager who then decides which technical staff will perform the required surveys."

**Yapılacaklar:**

- [x] **2.1** Proje kurulumu sırasında birden fazla rapor türü seçimine izin ver (örn. AA Screening + EcIA aynı anda)
  > DB: `project_report_types` tablosu oluşturuldu (project↔report_type many-to-many). Migration: `20260317_multi_report_support.sql`. Quick Create ve Full Create formlarında tek Select yerine checkbox grubu (Assessment + Technical kategorileri). Proje listesinde çoklu badge ve filtre desteği. Backward compat: `projects.survey_type` korunuyor, `getEffectiveReportTypes()` fallback sağlıyor. Dosyalar: `quick-create-project-modal.tsx`, `projects/new/page.tsx`, `projects/page.tsx`, `lib/supabase/queries/project-report-types.ts`, `hooks/queries/use-project-report-types.ts`
- [x] **2.2** Bir raporun birden fazla farklı anketten veri çekebilmesini sağla
  > DB: `report_survey_links` tablosu oluşturuldu (report_type↔survey many-to-many). Boş = tüm survey'ler kullanılır (fallback). Query ve hook altyapısı hazır. Dosyalar: `lib/supabase/queries/report-survey-links.ts`, `hooks/queries/use-report-survey-links.ts`. Phase 4'te UI (survey link panel) eklenecek.
- [x] **2.3** Raporlama aşamasında yeni rapor eklemeye izin ver
  > Step 8/9/10'da `ReportTypeSelector` tab bar eklendi. Tab bar'da "+" butonu ile yeni rapor türü eklenebilir. Her rapor bağımsız draft/review/export döngüsüne sahip. `useActiveReportType` hook'u aktif rapor türünü yönetir. `useLatestReportByType` ve `useReportsByType` hook'ları rapor türüne göre veri çeker. Version numaraları rapor türüne göre bağımsız (PEA v1, EcIA v1). Dosyalar: `report-type-selector.tsx`, `use-active-report-type.ts`, `ai-draft-step.tsx`, `quality-review-step.tsx`, `final-submission-step.tsx`, `use-report-hooks.ts`, `reports.ts`
- [x] **2.4** Proje yöneticisi atama ve anket sorumluluğu dağıtma yapısını düzenle
  > DB: `survey_assignments` tablosu oluşturuldu (survey↔user many-to-many, assigned_by ile kim atadığını takip eder). Step 4 (Field Survey)'da her survey card'a "Assign" butonu eklendi — sadece Admin ve PM rolündeki kullanıcılar görebilir. Tıklanınca `SurveyAssignmentDialog` açılır: organizasyon üyeleri listelenir, atama/çıkarma yapılabilir. Dosyalar: `survey_assignments.ts`, `use-survey-assignment-hooks.ts`, `survey-assignment-dialog.tsx`, `survey-card.tsx`, `field-survey-step.tsx`

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

**Orijinal:** "User Roles and Third-Party Access for Surveys: Identified Need: Different user roles are required, specifically for field workers who only need access to the survey element, not the reporting side. While third-party consultants often work independently, the application needs the functionality to assign them a login for data submission. This standardizes methods and data collection, allowing the firm to manage capacity by assigning fieldwork to third parties and focusing internal teams on reporting and administration."

**Yapılacaklar:**

- [x] **5.1** Mevcut rol sistemini genişlet — 3 rol yerine 7 rol:
  - **Admin:** Tam yetki
  - **Proje Yöneticisi (Project Manager):** Proje oluşturma/yönetme, anket ve rapor şablonlarını düzenleme (amending surveys and report templates), projeye kullanıcı ekleme
  - **Ekolojist (Ecologist):** Bir projeyi uçtan uca (end-to-end) yönetebilir
  - **Assessor:** Ecologist ile aynı yetkilere sahip (legacy, geriye uyumluluk)
  - **Junior:** Bir projenin farklı aşamalarına (different stages) erişim — Step 2 (Data Gathering) + Step 4-6 (Field Research)
  - **3. Taraf (3rd Party):** Sadece Step 4-6 (Field Research) — belirli bir ankete erişim ve düzenleme
  - **Client:** Salt okunur proje görüntüleme (hiçbir adıma erişim yok)
    > DB migration oluşturuldu (`20260313_expand_user_roles.sql`): `user_role` enum'una `project_manager`, `ecologist`, `junior`, `third_party` eklendi. `types/database.ts` güncellendi. `role-context.tsx`'te her rol için izin matrisi tanımlandı. `header.tsx`'te her rol için stil ve etiketler eklendi. Dosyalar: `supabase/migrations/20260313_expand_user_roles.sql`, `types/database.ts`, `contexts/role-context.tsx`, `components/layout/header.tsx`
- [x] **5.2** Saha çalışanlarının yalnızca anket kısmına erişimini sağla (raporlama tarafını gizle)
  > `ROLE_STEP_ACCESS` config'i `lib/config/workflow.ts`'ye eklendi. Junior: step 2,4,5,6. Third_party: step 4,5,6. Client: hiçbir step yok. `isStepLocked()` fonksiyonu project-context'te bu config'e göre çalışıyor. Sidebar'da kilitli adımlar `opacity-40` + `cursor-not-allowed` ile gösteriliyor. `page.tsx`'te kilitli adıma URL ile erişim de engellendi — Lock ikonu ve "Access Restricted" mesajı gösteriliyor. Dosyalar: `lib/config/workflow.ts`, `contexts/project-context.tsx`, `app/(dashboard)/projects/[id]/page.tsx`, `components/project/project-workflow-sidebar.tsx`
- [x] **5.3** 3. taraf danışmanlara firma uygulamasından login atayarak standart formlarla veri girmelerini sağla — bu sayede firma saha çalışmasını dışarıya devredip iç ekibi raporlama ve yönetime odaklayabilir (kapasite yönetimi)
  > Team sayfasından 5 rolden biri seçilerek davet oluşturuluyor (Admin, PM, Ecologist, Junior, 3rd Party). Davet linki kopyalanıp manuel paylaşılıyor. Davet edilen kişi `/accept-invite?token=...` sayfasında isim + şifre belirleyerek kayıt oluyor. Kayıt işlemi server-side `/api/team/accept-invite` endpoint'i üzerinden admin client ile yapılıyor — profil doğru organization ve role ile oluşturuluyor, invite otomatik accepted olarak işaretleniyor. Kayıt sonrası otomatik login + `/projects`'e yönlendirme. Re-invite desteği var: aynı email'e tekrar davet gönderilirse eski token silinip yeni oluşturuluyor. Dosyalar: `app/(dashboard)/team/page.tsx`, `app/api/team/invite/route.ts`, `app/api/team/accept-invite/route.ts`, `app/(auth)/accept-invite/page.tsx`
  >
  > **TODO: Resend entegrasyonu** — Şu an davet sadece link kopyalama ile çalışıyor, mail gönderimi yok. Resend (resend.com) entegre edilmeli: davet oluşturulduğunda kullanıcıya otomatik e-posta gitmeli, mail içinde şifre oluşturma linki (`/accept-invite?token=...`) bulunmalı. Bu sayede admin'in linki manuel kopyalayıp paylaşmasına gerek kalmaz.
- [x] **5.4** Rol bazlı erişim kontrolünü proje sayfasında uygula
  > 5.2 ile birlikte yapıldı. `canRoleAccessStep()` fonksiyonu + `isStepLocked()` callback'i tüm adımlarda rol bazlı erişimi kontrol ediyor. Sidebar ve sayfa içeriği bu kontrole göre davranıyor.

### Rol-Step Erişim Tablosu

| Step | Name             | Admin | PM  | Ecologist | Junior | 3rd Party | Client |
| ---- | ---------------- | :---: | :-: | :-------: | :----: | :-------: | :----: |
| 1    | GIS Mapping      |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| 2    | Data Gathering   |   Y   |  Y  |     Y     |   Y    |     -     |   -    |
| 3    | Desk Assessment  |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| 4    | Field Survey     |   Y   |  Y  |     Y     |   Y    |     Y     |   -    |
| 5    | Habitat Mapping  |   Y   |  Y  |     Y     |   Y    |     Y     |   -    |
| 6    | Target Notes     |   Y   |  Y  |     Y     |   Y    |     Y     |   -    |
| 7    | Data Analysis    |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| 8    | AI Draft         |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| 9    | Quality Review   |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| 10   | Final Submission |   Y   |  Y  |     Y     |   -    |     -     |   -    |

### Temel Yetki Farkları

| Yetki                           | Admin | PM  | Ecologist | Junior | 3rd Party | Client |
| ------------------------------- | :---: | :-: | :-------: | :----: | :-------: | :----: |
| Proje oluşturma                 |   Y   |  Y  |     -     |   -    |     -     |   -    |
| Proje silme                     |   Y   |  -  |     -     |   -    |     -     |   -    |
| Ekip yönetimi                   |   Y   |  Y  |     -     |   -    |     -     |   -    |
| Sistem ayarları                 |   Y   |  -  |     -     |   -    |     -     |   -    |
| Sınır çizme / shapefile yükleme |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| Harici veri arama               |   Y   |  Y  |     Y     |   Y    |     -     |   -    |
| Anket oluşturma                 |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| Saha verisi girişi              |   Y   |  Y  |     Y     |   Y    |     Y     |   -    |
| Belirsiz işaretleme             |   Y   |  Y  |     Y     |   Y    |     Y     |   -    |
| Habitat düzenleme               |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| Rapor yazma                     |   Y   |  Y  |     Y     |   -    |     -     |   -    |
| Rapor onaylama                  |   Y   |  Y  |     -     |   -    |     -     |   -    |
| Şablon yönetimi                 |   Y   |  Y  |     -     |   -    |     -     |   -    |

---

## 5. Düzeltmeler (14 Mart 2026)

- [x] **5.5** Active Members listesindeki "Remove" butonu çalışmıyordu → `/api/team/remove-member` endpoint'i oluşturuldu, buton `onClick` handler'a bağlandı. Güvenlik kontrolleri: kendini silemez, PM admin'i silemez, farklı organizasyondaki üyeyi silemez. Profil + auth user birlikte siliniyor.
- [x] **5.6** Invite Member'da doldurulan Full Name, davet linkini açan kullanıcıya boş geliyordu → `invites` tablosuna `full_name` sütunu eklendi, `get_invite_by_token` RPC güncellendi, accept-invite sayfası artık ismi ön doldurarak gösteriyor.
- [x] **5.7** Silinen bir kullanıcının e-postasına tekrar davet oluşturulamıyordu → Invite API'de eski davetler silinirken sadece pending (`accepted_at IS NULL`) olanlar temizleniyordu, kabul edilmiş eski davetler kalıyordu. Filtre kaldırıldı — aynı email+org için tüm eski davetler temizleniyor.
- [x] **5.8** Manage Team (proje içi) dialogundaki rol seçenekleri eski sistemden kalmaydı (`surveyor`, `analyst`) → `lead`, `member`, `reviewer`, `viewer` olarak güncellendi. `project_member_role` enum'una `member` eklendi, mevcut `surveyor`/`analyst` kayıtları `member`'a migrate edildi.
- [x] **5.9** Manage Team dialogunda kişilerin org rolü (Ecologist, PM, Junior vb.) görünmüyordu → Hem assigned hem available listesinde ismin yanına org role badge'i eklendi.
- [x] **5.10** `assessor` rolü deprecated edildi → DB'deki 3 assessor kullanıcı `ecologist`'e migrate edildi. UI'da assessor seçeneği hiçbir yerde gösterilmiyor. `Record<UserRole>` zorunlu olan yerlerde ecologist'e yönlendiren fallback'lar bırakıldı (DB enum'unda değer kaldığı için type-safety gereği).
