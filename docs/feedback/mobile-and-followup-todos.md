# Mobile Alignment & Follow-Up TODOs

> **Created:** 2026-04-19
> **Scope:** Items that must be reviewed / updated on the mobile app side, plus follow-up tasks generated during the Field Research UX pass on 2026-04-19.
> **Status:** Draft — not yet reviewed with Greg. Mobile app not yet integrated into discussion.

---

## Context

On 2026-04-19 we did a Field Research (Step 4) UX pass on the web app. Changes below may affect or depend on the mobile app. Greg mentioned "we have a mobile app but let's not confuse ourselves right now" — this doc captures what needs checking when mobile is revisited.

---

## Part A — Web changes that need mobile review

### A1. `expectedSurveyCount` field removed from web UI and types

- **Web state:** Removed from `surveyFormSchema`, form UI, `WeatherData` type, `Survey` type, and `handleSubmit` payload.
- **DB state:** Kolon hâlâ mevcut değil — alan sadece `surveys.weather` JSONB içinde anahtar olarak yaşardı. Hiç kaldırılmadı, sadece artık yazılmıyor.
- **Mobile review:** Mobile uygulaması hâlâ `weather.expectedSurveyCount` yazıyor olabilir. Ya mobil de kaldırsın ya da legacy olarak bırakıp okumasın.
- **Defensive filter:** Web okuma tarafında `k !== 'expectedSurveyCount'` filter'ı hâlâ var (`survey-form.tsx`, `survey-view-dialog.tsx`) — legacy mobile yazımları template-field olarak leak etmez.
- **Decision needed:** Mobile da kaldıracak mı? Kaldırırsa commit mesajına not düş.

### A2. Survey card CTA hierarchy changed

- **Web state:** `in_progress` survey card için primary buton artık "Fill Data" (Edit), secondary "Mark Complete". Eski "Complete Survey" tek primary'di.
- **Mobile review:** Mobile UI aynı hiyerarşiyi izliyor mu? Eğer mobilde tek buton "Complete Survey" ise, aynı UX kirliliği orada da var demektir.
- **Recommendation:** Mobile'da da aynı pattern — Fill Data primary, Mark Complete secondary.

### A3. Completed survey delete artık izinli

