# Feedback 27/4 — Greg Birdthistle (27 Nisan 2026)

> **Kaynak:** Greg Birdthistle — Google Docs metin + 3 screenshot (30 Nisan'da iletildi)
> **Greg'in basligi:** "Feedback 27/4"
> **Iletim tarihi:** 30 Nisan 2026
>
> **Screenshot referanslari:**
>
> - **SS-1** (08.48.26): Step 2 designated site detay paneli — "Ox Mountains Bogs SAC" SAC Code 002006. Sag tarafta detay paneli acilmis: Overview / AI / Map / SSCO / Links sekmeleri, "AI Analysis" bolumu (Conservation Summary, Key Habitats & Condition, Species of Interest, Threats & Pressures), alt kosede "Saved" pill + "Close" butonu. Greg bu AI ciktisini Step 3 + Step 5'te de gormek istiyor.
> - **SS-2** (08.48.38): #2-#5 maddelerinin metni (gorsel ek bilgi yok).
> - **SS-3** (08.49.08): Mevcut dashboard durumu — sol ust search bar gorulebilir, sol sidebar Settings tab'i mevcut. "Project Status" widget'inda donut chart (100% Active) + "By Project Status" listesi (Active 13, Planning 0, On Hold 0, Cancelled 0). Greg burada **"not started"** kavramini muhtemelen `Planning 0` slot'una refer ediyor — feature flag'in arka planda `not_started` enum degeri olabilir.

---

## Ozet

| #   | Baslik                                                                 | Oncelik          | Durum                      |
| --- | ---------------------------------------------------------------------- | ---------------- | -------------------------- |
| 1   | Step 2'de kaydedilen AI summary / deep research, Step 3 + 5'te yok     | 🔴 Kritik        | ✅ Tamamlandi (2026-05-01) |
| 2   | Designated sites / NBDC species / Aquatic — table generate edilebilsin | 🟡 Feature       | ⏸ Triage bekliyor          |
| 3   | Mobile app — GPS auto-detect / prompt                                  | 🟡 Mobile        | ⏸ Triage bekliyor          |
| 4   | Mobile app — Survey GPS auto-populate + Data Analysis GIS plot         | 🟡 Mobile + Web  | ⏸ Triage bekliyor          |
| 5   | Foto cekme — proje seviyesi + survey seviyesi ayrimi                   | 🟡 Mobile + Web  | ⏸ Triage bekliyor          |
| 6   | Customizable report structure (sections + look & feel + branding)      | 🟠 Buyuk feature | ⏸ Triage bekliyor          |
| 7   | Dashboard — "not started" → "overdue" yeniden adlandirma               | 🟢 Quick win     | ⏸ Triage bekliyor          |
| 8   | Dashboard — Settings tab'i (sol alt) kaldirilsin                       | 🟢 Quick win     | ⏸ Triage bekliyor          |
| 9   | Dashboard — Sol ust search bar kaldirilsin (non-functional)            | 🟢 Quick win     | ⏸ Triage bekliyor          |
| 10  | Platform user guide hazirlanmali                                       | 🟡 Docs          | ⏸ Triage bekliyor          |
| 11  | Team member ekleme — davet maili gonderilmiyor                         | 🔴 Bug           | ⏸ Triage bekliyor          |
| 12  | 2FA tum kullanicilar icin aktif edilebilsin mi?                        | 🟡 Security      | ⏸ Triage bekliyor          |
| 13  | New Project — Client name free-form text alani                         | 🟢 Quick win     | ⏸ Triage bekliyor          |

---

## 1. AI summary / Deep research erişilebilirlik 🔴 ✅ Tamamlandi (2026-05-01)

**Orijinal:**

> "When a user saves the ai summary or deep research data during the data gathering process they should have access to this in the desk assessment and in the data analysis stage. Users should be able to access the saved AI summary or deep research data — captured during the initial data gathering phase — throughout both the desk assessment and the subsequent data analysis stages."

**Turkce:** Step 2 (Data Gathering) sirasinda kaydedilen AI summary ve deep research ciktilari, Step 3 (Desk Assessment) ve Step 5 (Data Analysis) icinde de gorulebilir / kullanilabilir olmali. Su an sadece Step 2'ye scope'lu kaliyor.

**Yapilanlar (2026-05-01):**

- `lib/utils/finding-display.ts` — yeni helper. `getAISummary(finding)` 5 fallback kaynagi tariyor: `ai_summary` kolonu → `raw_data.aiSummary` (habitat) → `raw_data.metadata.aiSummary` (species/sites) → `raw_data.aquaticResearch.aiAnalysis` (aquatic) → `raw_data.deepResearch.aiAnalysis` (designated). `getDeepResearch()` benzer fallback'lerle.
- `components/steps/desk-assessment/finding-detail-dialog.tsx` — yeni reusable modal. Sparkles ikonuyla AI Summary + Microscope ikonuyla Deep Research bolumleri, "Open in source" linki. Designated case'inde duplicate render'i engelliyor.
- Step 3 entegrasyonu: `designated-sites-matrix.tsx`, `species-records-section.tsx`, `aquatic-environment-section.tsx`, `habitat-inventory-section.tsx`, `data-summary-cards.tsx` — finding adina tiklanca dialog acilir.
- Step 5 entegrasyonu: `desk-assessment-findings-section.tsx` — finding adi → dialog + source kart filtreleri.
- **Race condition fix** (`hooks/data-gathering/use-shell-ai.ts`): auto-trigger AI fetch sonrasi DB persist'e gitmiyordu (savedFindings closure stale). `savedFindingsRef.current` pattern ile cozuldu — artik save sonrasi AI summary DB'ye yaziliyor, Step 3 dialog'unda goruluyor.
- **Cascade fix** (`hooks/queries/use-finding-hooks.ts` + `hooks/steps/use-deep-research.ts`): species deep research yapilirken Step 3 kendisini needs_review olarak isaretliyor + yanlis "GIS Mapping" banner cikiyordu. `useUpdateFinding`'e `skipCascade` flag, banner mesaji generic. Detay: `.claude/rules/cascade-needs-review.md`.

**Triage notlari:**

- CLAUDE.md "AI Analysis Data Flow" bolumune gore: Step 3 ecological summary `api/ai/desk-insights` zaten saved findings + deep research + aquatic research'u alip ciktisini workflow step metadata'sina `aiInsights` olarak yaziyor.
- Step 6 AI Draft `deskInsights` metadata'sini context olarak okuyor — yani Step 3 → Step 6 aktarimi var.
- Eksik halka: Step 2'de kaydedilen substep-bazli AI summary'ler (ornegin designated sites AI summary, species AI summary) Step 3'te ve Step 5'te ayrica goruntulenemiyor / oradan tekrar acilamiyor.
- Veri zaten DB'de (saved findings → `ai_summary` veya substep metadata). UI tarafinda Step 3 ve Step 5'te bir "Saved AI Summaries" panel/accordion eklemek yetebilir.
- **SS-1'den dogrulama:** Greg'in screenshot'inda Step 2 detay panelinde "AI Analysis" bolumu var (Conservation Summary + Key Habitats & Condition + Species of Interest + Threats & Pressures) ve "Saved" pill ile kaydedildigi belli. Bu zenginlestirilmis (multi-section) AI ciktisi su an sadece Step 2 detay panelinde gorulebiliyor — Step 3 ve Step 5'te bu ayni structured ozet erisilebilir olmali.

**Sorulacak / arastirilacak:**

- [ ] Step 2'de AI summary nereye yaziliyor? (`saved_findings.ai_summary` mi, workflow step metadata mi, yoksa ayri bir tablo mu?)
- [ ] Greg "deep research" derken ozellikle deep research feature'ini mi (ayri OpenAI calismasi) yoksa AI summary'leri mi kastediyor? Muhtemelen ikisi de.
- [ ] Step 3 desk-assessment-step.tsx'e read-only "Step 2 AI Outputs" bolumu eklenebilir.
- [ ] Step 5 data-analysis-step.tsx ve Step 6 ai-draft-step.tsx zaten metadata'dan okuyor — ek bir display bolumu mu, yoksa raporlama input'u olarak otomatik mi kullanilsin?

---

## 2. Designated / NBDC / Aquatic icin tablo uretme 🟡

**Orijinal:**

> "During the data gathering phase, when the user saves designated sites, the NBDC species list, and Aquatic data, the system should allow them to generate a table for each list of this information. These tables must be available for inclusion in the report, either within the main body or as an appendix."

**Turkce:** Step 2'de designated sites, NBDC species list ve Aquatic data kaydedildiginde, her biri icin **rapor formatina uygun** bir tablo uretilebilmeli. Bu tablolar Step 6 AI Draft / Step 7-8 Final raporda main body veya appendix olarak eklenebilmeli.

**Triage notlari:**

- Su anda saved findings tablo formatinda Step 2 UI'sinde gosteriliyor ama rapor ciktisina (PDF / Word) tablo olarak surulmuyor.
- Rapor template motoru `lib/services/report-generation/` (varsa) veya jsPDF ciktisi icine **table block** primitif eklenmeli.
- Asama: 1) Saved findings'i kanonik table yapisina cevir (column'lar: SAC name, distance, qualifying interests vb. designated sites icin), 2) Step 6'da "Insert as table" toggle, 3) PDF ciktisinda table render.
- Rapor type'a gore (PEA, EcIA, AA Screening, NIS) zorunlu kolonlar farkli olabilir — `report-writer` skill kurallarini kullan.

