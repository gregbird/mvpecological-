# Dashboard Redesign - Bolt.new Referans Analizi

## 1. Mevcut Durum

~~Şu anki dashboard (`app/(dashboard)/page.tsx`) sadece `/projects` sayfasına redirect ediyor.~~
✅ Tüm yönlendirmeler `/dashboard`'a güncellendi (middleware, layout, sidebar, auth modal, login).
Gerçek dashboard `app/(dashboard)/dashboard/page.tsx` dosyasında mevcut.

### Mevcut Dashboard'da Olan:
- 4 stat kartı (Total Projects, Not Started, In Progress, Completed) ✅ Bolt.new'e uyarlandı
- ~~Recent Projects listesi (tablo formatında)~~ ✅ Timeline grid'e dönüştürüldü
- ~~Workflow Distribution donut chart (tek bir donut)~~ ✅ 3 ayrı donut chart'a dönüştürüldü
- Quick Actions (sadece assessor) ✅ Alt kısımda korundu

### Mevcut Dashboard'da Olmayan (Bolt.new'de Olan):
- ~~Project Status Distribution donut chart~~ ✅ Eklendi
- ~~Workflow Stage Progress donut chart~~ ✅ Eklendi
- ~~Timeline Health donut chart~~ ✅ Eklendi
- ~~All Projects Timeline Status grid (proje kartları ile progress bar)~~ ✅ Eklendi

---

## 2. Bolt.new Dashboard Analizi (Ekran Görüntüleri)

### 2.1 Header Bölümü
- **Başlık:** "Dashboard" + "Welcome back, {username}"
- **Sağ üst:** "+ New Project" butonu (mavi, filled)

### 2.2 Stat Kartları (4-column grid)
| Kart | Değer | İkon | İkon Rengi |
|------|-------|------|------------|
| Total Projects | 37 | Dosya/belge ikonu | Mavi |
| Not Started | 0 | Saat ikonu | Mavi |
| In Progress | 0 | Uyarı/saat ikonu | Turuncu |
| Completed | 0 | Onay ikonu | Yeşil |

- Her kart beyaz arka plan, hafif border/shadow
- İkon sağ üst köşede, pastel renk dairesi içinde
- Değer büyük ve bold, label küçük ve gri

### 2.3 Üç Donut Chart (3-column grid)

#### A) Project Status Distribution
- **Kategoriler:**
  - Pending (gri): 37
  - Not Started (mavi): 0
  - In Progress (turuncu): 0
  - Completed (yeşil): 0
- **Merkez:** "37 Projects" yazısı
- Legend altta, 2x2 grid formatında

#### B) Workflow Stage Progress
- **Kategoriler:**
  - Desk Research (mavi): 0
  - Field Research (yeşil): 0
  - Reporting (turuncu): 0
- **Merkez:** "0 Active" yazısı
- Legend altta, dikey liste

#### C) Timeline Health
- **Kategoriler:**
  - On Track (yeşil): 18
  - At Risk (sarı/amber): 1
  - Overdue (kırmızı): 18
- **Merkez:** "49% Healthy" yazısı
- Legend altta, dikey liste
- Bu chart en renkli: büyük kırmızı dilim, orta yeşil dilim, küçük sarı dilim

### 2.4 All Projects Timeline Status (Proje Kartları Grid) ✅ Tamamlandı

3 sütunlu kart grid (responsive: lg:3, md:2, sm:1). Her proje kartı:

```
┌─────────────────────────────────┐
│ ● Proje Adı                    │  ← büyük durum noktası (3.5x3.5)
│   KNP-2024-03                  │  ← site kodu (monospace, gri)
│ Active              11d left   │  ← durum + gün bilgisi (renkli)
│ ████████░░░░░░░░░░░░░░░░░░░░  │  ← progress bar (yüzde YOK)
│ 21 Jan                 18 Feb  │  ← başlangıç (sol) - bitiş (sağ)
└─────────────────────────────────┘
```

