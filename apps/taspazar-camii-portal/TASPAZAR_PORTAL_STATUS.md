# TAŞPAZAR CAMİİ PORTALI — Durum

## Yapılan işler
- ŞANTİYE-M'den ayrı `apps/taspazar-camii-portal` uygulama iskeleti oluşturuldu.
- Tam ekran karşılama ekranı, hamburger menü ve mobil/iPad responsive düzen kuruldu.
- ŞANTİYE-M Supabase Auth/username-login oturumu yeniden kullanıldı.
- İzleme paneli gerçek veri varsa ŞANTİYE-M'den salt-okunur okumaya hazırlandı; veri yoksa sahte rakam yerine “— / Veri bekleniyor” gösterir.
- Proje & Teknik Arşiv, Belgeler, Fotoğraf Galerisi, İlerleme Raporları, Güncel Durum ve Paylaşım Merkezi temel ekranları oluşturuldu.
- 10 ana arşiv klasörü UI'da tanımlandı.
- R2 signed upload/share backend hazır olmadan upload/paylaşım aksiyonları bilinçli olarak aktif edilmedi.
- Production DNS/deployment/migration yapılmadı.

## Kullanılan ŞANTİYE-M bileşenleri
Supabase client, Supabase Auth session, `santiye-username-login` Edge Function, `santiye_internal_users`, `santiye_company_members`, `santiye_projects`, `santiye_location_progress`.

## Oluşturulan dosyalar
`index.html`, `styles.css`, `app.js`, `package.json`, `eslint.config.js`, `TASPAZAR_PORTAL_INTEGRATION_REPORT.md`, `TASPAZAR_PORTAL_STATUS.md`.

## Değiştirilen ŞANTİYE-M dosyaları
Yok. Ana ŞANTİYE-M uygulamasına dokunulmadı.

## Supabase gereksinimleri
Production migration öncesi mevcut document/photo tabloları kesinleştirilmeli. Portal metadata için minimum: id, project_id, folder_id, name, object_key, mime_type, size_bytes, revision, description, uploaded_by, created_at, updated_at. Fotoğraf metadata: date, location/mahal, work/imalat, description, uploader, tags. Paylaşım metadata: token hash, expiry, password hash, view/download izinleri, revoked_at. RLS proje üyeliği üzerinden tasarlanmalı.

## R2 gereksinimleri
Private bucket; signed upload/download URL üreten Worker/Edge Function; object key project/folder/revision düzeni; MIME/size allowlist; link revoke/expiry. Public object URL kullanılmayacak.

## Eksik ENV / asset
- R2 bucket/account bilgisi ve signed URL servis endpoint'i.
- Gerçek Taşpazar Camii mimari görsel dosyası.
- Gerçek DAMA logo dosyası.
- Taşpazar'ın ŞANTİYE-M içindeki kesin `project_id` kaydı (production veri oluşturulmadı).

## Build / test
Kaynak branch üzerinde paket betikleri hazırlandı: `npm run build`, `npm run lint`, `npm run typecheck`. Bu connector oturumunda kullanıcının Mac yerel çalışma alanında komut çalıştırılamadığı için yerel sonuç henüz doğrulanmış değildir. Production'a çıkış yapılmadı.

## Sonraki güvenli adım
Branch'i yerel ORYVEX çalışma alanına alıp npm install + build/lint/typecheck çalıştırmak; ardından gerçek mimari görsel/DAMA logosunu yerel asset olarak bağlamak. Testler geçtikten sonra Supabase/R2 şeması için yalnız migration taslağı hazırlanmalı; production migration uygulanmamalı.

## Kullanıcı müdahalesi gereken noktalar
Gerçek Taşpazar mimari görseli ve DAMA logosunun kaynak dosyası; R2 secret/credential değerlerinin güvenli ENV kanalına girilmesi; daha sonra DNS ve production deployment için açık onay.
