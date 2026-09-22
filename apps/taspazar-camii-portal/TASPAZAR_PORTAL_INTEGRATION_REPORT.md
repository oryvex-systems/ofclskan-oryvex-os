# TAŞPAZAR CAMİİ PORTALI — Entegrasyon Raporu

Kod adı: `taspazar-camii-portal`  
Hedef domain: `santiye-m.online`  
Ana sistem: ORYVEX ŞANTİYE-M

## Mimari sınır
Portal, ŞANTİYE-M yönetim ekranlarının kopyası değildir. ŞANTİYE-M operasyonel kayıt sistemidir; portal izleme, arşiv, fotoğraf, rapor ve kontrollü paylaşım katmanıdır.

| Bileşen | Karar | Uygulama |
|---|---|---|
| Supabase Auth | AYNEN KULLAN | Mevcut proje ve oturum; portal açık kayıt üretmez. |
| Supabase client | AYNEN KULLAN | Aynı Supabase projesi; publishable key istemci tarafında. |
| Kullanıcı modeli | AYNEN KULLAN | `santiye_internal_users` ve `santiye_company_members`. |
| project_id | AYNEN KULLAN | Portal verileri seçili Taşpazar projesine bağlanacak. |
| Rol/yetki | UYARLA | Portal viewer/read, uploader, share-manager davranışlarını mevcut şirket üyeliğinden türetecek; yeni RLS ancak migration incelemesinden sonra. |
| ŞANTİYE-M operasyon verisi | AYNEN KULLAN | İzleme KPI'ları salt-okunur olarak mevcut proje/ilerleme/rapor tablolarından okunacak. |
| Dosya metadata | YENİDEN YAZ | Portal odaklı klasör, revision, object_key ve paylaşım metadata modeli gerekir. |
| R2 gerçek dosya | UYARLA | Varsa mevcut Worker/R2 imzalama katmanı tekrar kullanılacak; doğrudan public object URL yasak. |
| Supabase Storage | KULLANMA | R2 ana dosya deposu hedefleniyor; sadece mevcut zorunlu akış varsa geçiş köprüsü olabilir. |
| Dosya yükleme | UYARLA | Drag-drop, uzantı/boyut doğrulama, metadata kaydı ve signed upload URL. |
| Fotoğraf yükleme | UYARLA | Tarih, mahal, imalat, açıklama, etiket metadata alanları eklenecek. |
| Dosya görüntüleme/indirme | UYARLA | Signed URL/token üzerinden. |
| Paylaşım | YENİDEN YAZ | Süre, parola, view/download izni, revoke. |
| Modal/viewer | UYARLA | Portal sade arayüzüne göre. |
| Bildirim | KULLANMA | İlk aşama kapsamı dışında. |
| Ortak UI | UYARLA | ORYVEX koyu tema ve responsive davranış korunur; yönetim dashboard görünümü kopyalanmaz. |
| API/Worker/Edge Function | UYARLA | Auth ve signed URL üretimi için mevcut altyapı uygunsa kullanılır. |
| ŞANTİYE-M global nav | KULLANMA | Portalın kendi hamburger menüsü vardır. |
| ŞANTİYE-M finans/hakediş/satın alma UI | KULLANMA | Portal kapsamı dışında. |

## Mevcut kaynak incelemesi
İncelenen çekirdekler: `apps/oryvex-revakhali/global-nav.js`, `giris.html`, `session-watch.js`, `depo-evrak.html`, `mahal-ilerleme.html`, `raporlar.html`, `planlama-finans.html`.

Mevcut Auth akışı kullanıcı adı/şifreyi `santiye-username-login` Edge Function üzerinden doğruluyor, ardından Supabase session kuruyor. Portal aynı oturumu kullanacak ancak ŞANTİYE-M global navigasyonunu taşımayacak.

## Güvenlik sınırı
Bu aşamada production migration, DNS ve deployment yapılmaz. R2 object'leri public yapılmaz. Dosya yükleme/paylaşım butonları backend signed URL sözleşmesi hazır olana kadar güvenli biçimde devre dışı/“altyapı bekleniyor” durumunda kalır.
