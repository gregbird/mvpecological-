# OpenAI → Claude Migration

**Tarih:** 2026-05-01
**Durum:** Migration tamamlandı, cleanup beklemede

## Özet

Uygulamadaki **18 chat endpoint** OpenAI GPT-5 ailesinden Anthropic Claude ailesine taşındı. Embedding işi (Company Reports RAG arama) OpenAI'de bırakıldı çünkü Anthropic embedding modeli sunmuyor ve re-index riski yüksek.

**Tier eşleştirmesi:**

- OpenAI `gpt-5` (synthesis) → Claude **Sonnet** (`claude-sonnet-4-6`)
- OpenAI `gpt-5-mini` (cheap) → Claude **Haiku** (`claude-haiku-4-5-20251001`)

**Sonnet kullanan endpoint'ler:** `desk-insights`, `data-analysis-summary` (sadece Step 8 tier='final' çağrısı). Diğer 16 endpoint Haiku.

---

## Aşama 0 — Mimari Kurulumu

API key güvenliği için key Next.js process'ine hiç girmesin diye **Supabase Edge Function + Custom Secret** mimarisi seçildi.

```
Next.js route → callClaude() → supabase.functions.invoke('claude-proxy')
                                  ↓ (kullanıcı JWT'si auth header'da)
                       Edge Function (Deno, ANTHROPIC_API_KEY secret)
                                  ↓ (x-api-key)
                       api.anthropic.com/v1/messages
```

- [x] `ANTHROPIC_API_KEY` Supabase Edge Function Secret'a eklendi
- [x] `claude-proxy` edge function deploy edildi (`verify_jwt: true`, JWT zorunlu — abuse koruması)
- [x] `supabase/functions/claude-proxy/index.ts` codebase'e versiyonlandı
- [x] `lib/ai/anthropic-models.ts` — `CLAUDE_SYNTHESIS_MODEL` ve `CLAUDE_CHEAP_MODEL` sabitleri
- [x] `lib/ai/call-claude.ts` — Next.js helper (auth + invoke + hata yönetimi)
- [x] Geçici test endpoint ile end-to-end zincir doğrulandı, sonra silindi

---

## Aşama 1 — Wave 1: Küçük standalone summary'ler

**Risk:** Düşük (per-finding, kısa çıktı)
**Model:** Haiku

- [x] `app/api/ai/legend/route.ts` (Step 5 Maps → "AI Legend")
- [x] `app/api/ai/species-summary/route.ts` (Step 2 Species Records)
- [x] `app/api/ai/aquatic-summary/route.ts` (Step 2 Aquatic Features)
- [x] `app/api/ai/site-summary/route.ts` (Step 2 Designated Sites)
- [x] Lint + type-check ✓
- [x] UI test ✓ (4 endpoint, log: hepsi 200)

---

## Aşama 2 — Wave 2: Multi-finding aggregations

**Risk:** Orta (büyük context, 5-15s response)
**Model:** Haiku

- [x] `app/api/ai/habitat-summary/route.ts` (Step 2 Habitat Data, per-habitat)
- [x] `app/api/ai/habitat-analysis/route.ts` (Step 2 Habitat Data, overall)
- [x] `app/api/ai/species-research/route.ts` (Step 3 Deep Research → Species)
- [x] `app/api/ai/aquatic-research/route.ts` (Step 3 Deep Research → Aquatic)
- [x] `app/api/ai/deep-research/route.ts` (Step 3 Deep Research → Designated Sites)
- [x] Lint + type-check ✓
- [x] UI test ✓ (~55 yeni log, hepsi 200)

---

## Aşama 3 — Wave 3: Synthesis tier (Sonnet)

**Risk:** Yüksek (raporun kalbi, kalite kritik)
**Model:** Sonnet (synthesis), tier-aware (data-analysis-summary)

- [x] `app/api/ai/desk-insights/route.ts` → Sonnet (Step 3 Ecological Summary)
- [x] `app/api/ai/data-analysis-summary/route.ts` → tier-aware
  - Default `cheap` → Haiku (Step 5 her tab)
  - `tier: 'final'` → Sonnet (Step 8 Final Submission)
- [x] `components/steps/final-submission-step.tsx:391` → body'ye `tier: 'final'` eklendi
- [x] Lint + type-check ✓
- [x] UI test ✓ (Sonnet ~62s vs Haiku ~3s — tier ayrımı net görünüyor)

