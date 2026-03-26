# AI Draft Feature — Step 8

## Gereksinim Kaynağı

Greg'in feedback'inden gelen AI Draft Feature Requirements:

> - The AI draft feature should incorporate all saved tables and data from the "Data Analysis" section.
> - The UI should conceptually resemble the design of Context.ai.
> - The application will utilize report templates containing boilerplate text.
> - This boilerplate text will be automatically updated with location details and findings from each project stage.
> - The ecologist can then insert their professional opinion and context into each paragraph/section.
> - The AI tool will generate a comprehensive draft report using assets such as map screenshots, photographs, tabular habitat data, etc., which the ecologist can then edit and share with colleagues for review.

---

## Ne Yapıldı

Step 8 (AI Draft Generation) iki sekmeli yapıya dönüştürüldü:

1. **AI Draft** (ana sekme) — Context.ai benzeri üç sütunlu doküman editörü. Rapor şablonları + proje verileri + ekolojist görüşü + AI üretimi birleştirilir.
2. **Dulra Agent** (yardımcı sekme) — Proje verileri hakkında soru-cevap yapan chat asistanı. Agent yanıtları "Insert into Draft" ile rapora aktarılabilir.

### Gereksinim Karşılama Tablosu

| Gereksinim                                                       | Nasıl Karşılandı                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data Analysis verilerini dahil et                                | Asset Panel (sağ sidebar) Data sekmesinde findings, habitats, species, surveys sayıları gösterilir. AI bölüm üretimi tüm proje verilerini context olarak kullanır.             |
| Context.ai benzeri UI                                            | Üç sütunlu layout: sol TOC, orta doküman editörü (sürekli akış, kağıt görünümü), sağ asset panel. Eski accordion kaldırıldı.                                                   |
| Rapor şablonları + boilerplate                                   | `pea-template.ts` CIEEM standart boilerplate içerir. `template-renderer.ts` `{{placeholder}}`'ları gerçek proje verileriyle doldurur.                                          |
| Lokasyon ve bulgu bilgileri ile otomatik güncelleme              | Şablon render sırasında `{{project_name}}`, `{{location_description}}`, `{{designated_sites_table}}`, `{{habitat_table}}` vb. placeholder'lar proje datasından otomatik dolar. |
| Ekolojist profesyonel görüşü ekleme                              | Her bölümde collapsible "Add professional opinion" alanı. Girilen görüş AI üretimine dahil edilir.                                                                             |
| Asset'lerle (screenshot, fotoğraf, tablo) kapsamlı rapor üretimi | Asset Panel'de Maps (screenshot grid), Photos (fotoğraf grid), Data (tablo özetleri) sekmeleri. Photo Picker Modal ile editöre fotoğraf eklenir.                               |
| Düzenle ve meslektaşlarla paylaş                                 | TipTap editör her bölümde aktif. Save/Version History/Compare/Restore ile sürüm yönetimi. Complete Step ile Quality Review'a gönderilir.                                       |

---

## Mimari