**Sorular:**

- Greg "main body or appendix" diyor — bu secim kullanici tarafindan mi yoksa report type'a gore otomatik mi belirlenmeli?
- Tablo numaralandirmasi (Table 1, Table 2...) raporda otomatik mi olacak?
- Aquatic data'nin kolon yapisi ne? (Rivers, Lakes, WFD status, catchment vb.)

---

## 3. Mobile App — GPS detect / prompt 🟡 (Mobile)

**Orijinal:**

> "The app should either automatically detect the user's location or prompt the user to enable their phone's geolocation services."

**Turkce:** Mobile app acilirken kullanicinin lokasyonunu otomatik tespit etmeli ya da telefonun GPS / lokasyon servislerini acmasi icin uyari gostermeli.

**Triage notlari:**

- Bu mobile app scope'unda — main repo Next.js web tarafi.
- Mobile build (Expo / React Native) icinde permission flow eklenmeli: `expo-location` veya equivalent.
- App acilisinda permission yoksa modal goster, varsa current location'i cache'le.
- Surveyor proje listesi current location'a gore order'lanabilir (yakindan uzaga) — Greg'in muhtemel ucu acik vizyonu.

---

## 4. Mobile App — Survey GPS auto-populate + Web GIS plot 🟡

**Orijinal:**

