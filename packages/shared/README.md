# ORYVEX Shared Core

BURGERMY ve TIKLADOY için ortak kullanıcı, adres, sepet ve sipariş sözleşmelerinin evidir.

## Aktif modüller

- Teslimat türleri: Kurye ve Gel-Al
- Ürün ve sepet tipleri
- Ürün seçimi özeti
- Ara toplam, teslimat, indirim ve genel toplam hesaplama

## BURGERMY → TIKLADOY veri akışı

İki uygulama ayrı arayüzlerdir fakat aynı ticaret verisini paylaşır:

1. `sellers.slug = burgermy` BURGERMY markasını tanımlar.
2. BURGERMY ürünleri `products.seller_id` ile bu satıcıya bağlıdır.
3. BURGERMY kendi katalog API'sinde yalnızca `burgermy` satıcısının aktif ürünlerini ve şubelerini okur.
4. TIKLADOY pazaryeri olarak aynı `products` tablosundaki aktif ürünleri okur; `seller_id` siparişin hangi markaya gideceğini belirler.
5. TIKLADOY'da oluşturulan sipariş `orders.seller_id` alanıyla BURGERMY operasyonuna bağlanır.
6. Fiyat, aktif/pasif ürün ve ürün görseli Supabase'de değiştiğinde iki uygulama da aynı güncel kaynaktan beslenir.

Markaya özel arayüz, menü ve operasyon kuralları `apps/*` altında kalır. Ortak iş mantığı bu pakete taşınır.
