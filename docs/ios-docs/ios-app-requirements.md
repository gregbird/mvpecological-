# iOS App Gereksinimleri

Tasarım temiz ve sade olmalı.

---

## Kullanıcı Akışı ve İşlevler

1. Kullanıcılar uygulamaya giriş yapabilmeli
2. Giriş yapıldıktan sonra erişim yetkisi olan tüm projeler listelenmeli
3. Kullanıcı çalışmak istediği projeyi seçebilmeli
4. Masaüstü uygulamasında başlatılan anketler (örneğin Relevé Anketi) kullanıcı mobil uygulamaya giriş yaptığında hemen erişilebilir olmalı
5. Kullanıcılar tek bir saha ziyaretinde birden fazla anket yapabilmeli, bunun için net bir "Başka anket ekle" seçeneği olmalı
6. Tamamlanan anketler özel bir "Tamamlanan Anketler" sekmesine taşınmalı
7. Kullanıcılar anket verilerini doğrudan uygulama içerisinde düzenleyebilmeli veya güncelleyebilmeli

## Veri Erişimi ve Giriş

8. Kullanıcılar mevcut habitat haritalama ve hedef notlar verilerine tam erişime sahip olmalı; bu veriler ister masaüstü uygulamasından ister başka bir yerden girilmiş olsun fark etmemeli

## Fotoğraf

9. Uygulama kullanıcıların sahada fotoğraf çekmesine izin vermeli
10. Her fotoğraf otomatik olarak filigranlanmalı (watermark) ve coğrafi koordinat etiketlenmeli (geo-coordinate tag)

## Veri Senkronizasyonu ve Kalıcılık

11. Tüm anket verileri ve fotoğraflar hücresel ağ veya Wi-Fi bağlantısı olmasa bile uygulama içerisinde otomatik olarak yerel kayıt edilmeli ve veri kalıcılığı sağlanmalı
12. Hücresel ağ ve/veya Wi-Fi erişimi yeniden sağlandığında yerel olarak kaydedilmiş tüm veriler otomatik olarak senkronize edilmeli; hem mobil uygulamadaki ilgili projeye hem de masaüstü uygulamasındaki ilgili projeye kaydedilmeli
