# Meeting Notes

## 9 Mart 2026 — Greg & Apro Catch-up

**Katilimcilar:** Greg Birdthistle, Abdurrahim Balta
**Sure:** ~25 dakika

### Ozet

Greg projeyi %70-75 tamamlanmis goruyor. 4 hafta icinde urunun ucuncu parti kullanicilara (ekologlar, potansiyel musteriler) verilmesi hedefleniyor. Bu hafta 4 ekologla gorusmeler planli.

### Karar & Aksiyonlar

#### 1. Hosting — Dublin'e Tasima

- Supabase su an Zurich'te (EU Central 2, AWS)
- Greg Dublin'e tasinmasini istiyor — devlet kurumlari hosting lokasyonuna hassas
- Supabase ile iletisime gecilecek (region degisikligi)
- **Durum:** Beklemede — oncelik degil ama arastirilacak

#### 2. Staging & Production Ortami

- Staging ortami kurulacak — degisiklikler once staging'de test edilip sonra production'a alinacak
- Kullanici kabul testleri (UAT) staging uzerinde yapilacak
- **Durum:** Beklemede — 4 hafta icinde kurulmali

#### 3. Otomatik Test & Guvenlik

- Otomatik test case'leri olusturulmali (su an manuel + AI ile test ediliyor)
- Kullanici erisimi ve genel guvenlik yaklasimi dusunulmeli
- **Durum:** Beklemede — simdilik degil ama yakin gelecekte

#### 4. Veri Kaydedilebilirligi

- Dulra'nin gosterdigi her veri kullanici tarafindan kaydedilebilir olmali
- Kaydedilen veriler sonraki adimlarda kullanilabilmeli
- **Durum:** Devam eden — her yeni ozellikte uygulanacak

#### 5. Grid Reference Gosterimi

- Ekologlar ikon yerine grid reference gosterimini tercih ediyor (danismandan gelen oneri)
- **Durum:** Feedback dokumani ile takip ediliyor

#### 6. National Land Cover — Default Habitat Verisi

- National Land Cover 2018 verisi habitat mapping'e default olarak yuklenecek
- Kullanici daha sonra degistirebilecek
- **Durum:** Feedback #4 ile takip ediliyor

#### 7. Harita Legend & Orientation

- Her kaydedilen haritada legend secenegi olmali
- Portrait/Landscape secimi
- Kagit boyutu: A5, A4, A3
- **Durum:** Feedback #8 ile takip ediliyor

#### 8. Mobil Uygulama

- Survey123 referans alinacak ama daha iyi UX ile
- Offline mode kritik — farkli backend mimarisi gerektirir
- **Durum:** Beklemede — web tamamlandiktan sonra

#### 9. Kullanici Dokumantasyonu

- Urun hazir oldugunda kullanici dokumantasyonu olusturulacak
- Kullanici rolleri, guvenlik bilgileri dahil
- **Durum:** Beklemede — son asamada

#### 10. Proje Yonetim Araci

- Hafif tutulacak: Miro / Notion / txt
- Jira gibi agir araclar kullanilmayacak
- **Durum:** Miro + docs ile devam

### Genel Notlar

- Ekologist danisman uygulamayi "cok iyi" bulmus
- Greg bu hafta 4 ekologla gorusecek (2 Sali, 2 Carsamba) — potansiyel musteriler
- Hedef: 4 hafta icinde urun kullaniciya verilecek durumda olacak

---

## 28 Subat 2026 — Feedback & Degisiklik Talepleri

**Katilimcilar:** Greg Birdthistle, Abdurrahim Balta
**Detay:** `docs/feedback/feedback-28-feb.md`

### Ozet

Greg, ekologist danisman ile gorusme sonrasi 8 maddelik feedback listesi paylasti. Oncelik sirasina gore:

| #   | Konu                                                    | Oncelik | Durum         |
| --- | ------------------------------------------------------- | ------- | ------------- |
| 6   | Aquatic mesafe olcum hatasi (centroid → en yakin nokta) | Kirmizi | Yapilacak     |
| 5   | SAC eslestirme dogrulugu (isim + cografi yakinlik)      | Kirmizi | Yapilacak     |
| 1   | Deep Research save/regenerate (tek buton)               | Kirmizi | Yapilacak     |
| 3   | Species proximity filtresi                              | Sari    | Yapilacak     |
| 2   | Rapor appendix tablolari                                | Sari    | Yapilacak     |
| 4   | National Land Cover habitat data                        | Sari    | Yapilacak     |
| 7   | Nehir mesafesi (river distance)                         | Sari    | #6'ya bagimli |
| 8   | Data Analysis harita ozellikleri                        | Sari    | Yapilacak     |
