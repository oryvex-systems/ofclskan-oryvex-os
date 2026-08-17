# OCX CLO Connector v0.1

Cloudflare, OCX CORE içine doğrudan gömülmez. Bu paket provider-specific CLO Connector katmanıdır.

## Amaç

OCX komut standardını Cloudflare API'lerine güvenli biçimde bağlamak:

- `CLO.TOKEN.VERIFY`
- `CLO.ZONE.LIST`
- `CLO.DNS.LIST`
- `CLO.DNS.CREATE`
- `CLO.DNS.UPDATE`
- `CLO.WORKER.ROUTE.LIST`
- `CLO.WORKER.ROUTE.CREATE`

Silme, zone silme, nameserver değiştirme ve diğer kritik/destructive işlemler v0.1 API yüzeyinde bilerek yoktur.

## Worker secrets

Gerçek değerler repoya yazılmaz.

Gerekli Worker secrets:

- `CLOUDFLARE_API_TOKEN`
- `OCX_SHARED_SECRET`

Opsiyonel:

- `CLOUDFLARE_ACCOUNT_ID`

## Güvenlik

`/health` dışındaki uç noktalar `x-ocx-key` ister.

R2 kontrollü işlemler ayrıca:

`x-ocx-mode: controlled`

başlığı ister. DNS create/update ve Worker route create işleminden sonra yanıt `verify_required: true` döndürür. `EXECUTION != SUCCESS`; caller sonucu ayrı doğrulamalıdır.

## Capability probe

1. `GET /health`
2. `GET /token/verify`
3. `GET /zones?name=oryvex.com.tr`
4. zone_id bulunduğunda `GET /zones/{zone_id}/dns`
5. `GET /zones/{zone_id}/routes`

Bu probe gerçek tokenın hangi okuma işlemlerini yapabildiğini güvenli biçimde ortaya çıkarır.

## Deploy

```bash
npm install
npm --workspace @oryvex/ocx-clo-connector run check
npm --workspace @oryvex/ocx-clo-connector run deploy
```

GitHub Actions deployment için repository secrets olarak `CLOUDFLARE_API_TOKEN` ve `CLOUDFLARE_ACCOUNT_ID` tanımlı olmalıdır. Worker runtime içindeki yönetim tokenı ayrıca Worker secret olarak tutulmalıdır.