| Eleman | Açıklama |
|--------|----------|
| Durum noktası | Büyük (h-3.5 w-3.5): Yeşil (on_track), Sarı (at_risk), Kırmızı (overdue) |
| Proje adı | Bold, tıklanabilir → proje detay sayfası |
| Site kodu | Gri, monospace, küçük font (ör: KNP-2024-03) |
| Durum | Sol: "Active" / "Draft" / "Completed" |
| Gün bilgisi | Sağ: "11d left" (yeşil/sarı) veya "375d over" (kırmızı) |
| Progress bar | Renk duruma göre, yüzde gösterilmiyor |
| Tarihler | Sol: başlangıç, Sağ: bitiş (en-IE formatı: "21 Jan") |

**Renk Mantığı:**
- **Yeşil (on_track):** `bg-green-500` nokta + bar, `text-green-600` gün bilgisi
- **Sarı (at_risk):** `bg-amber-500` nokta + bar, `text-amber-600` gün bilgisi (≤7 gün kala)
- **Kırmızı (overdue):** `bg-red-500` nokta + bar, `text-red-600` gün bilgisi (süre aşımı)
- Progress bar doluluk = `(bugün - başlangıç) / (bitiş - başlangıç) * 100` (0-100 arası clamp)

**Pagination:** İlk 12 kart gösterilir, "Show more" / "Show less" toggle butonu

---

## 3. Sidebar Karşılaştırma

### Bolt.new Sidebar:
```
Workspace (expandable)
  ├── Dashboard (active - mavi highlight)
  ├── Projects
  ├── Team Members
  ├── Team Timesheets
  └── Audit Trail

Initial Setup >
Desk Research >
Field Research >
Reporting >
Configuration

─────────────
[Avatar] Apro / Admin
[Switch to Assessor View]
[Sign Out] (kırmızı)
```

### Mevcut Sidebar:
- Ana navigasyon layout.tsx içinde, sidebar.tsx ise proje detay sayfası için
- Benzer yapı mevcut ama "Configuration" ve "Switch to Assessor View" yok

---

## 4. Yapılması Gereken Değişiklikler

### 4.1 Stat Kartları Güncelleme ✅
- [x] ~~Mevcut: 4 kart var~~
- [x] ~~Güncelleme: İkonları ve renkleri Bolt.new'deki gibi yap~~
- [x] ~~"Needs Attention" -> "Not Started" olarak değiştir~~
- [x] ~~İkonlar pastel renk dairesi içinde sağ üst köşeye~~
- [x] ~~Kart sıralaması: Total Projects → Not Started → In Progress → Completed~~
- [x] ~~Sol renkli border eklendi (border-l-4)~~
- [x] ~~Rakam renkleri: Not Started (mavi), In Progress (turuncu), Completed (yeşil)~~
- [x] ~~Header "New Project" butonu mavi yapıldı (emerald → blue)~~
- [x] ~~Root redirect `/projects` → `/dashboard` olarak değiştirildi~~

### 4.2 Donut Chart'lar (3 adet) ✅
- [x] ~~Mevcut tek donut chart'ı 3 ayrı donut chart'a dönüştürüldü~~
  1. ~~**Project Status Distribution** - Pending/Not Started/In Progress/Completed~~
  2. ~~**Workflow Stage Progress** - Desk Research/Field Research/Reporting~~
  3. ~~**Timeline Health** - On Track/At Risk/Overdue~~
- [x] ~~Her donut chart'ın merkezinde özet bilgi (sayı + label)~~
- [x] ~~Her chart'ın altında legend (Status: 2x2 kare, Workflow: dikey kare, Health: dikey yuvarlak)~~
- [x] ~~SVG arc-path tabanlı donut chart (segmentler arası beyaz gap)~~
- [x] ~~Timeline Health: `expected_end_date` bazlı client-side hesaplama (veritabanı `health_status` yerine)~~

