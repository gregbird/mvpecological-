# Feedback - 8 Subat 2026 (Bolum 11-16)

> Acik/bekleyen gorevler. Tamamlanan gorevler icin bkz. `completed-archive.md`
> Bolum 14 (Smart Scoping) IPTAL edildi, yerine 18.1 Survey Targets uygulanmistir.

---

## 11. Caspio Bird Database Entegrasyonu

> Belirsizlik: YUKSEK. Greg'e sorulacak: GBIF zaten kus kayitlari getiriyor, Caspio'dan ek olarak "mean number" mi isteniyor? API dokumantasyonu var mi?

- [ ] **11.1.1** Caspio API'yi incele ve dokumantasyonunu bul
  - URL: `https://c0cre470.caspio.com/dp/4BAE30005dbe20614b404564be88`
  - API endpoints, auth, query parameters

- [ ] **11.1.2** Caspio entegrasyonu icin karar ver
  - Onerimiz: Mevcut `species-records-substep.tsx` icine "Birds (Caspio)" tab'i ekle

- [ ] **11.1.3** Caspio API client olustur
  - Dosya: `lib/external-apis/caspio.ts`
  - Bbox/koordinat ile kus aramasi, mean number + species name dondurme

- [ ] **11.1.4** UI entegrasyonu
  - Kus kayitlarini listele, mean number gosterimi, findings'e kaydetme

---

## 12. Automated Web Search - Ecological Reports

> Belirsizlik: YUKSEK. Greg'e sorulacak: Hangi kaynaklardan arama yapilacak? "Report sector" bilgisi nereden gelecek?

- [ ] **12.1.1** Web search stratejisi belirle
  - Google Custom Search API / OpenAI web search / Planning portal scraping?

- [ ] **12.1.2** Report sector field'i ekle
  - Proje olusturma formuna "Sector" dropdown (Wind farm, Housing, Infrastructure, vb.)

- [ ] **12.1.3** Web search API endpoint olustur
  - Dosya: `app/api/search/ecological-reports/route.ts`
  - Input: location, habitats, species, sector / Output: report listesi

- [ ] **12.1.4** UI substep olustur
  - Dosya: `components/steps/data-gathering/ecological-reports-substep.tsx`

---

## 15. Photo & Asset Management

- [ ] **15.1.5** Releve Survey entegrasyonu
  - Mevcut prototip: `https://dulraecological.bolt.host/admin/projects/:projectId/releve-survey`
  - Fotograflari survey kaydina baglama

---

## 16. Releve Survey Entegrasyonu

> Belirsizlik: ORTA. Greg'e sorulacak: Mevcut prototipteki field'larin listesi?

- [ ] **16.1.1** Mevcut Releve Survey prototipini incele
  - URL: `https://dulraecological.bolt.host/admin/projects/:projectId/releve-survey`

- [ ] **16.1.2** Releve Survey form bileseni
  - Dosya: `components/field-surveys/releve-survey-form.tsx`

- [ ] **16.1.3** Habitat Mapping ile entegrasyon
  - Her habitat polygon'u icin Releve Survey kaydi, coklu survey destegi

---

_Tamamlanan bolumler (arsivde): 13 (Ecological Summary) -- tamamiyla tamamlandi._
_Iptal edilen bolumler: 14 (Smart Scoping) -- musteri istegi ile kaldirildi._