> "For surveys requiring a geolocation, the user's phone should automatically populate this information. Furthermore, the location data from these field surveys, along with the collected survey data, needs to be plotted onto a GIS map within the data analysis tab."

**Turkce:** GPS gerektiren survey'lerde (releve, target notes vb.) telefon mobile app icinde GPS koordinatlarini otomatik doldurmali. Sonra bu konumlar + survey verisi web tarafinda **Step 5 Data Analysis → Maps tab**'inda GIS haritasi uzerinde noktalanmali.

**Triage notlari:**

- **Mobile parca:** Releve form'unda Latitude/Longitude alanlarina otomatik fill (kullanici tetikledigi an current location).
- **Web parca:** Step 5 maps tab'inda zaten habitat polygon'lari, screenshot gallery vb. var. Survey lokasyonlarini Marker / GeoJSON FeatureCollection olarak ekle.
- `releve_surveys` tablosunda `gps_latitude` / `gps_longitude` (veya benzeri) kolon zaten muhtemelen var (cieem standardi) — schema'yi kontrol et.
- Diger survey type'lari (bird, mammal, bat vb.) icin `surveys` tablosunda lokasyon var mi? Yoksa eklenmeli.
- Maps tab'inda layer toggle: "Survey Locations" tablo turune gore filterelenebilir (releve, walkover, bird vb.).

**Acik sorular:**

- Multi-point survey (transect, walkover) icin tek nokta mi, polyline mi tutulacak?
- Photo'larin GPS metadata'si (EXIF) varsa onlar da bu haritada noktalanabilir mi?

---

## 5. Foto cekme — proje vs survey seviyesi 🟡

**Orijinal:**

> "Photographs should be captured at two levels: project and survey. When conducting surveys in the field, users will take photographs that must be linked to the specific survey they are completing. Additionally, the user should have an option to take a photograph of the site itself."

