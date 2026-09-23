# ORYVEX Constitution v0.1

## 1. Egemenlik
ORYVEX hiçbir cloud, AI, database, git, mesajlaşma veya ödeme sağlayıcısını vazgeçilmez merkezi kabul etmez.

## 2. Sağlayıcı bağımsızlığı
Kritik dış servisler ORYVEX servis sözleşmeleri/adaptörleri üzerinden çağrılır. Gereksiz soyutlama yapılmaz.

## 3. Yetki
Least privilege esastır. AI/agent kendi yetkisini yükseltemez. Yüksek riskli yetkiler işlem bazlı, süreli ve audit edilebilir olmalıdır.

## 4. Otonomi
- L0 Observe
- L1 Recommend
- L2 Auto-Recover
- L3 Controlled Operate
- L4 Controlled Repair + ikinci doğrulama
- L5 Human Gate

## 5. Hata standardı
ALGILA -> IZOLASYON -> TIMEOUT/RETRY -> CIRCUIT BREAKER -> FALLBACK -> DOGRULA -> AUDIT -> GEREKIRSE INSAN.

## 6. Migration
COPY -> TEST -> SWITCH -> OBSERVE -> ARCHIVE. Kalıcı silme son ve kontrollü işlemdir.

## 7. Veri
Gerçek kurumsal veri tahmin edilmez. Tenant/organization sınırları zorunludur. Kritik değişiklikler audit kaydı üretir.

## 8. Güvenilirlik
Kritik servisler SLO, RTO, RPO, timeout, retry, idempotency ve degraded-mode politikası tanımlar.

## 9. AI
AI görev, kalite, maliyet, gecikme, hassasiyet ve sağlık durumuna göre router tarafından seçilir. Tek AI sınırsız production yetkisine sahip olamaz.

## 10. İnsan kontrolü
Geri döndürülemez, finansal, güvenlik-kritik veya veri kaybı riski taşıyan işlemler gerekli seviyede insan onayına yükseltilir.
