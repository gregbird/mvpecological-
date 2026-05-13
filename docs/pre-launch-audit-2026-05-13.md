# Dulra Pre-Launch Audit — 2026-05-13

> **Kapsam:** Vercel'e deploy ve canlı yayın öncesi 12 paralel ajan tarafından yürütülen derin denetim (5 ilk tur + 7 derinlemesine tur).
> **Branch:** `main` @ commit `9a3503b`
> **Audit metodolojisi:** Her ajan kendi alanında `file:line` referanslı, gerçek kod akışlarını trace ederek, edge case'leri arayarak rapor üretti.
> **Toplam çalışma süresi:** ~45 dakika paralel.

---

## İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Olgunluk Değerlendirmesi](#2-olgunluk-değerlendirmesi)
3. [BLOCKER'lar — Launch'tan Önce Kapatılmalı (8 madde)](#3-blockerlar)
4. [HIGH Öncelik — İlk 48 Saat (11 madde)](#4-high-öncelik)
5. [MEDIUM Öncelik — İlk Hafta (12 madde)](#5-medium-öncelik)
6. [LOW / Yapısal Borç — İlk Ay+ (15 madde)](#6-yapısal-borç)
7. [Detaylı Bulgular](#7-detaylı-bulgular)
   - [7.1 Güvenlik](#71-güvenlik)
   - [7.2 Build & Deploy Hazırlığı](#72-build--deploy-hazırlığı)
   - [7.3 Kod Kalitesi & Tech Debt](#73-kod-kalitesi--tech-debt)
   - [7.4 AI Entegrasyonu](#74-ai-entegrasyonu)
   - [7.5 Veritabanı & RLS](#75-veritabanı--rls)
   - [7.6 Workflow Steps 1-4 (Desk + Field)](#76-workflow-steps-1-4)
   - [7.7 Workflow Steps 5-8 (Reporting + Submission)](#77-workflow-steps-5-8)
   - [7.8 Export Pipeline (PDF/DOCX/HTML/Shapefile)](#78-export-pipeline)
   - [7.9 DB Performance & Query Patterns](#79-db-performance)
   - [7.10 External API Robustness](#710-external-apis)
   - [7.11 Multi-tenant & Auth & RBAC](#711-multi-tenant--auth)
   - [7.12 Mobile Sync / Dropbox RAG / Observability](#712-mobile--rag--observability)
8. [AI Maliyet Telemetrisi — Özel Bölüm](#8-ai-maliyet-telemetrisi)
9. [Greg'in EWIC Sample'ı ile Uyumsuzluklar](#9-ewic-sample-uyumsuzlukları)
10. [Performans Projeksiyonu — 100 Org / 10K Proje](#10-performans-projeksiyonu)
11. [Önerilen Launch Sırası](#11-önerilen-launch-sırası)
12. [Sonuç](#12-sonuç)

---

## 1. Yönetici Özeti

**Karar:** Dulra **launch-able**, ama bu haliyle "açtım gitti" değil. Build temiz (`tsc --noEmit` 0 hata, `next build` 19.9s, 43 route üretiliyor), mimari disiplinli, prompt mühendisliği iyi. Ancak **8 gerçek production landmine** açık ve hepsi kapanmadan canlıya çıkmak şu üç sınıfta hasar yaratır:

1. **Cüzdan riski:** rate limit yok → bir kullanıcı bir gecede $500-1500 Claude faturası çekebilir
2. **Veri sızıntısı riski:** `poc_records` herkese açık RLS, Dropbox token'lar plaintext, storage bucket'lar public listing
3. **Profesyonel kredibilite riski:** DOCX TOC yanlış sayfa numaraları, PDF TOC sayfa numarası yok, Relevé Appendix I LLM-generated, shapefile ITM CRS yok

**İyi haber:** Hepsi tamir edilebilir, hepsi spesifik ve lokalize. **Kötü haber:** Hepsi şu an açık.

**Genel değerlendirme:**

- Domain anlayışı sıra dışı iyi — CIEEM kılavuzlarına referanslar doğru, Annex II/IV/V ayrımları, Fossitt sınıflandırması, NPWS-EPA-NBDC-GBIF-Catchments entegrasyonu, AA Screening tetikleyici mantığı kurum-bilgisi seviyesinde
- Mimari kararlar gerçek post-incident savunmalarla şekillenmiş (`autoAiSummaryFilter`, concurrency cap, abort-aware AI loops)
- Operasyonel hazırlık zayıf: sıfır test, sıfır observability, sıfır error tracking, sıfır token usage logging

---

## 2. Olgunluk Değerlendirmesi

| Boyut                   | Skor      | Notlar                                                                                 |
| ----------------------- | --------- | -------------------------------------------------------------------------------------- |
| Domain bilgisi & mimari | 8.5/10    | Irish ekolojik consultancy domaini çok iyi modellenmiş, prompt'lar regülatuar doğru    |
| Kod kalitesi            | 7/10      | 8 `: any`, 19 `as any`, 30+ `as unknown as`, ama disiplin var                          |
| UI/UX                   | 7.5/10    | Modüler mimari, context providers, shared hooks; ama 22 dosya 500-satır kuralını ihlal |
| Güvenlik                | 5/10      | Önemli açıklar var, hepsi kapatılabilir; rate limit yok, RLS gevşek noktalar           |
| Operasyon hazırlığı     | 3/10      | Sentry yok, healthcheck yok, audit eksiksiz değil, AI maliyeti görünmüyor              |
| Test / CI               | 1/10      | **Sıfır test.** `Glob` `*.test.ts` `*.spec.ts` → sadece `node_modules`                 |
| **Genel**               | **~6/10** | **MVP'yi çok aşmış, V1 olmaya çok yakın, henüz V1.0 değil**                            |

**Tahmini olgunlaşma süreleri:**

- 2-4 haftalık focused work → V1.0
- 3 aylık çalışma → V1.5 (test, observability, performance debt)
- 6 aylık çalışma → gerçek SaaS (multi-tenant scaling, real RBAC, GDPR, support tooling)

---

## 3. BLOCKER'lar

Launch'tan **önce** kapanmalı. Tahmini toplam iş yükü: yarım gün — 1 gün.

### B1. `claude-proxy` Edge Function rate limit yok

- **Dosya:** `supabase/functions/claude-proxy/index.ts:4-39`
- **Risk:** Tek bir authenticated kullanıcı saatte ~$300 yakabilir. Edge Function gelen `max_tokens` değerini olduğu gibi Anthropic'e iletiyor — biri 200000 yollarsa cüzdan boşalır. CORS `*`, `verify_jwt: true` (iyi) ama application-level rate limit yok.
- **Fix:** Per-user-per-minute rate cap (30 req/dk, 1M token/gün), `max_tokens ≤ 16000` clamp, CORS prod domain'e daralt. ~50 satır.

### B2. AI route'larında `maxDuration` yok

- **Dosyalar:** `app/api/ai/{desk-insights,report-section,data-analysis-summary,deep-research,aquatic-research,dulra-agent,habitat-analysis}/route.ts`
- **Risk:** Sonnet sentezi rahat 40-120s sürüyor. Vercel Hobby 10s, Pro 60s default. **Üretim ilk gün:** Step 3 / Step 6 / Step 8 ilk gerçek rapor üretiminde 60s timeout, hata mesajı opak.
- **Fix:** `export const maxDuration = 300` (Pro plan gerekiyor). 5 dakika iş.

### B3. `poc_records` tablosu RLS `USING true`

- **Migration:** `supabase/migrations/20260316_*`
- **Risk:** Supabase advisor 2 kez "rls_policy_always_true" işaretliyor. Mobil POC GPS+fotoğraf verisi org-bağımsız ve `organization_id` kolonu bile yok. Login olmuş herhangi bir kullanıcı tüm organizasyonların kayıtlarını okuyabilir/değiştirebilir.
- **Fix:** Policy'leri `project_id` / `project_members` membership ile scope et, veya `organization_id` kolonu ekle, veya tabloyu drop et (UI tüketicisi yok).

### B4. Storage bucket'lar public listing açık

- **Bucket'lar:** `project-photos`, `poc-photos`, `nlc-tiles` (`public=true`)
- **Risk:** Advisor "public_bucket_allows_listing" x3. Storage SELECT policy "her şey" — URL tahmini gerekmez.
- **Fix:** `public=true` koru ama SELECT policy'sini `project_members` membership veya path pattern'a daralt.

### B5. Dropbox `access_token` + `refresh_token` plaintext

- **Tablo:** `dropbox_connections` (`types/database.ts:518-566`)
- **Risk:** Anyone with DB read access (Greg, service_role key, Supabase support, compromised admin) müşteri Dropbox token'larını exfiltrate edebilir. Diğer Slack/Gmail entegrasyonlarında token'lar genelde KMS ile şifrelenir.
- **Fix:** App-level AES (key Edge Function secret'ta) veya Supabase Vault. `lib/dropbox/client.ts:93-98`'de mint, callback'te encrypt, refresh path'te re-encrypt.

### B6. `NEXT_PUBLIC_APP_URL` prod'a set edilmeli + Dropbox callback kayıt

- **Dosyalar:** `app/api/auth/dropbox/route.ts:7`, `app/api/auth/dropbox/callback/route.ts:8`
- **Risk:** Stale `http://localhost:3000` değeriyle Dropbox OAuth kullanıcıyı localhost'a redirect eder, broken state.
- **Fix:** Vercel env vars prod URL, Dropbox app console `{APP_URL}/api/auth/dropbox/callback` allowed redirect.

### B7. Uncommitted Faz 1-4 polish değişiklikleri

- **Dosyalar:** `lib/ai/anthropic-models.ts`, `lib/ai/report-section-prompts.ts`
- **Risk:** Push edilmezse eski commit (`9a3503b`) deploy olur. Protected Species prompt expansion + Sonnet routing canlıya çıkmaz.
- **Fix:** Commit + push.

### B8. `/forgot-password` linki var ama sayfa yok

- **Dosya:** `app/(auth)/login/page.tsx:109`
- **Risk:** UX dead-end. Şifresini unutan kullanıcı stranded, admin manuel reset zorunluluğu.
- **Fix:** `app/(auth)/forgot-password/page.tsx` + `reset-password/page.tsx`. `supabase.auth.resetPasswordForEmail(email, { redirectTo })` + callback'te `updateUser({ password })`. ~50 satır.

---

## 4. HIGH Öncelik

İlk 48 saat içinde. Tahmini toplam: 1-2 gün.

| #   | Bulgu                                                                     | Dosya                                                              | Kategori                       |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ |
| H1  | DOCX TOC yanlış sayfa numarası (`3 + i` hardcoded)                        | `lib/export/docx-generator.ts:615`                                 | Profesyonel kredibilite        |
| H2  | PDF TOC'da sayfa numarası yok                                             | `lib/export/pdf/toc-page.ts:39-41`                                 | CIEEM uyumsuzluk               |
| H3  | Shapefile ITM/Irish Grid `.prj` yok (WGS84 default)                       | `lib/gis/shapefile-export.ts`                                      | Profesyonel kredibilite        |
| H4  | Relevé Appendix I LLM-generated, deterministik değil                      | `app/api/ai/report-section/_lib/guidance-blocks.ts:181-200`        | Greg sample uyumsuzluk         |
| H5  | Generate All sequential await, 1 hatada zincir kırılır                    | `components/steps/ai-draft-step.tsx:175-177`                       | Üretim UX                      |
| H6  | "Photographs" appendix gerçek photo plate render etmez, italic note basar | `lib/export/pdf/appendix-renderer.ts`                              | Greg uyumsuzluk                |
| H7  | Middleware'de `/team`, `/templates`, `/search`, `/audit` korumasız        | `middleware.ts:4`                                                  | Auth yüzeyi                    |
| H8  | accept-invite race + `randomUUID()` (122-bit)                             | `app/api/team/invite/route.ts:95`, `accept-invite/route.ts:22-129` | Token replay                   |
| H9  | 21 `SECURITY DEFINER` RPC `anon`'a açık                                   | Supabase                                                           | Privilege escalation primitive |
| H10 | `generate-desk-insights` Edge Function `verify_jwt: false`                | Supabase Edge                                                      | Auth bypass                    |
| H11 | HIBP leaked password protection kapalı                                    | Supabase Auth dashboard                                            | 1 tıklık fix                   |

---

## 5. MEDIUM Öncelik

İlk hafta. Tahmini toplam: 3-5 gün.

**Auth & Multi-tenant:**

- Profile FK'ları `NO ACTION` yerine `SET NULL` — kullanıcı silme şu an sessizce başarısız oluyor, dangling profile bırakıyor (`projects.created_by`, `desk_research_findings.created_by`, `photos.created_by`, vb.)
- Admin removal sonrası `auth.admin.signOut(userId, 'global')` — JWT 1 saat geçerli kalmaya devam ediyor
- AI route'larda `projectId` ownership doğrulaması — cost-DoS bloklamak için
- Security headers ekle: CSP, HSTS, X-Frame-Options, Referrer-Policy

**External APIs:**

- GBIF'te timeout + retry yok (en kötü sessiz hata kaynağı) — `lib/external-apis/gbif.ts:135`. Hung connection tab'i sonsuza kadar dondurur.
- NPWS/EPA "API down vs no results" ayırt edilemiyor → ekolog SAC kaçırır, AA Screening trigger atlanır (yasal sorumluluk)
- EPA `Promise.all` → `Promise.allSettled` + per-type fallback — `lib/external-apis/epa.ts:341-346`
- `xlsx@0.18.5` (CVE-2023-30533 + CVE-2024-22363) → `exceljs` veya SheetJS CDN tarball'a geç

**Performance & Reliability:**

- `claude-proxy` Edge Function'a `AbortController(140_000)` + 429/529 retry
- DOCX için Word native `TableOfContents` field code
- PDF için iki-pass render → gerçek sayfa numaraları
- `audit_log_trigger` async kuyruğa al veya heavy JSONB'leri snapshot'tan çıkar

---

## 6. Yapısal Borç

İlk ay+. Tahmini: 2-4 hafta refactor sprintleri.

**Veritabanı (100 org / 10K proje projeksiyonu için):**

1. `useSavedFindings`'ten `raw_data` JSONB'sini düş — `lib/supabase/queries/findings.ts:30,50,69`. 25-35MB transfer şu an Step 2-8 mount'larında. **310ms → 20ms** kazanım dökümante edilmiş ama uygulanmamış.
2. Projects dashboard `select('*')` → `GROUP BY` + `is_saved=true` filter — `app/(dashboard)/projects/page.tsx:181-194`. 60K row → 300 row at 100 orgs.
3. AI Draft batch endpoint — şu an her section 11 Supabase query'si, Generate All = 88 query.
4. RLS helper SQL functions (`is_releve_member`, `is_survey_member`) — releve_species/species_observations/photos için. 3-table EXISTS join'leri konsolide olur.
5. `photos.site_id` üzerinde partial index eksik.
6. Heavy `workflow_steps.metadata` content'i `step_artifacts` tablosuna taşı — her keystroke audit_log'a yazıyor şu an.

**Observability (şu an SIFIR):**

7. Sentry frontend + server entegrasyonu — en yüksek ROI tek değişiklik
8. `/api/health` endpoint + Better Uptime free tier
9. `mcp__supabase__get_advisors` haftalık çalıştır
10. `desk_research_findings`, `target_notes`, `habitat_polygons` üzerine audit trigger ekle (şu an sadece 9 tabloda var)
11. `ai_calls` tablosu + `callClaude`'da INSERT — token telemetri zorunlu

**Kod kalitesi:**

12. `types/database.ts` regenerate — 30+ `as unknown as` ve `(supabase.rpc as any)` kaybolur
13. Minimal test harness (Vitest + birkaç Playwright smoke) — özellikle prompt builders + spatial utils + Step 6→8 export
14. 22 dosya 500-satır limitini geçiyor — en kötüsü `lib/config/survey-field-definitions.ts:1401`, `lib/ai/report-section-prompts.ts:1276`
15. 4 ayrı markdown parser var (PDF/DOCX/HTML/tiptap-to-markdown) → konsolide et, drift hazırını azalt

---

## 7. Detaylı Bulgular

### 7.1 Güvenlik

**CRITICAL bulgular:**

- `middleware.ts:4` — `PROTECTED_PATHS` yalnızca `/dashboard`, `/projects`, `/settings` (`/settings` sayfası mevcut değil). `/team`, `/templates`, `/search`, `/audit` korumasız. Veri RLS ile gizleniyor ama yüzey açık.
- `scripts/seed-data.ts:8-10` — hardcoded Supabase URL + anon JWT (`exp: 2085054823`). Repo public olursa proje ref leak.

**HIGH bulgular:**

- `next.config.ts` — Security header yok (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy). Tiptap + Leaflet + user-controlled content render eden bir SaaS'te ciddi XSS/clickjacking eksiği.
- `app/api/team/accept-invite/route.ts:38` — Rate limit yok, `auth.admin.listUsers()` her istekte tüm kullanıcı listesi (`unique_pending_invite` index'i ile race condition, token leak'te account takeover).
- `app/api/auth/dropbox/callback/route.ts` — `state` parametresi user session'la karşılaştırılmıyor (PKCE protects code exchange ama state hardening miss).
- `package.json:101` — `xlsx@0.18.5` known CVE'li (prototype pollution, ReDoS). `app/api/nbdc/grid-records/route.ts:3`'te kullanılıyor.

**MEDIUM bulgular:**

- `middleware.ts:53-58` — `dev_mode` cookie bypass NODE_ENV ile gated, prod-safe ama dead weight.
- `app/api/team/accept-invite/route.ts:22-129` — token first-success branch'te password update edebiliyor, atomic UPDATE pattern yok.
- `lib/supabase/auth-guard.ts` — `requireAuth()` sadece "logged in" kontrol ediyor, ownership doğrulamıyor. AI route'lar `projectId`'yi body'den alıp Claude çağrısı yapıyor — başka org'un `projectId`'si ile cost-DoS mümkün.

**NOTES:**

- L1: `next.config.ts:32-38` hardcoded Supabase storage hostname (env'e bağlanmalı)
- L2: CORS header'lar yok (Next default, OK)
- L3: NPWS scrape + NBDC search fixed base URL (SSRF değil)
- L4: `components/ui/photo-upload.tsx:134` 10MB cap + 'project-photos' bucket, MIME implicit trust (`file.type.startsWith('image/')` guard ekle)
- L5: Hardcoded `sk-` / `sk-ant-` key yok, sadece scripts/seed-data.ts'de anon JWT
- L6: `lib/supabase/admin.ts` service-role session persistence disabled (browser leak yok)
- L7: `NEXT_PUBLIC_*` env'lerde secret yok (URL/anon/APP_URL)

### 7.2 Build & Deploy Hazırlığı

**Type-check:** ✅ PASS — `npm run type-check` exit 0, 0 hata.

**Lint:** ⚠️ 11 hata, 35 uyarı.

- 11 hatanın hepsi `scripts/inspect-pmtiles.mjs`'te ("'process'/'console'/'Buffer' is not defined"). `eslint.config.mjs:37` Node-globals override sadece `scripts/**/*.js` matchliyor, `.mjs` değil. **`next build` blocklamaz** çünkü Next 16 + Turbopack build sırasında ESLint çalıştırmıyor.
- Uyarı sample'ı: 14× `@next/next/no-img-element`, 13× `@typescript-eslint/no-unused-vars`, 4× unused `eslint-disable`, 1× `no-explicit-any`.

**Build:** ✅ PASS — Next.js 16.1.6 Turbopack 19.9s, 43/43 static page, 0 env warning.

**Env audit (kodda referans verilen unique vars):**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`middleware`, `lib/supabase/*`)
- `SUPABASE_SERVICE_ROLE_KEY` (`lib/supabase/admin.ts:7`)
- `OPENAI_API_KEY` (`lib/dropbox/embeddings.ts:6`, `app/api/ai/project-summary/route.ts:19`)
- `DROPBOX_APP_KEY` (`lib/dropbox/client.ts:10`)
- `NEXT_PUBLIC_APP_URL` (`app/api/auth/dropbox/{route,callback/route}.ts`)
- `NEXT_PUBLIC_NLC_PMTILES_URL` (`components/maps/nlc-tile-layer.tsx:19`) — **CLAUDE.md ve `.env.local.example`'da yok**

**Dokümante edilmiş ama kodda referans olmayan:**

- `DROPBOX_APP_SECRET` — Dropbox PKCE flow kullanıyor, client_secret hiç gönderilmiyor. Sadece error string'inde geçiyor.
- `NEXT_PUBLIC_MAPBOX_TOKEN` — `.env.local.example:7`'de listelenmiş, hiç kullanılmıyor.

**`process.env.X!` non-null assertions:** `middleware.ts:24-25`, `lib/supabase/server.ts:9-10`, `lib/supabase/client.ts:6-7`. Env unset olursa runtime crash (build'de fail değil).

**Vercel-specific:**

- `vercel.json` `npm install --force` kullanıyor (peer-dep checks bypass)
- API route'larda FS write yok, Node-only module import yok (`fs`, `child_process`, `path`)
- Middleware deprecation: Next 16'da `proxy.ts` rename önerisi (hâlâ çalışıyor)

### 7.3 Kod Kalitesi & Tech Debt

**Rule ihlali sayımları:**

| Kural                     | Sayı                                                       | Durum                                       |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `: any`                   | 8 (sadece `hooks/maps/use-geoman-setup.ts`)                | Acceptable Geoman interop                   |
| `as any`                  | 19 (9 dosya)                                               | Çoğu Leaflet/Geoman interop; 3'ü gerçek bug |
| `as unknown as`           | 30+ (5 query dosyasında yoğun)                             | **En ciddi kural ihlali, sistemik**         |
| `console.log` (runtime)   | 1 (`hooks/use-export-worker.ts:43`)                        | Sample audit gerek                          |
| 500-satır limiti          | 22 ihlal                                                   | Refactor borcu                              |
| TODOs in source           | 3                                                          | Trivial                                     |
| `.catch(() => {})` silent | 1 (`components/desk-research/deep-research-modal.tsx:142`) | Intent review                               |

**500+ satır dosyalar (en kötü 15):**

```
1401 lib/config/survey-field-definitions.ts
1276 lib/ai/report-section-prompts.ts
 935 components/steps/data-analysis/maps-tab.tsx
 857 lib/export/docx-generator.ts
 799 hooks/steps/use-deep-research.ts
 749 components/steps/data-gathering/review-export-substep.tsx
 734 components/steps/gis-mapping-step.tsx
 728 app/(dashboard)/dashboard/page.tsx
 664 hooks/maps/use-geoman-setup.ts
 649 app/api/ai/desk-insights/route.ts
 630 app/(dashboard)/projects/page.tsx
 616 components/steps/data-gathering/data-gathering-substep-shell.tsx
 610 components/steps/desk-assessment/species-records-section.tsx
 595 app/(dashboard)/team/page.tsx
 594 app/(dashboard)/audit/page.tsx
```

`types/database.ts` 3583 satır ama generated (sayılmaz).

**`as unknown as` epidemic (query layer):**

- `lib/supabase/queries/workflow.ts:82,102,147,151,171,196,220` (7 cast)
- `lib/supabase/queries/surveys.ts:35,57,73,93,162,196` (6)
- `lib/supabase/queries/target-notes.ts:37,68,91,107,127,164` (6)
- `lib/supabase/queries/survey-assignments.ts:28`, `templates.ts:123`
- Non-query: `app/api/ai/desk-insights/route.ts:146,165`, `app/api/ai/report-section/_lib/data-fetch.ts:320-321`

**Root cause:** Supabase generated `Json` columns deep_research/aquatic_research/target_notes/surveys.weather'da typed shape'lere narrow ediliyor — generator infer edemiyor. **Fix:** `types/database.ts` regenerate.

**`as any` (en kötü 3):**

- `components/steps/final-submission/use-shapefile-export.ts:61` — `(supabase.rpc as any)(...)` — RPC migration sonrası types regenerate edilmedi
- `components/steps/final-submission/use-pdf-export.ts:47,72` — `buildExportOptions() as any` — gerçek internal type bug

**React Query keys:** ✅ — sample'lı 30+ key'in tamamı project-scoped queries'te `projectId` içeriyor.

**Test coverage:** ❌ **Sıfır test.** `package.json`'da `vitest`, `jest`, `playwright`, `@testing-library` yok. `*.test.ts`/`*.spec.ts` glob → sadece `node_modules`.

**Documentation:** `docs/` 35 dosya. `docs/feedback/feedback-1-5-may-claude-migration.md:4` — "Migration tamamlandı, cleanup beklemede". `docs/feedback/mobile-and-followup-todos.md:5` — "Status: Draft — not yet reviewed with Greg". `docs/raw-data-migration-plan.md` — performance debt zaten flag'lenmiş.

### 7.4 AI Entegrasyonu

**Model tier mapping (`lib/ai/anthropic-models.ts:107-110`):**

- `CLAUDE_SYNTHESIS_MODEL`: Sonnet 4.6 → Step 3 desk-insights, Step 8 final-tier
- `CLAUDE_CHEAP_MODEL`: Haiku 4.5 → her şey
- HEAVY_SECTIONS (Sonnet routing): PEA results/constraints/discussion, EcIA baseline/assessment/mitigation, AA Screening natura_sites/significant_effects, NIS hepsi, Bat Survey methodology/results, Bird Survey methodology/results, **Protected Species methodology/results/mitigation** (uncommitted)

**Token bütçeleri (uncommitted diff sonrası):**

| Report            | Toplam output tokens | Tahmini maliyet |
| ----------------- | -------------------- | --------------- |
| PEA               | ~31,500              | $0.30-0.50      |
| EcIA              | ~45,500              | $1.50-2.50      |
| AA Screening      | ~31,000              | $0.50-1.00      |
| NIS               | ~48,500              | **$4-6**        |
| Bat Survey        | ~40,000              | $1.50-2.50      |
| Bird Survey       | ~31,000              | $1.00-1.50      |
| Protected Species | ~33,000              | $0.80-1.20      |

**Bir kullanıcı PEA + EcIA + NIS'in her birini 3'er kez "Generate All" yapsa: ~$15-25 bir öğleden sonrada.**

**Cost guardrails:**

- ✅ `autoAiSummaryFilter` species-records substep'ında — sadece protected/invasive/threatened için AI summary. 2026-04-19 incident sonrası. ~30 dk + $2.40 kaybını engelliyor per save.
- ✅ Module-level `MAX_CONCURRENT_AI_SUMMARIES = 3` (`hooks/data-gathering/use-shell-ai.ts:13`)
- ✅ Save All confirmation ≥100 finding
- ❌ `autoAiSummaryFilter` sadece species-records'da var; designated-sites/aquatic-features/habitat-data'da yok (şu an düşük risk ama future-proof değil)
- ❌ `handleSummarizeAll` upper-bound check yok — 5000 result'lı species table'da 5000 request × 3 concurrency = 27 dakika
- ❌ Token usage logging hiç yok — `tokensUsed: 0` hardcoded

**Reliability gaps:**

- `claude-proxy` Edge Function'da AbortController yok (`supabase/functions/claude-proxy/index.ts:39`)
- `call-claude.ts:33` retry yok — 429/529 immediate throw
- Streaming yok — full-buffered response, 60-90s spinner

**UX gaps:**

- `use-shell-ai.ts:167` generic "Failed to generate summary. Try again later." — rate limit/timeout/JSON malform aynı görünüyor
- `use-ai-insights.ts:159-180` AI fail'de template fallback'i destructive toast'la basıyor ama "neden başarısız" söylemiyor
- `desk-assessment-step.tsx:307-310` AI summary editor her keystroke'ta `persistInsights` çalıştırıyor — debounce yok, 200 mutation per paragraph

### 7.5 Veritabanı & RLS

**Genel durum:** 34 tablo, 87 migration, RLS hemen her yerde (`spatial_ref_sys` hariç). 4-policy/tablo standardı çoğu tenant-table'da.

**Advisor bulguları:**

- ❌ **CRITICAL: `poc_records`** advisor 2× "rls_policy_always_true" (B3'te detay)
- ❌ **CRITICAL: 3 public bucket** advisor "public_bucket_allows_listing" (B4)
- ❌ **CRITICAL: 21 SECURITY DEFINER RPC** advisor "anon*security_definer_function_executable" × 21 + "authenticated*..." × 21. `audit_log_trigger`, `handle_new_user`, `delete_project_site`, `update_project_boundary`, `seed_default_survey_templates` trigger-only fonksiyonlar REST'ten çağrılabilir.
- ⚠️ Extensions `public` schema'da (`postgis`, `vector`, `pg_trgm`) — advisor warning
- ⚠️ `spatial_ref_sys` RLS disabled — fonksiyonel risk düşük (migration `20260211120241` access revoke'lu)
- ⚠️ 26× `multiple_permissive_policies` (`photos` "Project members can ..." + "Photo creator or lead can ..." paralel)
- ⚠️ `auth_leaked_password_protection` disabled (1 tıklık fix)

**Migration drift:** 87 remote / 18 local. Sıralanmış 70 migration sadece dashboard'dan veya farklı working tree'den uygulanmış. **`supabase db pull` zorunlu** — fresh clone `supabase db reset` çekerse şeması bozulur.

**FK cascade safety:**

- ✅ Tenant data cascades: `*.project_id → projects` CASCADE, `projects.organization_id → organizations` CASCADE
- ⚠️ `profiles.organization_id → organizations` CASCADE → org deletion → tüm profiller silinir ama `auth.users` survives → broken state on next login
- ⚠️ `*.created_by → profiles` **NO ACTION** → user deletion bloke olur, dangling profile bırakır (B-Multi-tenant audit'te detay)

**Tablo boyutları (mevcut dev DB):**

```
desk_research_findings   198 MB total  (14 MB heap, 184 MB TOAST — JSONB)
audit_log                 34 MB total  (8.6 MB heap, write-amplification riski)
habitat_polygons          22 MB total
workflow_steps           944 kB total  (büyüyor — heavy metadata)
```

**184 MB TOAST `desk_research_findings`'te** — `raw_data` JSONB 47 KB ortalama, max 12 MB. Tek bir 12MB outlier'lı kullanıcının Step 2'sini açması = 35 MB transfer.

**Edge functions:**

- ✅ `claude-proxy` v1 ACTIVE, `verify_jwt: true` (2026-04-27)
- ❌ `generate-desk-insights` v7 ACTIVE, **`verify_jwt: false`** (H10)

### 7.6 Workflow Steps 1-4

#### Step 1 — GIS Mapping (`components/steps/gis-mapping-step.tsx`, 800 lines)

**Architecture:** 8 hook orchestrate, wizard step flow (source → sites → buffers → layers), no GIS-specific context.

**Edge cases:**

- **MultiPolygon → first ring only** (`hooks/gis/use-site-management.ts:378-384`) — GeoJSON upload sadece `coordinates[0]` korur. Shapefile path doğru splitliyor — inconsistency. **Silent data loss** for 5-turbine wind farm uploaded as single MultiPolygon.
- Manual override view-mode latch (`use-gis-wizard.ts:29-32`) — `setManualViewMode('wizard')` sonrası async site data preview'a geçemez
- Save loop sequential `await` (`gis-mapping-step.tsx:313-408`) — 10 dirty site = 10 sequential round-trip
- `fileInputRef.current.value = ''` reset sadece success path'inde — parse error sonrası aynı dosya tekrar seçilemez
- Cascade-on-delete soft toast, cascade-on-save sadece console log — asymmetry

**Performance:**

- 800-line root component, no `React.memo` on sub-panels
- `layers-sidebar.tsx` 570 lines, NPWS items flat list, 200+ rivers/buffer = DOM weight
- `npwsSiteCount` memo O(N×4) per render

#### Step 2 — Data Gathering (`data-gathering-step.tsx`, 500 lines)

**Architecture:** 7 substep (Project Info, Designated Sites, Species, Aquatic, Habitats, Reports, Review & Export). `DataGatheringProvider` 11-key memoized context.

**Strong points:**

- ✅ Auto-search sequential by design (`use-auto-search.ts:150-171`) — 20+ sites × 4 source × 3 concurrency public API rate limit saturation'ı önler
- ✅ Per-site failure observability ("Partial results 7/8 sites — 1 site failed" toast)
- ✅ Save All bulk INSERT + per-row fallback + AbortController-aware AI loop
- ✅ Spatial pre-filter with bbox optimization

**Edge cases:**

- **Save All confirmation `window.confirm`** (`use-shell-save.ts:240-248`) — native dialog, styled AlertDialog değil
- **Cascade-needs-review yok save sonrası** — Step 3 fingerprint check'i var ama Steps 5-8 yok. Direct Step 6'ya atlarsa stale `aiInsights` rapor'a girer.
- Two-browser race — toggle pattern `savedFindings`'i closure'dan okur, duplicate insert riski
- AI summary fail string `"Failed to generate summary. Try again later."` metadata'ya yazılıyor → `aiSummary` truthy → Summarize All atlıyor → manual per-card retry zorunlu

**Performance:**

- `findings-list.tsx` table view NOT virtualized — 2400 species rendered
- `useSavedFindings` `raw_data` JSONB pull — 310ms → 20ms kazanım dökümante ama uygulanmamış
- `wizard-step-content.tsx` ziyaret edilen tüm substep'leri DOM'da tutar — Leaflet maps inactive substep'lerde RAM tüketir
- `turf.require()` inside memo — tree-shake bozuluyor

#### Step 3 — Desk Assessment (`desk-assessment-step.tsx`, 377 lines)

**Architecture:** 3 tab (Desk Assessment, Deep Research, Evidence Matrix). 4 büyük section component (HabitatInventorySection 554, SpeciesRecordsSection 610, AquaticEnvironmentSection 588 — hepsi 500-satır limitini geçiyor).

**AI flow:**

- `useAiInsights` 800ms debounce + auto-trigger
- Per-site insights: `workflow_steps.metadata.aiInsightsBySite[siteId]` vs project-level `aiInsights`
- `app/api/ai/desk-insights/route.ts`: `requireAuth` → siteContext → findings (siteId filter) → deep_research_results → aquatic_research → buildContext (600-satır markdown prompt) → Sonnet `maxTokens: 12000`
- Output: `{ insights, metadata }` — `metadata.aiInsights` ve `metadata.aiInsightsBySite` Step 6 prompt'una input

**Edge cases:**

- **Manual edit her keystroke'ta `persistInsights`** (`desk-assessment-step.tsx:307-310`) — 200 mutation per paragraph
- AI generation `fetch` AbortSignal almıyor — unmount mid-call wasted response + React warning
- Failure → template fallback persist edilir → manual regenerate gerekli
- `projectLocation` fallback `'Ireland'` — county set değilse AI vague output
- Findings JSON `{relevance, notes}` parse fail → notes düşürülür

**UX:**

- Regenerate confirmation yok (~$0.05/click Sonnet maliyeti)
- Site switch hızlı browsing'de 800ms debounce sonrası her yeni site bir AI call

#### Step 4 — Field Research (`field-research-step.tsx`, 179 lines)

**Architecture:** Radix Tabs wrapper, 3 independent sub-step (Field Survey, Habitat Mapping, Target Notes). Tab state `sessionStorage[field-research-tab-${project.id}]`, sub-tab state persist edilmiyor.

**Strong points:**

- ✅ Single-site project auto-pick site (`field-survey-step.tsx:58-59`)
- ✅ `useAutoImportHabitats` localStorage dedupe + MultiPolygon support (regression fix dokümante: 3000 NLC parcel kaybı önlendi)
- ✅ Habitat draw out-of-boundary warning toast (silent acceptance yok)
- ✅ Species import `Promise.allSettled` + `confidenceLevel: 'low' needsVerification: true`

**Edge cases:**

- **Complete Step 4 button validation yok** — 0 survey + 0 habitat + 0 target note ile complete edebilir (Step 2'nin "no findings = can't complete" gate'i yok)
- 3 Leaflet maps mounted concurrently — mobile RAM 150MB+ in Leaflet alone
- `useAutoImportHabitats` her render `existingKeys` Set rebuild (effect guard var ama re-evaluate ediyor)
- Cross-device habitat re-import — localStorage scoped (DB flag yok, dokümante)

### 7.7 Workflow Steps 5-8

#### Step 5 — Data Analysis (`data-analysis-step.tsx`, 329 lines)

6 tab paralel DOM'da (Radix `removeChild` React 19 bug fix), hidden CSS. Her tab kendi useQuery'sini fire'lar — 6 paralel `useQuery` on render.

**AI:** `api/ai/data-analysis-summary` Haiku (Step 8'de Sonnet override). `maxTokens: 6000`. Context her tab için ayrı build. **Limit yok** — 1000 habitat polygon = 50K char context.

**Risk:** Empty-data guard yok — 0 survey'li proje'de "summarise field survey" Claude'a sorulur → output rapor metadata'sına yazılır.

#### Step 6 — AI Draft (`ai-draft-step.tsx`, 440 lines)

**Persistence:** ALL section bodies `reports.content` JSONB (`{ sections: [{ id, title, content, isEdited, aiGenerated, ecologistOpinion }], metadata }`). Autosave 30s debounce. Version create on demand.

**AI calls per report:**

- Generate All sequential `for` loop (`ai-draft-step.tsx:175-177`) — paralel değil
- Per-section: `fetchProjectData` 11 paralel Supabase query — 88 query for 8-section PEA
- Sonnet heavy section: 15-30s; Haiku: 3-5s
- Generate-All toplam: **75-120s per report**
- Tek progress spinner, section-by-section advancing

**Will break:**

- ❌ Tek 502 → zincir kırılır, manual recover
- ❌ Stale-closure: kullanıcı ecologistOpinion yazıyor mid-generation → snapshot click anında alınıyor → typed input prompt'a girmiyor
- ❌ `existingReport.content as unknown as { reviewComments?: string }` (CLAUDE.md banlamış)
- ❌ Habitat warning section ID'leri hardcoded — custom template breaks warning
- ❌ `tokensUsed: 0` hardcoded — usage hiçbir yere yazmıyor

#### Step 7 — Quality Review (`quality-review-step.tsx`, 469 lines)

Read-only Tiptap render + notes/signature workflow. AI call yok, diff view yok (VersionCompareDialog Step 6'da). `reviewSignature` overwrite — original approval timestamp lost on second decision.

**Will break:**

- Reject permission check `permissions.canApproveReport` cached RBAC — mid-session role revocation algılamaz
- Step 6 reset on rejection swallowed exception → setTimeout navigateToStep(6) eve halinden bağımsız ateşliyor
- Approval warnings `< 50` char threshold "minimal content" — pure-table sections (EcIA Mitigation) bypass

#### Step 8 — Final Submission (`final-submission-step.tsx`, 491 lines)

**"Submitted" anlamı:** İç flag flip — `report.status='final'`, `project.status='completed'`, `completeStep(8)`. External regulator submission yok.

**3 sequential mutation transaction'sız** — race riski: step 2 fail'de report `final` ama project `in_progress`. İdempotent practice'te ama luck.

**CSV export newline escape yok** — `s.notes` literal `\n` → broken CSV.

**Appendix order toggle insertion order'a bağlı** — A/B/C labels toggle order'a göre shift. Reviewer iki export karşılaştırırsa karışıklık.

### 7.8 Export Pipeline

#### PDF (`lib/export/pdf-generator.ts`, 370 lines + 6 sub-files)

Hand-rolled markdown-to-jsPDF walker, no `html()` call. RenderContext font cache + width cache. Two-pass image fetch via `Promise.all` (öncesi 30 photo × 5s timeout = 2.5 min stall).

**Markdown features:**

- ✅ Bold/italic/bold-italic, headings H1-H4 (H3+H4 collapsed to same style)
- ✅ Bullets (numbered → bullets too)
- ✅ Tables with multi-pass column-width fitting + longest-word floor
- ✅ Glyph substitution (→ `->`, ≥ `>=`, ± `+/-`, µ `u`, vb.) for WinAnsi Helvetica
- ❌ **Blockquote (`> `) → literal `>` character** (`.docx_inspect/text_v3.txt:181`)
- ❌ **HR (`---`) basamak block enum'ında yok** — literal `---` basılır (DOCX ve HTML doğru)
- ❌ Hyperlinks `[text](url)` plain bracket string

**Tables:**

- Cell content plain text — `stripMarkdown` markers wipe → italik scientific names roman
- Header reprint on page break ✅

**Images:**

- 1600×1200 max, JPEG 0.92, EXIF strip implicit
- Broken/expired URL → silent skip, no warning to user

**TOC:** **No page numbers** (comment explicit, deferred two-pass refactor)

**Cover page:** Logo + banner + title + details + bottom banner. Multi-site Sites: A, B, C list. Bare try/catch on logo silently fails.

#### DOCX (`docx-generator.ts`, 931 lines)

Structured Document AST. **Separate markdown parser** (drift hazard from PDF parser):

- `parseInlineWithScientific` yok → italic scientific names plain
- Native Unicode preserved (no glyph substitution)
- HR supported (border-bottom paragraph)
- Numbered lists → bullets (no numbering)
- Tables: `WidthType.DXA`, dark green header, alternating stripe

**TOC:** Static paragraph "1. Title — 3" with `3 + i` page number — **30+ page report'unda tamamen yanlış**.

**Section headings `HeadingLevel.HEADING_1`** → Word Navigation Pane + native TOC çalışır.

**Bug fixes:**

- ✅ `repairRunBoundaries` (boldword → bold word)
- ✅ `trimBoldItalicEdges` (** Foo ** trim)

#### HTML (`pdf/html-generator.ts`, 344 lines)

Inline CSS, no DOM. `markdownToHtml` 8-pass regex. `<h2>`/`<h3>` flattened. Image src direct (signed URL → 1 saat sonra expire). Branding intentionally not applied (copy-paste to Word).

#### Shapefile (`use-shapefile-export.ts`, 131 lines + `lib/gis/shapefile-export.ts`)

Boundary GeoJSON + habitat polygons (RPC) + target_notes (`include_in_report=true`) → 3 sub-shapefile zip → JSZip merge.

**Critical gap:** **ITM/Irish Grid `.prj` injection yok** — shp-write default WGS84 yazıyor. Irish ekolojik konsültan QGIS'e ITM bekler, manuel CRS set zorunlu. `lib/gis/coordinate-transform.ts` mevcut, sadece export'a wire edilmemiş.

**Attribute schema:** DBF 10-char limit — `ANNEX_CODE` (10) survives, `OBJECT_ID` (9) fits. Free-form `attributes` spread silently truncate edebilir.

**Main thread execution** — büyük habitat polygon set'lerinde UI freeze.

### 7.9 DB Performance

**1. Headline finding: `raw_data` time-bomb already real**

```
desk_research_findings — 3,763 rows
  heap:    14 MB
  TOAST:   184 MB  (JSONB raw_data column)
  total:   198 MB
  avg raw_data:   47 KB / row
  max raw_data:   12 MB / row  (NPWS site with full conservation feature list)
```

500 finding'li EcIA = 25 MB transfer per Step 2-8 mount. 12 MB outlier'lı projede = 35 MB. `useSavedFindings` React Query 5-min staleTime — Steps 2-8 hepsi tüketiyor.

**Fix:** `lib/supabase/queries/findings.ts:30,50,69` `select('*')` → explicit column list (no raw_data). `getFindingRawData(id)` on-demand. **310 ms → 20 ms** dokümante.

**2. Projects dashboard N×M scan**

`app/(dashboard)/projects/page.tsx:181-194` 300K row scan at 100 orgs (15 projects × 200 findings):

```js
.from('desk_research_findings').select('project_id, source').in('project_id', projectIds)
```

Missing `GROUP BY` + `is_saved=true` filter. **Prediction: 8-12s first paint at 100 orgs.**

**3. RLS per-row subqueries**

```sql
-- releve_species SELECT (3-table EXISTS join, fires per row)
EXISTS (SELECT 1 FROM releve_surveys
        JOIN project_members ON project_members.project_id = releve_surveys.project_id
        WHERE releve_surveys.id = releve_species.releve_id
          AND project_members.user_id = (SELECT auth.uid()))
```

20 relevé / 800 species → 4000 subquery eval. Helper SQL function (`is_releve_member`) eksik.

**4. `audit_log_trigger` synchronous**

13 tablo üzerinde trigger. Her INSERT/UPDATE/DELETE:

- Domain row write
- `to_jsonb(NEW)` snapshot
- audit_log INSERT
- audit_log RLS eval (admin EXISTS)

Bulk Save 2000 species = 2000 audit row + 2000 `to_jsonb` + 2000 RLS eval. **audit_log 1 yılda en büyük tablo olacak.**

**5. Step 6 AI Draft N+11 query**

Per section: `fetchProjectData` 11 query. PEA 8 section = 88 query. EcIA 14 section "Generate All" = 154 query. Sadece data fetch için ~30-60s wasted.

**Fix:** `POST /api/ai/report-sections-batch` endpoint — fetch project data once, iterate sections internally.

**6. `getHabitatStats` client-side reduce**

500 polygon over wire just to compute 6 row counts. `lib/supabase/queries/habitats.ts:137-143`. PostGIS RPC `get_habitat_stats(project_id)` ile fix.

**7. Missing indexes**

- `photos.site_id` FK index yok (migration `20260503142247_add_photos_site_id` index eklemedi)
- Diğer FK'lar kapsamlı (sanity query 0 row)

**8. EPA `Promise.all` (CLAUDE.md known)**

`lib/external-apis/epa.ts:341-346` — rivers/lakes/catchments/water_quality paralel. Tek timeout → entire bundle empty. **Switch to `Promise.allSettled`.**

**9. Migration pattern**

Recent 3 migration idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`). No `DROP TABLE` unconditional. ✅. Ama hiçbiri `CREATE INDEX CONCURRENTLY` kullanmıyor — 100-org scale'de `CREATE INDEX` 5-30 dk lock.

**10. Connection pooling**

`@supabase/ssr` doğru kullanılmış — `createServerClient` per-request via `cookies()`. Module-level singleton yok. Real-time `.subscribe()` çağrısı sıfır. ✅

**Will-crack predictions:**

1. Admin opens `/projects` at 100 orgs → **8-12s first paint** (300K row scan)
2. Ecologist 500-finding EcIA step switch → **4-6s per mount** (25-35 MB JSONB)
3. 20-relevé / 800-species project relevé list → **1.5-3s** (RLS join)
4. EcIA 14-section "Generate All" → **4-7 min**, 30-60s wasted on repeated queries
5. Bulk save 2000 NBDC species → **5-10 min**, half audit_log

**Top 10 perf improvements:**

| #   | Change                                                         | Impact                         | Effort           |
| --- | -------------------------------------------------------------- | ------------------------------ | ---------------- |
| 1   | Drop `raw_data` from list reads                                | 30-100× faster Step 2-8        | Yarım gün        |
| 2   | Projects dashboard `GROUP BY` + `is_saved=true`                | 60K → 300 row                  | 1 saat           |
| 3   | `audit_log_trigger` async or trim heavy JSONB                  | 2× faster bulk; bounded growth | 1-2 gün          |
| 4   | Batch `POST /api/ai/report-sections-batch`                     | 88 → 11 query                  | 1 gün            |
| 5   | `get_habitat_stats` / `get_findings_stats` RPC                 | 150KB transfer kazanım         | Yarım gün        |
| 6   | `is_releve_member`/`is_survey_member` helpers + replace EXISTS | 3× RLS perf                    | 1 gün            |
| 7   | `CREATE INDEX CONCURRENTLY idx_photos_site`                    | Future-proofing                | 5 dk             |
| 8   | EPA `Promise.allSettled`                                       | 30s p99 kazanım                | 1 saat           |
| 9   | Heavy `workflow_steps.metadata` → `step_artifacts` table       | audit_log explosion stop       | 1-2 gün          |
| 10  | All `select('*')` → explicit column lists                      | Predictable transfer           | 1 gün mechanical |

### 7.10 External APIs

**NPWS:**

- ArcGIS FeatureServer (layer 0-3) + HTML scrape
- 10s timeout ✅ (CLAUDE.md gotcha implemented), no retry
- Per-layer try/catch + `continue` → **silent empty array on failure** (NPWS down vs no SACs indistinguishable)
- 4-layer sequential loop (should be parallel)
- ArcGIS WHERE clause injection risk (`npws.ts:176,239` — şu an unused, future caller risk)
- `outFields` hardcoded → field rename = silent undefined

**GBIF:**

- Public endpoint, no auth
- ❌ **NO timeout, NO retry, NO AbortController** (`gbif.ts:135` plain `await fetch`)
- Hung connection = tab freeze indefinitely
- `country: 'IE'` hardcoded → Northern Ireland records dropped (cross-border projects miss UK side)
- Turkish dev comment leftover (`gbif.ts:91`)
- No taxonomy normalization vs NBDC (duplicate finding with subtly different names)

**NBDC:**

- 4 ayrı proxy route (`/api/nbdc/{search,taxon,grid-records,...}`)
- Direct API deprecated, server proxy with session scraping (5-min TTL)
- ❌ **xlsx@0.18.5 CVE'li** (`grid-records/route.ts:164`)
- 200 grid ref per call, worker-pool 10 concurrency ✅
- Substring matching on `designations` field for `isProtected` — unbounded false positives
- **Caching yok** — same grid set queried by two users = full pipeline twice

**EPA:**

- 15s timeout ✅
- `Promise.all` (no per-type fallback) — **CLAUDE.md known**
- Defensive parsing partial (some speculative fields never returned)
- Layer rename history (`MON_WaterStations` after rename)

**Catchments.ie:**

- 15s timeout ✅, no retry
- Schema drift tolerant (multi-key fallback `ParameterName || Parameter || Name`)
- Hardcoded `IE_` prefix → Northern Ireland breaks
- 404 → `null` (no error distinction)

**Townlands (Tailte Éireann):**

- ✅ **Gold standard:** 15s timeout, Ireland-bbox guard 400, 502/504 errors, `Cache-Control: public, max-age=3600`, max-features 1000, parameterized WHERE

**OSI/NLC:**

- ✅ PBF parser with try/catch + partial results on timeout/decode failure
- ✅ 30/45s timeouts (heavier query)
- ✅ `exceededTransferLimit` pagination (not page-size heuristic)
- ✅ 100k feature ceiling with warning

**Dropbox:**

- ✅ PKCE OAuth + token refresh
- ✅ `maxDuration = 300` index route
- ✅ Hash-guarded re-indexing (`content_hash`)
- ❌ No embedding timeout/retry (`lib/dropbox/embeddings.ts`)
- ❌ Full `arrayBuffer()` (OOM risk on large PDFs)
- ❌ Revoked file chunks NOT deleted (privacy bug)

**Anthropic (claude-proxy):**

- ❌ No timeout in edge function fetch
- ❌ No retry
- ✅ Model routing (Sonnet/Haiku tiers)

**OpenAI:**

- Single endpoint, batches of 25, 8000-char input cap
- ❌ No timeout, no retry, batch failure poisons file indexing

**Failure scenario walkthrough:** Ekolog Dublin'de project açar, NPWS Pazartesi sabah down.

1. `queryDesignatedSites({bbox})` → 4 layer sequential
2. Each fetch → 10s abort → console.warn `continue`
3. 40s wall-clock, returns `[]`
4. UI renders `'Search to find sites'` empty state — **no error toast**
5. Ecologist concludes "no SACs nearby", skips AA Screening trigger
6. 3 weeks later NPWS back, SAC reappears
7. **Yasal sorumluluk anı.**

**Top fixes:**

1. Typed `{ data, status: 'ok'|'partial'|'failed', failedLayers }` everywhere — distinguish API down vs empty
2. EPA `Promise.allSettled`
3. GBIF timeout + retry
4. Vercel cron healthcheck per upstream → `api_health` table
5. NBDC grid cache `(grid_ref, resolution)` 6h TTL
6. Replace `xlsx@0.18.5`
7. NPWS WHERE parameterize
8. claude-proxy AbortController + 529 retry
9. GBIF expose `country` param
10. Edge cache `Cache-Control` on external GETs

### 7.11 Multi-tenant & Auth

**Auth model:**

- Email/password only — no OAuth, no SAML, no magic link, no MFA
- Signup `app/(auth)/register/page.tsx:66` — password `z.string().min(1)` ❌ (login `min(6)`, accept-invite `min(8)` — inconsistent)
- `handle_new_user` trigger: invite match → profile with `organization_id`; no match → new org + admin + owner_id + seed templates
- Email verification: invite path explicit `email_confirm: true`; signup inherits Supabase project setting (unconfirmed)

**Organizations:**

- `profiles.organization_id` one-to-one (no members join table)
- Owner concept added (`20260509_add_organization_owner_id.sql`): immutable, `ON DELETE SET NULL`, transfer requires owner caller + admin target same-org
- **Race in transfer-ownership** — non-transactional read-then-write
- **Owner SET NULL no UI recovery path** — DB-level fix only

**RBAC:**

- 7-role enum: admin, assessor (deprecated alias→ecologist), project_manager, ecologist, junior, third_party, client
- `project_member_role` enum: lead, surveyor, analyst, reviewer, viewer, member
- `contexts/role-context.tsx:38-223` — 20-flag permission map
- **Most enforcement client-side** — `useRole()`, sidebar filter, redirect
- Server-side: only team APIs + handful of admin endpoints
- RLS asymmetry: SELECT org-wide; INSERT/UPDATE/DELETE project_members + creator
- **RBAC ↔ RLS mismatch:** `junior` denied `canEditHabitats` client-side, but RLS on `habitat_polygons` grants write to any `project_members` row regardless of `project_member_role`. Junior added → full habitat write at API level.

**Invite flow risks:**

- ❌ Token: API generates UUIDv4 (122-bit) overriding column default `encode(gen_random_bytes(32), 'hex')` (256-bit)
- ❌ Single-use race: validate then mark accepted at end → window where token replay updates existing user's password
- ✅ 7-day expiry
- ❌ Email delivery NONE — UI displays link for admin copy-paste
- ❌ **Zero rate limiting** anywhere
- Email change post-acceptance not synced → phantom account

**Session:**

- Default Supabase: 3600s access + 30-day refresh
- Logout `scope: 'local'` — JWT keeps working on other devices
- **No global force-logout on removal** — removed user's JWT valid ≤1h
- Role change → no JWT change, client re-fetch only on auth state event

**Cross-tenant isolation:**

- SELECT org-wide (org member reads all org data)
- INSERT/UPDATE/DELETE project_members or creator
- `project_sites`, `releve_surveys` SELECT project_member-only → **admin not auto-added to project_members on creation = loses site/relevé read** (verify needed)

**AI cost-DoS:** `dulra-agent` accepts `message` ≤4000 chars + `chatHistory` unbounded. No per-user, per-org, per-IP rate limit. No daily token budget. **Single malicious internal user can burn Anthropic budget.**

**`createAdminClient()` callsites (7):**

1. `team/transfer-ownership` ✅ gated
2. `team/remove-member` ✅ required
3. `team/accept-invite` ✅ required
4. `projects/[id]/evidence-matrix` ⚠️ manual org check (copy-paste risk)
5. `dropbox/answer`, `search`, `index`, `files` ⚠️ only `index` has `role==='admin'` gate, others **need audit**
6. `auth/dropbox/disconnect`, `callback` ✅ pre-session
7. `lib/supabase/admin.ts` factory

**Account lifecycle:**

- ❌ Profile FKs `NO ACTION` everywhere (`projects.created_by`, etc.) → user delete fails → dangling profile (error swallowed, `route.ts:100-104`)
- ❌ Org deletion: no API, CASCADE wipe (no soft-delete, no `deleted_at`)
- ❌ No `is_active` / `suspended_at` on profiles

**GDPR:**

- ❌ Article 15 (right of access): no self-export
- ❌ Article 17 (right to erasure): no flow
- ✅ `audit_log` exists (admin-only SELECT, 41 rows in dev)

**UX errors:**

- Generic "Failed to save" — RLS/FK/network indistinguishable
- Mid-session removal: app silently breaks (RLS empty), no "access revoked" banner

**Compromised admin blast radius:**

1. Full read all org data ✅
2. Write any project ✅
3. Add self to any project_members → full write everywhere
4. Invite new admin (no email confirm) → parallel admin seat
5. Remove other admins (except owner)
6. Steal Dropbox integration (admin-gated only on `index`, not other routes — audit needed)
7. **Cannot remove owner** ✅ (new safety net)
8. **Cannot delete org** ✅ (no API)
9. **Burn AI budget unlimited** (cost-DoS, no rate limit)

Cleanup: owner via Supabase dashboard (force-logout API not exposed).

**Left employee walkthrough:**

1. Owner clicks Remove → `auth.admin.deleteUser` revokes refresh
2. `DELETE FROM profiles` **fails silently** (NO ACTION FKs) → dangling profile visible in joins
3. JWT valid ≤1h → continues operating
4. `project_members` rows stay (CASCADE didn't fire) → user in member dropdowns indefinitely
5. No audit-log entry by default

**Prioritized fixes:**

1. **P0** Profile FKs `SET NULL` migration
2. **P0** Build `/forgot-password` flow
3. **P0** AI route rate limits per-user
4. **P1** Atomic invite acceptance (`UPDATE ... WHERE accepted_at IS NULL RETURNING *`)
5. **P1** Stop `randomUUID()` invite tokens (use `gen_random_bytes(32)`)
6. **P1** Force-logout on demotion/removal
7. **P1** GDPR self-export + delete flow
8. **P2** Align RBAC with RLS (project_member_role write gating)
9. **P2** `is_active` / `suspended_at` on profiles
10. **P2** Audit dropbox/\* admin-client gates
11. **P3** MFA / TOTP
12. **P3** Drop client-supplied `organizationId` in invite
13. **P3** Sync `profiles.email` with `auth.users.email`

### 7.12 Mobile / RAG / Observability

#### A) iOS / Mobile Sync

**State:** React Native (Expo) separate repo, talks to same Supabase via `@supabase/supabase-js`. No `app/api/ios/` or `app/api/mobile/` REST layer — direct PostgREST + RLS.

**Documentation discipline:** Unusually good. `docs/ios-docs/`:

- `ios-app-requirements.md` — 8 implementation phases
- `SYSTEM-DOCS.md` — full schema + queries (2026-03-31)
- `mobile-sync-breaking-changes.md` — versioned change log
- `mobile-sync-todo.md` — Faz 1-2 done, Faz 3-4 open
- `faz3-plan.md` — 350-line multi-site plan
- `releve-form-fields-reference.md`

**Web-side ready:**

- `surveys.local_id` text + partial unique index ✅ (`20260420_mobile_sync_idempotency.sql:21`)
- `surveys.sync_status` enum `synced|pending|conflict` ✅
- `releve_surveys.survey_id` unique index ✅
- `species_observations.local_id` text ✅

**Offline-first viable.** Last-write-wins via `updated_at` (no CRDT). Idempotent UPSERT pattern correct.

**Photo upload:**

- 10 MB cap on web matches `project-photos` bucket ✅
- ❌ **Server-side watermarking absent** — spec depends on client-side `@shopify/react-native-skia`. If Skia fails, photos upload un-watermarked. `photos.watermarked_path` column exists but nothing writes it.
- ❌ **`poc-photos` bucket `file_size_limit = NULL`** — unlimited, 200MB video upload possible

**GPS precision fix:** Web-only commit `9323517` (`step="any"` on NumField). Mobile RN TextInput unaffected. ✅

**`poc_records` orphan:** Mobile-pilot remnant, no `organization_id`, no UI consumer. Drop or add org_id.

**Mobile vs web gaps (correct read-only):** Steps 1-3 desk research, Steps 5-8 reporting, photo deletion, habitat boundary edit, multi-site create, survey template edit, team management, report export.

**Priorities:**

1. Drop `poc_records` or add `organization_id` + RLS
2. Server-side watermark fallback (Storage trigger or scheduled job for `watermarked_path IS NULL`)
3. `poc-photos` 10 MB limit
4. Finish Faz 3 mobile-side
5. Mobile-only field guard (deprecated `weather.expectedSurveyCount`)

#### B) Dropbox RAG Pipeline

**Architecture:**

1. OAuth PKCE (`force_reapprove=true`)
2. Browse (`/files`, auto token refresh)
3. Index (admin-only, 5-min `maxDuration`, hash-guarded re-indexing): download → text extract (unpdf for PDF, mammoth for DOCX) → chunk ~400 words 50-word overlap → Haiku document summary → OpenAI embedding (contextual: doc summary prepended) → Haiku entity extraction
4. Search: parallel keyword (`search_document_chunks` RPC, BM25 tsvector + ILIKE fallback) + semantic (`search_document_chunks_semantic`, pgvector cosine HNSW, threshold 0.45) → LLM rerank Haiku
5. Answer: top chunks → MAX_CONTEXT_CHARS=24000 → Haiku synthesis with citation discipline

**Strengths:**

- ✅ Per-org RLS on all 4 tables
- ✅ Hash-guarded re-index ($ saving)
- ✅ Contextual retrieval (Anthropic pattern)
- ✅ Hybrid search + reranker
- ✅ Token refresh in both index + files paths

**Risks:**

- ❌ **`access_token` + `refresh_token` PLAINTEXT** (B5) — biggest security gap
- ❌ Full `arrayBuffer()` on download (`indexer.ts:61`) — OOM on >50MB PDF
- ❌ Revoked file chunks not deleted (privacy bug)
- ❌ Index in request thread (no queue) — 5-min limit
- ❌ `dropbox_connections.cursor` schema exists, unused — no incremental sync

**Cost (500 doc × 50 pages → ~250K chunks):**

- Embeddings: ~$2.50 one-time
- Doc summaries: ~$2.20
- **Entity extraction: ~$290 (50K Haiku calls)** — confirm consumer exists
- Search rerank: $0.001/search
- Answer synthesis: $0.005/question

**Priorities:**

1. Token encryption (B5)
2. Stream large files (replace `arrayBuffer`)
3. Detect & purge revoked files
4. Background index job
5. Gate entity extraction behind feature flag

#### C) Observability — Essentially Nonexistent

**What exists:**

- Vercel function logs (1-30 day retention)
- Supabase logs via `mcp__supabase__get_logs` (1-7 day)
- `audit_log` domain trigger — 11,175 rows since 2026-01-31, 504/day baseline. **Only on 9 tables** — `desk_research_findings` NOT triggered.
- Admin audit-log viewer (`lib/supabase/queries/audit.ts`)

**What doesn't exist:**

- ❌ Sentry / Datadog / LogRocket / PostHog
- ❌ Frontend error tracking
- ❌ API error tracking (31 `console.error` sites disappear)
- ❌ Token usage table — claude-proxy returns `usage`, `call-claude.ts:21` discards
- ❌ Cost attribution per-org/per-user
- ❌ `/api/health` endpoint
- ❌ Uptime monitor config
- ❌ Speed Insights / Web Vitals
- ❌ Background job monitoring (foreground indexer)

**Day-1 walkthrough — "Dropbox 2 saat down":**

- Search/Answer: continue working (DB only, no Dropbox dependency)
- Browse: 500 generic error, no "Dropbox down" hint
- Index: per-file 503 error in `indexed_documents.error_message`
- **Operator (Greg) finds out via customer email** — no automated alert
- Debug: Vercel logs filter "Dropbox" — retention dependent

**Day-1 walkthrough — "my report has wrong data":**

What Greg can do today:

1. Admin audit-log viewer — but `desk_research_findings` NOT audited
2. Open project, walk Step 6/7 manually, re-run AI
3. Vercel logs — retention dependent
4. Supabase logs — retention dependent

What Greg CANNOT do:

- See which Claude model + tokens consumed
- See input prompt (built server-side, never persisted)
- See raw Claude response (not stored separately)
- See client-side errors (no frontend tracker)

**Priorities:**

1. Sentry frontend + server (~2h, single most impactful)
2. `ai_calls` table + INSERT in `call-claude.ts:21`
3. `GET /api/health` + Better Uptime free tier
4. Weekly `mcp__supabase__get_advisors` run
5. Add audit triggers on `desk_research_findings`, `target_notes`, `habitat_polygons`

---

## 8. AI Maliyet Telemetrisi — Özel Bölüm

**Bu bulgu ayrı tutuluyor çünkü en yanıltıcı bulgu burada.**

`tokensUsed: 0` her yerde hardcoded:

- `lib/ai/call-claude.ts:21-37` — Anthropic'ten gelen `usage` alır ama hiçbir yerde saklamaz
- `app/api/ai/report-section/route.ts:265` — `tokensUsed: 0` döndürür
- **Token kullanım tablosu yok.** **Maliyet attribution yok.** **Per-org/per-user spend görünürlüğü yok.**

**Anlamı:**

- Bir kullanıcı PEA + EcIA + NIS reports'unu 3'er kez "Generate All" yapsa: **$15-25 bir öğleden sonrada**
- Faz 4 prompt expansion sonrası Protected Species rapor: **$0.80-1.20**
- Tam NIS Sonnet: **$4-6/üretim**
- Dropbox indexing 500 doc / 250K chunk: embedding ~$2.50 + summaries $2.20 + **entity extraction $290** (50K Haiku call)

**Bunu Anthropic faturanı görene kadar bilemezsin.**

**Pre-launch zorunlu fix:**

```sql
CREATE TABLE ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  org_id uuid REFERENCES organizations(id),
  project_id uuid REFERENCES projects(id),
  route text NOT NULL,
  model text NOT NULL,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  error text,
  created_at timestamptz DEFAULT now()
);
```

`call-claude.ts:21`'de tek bir INSERT. ~1 saat iş. **Bu olmadan launch = kör uçuş.**

---

## 9. EWIC Sample Uyumsuzlukları

`docs/link/EWIC_Releve_Sample_Report.pdf` MEMORY'de canonical olarak işaretli.

| Greg sample                                       | Mevcut Dulra                                         | Sonuç                            |
| ------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| Section 9 Relevé subsection main body'de          | `### 3.5 Vegetation Survey (Relevé Data)` AI compose | Yapı doğru, içerik LLM'e bağımlı |
| Appendix I deterministik per-relevé veri kartları | AI-generated veya yok                                | **Uyumsuz**                      |
| Numaralı TOC sayfa numaralarıyla                  | PDF: yok / DOCX: yanlış (`3+i`)                      | **Uyumsuz**                      |
| Section header stilleri                           | Hem PDF hem DOCX yeşil-underline                     | Uyumlu                           |
| Photo plate                                       | Sadece "supplied separately" italic note             | **Uyumsuz**                      |

**En kritik mismatch:** Relevé Appendix I LLM-generated. DOMIN values, % cover, GPS, relevé code AI tarafından paraphrase ediliyor — halüsinasyon riski regülatör gözünde en yüksek olan yerde.

**Fix:** `lib/export/appendix-data.ts`'ye `releves: ReleveCard[]` ekle, `releve_surveys` + `releve_species`'ten yeni RPC ile getir, yapısal olarak render et. Bu tek değişiklik en yüksek leverage düzeltme.

---

## 10. Performans Projeksiyonu

100 org × 15 proje × averages (200 finding, 100 habitat, 5 survey per project):

- 30,000 proje, 3M finding, 1.5M habitat, 150K survey, ~10M audit row
- `desk_research_findings` heap: 3M × 50KB raw_data → **~150 GB**
- `audit_log`: 10M × avg 3KB → **~30 GB**
- `habitat_polygons`: 1.5M × 1KB geometry → ~1.5 GB

Supabase Pro single-server 50GB üstünde uncomfortable. raw_data fix'siz **200+ GB single-tenant Postgres 12-18 ay sonra**.

**Kırılma sırası (chronological):**

1. Projects dashboard (50 org'da görünür)
2. `useSavedFindings` mount time (200+ finding/project — zaten neredeyse oradayız)
3. Audit log write amplification slowing Save All (1000+ finding bulk insert)
4. Step 6 "Generate All" N+11 (multi-section report — şu an gerçek issue)
5. RLS subqueries `releve_species` / `species_observations` (1000+ row)

---

## 11. Önerilen Launch Sırası

**Bugün (4-8 saat):**

1. Uncommitted Faz 1-4 değişiklikleri commit (B7)
2. AI route'lara `maxDuration = 300` (B2) — 5 dakika
3. `claude-proxy` JWT-bound rate limit + `max_tokens` clamp + CORS daralt (B1)
4. `poc_records` policy fix veya tablo drop (B3)
5. Storage bucket SELECT policy daralt (B4)
6. Dropbox token encryption (B5)

**Deploy öncesi:**

7. Vercel env vars + Dropbox console callback (B6)
8. HIBP password protection açık
9. `/forgot-password` sayfası (B8) — `resetPasswordForEmail` ~50 satır
10. `ai_calls` tablosu + `callClaude`'da INSERT — **token telemetri olmadan launch yapma**

**İlk hafta:**

11. DOCX/PDF TOC sayfa numaraları (H1, H2)
12. Shapefile `.prj` ITM injection (H3)
13. Relevé Appendix I deterministik render (H4)
14. Generate All retry + recovery (H5)
15. Middleware `PROTECTED_PATHS` güncelle (H7)
16. accept-invite atomic UPDATE + 256-bit token (H8)
17. SECURITY DEFINER trigger fonksiyonlarından EXECUTE revoke (H9)
18. Security headers (CSP, HSTS)
19. Sentry ekle

**İlk ay:** test harness, observability eksiksiz, performance items, audit triggers, GDPR self-service.

---

## 12. Sonuç

**Codebase'in temeli sağlam.** Disiplinli modüler mimari, dikkatle yapılmış multi-site refactoring, gerçek post-incident savunmalar (`autoAiSummaryFilter`, concurrency cap, abort-aware AI loops), iyi mühendislenmiş prompt'lar. Domain anlayışı sıra dışı iyi.

**Eksikler çok ama her biri spesifik, lokal ve fikslenebilir.** 8 BLOCKER kapansa, 11 HIGH 1-2 günde temizlense — Dulra V1.0 olarak rahatça çıkar. Operasyonel hazırlık (test, observability, token telemetri) ilk ayda eklenmeli; mimari refactor (raw_data normalization, RLS helpers, fat files) ilk çeyrekte.

**Soft launch evet, hard launch hayır — şu an.** Greg ile 1 saat geçir, 8 BLOCKER + token telemetri kapat, sonra deploy et.

**Olgunluk skoru tekrar: ~6/10.** MVP'yi çok aşmış, V1'e çok yakın, henüz V1.0 değil.

---

## Audit Metadata

- **Tarih:** 2026-05-13
- **Audit ajanları:** 12 paralel (5 ilk-tur + 7 derinlemesine)
- **Toplam çalışma süresi:** ~45 dakika paralel CPU
- **Toplam çıktı kelime:** ~25,000 (raporlar agregate)
- **Audit metodolojisi:** file:line referanslı kod akış trace + Supabase MCP queries (advisor, list_tables, list_migrations, execute_sql) + git log analizi
- **Reviewer:** Claude Opus 4.7 (1M context)

Bulguların güncelliği audit tarihine bağlıdır — şema/kod değişikliği sonrası re-audit gerekebilir.