**Turkce:** Iki ayri foto kategorisi olmali:

1. **Survey-level:** Spesifik bir survey ile bagli (mevcut yapi muhtemelen bu, `survey_photos` tablosu).
2. **Project / Site-level:** Survey'e bagli olmayan, sadece site'i gosteren genel fotograflar.

Mobile app + web her ikisini de destekleyecek sekilde guncellenmeli.

**Triage notlari:**

- Photos su an `surveys` ile FK ile bagli (`survey_photos.survey_id` muhtemelen NOT NULL).
- Yeni bir model: `project_photos` (project_id, site_id, image_url, caption, taken_at, gps_lat, gps_lng).
- Mobile UI'da "Survey foto / Site foto" toggle eklenebilir.
- Web tarafi Step 4 Field Research'te veya Step 5 Photographs tab'inda iki sekme: "Survey Photos" + "Site Photos".
- Multi-site projelerde site_id zorunlu — hangi site'a bagli olduğu sorulmali.

---

## 6. Customizable report structure 🟠 (Buyuk feature)

**Orijinal:**

> "The MVP should allow users the flexibility to fully customize their report structure, including sections and overall appearance ('look and feel'). This is critical because, as demonstrated by the PEA report examples shared last week, the required structure varies significantly from firm to firm along with their own branding."

**Turkce:** Her ekoloji firmasinin kendi rapor yapisi (sections sirasi, hangi sections var/yok), kapak tasarimi, font, renk paleti, logo yerlesimi farkli. MVP'nin **org-level customization** desteklemesi sart — Greg "critical" diye not etmis. Gecen hafta paylastigi PEA ornekleri firmadan firmaya cok degisiyor.

**Triage notlari:**

- Bu **buyuk** bir feature — birkac haftalik scope.
- Asamalar:
  1. **Section template editor:** Her org icin "report sections" listesi (drag-drop reorder, toggle on/off, custom title).
  2. **Branding:** Logo upload, primary/accent color, font choice (header + body), cover page template.
  3. **Per-report-type override:** PEA, EcIA, AA Screening, NIS icin ayri template.
  4. **Report generation update:** Step 6 AI Draft + final PDF builder org template'ini kullanacak.
- Mevcut `survey-templates` seed pattern'i (organization-level template) bu featuredan once kuruldu — ayni mimari report templates'e tasinabilir.
- DB: `report_templates (id, org_id, report_type, sections jsonb, branding jsonb)`.
- UI: Settings → Org Settings → Report Templates.

**Sorular:**

- MVP icin minimum: section reorder + logo upload + 1 renk yeterli mi?
- AI Draft generation customization-aware olmali mi (her section icin ayri prompt)?
- "Look & feel" — sadece PDF mi, yoksa Word ciktisi da mi?

---

## 7. Dashboard — "not started" → "overdue" 🟢

**Orijinal:**

> "On the dashboard can you change the 'not started' view of projects to 'over due'"

**Turkce:** Dashboard'daki proje listesi widget'inda "Not Started" status filter'i / view'i "Overdue" olarak yeniden adlandirilsin.

**Triage notlari:**

- CLAUDE.md status colors: `overdue (red)` zaten tanimli — sadece label degisikligi degil, **filter mantigi** da degisecek.
- Eski: status === `not_started` projeler.
- Yeni: due_date < today AND status !== `completed` projeler.
- Component muhtemelen `app/dashboard/page.tsx` veya `components/dashboard/projects-overview.tsx`.

**Acik soru:** Greg sadece label mi yoksa filter logic'i de mi degissin diyor? Metin label degisikligine isaret ediyor ama "overdue" label'i altinda yine "not_started" projeler dursa anlamsiz olur. Buyuk ihtimalle filter logic de degismeli.

**SS-3 dogrulama:** Screenshot'taki "By Project Status" listesinde su an `Active 13 / Planning 0 / On Hold 0 / Cancelled 0` var — "Not Started" string'i UI'da gorunmuyor ama Greg'in tariflediği slot muhtemelen `Planning` (boş, 0). Yani "not started → overdue" donusumu suradaki bir feature card / segmented filter'da geciyor olabilir, sadece bu liste degil. Gercek lokasyonu bulmak icin `app/dashboard` icinde "not started" / "Planning" string'ini grep et.