**Not:** Sonnet çağrıları çok yavaş olabiliyor (büyük desk-insights için 60s+). Edge function default timeout 150s; çok büyük projelerde bu sınıra yaklaşabilir, izlemek lazım.

---

## Aşama 4 — Wave 4: Conversational + uzun-form

**Risk:** Yüksek (chat UX + rapor üretimi)
**Model:** Haiku (kullanıcı kararı — Sonnet önerildi ama Haiku tercih edildi)

- [x] `app/api/ai/dulra-agent/route.ts` (Step 6 chat — çift system message Claude'un `system` parametresinde birleştirildi)
- [x] `app/api/ai/report-section/route.ts` (Step 6 rapor bölümü üretimi — OpenAI-spesifik `finish_reason` kontrolü, `reasoning_effort`, ve 4000-token reasoning headroom kaldırıldı)
- [x] Lint + type-check ✓
- [x] UI test ✓ (log: 200, ~2.9s)

**Önemli karar:** `report-section` rapor bölümlerinin asıl yazıldığı yer. OpenAI'de en güçlü model (`gpt-5`) seçilmişti. Kullanıcı kalite trade-off'unu bilerek Haiku'da bırakmayı tercih etti — kalite düşerse tek satır değişiklikle Sonnet'e geçilebilir.

---

## Aşama 5 — Wave 5: Company Reports (RAG)

**Risk:** Orta (RAG zinciri karmaşık ama her bileşen küçük)
**Model:** Haiku

- [x] `lib/dropbox/entity-extractor.ts` (doküman index sırasında entity çıkarma)
- [x] `lib/dropbox/reranker.ts` (arama sonuçlarını yeniden sıralama)
- [x] `lib/dropbox/document-summary.ts` (Contextual Retrieval doküman özetleri)
- [x] `app/api/dropbox/answer/route.ts` (Company Reports soru-cevap, eski Synthesis tier'daydı → Haiku)
- [x] `app/api/projects/[id]/evidence-matrix/route.ts` (Step 3 Evidence Matrix narrative, eski Synthesis tier'daydı → Haiku)
- [x] Lint + type-check ✓
- [x] UI test (`document-summary`, `entity-extractor`, `reranker`, `dropbox/answer` canlı doğrulandı; `evidence-matrix` mention oluşunca tetiklenecek)

**JSON-mode uyarlaması:** OpenAI'nin `response_format: { type: 'json_object' }` parametresi Claude'da yok. System prompt'lardaki "Return strict JSON" talimatına güveniyoruz; mevcut `JSON.parse` try/catch koruması yerinde, malformed JSON'da boş sonuç döner ve kullanıcı akışı bozulmaz.

**OpenAI'de kalan tek bileşen:** `lib/dropbox/embeddings.ts` (`text-embedding-3-small`). Anthropic embedding sunmuyor; re-index + schema değişikliği + arama kalitesi belirsizliği için risk/efor oranı çok yüksek.

---

## Aşama 6 — Cleanup (beklemede)

- [ ] `generate-desk-insights` orphan edge function'ı sil — **atlandı, takım üyesi (Furkan'ın arkadaşı) kontrol edecek**. Hâlâ ACTIVE ama kimse çağırmıyor; silinmesi güvenli ama acil değil.
- [x] CLAUDE.md güncelle (provider bilgisi: artık Anthropic + OpenAI hibrit, embeddings hâlâ OpenAI)
- [x] (Saklanır) `lib/ai/openai-models.ts` — kalsın, embedding sadece kendi modelini import ediyor ama referans olarak duruyor
- [x] (Saklanır) `OPENAI_API_KEY` env var — embeddings için hâlâ gerekli
- [x] Migration commit'i

---

## Endpoint Envanteri — Hangi UI Hangi API'yi Kullanıyor

Migration sonrası tam tablo. Tüm chat/synthesis Claude'a, embeddings tek bir yerde OpenAI'ye gidiyor.

### Step bazında AI çağrıları

| Step | UI Feature                              | Endpoint                                                | Provider   | Model                      |
| ---- | --------------------------------------- | ------------------------------------------------------- | ---------- | -------------------------- |
| 2    | Species Records → Generate AI Summary   | `/api/ai/species-summary`                               | Anthropic  | Claude Haiku               |
| 2    | Aquatic Features → Generate AI Summary  | `/api/ai/aquatic-summary`                               | Anthropic  | Claude Haiku               |
| 2    | Designated Sites → Generate AI Summary  | `/api/ai/site-summary`                                  | Anthropic  | Claude Haiku               |
| 2    | Habitat Data → per-habitat Summary      | `/api/ai/habitat-summary`                               | Anthropic  | Claude Haiku               |
| 2    | Habitat Data → Overall Analysis         | `/api/ai/habitat-analysis`                              | Anthropic  | Claude Haiku               |
| 2    | Company Reports → Document index (auto) | `/api/dropbox/index` triggers `document-summary` lib    | Anthropic  | Claude Haiku               |
| 2    | Company Reports → Document index (auto) | `/api/dropbox/index` triggers `entity-extractor` lib    | Anthropic  | Claude Haiku               |
| 2    | Company Reports → Document index (auto) | `/api/dropbox/index` calls `embeddings` lib             | **OpenAI** | **text-embedding-3-small** |
| 2    | Company Reports → Search (auto)         | `/api/dropbox/search` calls `embeddings` lib            | **OpenAI** | **text-embedding-3-small** |
| 2    | Company Reports → Search → AI Answer    | `/api/dropbox/answer` (calls `reranker` + own LLM call) | Anthropic  | Claude Haiku               |
| 3    | Desk Assessment → Ecological Summary    | `/api/ai/desk-insights`                                 | Anthropic  | **Claude Sonnet**          |
| 3    | Deep Research → Designated Sites        | `/api/ai/deep-research`                                 | Anthropic  | Claude Haiku               |
| 3    | Deep Research → Species                 | `/api/ai/species-research`                              | Anthropic  | Claude Haiku               |
| 3    | Deep Research → Aquatic                 | `/api/ai/aquatic-research`                              | Anthropic  | Claude Haiku               |
| 3    | Evidence Matrix → Generate Narrative    | `/api/projects/[id]/evidence-matrix`                    | Anthropic  | Claude Haiku               |
| 5    | Data Analysis tabs → Create Summary     | `/api/ai/data-analysis-summary` (`tier: 'cheap'`)       | Anthropic  | Claude Haiku               |
| 5    | Maps → Generate AI Legend               | `/api/ai/legend`                                        | Anthropic  | Claude Haiku               |
| 6    | AI Draft → Generate Section             | `/api/ai/report-section`                                | Anthropic  | Claude Haiku               |
| 6    | Dulra Agent → Chat                      | `/api/ai/dulra-agent`                                   | Anthropic  | Claude Haiku               |
| 8    | Final Submission → Survey Summaries     | `/api/ai/data-analysis-summary` (`tier: 'final'`)       | Anthropic  | **Claude Sonnet**          |

### Endpoint envanteri (unique)

| Endpoint                             | Provider   | Model                      | Kullanım yeri                                                                 |
| ------------------------------------ | ---------- | -------------------------- | ----------------------------------------------------------------------------- |
| `/api/ai/species-summary`            | Anthropic  | Haiku                      | Step 2                                                                        |
| `/api/ai/aquatic-summary`            | Anthropic  | Haiku                      | Step 2                                                                        |
| `/api/ai/site-summary`               | Anthropic  | Haiku                      | Step 2                                                                        |
| `/api/ai/habitat-summary`            | Anthropic  | Haiku                      | Step 2                                                                        |
| `/api/ai/habitat-analysis`           | Anthropic  | Haiku                      | Step 2                                                                        |
| `/api/ai/desk-insights`              | Anthropic  | **Sonnet**                 | Step 3                                                                        |
| `/api/ai/deep-research`              | Anthropic  | Haiku                      | Step 3                                                                        |
| `/api/ai/species-research`           | Anthropic  | Haiku                      | Step 3                                                                        |
| `/api/ai/aquatic-research`           | Anthropic  | Haiku                      | Step 3                                                                        |
| `/api/ai/data-analysis-summary`      | Anthropic  | Haiku / **Sonnet**         | Step 5 (Haiku) + Step 8 (Sonnet)                                              |
| `/api/ai/legend`                     | Anthropic  | Haiku                      | Step 5                                                                        |
| `/api/ai/report-section`             | Anthropic  | Haiku                      | Step 6                                                                        |
| `/api/ai/dulra-agent`                | Anthropic  | Haiku                      | Step 6                                                                        |
| `/api/dropbox/answer`                | Anthropic  | Haiku                      | Step 2 Company Reports                                                        |
| `/api/projects/[id]/evidence-matrix` | Anthropic  | Haiku                      | Step 3                                                                        |
| `lib/dropbox/document-summary`       | Anthropic  | Haiku                      | Step 2 (background, doc index)                                                |
| `lib/dropbox/entity-extractor`       | Anthropic  | Haiku                      | Step 2 (background, doc index)                                                |
| `lib/dropbox/reranker`               | Anthropic  | Haiku                      | Step 2 Company Reports search                                                 |
| `lib/dropbox/embeddings`             | **OpenAI** | **text-embedding-3-small** | Step 2 (document index + search)                                              |
| `/api/ai/project-summary`            | Anthropic  | Haiku                      | Dashboard projeler listesi (kapsam dışıydı, ama aynı `callClaude` kullanıyor) |

### Özet

- **20 AI çağrı noktası** toplam
- **19'u Anthropic Claude** (17 Haiku + 2 Sonnet kullanım kombinasyonu)
- **1'i OpenAI embedding** (Company Reports RAG arama için, değiştirilmedi)

Tüm Claude çağrıları `claude-proxy` Supabase Edge Function üzerinden geçer. `ANTHROPIC_API_KEY` Supabase Custom Secret'ta, lokal `.env.local`'da yoktur.

---

## Notlar / Kararlar

### Neden Edge Function + Custom Secret?

Alternatif Vault yaklaşımı tartışıldı; Vault da şifreli saklama sunuyor ama key Next.js process'ine giriyordu. Edge function ile key sadece Deno runtime'ında bulunuyor, Next.js memory'sine hiç inmiyor — daha izole. Trade-off: tek edge function deploy + her çağrıda küçük hop latency'si.

### Tier seçimi mantığı

OpenAI `gpt-5` zaten sadece 2 endpoint'te kullanılıyordu (`desk-insights`, `report-section`) ve simetrik olarak Sonnet'e taşınması doğal. Kullanıcı `report-section` için maliyet kaygısıyla Haiku tercih etti, kalite testleri sonrası gerekirse Sonnet'e geri dönülebilir. `data-analysis-summary` Step 5 ve Step 8 arasında paylaşılan tek endpoint olduğu için tier parametresi ile çözüldü.

### Neden Company Reports'ta embedding OpenAI'de kaldı?

Company Reports RAG'inin omurgası **embedding** (her doküman parçasını anlamsal sayı vektörüne çevirme). Anthropic Claude **embedding modeli sunmuyor** — sadece sohbet/sentez modelleri var. Mevcut indeksli tüm dokümanlar OpenAI `text-embedding-3-small` formatında (1536 boyutlu vektör) Supabase'e kayıtlı. Başka bir embedding sağlayıcısına (Voyage, Cohere) geçmenin maliyeti:

- **Re-index zorunluluğu** — tüm dokümanları yeniden işleyip embedding çıkarmak (yüzlerce/binlerce doküman için saatler/günler + ek API maliyeti)
- **Veritabanı şeması değişikliği** — vektör boyutu farklı (örn. Voyage 1024), kolon yeniden boyutlandırılır + indeksler yeniden kurulur
- **Arama kalitesi belirsizliği** — yeni embedding'in geri çağırma performansı test edilmeden bilinmez; kullanıcı "eskiden iyi sonuç veriyordu, şimdi vermiyor" şikayetiyle dönebilir

Buna karşılık **fayda küçük**: embedding çağrıları çok ucuz (~$0.02/milyon token, indeksleme tek seferlik). Yani **risk × efor >> kazanç**, OpenAI'de bırakmak doğru karar.

Sonuç olarak `OPENAI_API_KEY` env var'ı `.env.local`'da kalmaya devam ediyor — sadece `lib/dropbox/embeddings.ts` için. RAG'in zincirinin geri kalanı (entity-extractor, document-summary, reranker, dropbox/answer) Claude'a geçti.

### Dev server gotcha

Migration sırasında bir noktada Wave 4 testleri log'da görünmedi — kullanıcı butonu tıkladığını sandı ama UI istek yapmadı. Sonraki tıklamada düzgün çalıştı. Turbopack hot-reload nadiren bunu yapabiliyor; şüphe varsa hard reload (Ctrl+Shift+R) çözer.

### Token sayımı

`callClaude` helper şu an sadece text döndürüyor; `tokensUsed` metadata'sı `0` olarak kaydediliyor. UI tarafında kullanılmıyor (sadece TS interface'de tanımlı). İleride telemetri lazım olursa helper'ı `usage` döndürecek şekilde genişletilir.