### 4.3 All Projects Timeline Status (YENİ) ✅
- [x] ~~3 sütunlu card grid oluşturuldu (lg:3, md:2, sm:1 responsive)~~
- [x] ~~Her kart: durum noktası (büyük), proje adı, site kodu, durum, gün bilgisi, progress bar, tarihler~~
- [x] ~~Renk kodlaması: yeşil (on_track), sarı/amber (at_risk), kırmızı (overdue)~~
- [x] ~~Progress bar hesaplama: `(bugün - başlangıç) / (bitiş - başlangıç) * 100` (clamp 0-100)~~
- [x] ~~12'den fazla projede "Show more" / "Show less" toggle butonu~~
- [x] ~~Kart tıklama → `/projects/{id}?step={currentStep}` sayfasına yönlendirme~~
- [x] ~~`ProjectWithTimeline` interface: `timelineProgress`, `healthStatus`, `daysInfo` alanları~~
- [x] ~~Tüm projeler için hesaplama (`slice(0,5)` kaldırıldı)~~
- [x] ~~Tarihler progress bar altında: sol başlangıç, sağ bitiş (en-IE formatında)~~
- [x] ~~**Kart tıklama -> Proje Detay Modal'ı aç** (bkz. 4.5)~~ ✅ Admin görünümünde tamamlandı

### 4.4 Layout Düzeni ✅
- [x] ~~Recent Projects tablo formatı → Timeline kartları grid formatına dönüştürüldü~~
- [x] ~~Quick Actions alt kısma taşındı (sadece assessor için görünür)~~

### 4.5 Proje Detay Modal'ı (YENİ - Proje Kartına Tıklayınca)

Timeline kartlarına tıklandığında açılan modal/popup. Projenin tüm workflow adımlarını
hızlıca görmek için kullanılıyor. Projeye gitmeden "nerede kaldık?" sorusuna cevap veriyor.

#### Modal Header:
| Eleman | Açıklama |
|--------|----------|
| Proje adı | Bold, büyük font (ör: "apro") |
| Site Code | "Site Code: N/A" veya gerçek kod |
| Project ID | UUID formatında (ör: 7a889939-e90c-...) |
| Team | Atanan ekip/kullanıcı adı |
| Kapat butonu | X ikonu, sağ üst köşe |

#### Faz Özet Kartları (3-column grid):
Her faz için bir özet kartı:

| Faz | İçerik | Örnek |
|-----|--------|-------|
| Desk Research | İkon + "X of Y completed" + progress bar + yüzde | 0 of 5 completed, 0% |
| Field Research | İkon + "X of Y completed" + progress bar + yüzde | 0 of 6 completed, 0% |
| Reporting | İkon + "X of Y completed" + progress bar + yüzde | 0 of 5 completed, 0% |

- Her kart border'lı, beyaz arka plan
- Progress bar kartın alt kısmında
- Yüzde sağ alt köşede

#### Accordion Bölümleri (Faz Detayları):
3 ayrı accordion (açılıp kapanabilir), her biri bir faz:

**1. Desk Research Steps** (bizim sistemde 3 adım):
| Adım | Bizim Karşılığı | Açıklama |
|------|-----------------|----------|
| GIS Mapping | Step 1 | Site boundary, buffer zones, NPWS overlay |
| Data Gathering | Step 2 | NPWS, GBIF, NBDC, EPA searches |
| Desk Assessment | Step 3 | AI insights, relevance assessment |

> **Not:** Bolt.new'de 5 adım var (Review Historical Data, GIS Mapping Analysis,
> Data Mine Search, Climate Data Review, Desk Research Report) ama bizim
> sistemde 3 adım var. Modal'ı bizim 10-step workflow'a uyarlayacağız.

