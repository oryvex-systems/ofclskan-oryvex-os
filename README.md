# ORYVEX OS

TIKLADOY ve BURGERMY başta olmak üzere ortak kullanıcı, sepet, sipariş, ödeme, teslimat ve yönetim altyapısını paylaşan çok markalı uygulama ekosistemi.

## Uygulamalar

- `apps/tikladoy` — çok kategorili online paket yemek platformu
- `apps/burgermy` — BURGERMY paket fast-food sipariş uygulaması

## Ortak çekirdek

Ortak iş kuralları ve servisler `packages/shared` altında geliştirilir. Markaya özel görünüm, menü ve operasyon kuralları kendi `apps/*` dizininde kalır.

BURGERMY V1 yalnızca **Kurye ile Teslimat** ve **Gel-Al** sipariş türlerini destekler; masa servisi, masa numarası ve garson çağırma kapsam dışıdır.

## Komutlar

- `npm run dev:tikladoy`
- `npm run dev:burgermy`
- `npm run build:tikladoy`
- `npm run build:burgermy`
