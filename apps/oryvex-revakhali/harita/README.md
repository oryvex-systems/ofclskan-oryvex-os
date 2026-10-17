# Topograf / Harita İşleri modülü

- Şantiye OS içindeki çalışma adresi: `/harita/` (mevcut `santiye-m.com` alan adı altında).
- Bu klasör statik ve taşınabilir tutulur; ileride bağımsız bir statik hosta veya ayrı domaine kopyalanabilir.
- Supabase proje URL'si ve publishable anahtar `supabase-config.js` içinde tutulur. Burada yalnızca public publishable key bulunmalıdır.
- Farklı bir domain/host kullanılacaksa Supabase Auth URL allowlist'e o adres ayrıca eklenmelidir.
- Bu entegrasyon yeni domain, DNS kaydı veya domain satın alımı yapmaz.