**2. Field Research Steps** (bizim sistemde 3 adım):
| Adım | Bizim Karşılığı | Açıklama |
|------|-----------------|----------|
| Field Survey | Step 4 | Survey creation, weather, effort |
| Habitat Mapping | Step 5 | FOSSITT classification, polygons |
| Target Notes | Step 6 | Field observations, 8 categories |

> **Not:** Bolt.new'de 6 adım var ama bizim sistemde 3 adım.

**3. Reporting Steps** (bizim sistemde 4 adım):
| Adım | Bizim Karşılığı | Açıklama |
|------|-----------------|----------|
| Data Analysis | Step 7 | Statistics, synthesis |
| AI Draft | Step 8 | PEA report generation |
| Quality Review | Step 9 | Senior review, approval |
| Final Submission | Step 10 | Report finalization |

> **Not:** Bolt.new'de 5 adım var ama bizim sistemde 4 adım.

#### Her Adım Satırının İçeriği:
| Eleman | Açıklama |
|--------|----------|
| Durum ikonu | Daire: ○ Not Started, ◑ In Progress, ● Completed, ◑ Needs Review, ○ Blocked |
| Adım adı | Bold (ör: "Plan Field Survey") |
| Açıklama | Gri, küçük font (ör: "Plan field survey route and methodology...") |
| Bağımlılık | "Depends on: {önceki adım}" - link/zincir ikonu ile |
| Durum text | Sağ tarafta: "Not Started" / "In Progress" / "Completed" / "Needs Review" / "Blocked" |

#### Status Legend (Modal Alt):
```
○ Not Started   ◑ In Progress   ● Completed   ◑ Needs Review   ○ Blocked
```

#### Modal Davranışları:
- [x] ~~Proje kartına tıklayınca modal açılır (shadcn Dialog kullan)~~ ✅
- [x] ~~X butonu veya overlay tıklama ile kapanır~~ ✅
- [x] ~~Accordion'lar varsayılan kapalı, tıklayınca açılır~~ ✅
- [x] ~~Workflow step durumları `workflow_steps` tablosundan çekilir~~ ✅
- [x] ~~Bağımlılıklar step_number sıralamasına göre gösterilir~~ ✅
- [x] ~~Modal'dan projeye gitme linki eklenebilir ("Go to Project" butonu)~~ ✅

#### Uygulama Detayları (2026-02-08):
- **Component:** `components/dashboard/project-detail-modal.tsx`
- **Veri kaynağı:** Dashboard'daki mevcut `workflow_steps` fetch'i kullanılıyor (yeni query yok)
- **Admin only:** Sadece admin rolünde kart tıklama ile modal açılıyor
- **Assessor:** `router.push()` ile proje sayfasına yönlendirme (mevcut davranış)
- **Status ikonları:** SVG tabanlı (○ pending, ◑ in_progress, ● approved, ◑ needs_review, ○ blocked)
- **Bağımlılıklar:** Lineer zincir (her adım bir öncekine bağlı, `ALL_WORKFLOW_STEPS` kullanılarak)
- **Fazlar:** Bizim 10-step workflow'a uyarlanmış (3+3+4 = Desk/Field/Reporting)

---

## 5. Bolt.new vs Bizim Sistem - Adım Eşleme Tablosu

### Önemli Fark:
Bolt.new'de **16 alt adım** var, bizim sistemde **10 adım** var.
Modal'ı bizim workflow'a uyarlayacağız.

| Bolt.new Adımı | Bizim Adım | Step # | Faz |
|----------------|-----------|--------|-----|
| Review Historical Data | GIS Mapping | 1 | Desk Research |
| GIS Mapping Analysis | GIS Mapping | 1 | Desk Research |
| Data Mine Search | Data Gathering | 2 | Desk Research |
| Climate Data Review | Data Gathering | 2 | Desk Research |
| Desk Research Report | Desk Assessment | 3 | Desk Research |
| Plan Field Survey | Field Survey | 4 | Field Research |
| Conduct Habitat Survey | Habitat Mapping | 5 | Field Research |
| Species Recording | Field Survey | 4 | Field Research |
| Impact Calculation | Target Notes | 6 | Field Research |
| Article 17 Assessment | Target Notes | 6 | Field Research |
| Photo Documentation | Target Notes | 6 | Field Research |
| Data Quality Check | Data Analysis | 7 | Reporting |
| Statistical Analysis | Data Analysis | 7 | Reporting |
| Generate Assessment Report | AI Draft | 8 | Reporting |
| Peer Review | Quality Review | 9 | Reporting |
| Final Report | Final Submission | 10 | Reporting |