---

## 8. Dashboard — Settings tab'i (sol alt) kaldir 🟢

**Orijinal:**

> "The 'Settings' tab, currently located in the bottom-left corner."

**Turkce:** Sol alt kosedeki "Settings" tab'i / butonu kaldirilsin (tum kullanici / org settings'e bu noktadan ulasilamasin).

**Triage notlari:**

- `components/dashboard-sidebar.tsx` veya `components/layout/sidebar.tsx` bottom section.
- Sadece linki kaldirmak yeterli — settings sayfasi muhtemelen tutulacak ama dashboard'tan ulasilmayacak.
- **Soru:** Settings sayfasinin kendisi tamamen kaldirilsin mi yoksa sadece sol-alt link mi? Greg "remove from dashboard" diyor — sayfanin kendisi kalmis olabilir.

---

## 9. Dashboard — Sol ust search bar kaldir 🟢

**Orijinal:**

> "The search bar on the top-left. Please remove this for the time being, as it is non-functional."

**Turkce:** Dashboard'in sol ust kosesindeki search bar non-functional. Su anlik kaldirilsin (tamamen sil veya hidden).

**Triage notlari:**

- `components/dashboard-header.tsx` veya `components/layout/header.tsx`.
- Hidden ile sil arasinda secim — Greg "for the time being" diyor, ileride geri eklenecek. Component'i koru ama render etme (feature flag veya direkt `hidden` ile).

---

## 10. User guide 🟡

**Orijinal:**

> "Can you create a user guide for the platform"

**Turkce:** Platformun kullanim kilavuzu hazirlanmali. End-user (ekoloji firmasi calisani) icin step-by-step nasil kullanilacagi belgesi.

**Triage notlari:**

- Format secimi: PDF, web sayfasi (in-app help center), Notion/GitBook?
- Icerik: 8-step workflow, her step'in amaci, mobile app kullanimi, multi-site projeler, AI ozelliklerinin sinirlari.
- `docs/` klasorunde tutmak yerine end-user'a yonelik ayri bir alan dusunulmeli.
- AI ile draft cikarilabilir ama Greg'in onaylamasi gerekir (CIEEM standardi, terminoloji).

---

## 11. Team member ekleme — davet maili gonderilmiyor 🔴

**Orijinal:**

> "The team members' functions aren't working as they should. When adding a team member the added team member should receive an email asking to join the team"

**Turkce:** Team member ekleme akisi su an calismiyor: Eklenen kullaniciya **davet maili gitmiyor**, dolayisiyla yeni uye platforma katilamiyor.

**Triage notlari:**

- Supabase Auth'in invite flow'u kullaniliyor olmali — `auth.admin.inviteUserByEmail()`.
- Olası nedenler:
  1. Supabase Auth email provider yapilandirilmamis (SMTP / SendGrid / Resend).
  2. Email gonderiliyor ama redirect URL yanlis (production domain vs localhost).
  3. RLS policy invite tablosunu engelliyor olabilir.
  4. Sadece `organization_members` row'u atilip auth user yaratilmiyor.
- Component: `components/team/add-team-member-dialog.tsx` veya benzeri + ilgili API route.

**Aksiyon:**

- [ ] Supabase Auth → Email Templates kontrol et.
- [ ] Production'da gercekten email gonderiliyor mu (Supabase logs).
- [ ] Local test yap — invite email gelmeli.

---

## 12. 2FA tum kullanicilar icin 🟡

**Orijinal:**

> "Is it possible to add 2fa for all members?"

**Turkce:** Tum org member'lari icin 2FA (MFA) zorunlu / opsiyonel olarak acilabilir mi?

**Triage notlari:**

- Supabase Auth MFA (TOTP) destegi var (`supabase.auth.mfa.enroll()`).
- Implementation:
  1. Profile / Account settings sayfasinda "Enable 2FA" akisi (QR + recovery codes).
  2. Login sonrasi MFA challenge.
  3. Org-level enforce (admin "Require 2FA for all members" toggle) — zorunlu olursa enroll etmemis kullanici dashboard'a giremez, once enroll ekrani.
- Ekoloji projelerinde GDPR / hassas veri (designated sites coordinates, protected species locations) var — 2FA business sense yapar.

