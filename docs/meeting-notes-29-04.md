# Meeting Notes — 29 Nisan 2026

**Katılımcılar:** Greg Birdthistle, Abdurrahim Balta
**Süre:** ~24 dakika

---

## Özet

Greg geçen hafta 160 ekolojistin katıldığı bir konferansta sunum yaptı, güçlü pazar validasyonu aldı ve birebir demo isteyen ekolojist/firma listesi oluşturdu. Hedef: **Dulra'yı 1 hafta içinde tamamlamak** → Goran kendi sunuculara taşır → Paddy gerçek bir projede test eder → public release. Dulra bitince sıradaki platform: **acres**.

---

## Karar & Aksiyonlar

### 1. AI Analyzer Section (Step 3)

- Desk research var ama AI analyzer kısmı eksik
- Step 3 desk-insights akışına bağlanacak
- **Durum:** Implement edilecek — straightforward

### 2. Final Report Export

- Veriler tablo formatında toplanıyor ama henüz "report" aşamasına gelmiyor
- Final step için export functionality eklenecek
- **Durum:** Implement edilecek

### 3. Mobile Map Entegrasyonu

- Ekolojistler sahada habitat polygon'larını çizmek/güncellemek istiyor (NLC haritası %100 doğru değil)
- **Karar: Sadece online çalışacak** — offline mode çok zor, şimdilik vazgeçildi
- Survey, fotoğraf, target notes offline kalmaya devam; sadece haritalar online
- **Durum:** Online map mobil entegrasyonu yapılacak, offline sonra revisit

### 4. Otomatik Konum Servisi (Mobil)

- Relevé survey açılınca konum **otomatik dolsun**
- Bir sahada ~16 relevé survey olabilir, hepsi konum tabanlı
- **Durum:** Mobil tarafa eklenecek

### 5. Konum Verisinin Analyzer'da Gösterimi

- Toplanan konum data analyzer/desk assessment haritasında görünsün
- Her survey'in nerede yapıldığı haritada görünür olsun
- Final raporun doğruluğu için kritik
- **Durum:** Patty ile detayı netleştirilecek, sonra implement

### 6. Genel Saha Fotoğrafları

- Şu an: fotoğraf survey'e bağlı çekiliyor (doğru, korunacak)
- Eksik: survey'e bağlı olmayan **genel saha fotoğrafları** (erişim yolu, anıt, vs.)
- Proje açıkken survey dışında genel fotoğraf çekilebilsin
- **Durum:** Implement edilecek — zor değil

### 7. Rapor Yapısı Esnekliği

- Şu an: kullanıcı raporu amend ederken yeni section ekleyemiyor
- Her firmanın kendi rapor yapısı var, esneklik şart
- Custom report oluşturulduğunda bile yapı sabit kalıyor
- **Durum:** Section ekleme/değiştirme özgürlüğü eklenecek

### 8. UI Düzeltmeleri

- Desk status etiketi: **"Not Started" → "Overdue"**
- Sol alttaki **Settings tab kaldırılsın** (nonfunctional)
- Üstteki **Search bar kaldırılsın** (nonfunctional)
- İleride geri eklenebilir

### 9. User Guide

- Platform kullanıcıları için user guide draft
- **Durum:** Bugün sonuna kadar taslak çıkarılacak

### 10. Email Service (Team Mention)

- Şu an: yeni kullanıcı eklendiğinde email gitmiyor — manuel link paylaşımı
- Greg, Goran ile konuşacak — kendi sunucularında zaten email service var, bağlanılacak
- **Durum:** Greg + Goran konuşmasını bekliyor

---

## Timeline & Sonraki Adımlar

### Hedef: 1 Hafta İçinde Dulra Tamamlanacak

| Aşama                | Sorumlu    | Süre       |
| -------------------- | ---------- | ---------- |
| Geliştirme tamamlama | Abdurrahim | ~1 hafta   |
| Sunucuya taşıma      | Goran      | sonrasında |
| Gerçek proje testi   | Paddy      | sonrasında |
| Minor düzeltmeler    | Abdurrahim | bekleniyor |
| Public release       | -          | hedef      |

### Sonraki Platform: acres

- Dulra bitince acres platformuna geçilecek
- Dulra'nın GIS tool entegrasyonu kalıpları acres'e adapte edilebilir
- Greg: "Spent a lot of time on this, now let's get to users and you focus on acres"

---

## Yapılacaklar (Dev — Abdurrahim)

### Hızlı İşler

- [ ] Desk status: "Not Started" → "Overdue"
- [ ] Settings tab kaldırılsın (sol alt)
- [ ] Search bar kaldırılsın (üst)
- [ ] User guide taslağı (bugün sonuna kadar)

### Major Features

- [ ] AI analyzer section (Step 3 desk research)
- [ ] Final report export
- [ ] Mobile map entegrasyonu (online)
- [ ] Otomatik konum servisi (mobil relevé survey)
- [ ] Konum verisinin analyzer haritasında gösterimi
- [ ] Genel saha fotoğrafları (survey'den bağımsız)
- [ ] Rapor section ekleme/değiştirme esnekliği

---

## Greg & Goran'dan Beklenenler

- [ ] Email service bağlantısı için karar (Greg ↔ Goran)
- [ ] Goran: Dulra bitince sunucuya taşıma
- [ ] Greg: konferansta demo isteyen ekolojistlere takip emaili / 1-on-1 demo planlaması

---

## Konferans Notları (Bilgi)

- 160 ekolojistin katıldığı sunum
- Güçlü pazar validasyonu, çok pozitif geri dönüş
- Demo isteyen kişiler/firmalar listesi var
- Greg birebir demoları takip edecek
- Strategy: Paddy testinden sonra public release, üçüncü taraf kullanıcılara mümkün olan en kısa sürede ulaşmak
