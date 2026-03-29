# Meeting Notes — 26 Mart 2026

**Katilimcilar:** Greg Birdthistle, Abdurrahim Balta
**Sure:** ~36 dakika

---

## Ozet

Mobil uygulama durumu gozden gecirildi, App Store ve Supabase hesap gereksinimleri kararlastirildi. Hedef: Nisan ortasi ekoloji konferansi icin urunun hazir olmasi. Sunucu gecisi icin 10 gunluk buffer gerekiyor.

---

## Karar & Aksiyonlar

### 1. Mobil Uygulama Durumu

- Uygulama neredeyse hazir: proje ve survey goruntuleyebiliyor
- **Mevcut durum:** Tum organizasyon survey'leri gosteriyor
- **Greg'in istedigi:** Kullanici sadece atandigi projelerin survey'lerini gormeli
- User role'lerde bug bulundu (toplanti oncesi 1 saat)
- Test ve App Store hesabi gerekiyor dagitim icin
- **Durum:** Logic degisikligi yapilacak, test edilecek

### 2. App Store Developer Hesabi

- Greg 5 Mart'ta basvuru yapti, hala onay gelmedi
- App Store Connect'e giris engellendi — "enroll" adimi tamamlanmamis olabilir
- **Sorun:** Greg bireysel degil, organizasyonel hesap acmali
- App Store review suresi uzun olabilir (insan review'i devam ediyor)
- **Durum:** Greg toplanti sonrasi arastiracak
- **Risk:** Konferans deadline'i ile review suresi cakisabilir

### 3. SMTP Server & Takim Uye Daveti

- Email gonderimi icin SMTP server gerekiyor
- Mevcut cozum: davet linki manuel paylasiliyor
- Hedef: Email ile davet → kullanici link'e tiklayip hesap olusturuyor → organizasyona katiliyor
- Resend onerildi email servisi olarak
- **Durum:** SMTP kurulumu gerekiyor

### 4. Organizasyon Izolasyonu (Guvenlik Riski)

- Yeni kullanici kaydolup organizasyon olusturabiliyor
- Organizasyonlar arasi izolasyon **henuz test edilmemis**
- Abdurrahim: "no one see our organizations... I never checked it"
- **Durum:** Multi-tenancy guvenlik testi yapilmali — ONCELIKLI

### 5. Supabase Odeme Plani

- $20/ay paid plan onaylandi
- **Sadece bu ay icin** — gecici cozum, sonra kendi sunucularina tasinacak
- Free tier mobil foto testlerinde crash veriyor
- **Durum:** Greg toplanti sonrasi odeme yapacak

### 6. Species Data Iyilestirmesi (Tamamlandi)

- GBIF report sistemi entegre edildi
- Onceki: ~50 species / 10km
- Simdi: ~1.000 species / 10km default radius
- Kullanici 2km, 5km, 10km secebiliyor, secim sonrasi data yenileniyor
- Ireland grid sistemine donusum yapildi
- Varsayilan gorunum card view'dan **table view'a** degistirildi (card view hala mevcut)
- **Durum:** Tamamlandi

### 7. Sunucu Gecisi Plani

- MVP tamamlandiktan sonra kod Supabase'den Greg'in kendi sunucularina tasinacak
- Teknik lead **Gorn** kodu zaten inceledi ve tasiyabileceini onayladi
- Gorn GitHub'dan kendi ortamlarina tasiyacak
- **Abdurrahim testing'i yonetecek** — yeni ortamda her seyin calistigini dogrulayacak
- 10 gun gerekiyor: tasima + test
- **Durum:** MVP tamamlanmasini bekliyor

### 8. Iletisim Kanali

- Greg, Gmail kanali kuracak: Greg + Abdurrahim + Gorn
- Sunucu gecisi ve test surecinde iletisim icin kullanilacak
- **Durum:** Greg tarih belirlendikten sonra kuracak

---

## Timeline & Riskler

### Hedef: Nisan Ortasi Ekoloji Konferansi

| Kalem                     | Sure           |
| ------------------------- | -------------- |
| Toplantidan konferansa    | ~19 gun        |
| Sunucu gecisi + test      | 10 gun         |
| **Gelistirme icin kalan** | **~9 is gunu** |

### Tamamlanmasi Gerekenler

- [ ] Feedback 11 review ve implementation
- [ ] Mobil app logic degisikligi (proje bazli survey filtreleme)
- [ ] User role bug fix'leri
- [ ] Org izolasyonu guvenlik testi
- [ ] SMTP server kurulumu
- [ ] App Store hesabi (Greg)
- [ ] Tum MVP feedback item'lari

### Risk Tablosu

| Risk                           | Seviye     | Aciklama                                         |
| ------------------------------ | ---------- | ------------------------------------------------ |
| Org izolasyonu test edilmemis  | **Yuksek** | Multi-tenant veri sizintisi olabilir             |
| 9 is gunu kaldi                | **Yuksek** | Feedback 11 henuz review edilmemis               |
| App Store hesap sorunu         | **Orta**   | Greg enrollment yapamadi, review suresi belirsiz |
| App Store review suresi        | **Orta**   | Insan review'i — sure kontrolumuzde degil        |
| Supabase → kendi sunucu gecisi | **Orta**   | Beklenmeyen sorunlar cikabilir                   |

---

## Onceki Feedback Durumu

- Feedback 5 & 6: **Tamamlandi**
- Dark/light mode sorunlari: **Tamamlandi**
- User role kucuk sorunlari: **Devam ediyor**
- Feedback 11: **Henuz review edilmedi**

---

## Bu Konusmada Istenenler

> Hedef: 1 haftada tamamlanacak (2 Nisan 2026'ya kadar)

### Yapilacaklar (Dev)

- [ ] Feedback 11 — review et ve implement et
- [ ] Mobil app: sadece kullanicinin atandigi projelerin survey'lerini goster (tum org degil)
- [ ] User role bug'larini duzelt
- [ ] Org izolasyonu test et (baska org'un verisini gorebiliyor mu?)
- [ ] SMTP server kurulumu (Resend) — takim uyesi email daveti icin

### Yapilacaklar (Non-dev)

- [ ] Miro board'a eski feedback'leri ekle
- [ ] Greg'e completion date mesaji at — ✅ 1 hafta verildi

### Greg'den Beklenenler

- [ ] Apple Developer hesabi enrollment sorununu coz
- [ ] Supabase $20/ay paid plan'a gec
- [ ] Gmail kanali kur (Greg + Abdurrahim + Gorn)

### Bilgi Notu

- Sunucu gecisi (Gorn) MVP bittikten sonra basliyor — 10 gun surecek
- Supabase odemesi gecici, sadece test sureci icin
- App Store review suresi kontrolumuzde degil, Greg kabul etti