---

## 6. Veri Kaynakları

### Stat Kartları İçin:
```sql
-- Total Projects
SELECT COUNT(*) FROM projects WHERE organization_id = ?

-- Not Started (status = 'draft')
SELECT COUNT(*) FROM projects WHERE status = 'draft' AND organization_id = ?

-- In Progress (status = 'active')
SELECT COUNT(*) FROM projects WHERE status = 'active' AND organization_id = ?

-- Completed (status = 'completed')
SELECT COUNT(*) FROM projects WHERE status = 'completed' AND organization_id = ?
```

### Donut Chart'lar İçin:

#### A) Project Status Distribution
```sql
-- projects.status alanından (client-side count)
-- Pending   → status = 'draft'
-- Not Started → sabit 0 (henüz kullanılmıyor)
-- In Progress → status = 'active'
-- Completed   → status = 'completed'
```

#### B) Workflow Stage Progress
```sql
-- projects.current_phase alanından (client-side count)
-- Desk Research  → current_phase = 'desk_research'
-- Field Research → current_phase = 'field_research'
-- Reporting      → current_phase = 'reporting'
SELECT current_phase, COUNT(*) FROM projects
WHERE organization_id = ? GROUP BY current_phase;
```

#### C) Timeline Health
```
Veritabanındaki health_status KULLANILMIYOR.
Client-side olarak projects.expected_end_date'e göre hesaplanıyor:

- Overdue  → expected_end_date < bugün (süresi geçmiş projeler)
- At Risk  → expected_end_date <= bugün + 7 gün (son 1 haftaya giren projeler)
- On Track → expected_end_date > bugün + 7 gün VEYA tarih yok

NOT: Sadece tamamlanmamış projeler (status !== 'completed') hesaba dahil.
Healthy yüzdesi = onTrack / (onTrack + atRisk + overdue) * 100
```

### Timeline Kartları İçin:
```sql
SELECT
  p.name, p.site_code, p.status, p.health_status,
  p.expected_start_date, p.expected_end_date,
  -- Gün hesaplama
  CASE
    WHEN p.expected_end_date < NOW()
    THEN EXTRACT(DAY FROM NOW() - p.expected_end_date) || 'd over'
    ELSE EXTRACT(DAY FROM p.expected_end_date - NOW()) || 'd left'
  END as time_status
FROM projects p
WHERE p.organization_id = ?
ORDER BY p.expected_end_date ASC
```

---

## 6. Teknik Notlar

### Kullanılacak Bileşenler:
- **Donut Chart:** Mevcut SVG-based DonutChart bileşeni genişletilebilir
- **Stat Kartları:** shadcn/ui Card bileşeni
- **Progress Bar:** Tailwind CSS ile custom
- **Grid Layout:** CSS Grid (3-column responsive)

### Responsive Tasarım:
- Desktop: 3 sütunlu donut + 3 sütunlu proje kartları
- Tablet: 2 sütun
- Mobile: 1 sütun

### Proje Detay Modal Bileşeni:
- **shadcn/ui Dialog** kullan (modal)
- **shadcn/ui Accordion** kullan (faz detayları açılıp kapanması)
- **Faz özet kartları:** shadcn Card + custom progress bar
- **Step durumu ikonları:** Custom SVG veya Lucide ikonları
- **Bağımlılık gösterimi:** `workflow_steps` tablosundaki `step_number` sırasına göre