**Sorular:**

- MVP'de optional mi, mandatory mi?
- Recovery code'lar nasil saklanacak (download bir kerelik mi)?
- SMS 2FA gerek var mi yoksa TOTP yeter mi?

---

## 13. New Project — Client name free-form 🟢

**Orijinal:**

> "ON the new project page the user should be able to add the client name in a free form"

**Turkce:** Yeni proje olustururken (New Project page), client name su an dropdown / select gibi gorunuyor. Bunun yerine **free-form text input** olarak yazilabilsin (CRM'e bagli olmadan istenen ismi gir).

**Triage notlari:**

- Component: `components/projects/new-project-dialog.tsx` veya `app/projects/new/page.tsx`.
- Mevcut `clients` tablosu / dropdown varsa — autocomplete (existing'den sec, yoksa yeni yaz) deseni guzel olur ama Greg "free form" diye basitlestiriyor.
- En basit cozum: Field'i `Input` ile degistir, `clients` tablosu varsa silmeden free-form olarak da kabul et (DB nullable veya FK kaldir).

**Sorular:**

- Mevcut `clients` tablosu / FK var mi? Free-form'a gecince eski bagli projeler ne olacak?
- Autocomplete + free-form hibrit mi (Combobox), yoksa duz Input mu?

---

## Inceleme Sirasi (Onerilen)

### Faz 1 — Hizli Kazanimlar (Quick Wins)

1. **#7 Dashboard "not started" → "overdue"** — Label + filter logic
2. **#8 Settings tab kaldir**
3. **#9 Search bar kaldir**
4. **#13 Client name free-form**

### Faz 2 — Bug Fix (Kritik)

5. **#11 Team member invite email** — Production'da broken team flow
6. **#1 AI summary cross-step erisim** — Veri zaten var, UI eksik

### Faz 3 — Orta Olcekli Feature

7. **#2 Tablo uretme (designated/NBDC/aquatic)** — Rapor uretiminin temeli
8. **#12 2FA** — Security baseline
9. **#10 User guide** — Adoption icin gerekli

### Faz 4 — Mobile + Web Cross-cutting

10. **#3 Mobile GPS detect/prompt** — Mobile scope
11. **#4 Survey GPS + Data Analysis plot** — Mobile + Web koordinasyon
12. **#5 Project vs Survey foto** — Schema degisikligi gerekli

### Faz 5 — Buyuk Feature

13. **#6 Customizable report structure** — MVP "critical" demis Greg, ama scope buyuk. Faz oncelikli is degil ama mid-April konferans deadline yaklasiyor (project_meeting_26mar.md). Greg ile zamanlama netlestirilmeli.

---

## Acik Sorular (Greg'e dogrula)

- [ ] **#1** "Deep research" derken AI summary mi yoksa ayri deep research feature'i mi?
- [ ] **#2** Tablonun main body / appendix yerlesimi otomatik mi user-secimi mi?
- [ ] **#6** MVP scope: section reorder + logo + 1 renk yeterli mi?
- [ ] **#7** "not started" sadece label degisikligi mi yoksa filter logic'i de mi?
- [ ] **#8** Settings sayfasinin kendisi de kaldirilsin mi yoksa sadece dashboard linki mi?
- [ ] **#12** 2FA optional mi mandatory mi (org-level toggle)?
- [ ] **#13** Mevcut `clients` tablosu free-form'a gecince ne olacak?
- [ ] **Faz 5** #6 "critical" ama buyuk — mid-April konferans icin yetisecek mi?

---

## Notlar

- **Mobile app maddeleri (#3, #4, #5):** Main repo (web) disinda mobile build var. Schema degisiklikleri (project_photos vb.) iki tarafi da etkiler — koordineli planlama gerekli.
- **#11 invite email** kritik bir bug — team feature'i komple kullanilamiyor demek. Hemen production logs'a bakilmali.
- **#6 customizable reports** Greg'in en buyuk vizyonu. PEA report orneklerini paylasmis — bunlar `docs/feedback/` icinde mi yoksa Greg'in Drive'inda mi saklaniyor netlestirilmeli (reference memory adayi).
- Bu feedback'in cogu MVP-critical, mid-April konferans deadline'i olan #6 disinda hizli iterable.
