# ORYVEX OS

ORYVEX ürün ekosisteminin monorepo çatısıdır.

## Uygulamalar

- `apps/burgermy`: BURGERMY paket fast-food sipariş uygulaması
- `apps/tikladoy`: TIKLADOY çevrim içi paket yemek platformu için ayrılan uygulama alanı

BURGERMY ve TIKLADOY ayrı ürünlerdir; kullanıcı, adres, sepet ve sipariş sözleşmeleri `packages/shared` altında ortaklaştırılır.

## BURGERMY V1 kapsamı

- Telefon doğrulama veya misafir girişi
- Yalnızca Kurye ile Teslimat ve Gel-Al
- Adres / şube seçimi
- Ürün boyutu, içecek, sos, ekstra ve çıkarılacak malzeme seçenekleri
- Kalıcı sepet ve sipariş takibi
- Kalıcı sipariş numarası ve sunucuda fiyat doğrulama
- Yetkili şube / mutfak sipariş kuyruğu
- Mobil ve masaüstü uyumlu Türkçe arayüz

Masa servisi, masa numarası ve garson çağırma BURGERMY kapsamına dahil değildir.

## Aktif V1

Canlı uygulama: https://burgermy-v1.ofrkcaliskan.chatgpt.site

Canlı V1'de ürün ve şube kataloğu ORYVEX yemek çekirdeğinden okunur. Siparişler platform veritabanında kalıcı tutulur; müşteri cihaz anahtarıyla yalnız kendi geçmişini görür. Şube paneli yönetici e-posta kontrolüyle korunur. Sipariş durumu `Yeni Sipariş → Hazırlanıyor → Kuryeye Verildi/Teslime Hazır → Teslim Edildi` akışında ilerler.

Bu sürüm gerçek sipariş kaydı oluşturur. Online kart tahsilatı henüz açık değildir; ödeme seçenekleri Kapıda Kart ve Kapıda Nakit ile sınırlandırılmıştır.

## Ortak veri katmanı

Supabase projesi ORYVEX yemek kataloğu çekirdeği olarak kullanılır. Uygulamalar ayrı kalırken aşağıdaki tablolar ortak sözleşmeleri taşır:

- `sellers`, `branches` ve `seller_members`
- `products`, `product_options` ve `product_option_values`
- `profiles`, `addresses`, `carts` ve `cart_items`
- `orders`, `order_items` ve `order_status_history`

BURGERMY, `sellers.slug = 'burgermy'` ile ayrılır. Kurye/Gel-Al seçimi `orders.fulfillment_type`, seçilen şube ise `orders.branch_id` üzerinden modellenir. Şema değişiklikleri `supabase/migrations` altında sürümlenir ve tüm açık tablolarda RLS kullanılır.

## Geliştirme

```bash
npm install
npm run dev:burgermy
```

Üretim kontrolü:

```bash
npm run build:burgermy
```