```
Step 8: AI Draft Generation
┌──────────────────────────────────────────────────┐
│  [Dulra Agent]  [AI Draft]      ← Sekmeler      │
├──────────────────────────────────────────────────┤
│                                                  │
│  AI Draft Sekmesi (Ana):                         │
│  ┌───────┬─────────────────┬──────────┐          │
│  │  TOC  │  Doküman Editörü│  Assets  │          │
│  │       │                 │          │          │
│  │ 1.Int │  [Başlık+Badge] │  Data    │          │
│  │ 2.Met │  [Opinion]      │  Maps    │          │
│  │ 3.Res │  [TipTap Editor]│  Photos  │          │
│  │ 4.Con │  ─────────────  │          │          │
│  │ 5.Dis │  [Başlık+Badge] │          │          │
│  │ 6.App │  [TipTap Editor]│          │          │
│  └───────┴─────────────────┴──────────┘          │
│                                                  │
│  Dulra Agent Sekmesi (Yardımcı):                 │
│  ┌─────────────────────────────────┐             │
│  │  Chat mesajları (scrollable)    │             │
│  │  + "Insert into Draft" butonu   │             │
│  ├─────────────────────────────────┤             │
│  │  [Mesaj yaz...] [Gönder]       │             │
│  └─────────────────────────────────┘             │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## AI Draft Sekmesi (Context.ai Benzeri Doküman Editörü)

### Rapor Akışı

1. **Yeni proje açıldığında** → `pea-template.ts`'deki boilerplate metin, `template-renderer.ts` ile proje verileriyle doldurularak 6 bölüme yerleştirilir
2. **Ekolojist** → her bölüme "professional opinion" ekler (collapsible textarea)
3. **"Generate with AI" tıklanınca** → GPT-4o, tüm proje verileri + ekolojist görüşü ile o bölümü yazar
4. **Ekolojist** → TipTap editörde düzenler, fotoğraf/tablo ekler
5. **Save** → Supabase `reports` tablosuna kaydeder
6. **Save as New Version** → Yeni versiyon oluşturur (diff/compare/restore destekli)
7. **Complete Step** → Quality Review'a (Step 9) gönderir

### Sol Sütun: Table of Contents

**Dosya:** `components/steps/ai-draft/table-of-contents.tsx`

- 6 PEA rapor bölümü (CIEEM standart)
- Renk kodlu durum noktaları:
  - Gri: boş
  - Mavi: şablon ile dolu
  - Mor: AI tarafından üretilmiş
  - Yeşil: kullanıcı tarafından düzenlenmiş
- Tıklayınca ilgili bölüme smooth scroll

### Orta Sütun: Doküman Editörü

**Dosyalar:**

- `document-shell.tsx` — max-width 800px container, sürekli akış
- `document-section.tsx` — bölüm başlığı + badge + generate/regenerate butonu + TipTap editör
- `ecologist-opinion-inline.tsx` — collapsible professional opinion textarea
- `section-editor.tsx` — TipTap (markdown, tablo, resim destekli)
- `editor-toolbar.tsx` — bold, italic, heading, list, table, photo, undo/redo

### Sağ Sütun: Asset Panel

**Dosya:** `components/steps/ai-draft/asset-panel.tsx`

| Sekme  | Dosya                         | İçerik                                                |
| ------ | ----------------------------- | ----------------------------------------------------- |
| Data   | `asset-panel-data-tables.tsx` | Designated sites, habitats, species, surveys sayıları |
| Maps   | `asset-panel-screenshots.tsx` | `getAllScreenshots()` ile map screenshot grid'i       |
| Photos | `asset-panel-photos.tsx`      | `useProjectPhotos()` ile field fotoğraf grid'i        |

### Üst Bar

**Dosya:** `components/steps/ai-draft/document-top-bar.tsx`

- İlerleme çubuğu (X/6 sections)
- Save, New Version, Regen All, Generate All, Complete Step butonları

### Şablon Sistemi

| Dosya                                | Rol                                                               |
| ------------------------------------ | ----------------------------------------------------------------- |
| `lib/templates/pea-template.ts`      | CIEEM standart boilerplate metin, `{{placeholder}}` değişkenlerle |
| `lib/templates/template-renderer.ts` | Placeholder'ları gerçek proje verileriyle doldurur                |
| `hooks/queries/use-template-data.ts` | Findings, habitats, observations, surveys verilerini toplar       |

Placeholder'lar: `{{project_name}}`, `{{location_description}}`, `{{site_code}}`, `{{grid_reference}}`, `{{desk_sources_summary}}`, `{{survey_details}}`, `{{designated_sites_table}}`, `{{habitat_table}}`, `{{flora_summary}}`, `{{fauna_summary}}`, `{{constraints_table}}`

### AI Bölüm Üretimi

**Dosya:** `app/api/ai/report-section/route.ts`
d
sdf

- GPT-4o kullanır (yüksek kalite)
- Her bölüm için özel CIEEM prompt'ları (introduction, methodology, resualts, constraints, discussion, appendices)
- Tüm proje verilerini context olarak gönderir (findings, habitat s, observations, surveys, target notes, deep research, aquatic research, desk insights)
- Ekolojist opinion'ı varsa prompt'a dahil eder
- Results bölümü için 4000 token, diğerleri 2000 token

### Version History

| Dosya                        | Rol                                              |
| ---------------------------- | ------------------------------------------------ |
| `version-history-panel.tsx`  | Versiyon listesi                                 |
| `version-compare-dialog.tsx` | İki versiyon karşılaştırma                       |
| `version-view-dialog.tsx`    | Eski versiyon görüntüleme                        |
| `restore-version-dialog.tsx` | Eski versiyonu yeni versiyon olarak geri yükleme |

---

## Dulra Agent (Chat Sekmesi)

Yardımcı sekme — ekolojist proje verileri hakkında sorular sorar, agent yanıt üretir.

### API Endpoint

**`POST /api/ai/dulra-agent`**

| Alan          | Tip                 | Açıklama                                   |
| ------------- | ------------------- | ------------------------------------------ |
| `projectId`   | string              | Proje ID                                   |
| `message`     | string              | Kullanıcı mesajı                           |
| `chatHistory` | `{role, content}[]` | Önceki mesajlar (son 10 tanesi gönderilir) |

**Yanıt:** `{ reply: string, metadata: { model, tokensUsed } }`

- Model: `gpt-4o-mini` (hızlı yanıt, düşük maliyet)
- Max token: 1000
- Tüm proje verilerini Supabase'den çekip context olarak gönderir
- System prompt: İrlanda ekoloji uzmanı, sadece verilen proje verilerine dayanarak yanıt verir

**Dosya:** `app/api/ai/dulra-agent/route.ts`

### Chat UI

**Dosya:** `components/steps/ai-draft/dulra-agent-tab.tsx`

- Boş chat'te 4 hazır soru kartı
- Kullanıcı mesajları sağda (mavi), agent yanıtları solda (gri)
- Typing animasyonu (3 nokta)
- Enter ile gönder, Shift+Enter yeni satır
- **"Insert into Draft"** butonu — agent yanıtını rapora aktarır

**Dosya:** `components/steps/ai-draft/chat-message.tsx`

- Markdown render (bold, italic, bullet list)
- User/Bot ikonları

Chat history session boyunca `useState` ile tutulur, veritabanına kaydedilmez.

---

## Üst Seviye Bileşen

**Dosya:** `components/steps/ai-draft-step.tsx`

Tüm state burada tutulur ve her iki sekmeye prop olarak aktarılır:

- `sections` — rapor bölümleri (ReportSection[])
- `generatingSection` — hangi bölüm üretiliyor
- `activeTab` — 'agent' | 'draft'
- Version dialog state'leri
- Save/version/complete handler'ları

shadcn `Tabs` bileşeni, Bot ve FileText ikonlarıyla.

---

## Dosya Listesi

### Yeni Dosyalar

| Dosya                                                    | Açıklama              |
| -------------------------------------------------------- | --------------------- |
| `app/api/ai/dulra-agent/route.ts`                        | Chat API endpoint     |
| `components/steps/ai-draft/dulra-agent-tab.tsx`          | Chat UI               |
| `components/steps/ai-draft/chat-message.tsx`             | Mesaj bileşeni        |
| `components/steps/ai-draft/ai-draft-tab.tsx`             | Draft sekmesi wrapper |
| `components/steps/ai-draft/document-top-bar.tsx`         | Action bar            |
| `components/steps/ai-draft/table-of-contents.tsx`        | Sol sidebar TOC       |
| `components/steps/ai-draft/document-shell.tsx`           | Doküman container     |
| `components/steps/ai-draft/document-section.tsx`         | Bölüm bileşeni        |
| `components/steps/ai-draft/ecologist-opinion-inline.tsx` | Opinion textarea      |
| `components/steps/ai-draft/asset-panel.tsx`              | Sağ sidebar           |
| `components/steps/ai-draft/asset-panel-screenshots.tsx`  | Screenshot grid       |
| `components/steps/ai-draft/asset-panel-photos.tsx`       | Fotoğraf grid         |
| `components/steps/ai-draft/asset-panel-data-tables.tsx`  | Veri özet kartları    |

### Değiştirilen Dosyalar

| Dosya                                         | Değişiklik                                |
| --------------------------------------------- | ----------------------------------------- |
| `components/steps/ai-draft-step.tsx`          | Yeniden yazıldı — iki sekmeli tab wrapper |
| `components/steps/ai-draft/index.ts`          | Export güncellendi                        |
| `components/steps/ai-draft/tiptap-styles.css` | Document mode stilleri eklendi            |

### Silinen Dosyalar

| Dosya                                                  | Sebep                                   |
| ------------------------------------------------------ | --------------------------------------- |
| `components/steps/ai-draft/section-accordion-item.tsx` | `document-section.tsx` ile değiştirildi |

---

## Teknik Notlar

- Chat history session boyunca tutulur, sayfa yenilenince kaybolur (kasıtlı)
- Dulra Agent GPT-4o-mini kullanır (hız/maliyet), AI Draft bölüm üretimi GPT-4o kullanır (kalite)
- "Insert into Draft" ilk boş bölüme ekler, hepsi doluysa Discussion'a append eder
- Mevcut raporlar, version history, save/restore/compare tam geriye uyumlu
- Legacy 11-section → 6-section migration mantığı korundu
- Şablon sistemi önceki adımlardan (Step 1-7) gelen veriyi otomatik kullanır — yeniden API çağrısı yapmaz
