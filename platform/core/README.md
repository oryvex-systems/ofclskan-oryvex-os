# ORYVEX CORE

ORYVEX ekosisteminin sağlayıcı bağımsız karar, politika, sağlık, servis yönlendirme ve audit omurgası.

## Ana ilke

**Bağlan ama bağımlı olma.**

CORE bir sağlayıcının ürünü değildir. Cloudflare ilk runtime pilotudur; runtime değiştirilebilir.

## MVP sınırı

- ORYVEX API
- Constitution / politika kuralları
- Policy Engine çekirdeği
- Service Registry
- Health endpoint
- Audit sözleşmesi

Sonraki fazlarda AI Router, durable workflow, PostgreSQL, event bus, secrets ve observability bağlanır.

## Endpointler

- `GET /health`
- `GET /v1/constitution`
- `GET /v1/services`
- `POST /v1/policy/evaluate`

## Güvenlik prensibi

AI veya otomasyon kendi yetkisini yükseltemez. Kritik işlemler risk sınıfına ve otonomi seviyesine göre policy kontrolünden geçer.
