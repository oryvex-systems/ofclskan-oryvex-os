# ORYVEX OS

ORYVEX ürün ekosisteminin monorepo çatısıdır. ORYVEX Core; tüm uygulamaların, markaların, yapay zekâ araçlarının ve otomasyonların ana giriş kapısıdır.

## Uygulamalar

- `apps/oryvex`: ORYVEX Business Operating System ana çatı / sistem geçidi
- `apps/burgermy`: BURGERMY paket fast-food sipariş uygulaması
- `apps/tikladoy`: TIKLADOY çevrim içi paket yemek platformu

ORYVEX ana çatı olarak konumlanır. BURGERMY ve TIKLADOY bağımsız ürünlerdir; kullanıcı, adres, sepet, sipariş ve platform sözleşmeleri gerektiğinde `packages/shared` altında ortaklaştırılır.

## ORYVEX Core V0.1

ORYVEX ilk sürümde sade bir platform kabuğu olarak başlar:

- ORYVEX karşılama / marka giriş ekranı
- Sistemler ve çalışma alanları geçidi
- TIKLADOY ve BURGERMY sistem kartları
- Yapay zekâ, otomasyon, analitik ve ekosistem çekirdek alanları
- Sonradan eklenecek Woodlife, TEKNOM YAPI, Dome Lighting ve diğer sistemler için genişleyebilir yapı

Geliştirme:

```bash
npm install
npm run dev:oryvex
```

Üretim kontrolü:

```bash
npm run build:oryvex
```

## BURGERMY V1 kapsamı

- Supabase tabanlı 6 haneli telefon doğrulama veya misafir girişi
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

Telefon doğrulama uç noktası gerçek Supabase OTP akışını kullanır; SMS teslimi Supabase projesinde bir SMS sağlayıcısı tanımlandığında devreye girer.

## Ortak veri katmanı

Supabase projesi ORYVEX yemek kataloğu çekirdeği olarak kullanılır. Uygulamalar ayrı kalırken aşağıdaki tablolar ortak sözleşmeleri taşır:

- `sellers`, `branches` ve `seller_members`
- `products`, `product_options` ve `product_option_values`
- `profiles`, `addresses`, `carts` ve `cart_items`
- `orders`, `order_items` ve `order_status_history`

BURGERMY, `sellers.slug = 'burgermy'` ile ayrılır. Kurye/Gel-Al seçimi `orders.fulfillment_type`, seçilen şube ise `orders.branch_id` üzerinden modellenir. Şema değişiklikleri `supabase/migrations` altında sürümlenir ve tüm açık tablolarda RLS kullanılır.