### Modal İçin Veri Akışı:
```typescript
// 1. Proje kartına tıklandığında project_id al
// 2. workflow_steps tablosundan tüm adımları çek
const { data: steps } = await supabase
  .from('workflow_steps')
  .select('*')
  .eq('project_id', projectId)
  .order('step_number', { ascending: true })

// 3. Fazlara göre grupla
const deskResearchSteps = steps.filter(s => s.phase === 'desk_research')
const fieldResearchSteps = steps.filter(s => s.phase === 'field_research')
const reportingSteps = steps.filter(s => s.phase === 'reporting')

// 4. Tamamlanma oranını hesapla
const completedCount = steps.filter(s => s.status === 'approved').length
const percentage = Math.round((completedCount / steps.length) * 100)
```

### Veri Yenileme:
- İlk yüklemede Supabase'den fetch
- Realtime subscription ile güncel tutma opsiyonel

---

## 7. Tamamlanan İşler (2026-02-08)

### Dashboard UI ✅
- [x] 4 Stat Kartı (Bolt.new tasarımına uyarlandı)
- [x] 3 Donut Chart (Project Status, Workflow Stage, Timeline Health)
- [x] All Projects Timeline Status grid (proje kartları + progress bar)
- [x] Show more / Show less pagination (12+ proje)
- [x] Quick Actions (assessor only, alt kısımda)

### Proje Detay Modal ✅
- [x] `components/dashboard/project-detail-modal.tsx` oluşturuldu
- [x] Admin: kart tıklama → modal açılır
- [x] Assessor: kart tıklama → proje sayfasına yönlendirme
- [x] 3 Faz Özet Kartı (progress bar + yüzde)
- [x] 3 Accordion (Desk Research, Field Research, Reporting steps)
- [x] SVG durum ikonları (pending, in_progress, approved, needs_review, blocked)
- [x] Status Legend
- [x] "Go to Project" butonu
- [x] Bolt.new referans ikonları (BookOpen, Compass, BarChart3)

### Yönlendirme Düzeltmeleri ✅
- [x] Middleware: auth sayfalarından `/dashboard`'a yönlendirme (middleware.ts:65)
- [x] Layout logo: `/dashboard`'a link (layout.tsx:105, 154)
- [x] Sidebar logo: `/dashboard`'a link (sidebar.tsx:167)
- [x] Auth modal: login sonrası `/dashboard`'a yönlendirme (auth-modal.tsx:204)
- [x] Login sayfası: login sonrası `/dashboard`'a yönlendirme (login/page.tsx:67)

---

## 8. Kalan İşler & Öncelikler

### P0 - Kritik (Veri Bütünlüğü)
- [ ] **Workflow steps 16→10 migration:** DB'deki eski 16-step şema, kodda 10-step config var. Trigger function `create_default_workflow_steps` hala 16 adım oluşturuyor. CHECK constraint `step_number <= 16` → `<= 10` olmalı. Mevcut projelerin workflow_steps'leri migre edilmeli.
- [ ] **current_phase düzeltmesi:** Bazı projelerde `current_phase = 'field_research'` ama gerçekte hala desk research'te. Migration ile birlikte düzeltilmeli.

### P1 - Önemli (Fonksiyonellik)
- [ ] **Assessor rolü / görünümü:** Henüz başlanmadı. Dashboard'da admin vs assessor deneyimi farklı olacak.
- [ ] **Sidebar navigasyonu:** Bolt.new'deki "Configuration", "Switch to Assessor View" gibi öğeler eksik.

### P2 - İyileştirme
- [ ] **Donut chart animasyonları:** Sayfa yüklendiğinde chart'ların animasyonla dolması
- [ ] **Realtime güncellemeler:** Supabase realtime subscription ile dashboard verilerinin otomatik güncellenmesi
- [ ] **Modal içi aksiyonlar:** Modal'dan direkt step status değiştirme (admin için)