- **Web state:** `survey-card.tsx`'te `status !== 'completed'` gate kaldırıldı. Admin completed survey'leri silebilir.
- **Mobile review:** Mobile aynı yasağı uyguluyor muydu? Muhtemelen evet (RLS policy'den geliyorsa DB tarafı zaten izin veriyor).
- **Action:** Mobile'da aynı yasağı kaldır.

### A4. Progressive disclosure "Field Data" collapsible

- **Web state:** `SurveyForm`'daki template field'lar (weather, survey-specific fields) artık collapsible bir section içinde. Kullanıcı bağlamına göre default açık/kapalı:
  - Yeni survey: kapalı (admin schedule modu)
  - Kendi in-progress survey'ini edit ediyorsa: açık (ekolojist fill modu)
- **Mobile review:** Mobile form genelde tek scrollable ekran. Collapsible gereksiz olabilir ama "context-aware initial state" fikri korunabilir — fill moduna girerken section'lar otomatik expand olsun, schedule moduna girerken collapsed olsun.

### A5. Relevé view dialog metadata header

- **Web state:** Relevé view dialog'una üstte InfoRow metadata section eklendi (type, date, surveyor, start/end time) — walkover view ile aynı format.
- **Mobile review:** Mobile relevé detay ekranında bu metadata görünüyor mu? Yoksa sadece form alanları mı? Eğer eksikse, ekle.

### A6. React Query invalidation artık scoped

- **Web state:** `useUpdateSurvey`, `useDeleteSurvey`, `useUpdateObservation`, `useDeleteObservation`, `useVerifyObservation`, `useUpdatePhoto`, `useDeletePhoto` — hepsi artık `projectId` parametresi alıp sadece o projenin cache'ini invalidate ediyor.
- **Mobile review:** Mobile'ın kendi cache/state management'ı (muhtemelen farklı bir kütüphane) aynı patterna ihtiyaç duyabilir. Single-project session'ı varsa sorun yok; çok-proje gezinen kullanıcılar için gerekli.

### A7. Site auto-assign in single-site projects

- **Web state:** Tek-siteli projelerde survey oluşturulurken `site_id` artık otomatik dolduruyor (`effectiveSiteId` pattern, `field-survey-step.tsx`). Daha önce null kalıyordu.
- **Mobile review:** Mobile survey create flow'unda `site_id` default'u var mı? Tek-siteli projede null yazıyorsa web ile tutarsız veri üretir.

### A8. Releve Step 5 tab site filtering

- **Web state:** Site seçildiğinde Step 5 Releve tab artık `survey_id → surveys.site_id` üzerinden gerçekten filtreliyor.
- **Mobile review:** Mobile'da Releve listesi proje düzeyinde mi, site düzeyinde mi? Eğer proje düzeyi ise multi-site projelerde yanıltıcı.

---

## Part B — Follow-up bugs & tech debt (all platforms)

### B1. 🔴 Delete action has no confirmation dialog

- **Location:** `components/field-surveys/survey-card.tsx` → `onDelete(survey)` → `use-visit-management.ts:150` `handleDeleteSurvey`
- **Problem:** Clicking Delete in dropdown menu immediately fires mutation. No "Are you sure?" prompt. Cascade may delete species observations, photos, relevé data.
- **Risk increased:** 2026-04-19 change allowed completed surveys to be deleted — accidental clicks now destroy finalized work.
- **Fix:** Wrap delete click in `AlertDialog`. Show counts (observations, photos, relevé data) in the confirmation body.
- **Estimated:** ~1 saat

### B2. 🔴 `surveyor_id` written as creator, not form-selected surveyor

- **Location:** `hooks/use-visit-management.ts:52` → `surveyor_id: userId`
- **Problem:** Survey create uses the logged-in user's ID for `surveyor_id` regardless of who the Surveyor dropdown selects. Admin delegating to ecologist results in wrong attribution.
- **Downstream effect:** `isOwnInProgressEdit` (Field Data collapsible auto-open logic) compares against DB surveyor_id — always true for the creator, always false for the intended surveyor.
- **Fix:** Use `data.surveyor?.id` from form in `handleCreateSurvey`, fall back to `userId` if missing.
- **Estimated:** ~15 dakika

### B3. 🟡 `SurveyViewDialog` relevé branch has silent fallback when `projectId` is undefined

- **Location:** `components/field-surveys/survey-view-dialog.tsx:200` → `if (isReleve && projectId)`
- **Problem:** Prop is optional but relevé path requires it. If omitted, relevé survey renders generic view which routes Edit back to the same dialog → infinite loop potential.
- **Fix:** Make `projectId` required in interface, or assert at runtime.
- **Estimated:** ~15 dakika

### B4. 🟡 Empty completed relevé has no edit path

- **Location:** `components/field-surveys/survey-view-dialog.tsx` — footer Edit button requires `releveData`, empty-state "Start Relevé Survey" gated on `status !== 'completed'`.
- **Problem:** If someone accidentally marks Complete without entering relevé data, the survey becomes permanently empty. No UI path to enter data post-completion.
- **Fix:** Allow admin to reopen edit mode for empty completed relevés, OR add confirmation to Mark Complete that blocks completion when relevé data is empty.
- **Estimated:** ~30 dakika

### B5. 🟡 `survey-list.tsx` CollapsibleTrigger uses `<div>` (not keyboard accessible)

- **Location:** `components/steps/field-survey/survey-list.tsx` — group headers
- **Problem:** `<CollapsibleTrigger asChild><div>...</div></CollapsibleTrigger>` — `<div>` does not receive focus/respond to Enter/Space. Inaccessible via keyboard.
- **Fix:** Use a `<button>` or add `role="button" tabIndex={0}` + keyboard handler.
- **Estimated:** ~15 dakika

### B6. 🟡 `fetchTeamMembers` uses direct Supabase client, not React Query

- **Location:** `components/field-surveys/survey-form.tsx:279` — `useEffect` with direct `createClient()` call
- **Problem:** No caching, no dedup, `select('*')` on profiles. Form now opens more frequently (as primary CTA) → more wasted fetches.
- **Fix:** Migrate to a `useOrgTeamMembers(orgId)` React Query hook with explicit column whitelist.
- **Estimated:** ~30 dakika

### B7. 🟢 `releveEditing` state not reset on survey navigation

- **Location:** `components/field-surveys/survey-view-dialog.tsx`
- **Problem:** If `onNavigateVisit` swaps the survey while `releveEditing=true`, state persists. Currently only reset on dialog close.
- **Fix:** Add `setReleveEditing(false)` when `survey.id` changes.
- **Estimated:** ~10 dakika

### B8. 🟢 `CollapsibleTrigger` inside `<form>` should have explicit `type="button"`

- **Location:** `components/field-surveys/survey-form.tsx` — new Field Data collapsible trigger
- **Problem:** Radix sets `type="button"` internally, but explicit safer.
- **Fix:** Pass `type="button"` prop.
- **Estimated:** ~2 dakika

### B9. 🟡 Profile `NO ACTION` FK cascade blocks user removal

- **Location:** DB schema — `surveys.surveyor_id`, `target_notes.created_by/verified_by`, `releve_surveys.created_by`, `habitat_polygons.*`, `photos.created_by`, `projects.created_by`, `desk_research_findings.created_by`, `survey_assignments.assigned_by`
- **Problem:** Kullanıcı remove edilmeye çalışıldığında: auth user silindi → profile silinmesi fail oluyor (NO ACTION cascade) → orphan state (login yok ama profile var).
- **Fix:** Either change FK cascade to `SET NULL` via migration, OR add pre-delete reassignment UI in remove flow.
- **Estimated:** Migration tek başına ~30 dk; UI reassignment akışı ~4 saat.

---

## Part C — Decisions still pending

These items need Greg's input before implementation.

### C1. Mobile strategy (Q3 from earlier discussion)

- **Options:** (a) React Native app, (b) responsive web, (c) defer
- **Our recommendation:** (b) responsive web as interim, (a) long-term based on usage
- **Status:** Deferred until mobile app current state is reviewed together

### C2. Habitat/Target Note `survey_id` auto-fill (Q5)

- **Status:** Decided NOT to implement — Greg's earlier feedback explicitly scoped these to `site_id`, not `survey_id`. Columns stay nullable; UI does not auto-fill. Future need can be revisited.

### C3. Assignment notifications (Q4)

- **Status:** Deferred — Supabase default mailer too limited. External service (Resend/Postmark) integration needed.

### C4. "My Assigned Surveys" view (Q2)

- **Status:** Deferred — assignment feature only used in ~20% of surveys. Build "Mine" filter when cross-project usage grows.

---

## Appendix — Done today (2026-04-19)

### Web changes completed

- ✅ `expectedSurveyCount` fully removed from web UI, schema, types, handlers
- ✅ Progressive disclosure for Field Data section in SurveyForm (context-aware default)
- ✅ Survey card CTA restructured — Fill Data primary, Mark Complete secondary
- ✅ Completed surveys can now be deleted (admin)
- ✅ Relevé view dialog: metadata InfoRow header + unified footer (Email / Edit / Close)
- ✅ Releve Step 5 tab filters by site via survey_id join
- ✅ React Query scoped invalidation (survey, observation, photo mutations)
- ✅ Single-site auto-assign `site_id` on survey create
- ✅ Survey form `siteName` display in header
- ✅ `onInvalid` callback added to survey-form, target-note-form, species-observation-form, habitat-form
- ✅ `biodiversity_net_gain` added to SURVEY_TYPES display list
- ✅ `<Select>` `defaultValue` → `value` (reset-aware)
- ✅ `isOwnInProgressEdit` memoized + user-async race fixed
- ✅ ScrollArea height adaptive for relevé edit mode
- ✅ Completed relevé edit lockout removed

### Rules updated

- `.claude/rules/step4-field-surveys.md` — CTA hierarchy, progressive disclosure rules, consistency requirements, removed-fields note, known issues refreshed
