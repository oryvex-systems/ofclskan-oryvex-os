# ŞANTİYE OS — GERÇEK SAHA ÇEKİRDEĞİ (v1)

Bu aşamada hedef: şartname + pursantaj + iş programı + saha gerçekleşmesi + hakediş + finans aynı veri zincirinde çalışsın. Gereksiz modül geliştirmesi bu çekirdek tamamlanana kadar bekler.

## Tek gerçek veri zinciri

1. Proje / sözleşme
2. Şartname ve dokümanlar
3. Pursantaj / bütçe kalemleri
4. İş paketleri ve 12 aylık plan
5. Günlük / mahal bazlı gerçek saha miktarı
6. Onaylı gerçekleşme yüzdesi
7. Hakediş
8. Tahsilat / finans
9. Plan-gerçek sapması

## Hesap kuralları

- Proje pursantajı = kalem tutarı / sözleşme-referans bedeli.
- Fiziki ilerleme, serbest elle girilen genel yüzde yerine mümkün olduğunda gerçek miktardan hesaplanır: kümülatif gerçekleşen miktar / toplam miktar.
- Proje gerçekleşmesi = kalem pursantajı × kalem gerçekleşme oranlarının toplamı.
- Hakedişe esas tutar = onaylı gerçekleşme × ilgili kalem tutarı; önceki hakediş düşülür.
- Finans ekranı planlanan hakediş, gerçekleşen hakediş, tahsilat ve nakit farkını ayrı gösterir.
- Plan yüzdesi ile gerçek yüzde aynı tarih ekseninde karşılaştırılır.
- %100 üzeri gerçekleşme, toplam miktarı aşan günlük giriş, negatif miktar ve mükerrer kayıt uyarı üretir.
- Şartname/proje/mahal referansı ilgili iş paketine bağlanır; saha kaydı hangi kalemin hangi şartname maddesine göre yapıldığını gösterebilir.
- Manuel yüzde yalnız istisna olarak kullanılır ve not/onay gerektirir.

## Taşpazar pilotu

Taşpazar Camii için hazırlanmış 175.000.000 TL referanslı pursantaj, 12 aylık imalat programı ve hakediş-finans cetveli daha sonra pilot proje verisi olarak içeri alınacak. Bu aşamada canlı veritabanına proje verisi basılmaz.

## Öncelikli ekranlar

- Proje özeti: bütçe, plan %, gerçek %, hakediş, tahsilat, sapma.
- Pursantaj / iş kalemleri: miktar, birim fiyat, tutar, pursantaj, plan başlangıç-bitiş.
- Saha ilerleme: tarih + mahal + iş kalemi + günlük miktar + foto/not.
- Hakediş: önceki, bu dönem, kümülatif, onay durumu.
- Finans: hakediş / tahsilat / nakit ihtiyacı.
- Plan-gerçek: aylık ve kümülatif S-eğrisi.

## Şimdilik ikinci planda

CRM, geniş AI özellikleri, ayrıntılı ekipman bakım, dekoratif dashboard, bağımsız teklif senaryoları ve çekirdek saha-hakediş zincirini etkilemeyen diğer modüller.
