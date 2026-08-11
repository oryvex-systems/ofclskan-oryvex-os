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
- Kalıcı sepet, ödeme demosu ve sipariş takibi
- Mobil ve masaüstü uyumlu Türkçe arayüz

Masa servisi, masa numarası ve garson çağırma BURGERMY kapsamına dahil değildir.

## Geliştirme

```bash
npm install
npm run dev:burgermy
```

Üretim kontrolü:

```bash
npm run build:burgermy
```
