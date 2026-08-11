"use client";

import { useMemo, useState } from "react";

type Screen = "home" | "cart" | "checkout" | "success" | "track" | "orders" | "profile";
type Product = { id: number; name: string; desc: string; price: number; image: string; badge?: string };

const products: Product[] = [
  { id: 1, name: "Classic Burger Menü", desc: "120 g dana köfte, cheddar, turşu, özel sos, patates ve içecek", price: 245, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/classic.png", badge: "Çok Sevilen" },
  { id: 2, name: "Duble Burger Menü", desc: "Tek ekmekte iki dana köfte, çift cheddar, patates ve içecek", price: 315, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/double.png", badge: "Doyuran Menü" },
  { id: 3, name: "Crispy Chicken Menü", desc: "Çıtır tavuk, taze marul, domates, özel sos, patates ve içecek", price: 225, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/chicken.png" },
  { id: 4, name: "Çift Burger Menü", desc: "İki ayrı burger, büyük patates ve iki içecek", price: 465, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/twin.png", badge: "Paylaşmalık" },
  { id: 5, name: "BBQ Burger Menü", desc: "Dana köfte, isli barbekü sos, çıtır soğan, cheddar ve içecek", price: 275, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/bbq.png" },
  { id: 6, name: "Öğrenci Menü", desc: "Classic burger, patates ve içecek; tam porsiyon, net fiyat", price: 199, image: "https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/student.png", badge: "Avantajlı" },
];

const money = (n: number) => `₺${n.toLocaleString("tr-TR")}`;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [delivery, setDelivery] = useState<"Kurye" | "Gel-Al">("Kurye");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<{ product: Product; qty: number; extras: number }[]>([]);
  const [size, setSize] = useState<"Normal" | "Büyük">("Normal");
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraPatty, setExtraPatty] = useState(false);
  const [drink, setDrink] = useState("Kola");
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [payment, setPayment] = useState("Online Kart");
  const [accepted, setAccepted] = useState(false);
  const [category, setCategory] = useState("Menüler");

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price + item.extras) * item.qty, 0), [cart]);
  const deliveryFee = delivery === "Kurye" && cart.length ? 29 : 0;
  const discount = subtotal >= 450 ? 50 : 0;
  const total = subtotal + deliveryFee - discount;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  function openProduct(product: Product) {
    setSelected(product);
    setSize("Normal"); setExtraCheese(false); setExtraPatty(false); setDrink("Kola");
  }

  function addToCart() {
    if (!selected) return;
    const extras = (size === "Büyük" ? 35 : 0) + (extraCheese ? 25 : 0) + (extraPatty ? 65 : 0);
    setCart(items => [...items, { product: selected, qty: 1, extras }]);
    setSelected(null);
  }

  function changeQty(index: number, delta: number) {
    setCart(items => items.map((item, i) => i === index ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
  }

  function go(next: Screen) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <Brand />
        <nav>
          <NavButton active={screen === "home"} icon="⌂" label="Ana Sayfa" onClick={() => go("home")} />
          <NavButton active={screen === "orders" || screen === "track"} icon="▤" label="Siparişlerim" onClick={() => go("orders")} />
          <NavButton active={screen === "profile"} icon="◎" label="Profil" onClick={() => go("profile")} />
        </nav>
        <div className="branch-mini"><span className="live-dot" /><div><b>Kadıköy Şubesi</b><small>Açık · 35-45 dk</small></div></div>
      </aside>

      <header className="mobile-header">
        <Brand />
        <button className="icon-btn" onClick={() => go("profile")} aria-label="Profil">◎</button>
      </header>

      <main className="main-canvas">
        {screen === "home" && <HomeScreen delivery={delivery} setDelivery={setDelivery} category={category} setCategory={setCategory} openProduct={openProduct} go={go} />}
        {screen === "cart" && <CartScreen cart={cart} subtotal={subtotal} deliveryFee={deliveryFee} discount={discount} total={total} delivery={delivery} changeQty={changeQty} go={go} />}
        {screen === "checkout" && <CheckoutScreen step={checkoutStep} setStep={setCheckoutStep} delivery={delivery} payment={payment} setPayment={setPayment} total={total} accepted={accepted} setAccepted={setAccepted} go={go} />}
        {screen === "success" && <SuccessScreen total={total} delivery={delivery} go={go} />}
        {screen === "track" && <TrackScreen total={total || 274} delivery={delivery} go={go} />}
        {screen === "orders" && <OrdersScreen go={go} />}
        {screen === "profile" && <ProfileScreen delivery={delivery} go={go} />}
      </main>

      {screen === "home" && count > 0 && (
        <button className="floating-cart" onClick={() => go("cart")}><span className="cart-count">{count}</span><b>Sepeti Gör</b><span>{money(total)}</span></button>
      )}

      <nav className="bottom-nav">
        <NavButton active={screen === "home"} icon="⌂" label="Ana Sayfa" onClick={() => go("home")} />
        <NavButton active={screen === "cart" || screen === "checkout"} icon="▱" label="Sepet" onClick={() => go("cart")} />
        <NavButton active={screen === "orders" || screen === "track"} icon="▤" label="Siparişler" onClick={() => go("orders")} />
        <NavButton active={screen === "profile"} icon="◎" label="Profil" onClick={() => go("profile")} />
      </nav>

      {selected && <ProductModal product={selected} size={size} setSize={setSize} drink={drink} setDrink={setDrink} extraCheese={extraCheese} setExtraCheese={setExtraCheese} extraPatty={extraPatty} setExtraPatty={setExtraPatty} close={() => setSelected(null)} add={addToCart} />}
    </div>
  );
}

function Brand() { return <div className="brand" aria-label="BURGERMY"><span>BURGER</span><em>MY</em></div>; }

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><small>{label}</small></button>;
}

function HomeScreen({ delivery, setDelivery, category, setCategory, openProduct, go }: { delivery: "Kurye" | "Gel-Al"; setDelivery: (v: "Kurye" | "Gel-Al") => void; category: string; setCategory: (v: string) => void; openProduct: (p: Product) => void; go: (v: Screen) => void }) {
  const categories = ["Menüler", "Burgerler", "Çıtır Lezzetler", "İçecekler"];
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">PAKET FAST-FOOD · TAZE HAZIRLANIR</span>
        <h1>Canın burger istediyse,<br /><em>mesele kapanmıştır.</em></h1>
        <p>Gerçek dana köftesi, günlük hazırlanan malzemeler ve bol porsiyon. Siparişin sıcak, keyfin yerinde.</p>
        <button className="primary-btn" onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>Menüyü İncele <span>↓</span></button>
      </div>
      <div className="hero-art"><img src="https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/hero.png" alt="BURGERMY Classic Burger menüsü" /><span className="hero-stamp">%100<br />DANA</span></div>
    </section>

    <section className="service-bar">
      <div className="service-switch">
        <button className={delivery === "Kurye" ? "selected" : ""} onClick={() => setDelivery("Kurye")}><span>⌁</span><b>Kurye ile Teslimat</b><small>35-45 dakika</small></button>
        <button className={delivery === "Gel-Al" ? "selected" : ""} onClick={() => setDelivery("Gel-Al")}><span>⌂</span><b>Gel-Al</b><small>20-25 dakika</small></button>
      </div>
      <div className="address"><span>●</span><div><small>{delivery === "Kurye" ? "Teslimat adresi" : "Seçilen şube"}</small><b>{delivery === "Kurye" ? "Ev · Caferağa, Kadıköy" : "BURGERMY Kadıköy"}</b></div><button onClick={() => go("profile")}>Değiştir</button></div>
    </section>

    <section id="menu" className="menu-section">
      <div className="section-head"><div><span className="eyebrow">NE YİYORUZ?</span><h2>Menüyü keşfet</h2></div><p>Her ürün siparişinle birlikte hazırlanır. Fotoğrafta ne görüyorsan, pakette de o var.</p></div>
      <div className="categories">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {category === "Menüler" ? <div className="product-grid">{products.map(p => <article className="product-card" key={p.id} onClick={() => openProduct(p)}><div className="product-img"><img src={p.image} alt={p.name} />{p.badge && <span className="badge">{p.badge}</span>}</div><div className="product-info"><h3>{p.name}</h3><p>{p.desc}</p><div><strong>{money(p.price)}</strong><button aria-label={`${p.name} ekle`}>+</button></div></div></article>)}</div> : <div className="empty-category"><span>🍔</span><h3>{category} çok yakında</h3><p>V1 menüsünde en sevilen BURGERMY menüleri şu an siparişe açık.</p><button className="secondary-btn" onClick={() => setCategory("Menüler")}>Menülere Dön</button></div>}
    </section>
  </>;
}

function ProductModal({ product, size, setSize, drink, setDrink, extraCheese, setExtraCheese, extraPatty, setExtraPatty, close, add }: any) {
  const extra = (size === "Büyük" ? 35 : 0) + (extraCheese ? 25 : 0) + (extraPatty ? 65 : 0);
  return <div className="modal-backdrop" onMouseDown={close}><section className="product-modal" onMouseDown={e => e.stopPropagation()}>
    <button className="modal-close" onClick={close} aria-label="Kapat">×</button>
    <div className="modal-image"><img src={product.image} alt={product.name} /></div>
    <div className="modal-body"><span className="eyebrow">MENÜNÜ OLUŞTUR</span><h2>{product.name}</h2><p>{product.desc}</p>
      <Option title="Menü Boyutu" required>{["Normal", "Büyük"].map(v => <Choice key={v} label={v} price={v === "Büyük" ? "+₺35" : "Dahil"} selected={size === v} onClick={() => setSize(v)} />)}</Option>
      <Option title="İçecek" required><div className="chips">{["Kola", "Kola Zero", "Ayran"].map(v => <button key={v} className={drink === v ? "active" : ""} onClick={() => setDrink(v)}>{v}</button>)}</div></Option>
      <Option title="Ekstralar"><Choice label="Ekstra cheddar" price="+₺25" selected={extraCheese} onClick={() => setExtraCheese(!extraCheese)} /><Choice label="Ekstra dana köfte" price="+₺65" selected={extraPatty} onClick={() => setExtraPatty(!extraPatty)} /></Option>
      <button className="primary-btn wide" onClick={add}><span>Sepete Ekle</span><b>{money(product.price + extra)}</b></button>
    </div>
  </section></div>;
}

function Option({ title, required, children }: any) { return <div className="option-group"><div className="option-title"><b>{title}</b>{required && <small>Zorunlu</small>}</div>{children}</div>; }
function Choice({ label, price, selected, onClick }: any) { return <button className={`choice ${selected ? "selected" : ""}`} onClick={onClick}><span className="radio">{selected ? "●" : ""}</span><b>{label}</b><small>{price}</small></button>; }

function PageTop({ title, subtitle, back }: { title: string; subtitle?: string; back: () => void }) { return <div className="page-top"><button className="back-btn" onClick={back}>←</button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>; }

function CartScreen({ cart, subtotal, deliveryFee, discount, total, delivery, changeQty, go }: any) {
  return <section className="inner-page"><PageTop title="Sepetim" subtitle={`${cart.length} farklı ürün`} back={() => go("home")} />
    {!cart.length ? <div className="empty-state"><span>▱</span><h2>Sepetin henüz boş</h2><p>Bu sessizliği güzel bir burger bozabilir.</p><button className="primary-btn" onClick={() => go("home")}>Menüyü İncele</button></div> : <div className="checkout-layout"><div className="cart-list">{cart.map((item: any, i: number) => <article className="cart-item" key={`${item.product.id}-${i}`}><img src={item.product.image} alt="" /><div className="cart-copy"><h3>{item.product.name}</h3><p>Orta boy · Kola · Özel sos</p><strong>{money(item.product.price + item.extras)}</strong></div><div className="qty"><button onClick={() => changeQty(i, -1)}>−</button><b>{item.qty}</b><button onClick={() => changeQty(i, 1)}>+</button></div></article>)}<button className="text-btn" onClick={() => go("home")}>+ Başka ürün ekle</button></div><Summary subtotal={subtotal} deliveryFee={deliveryFee} discount={discount} total={total}><div className="delivery-note"><span>⌁</span><div><small>{delivery}</small><b>{delivery === "Kurye" ? "35-45 dk içinde kapında" : "20-25 dk içinde hazır"}</b></div></div><button className="primary-btn wide" onClick={() => { setTimeout(() => {}, 0); go("checkout"); }}>Siparişe Devam Et <span>→</span></button></Summary></div>}
  </section>;
}

function Summary({ subtotal, deliveryFee, discount, total, children }: any) { return <aside className="summary-card"><h3>Sipariş Özeti</h3><div className="summary-row"><span>Ara toplam</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Teslimat</span><b>{deliveryFee ? money(deliveryFee) : "Ücretsiz"}</b></div>{discount > 0 && <div className="summary-row discount"><span>Menü indirimi</span><b>−{money(discount)}</b></div>}<div className="summary-total"><span>Toplam</span><b>{money(total)}</b></div>{children}</aside>; }

function CheckoutScreen({ step, setStep, delivery, payment, setPayment, total, accepted, setAccepted, go }: any) {
  return <section className="inner-page"><PageTop title="Siparişi Tamamla" subtitle={`Adım ${step}/2`} back={() => step === 2 ? setStep(1) : go("cart")} />
    <div className="stepper"><i className="done" /><span className={step === 1 ? "active" : "done"}>Teslimat</span><i className={step === 2 ? "done" : ""} /><span className={step === 2 ? "active" : ""}>Ödeme</span></div>
    {step === 1 ? <div className="form-card"><h2>Teslimat bilgileri</h2><div className="selected-address"><span>●</span><div><small>{delivery === "Kurye" ? "Teslimat adresi" : "Gel-Al şubesi"}</small><b>{delivery === "Kurye" ? "Ev · Caferağa Mah., Kadıköy / İstanbul" : "BURGERMY Kadıköy · Rıhtım Cad."}</b></div><button>Değiştir</button></div><label>İletişim telefonu<input defaultValue="+90 5•• ••• •• 42" /></label><label>Sipariş notu<textarea placeholder="Örn. Zili çalmayın, kapıya bırakın." /></label><div className="toggle-row"><span><b>Kapıya bırak</b><small>Kurye siparişi kapıda teslim eder</small></span><button className="toggle"><i /></button></div><button className="primary-btn wide" onClick={() => setStep(2)}>Ödemeye Geç <span>→</span></button></div> : <div className="checkout-layout"><div className="form-card"><h2>Ödeme yöntemi</h2>{["Online Kart", "Kapıda Kart", "Kapıda Nakit"].map(v => <Choice key={v} label={v} price={v === "Online Kart" ? "Güvenli ödeme" : ""} selected={payment === v} onClick={() => setPayment(v)} />)}{payment === "Online Kart" && <div className="card-fields"><label>Kart numarası<input placeholder="0000 0000 0000 0000" inputMode="numeric" /></label><div><label>Son kullanma<input placeholder="AA/YY" /></label><label>CVV<input placeholder="•••" type="password" /></label></div></div>}<label className="consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okudum, onaylıyorum.</span></label><button className="primary-btn wide" disabled={!accepted} onClick={() => go("success")}>Siparişi Onayla — {money(total)}</button></div><aside className="summary-card compact"><h3>Son Kontrol</h3><div className="delivery-note"><span>⌁</span><div><small>{delivery}</small><b>{delivery === "Kurye" ? "Caferağa, Kadıköy" : "Kadıköy Şubesi"}</b></div></div><div className="summary-total"><span>Ödenecek</span><b>{money(total)}</b></div></aside></div>}
  </section>;
}

function SuccessScreen({ total, delivery, go }: any) { return <section className="success-page"><div className="success-check">✓</div><span className="eyebrow">SİPARİŞ NO · #BM260809</span><h1>Siparişin alındı!</h1><p>Mutfağımız çalışmaya başladı. Bundan sonrası sıcak, çıtır ve hızlı.</p><div className="success-card"><div><small>Tahmini {delivery === "Kurye" ? "teslimat" : "hazırlanma"}</small><strong>{delivery === "Kurye" ? "35-45 dk" : "20-25 dk"}</strong></div><div><small>Toplam</small><strong>{money(total)}</strong></div></div><button className="primary-btn wide" onClick={() => go("track")}>Siparişimi Takip Et <span>→</span></button><button className="secondary-btn wide" onClick={() => go("home")}>Ana Sayfaya Dön</button></section>; }

function TrackScreen({ total, delivery, go }: any) { const stages = ["Sipariş alındı", "Hazırlanıyor", delivery === "Kurye" ? "Kuryeye verildi" : "Teslime hazır", "Teslim edildi"]; return <section className="inner-page"><PageTop title="Sipariş Detayı" subtitle="#BM260809 · Bugün, 18:24" back={() => go("orders")} /><div className="track-layout"><div className="track-card"><div className="eta"><span>◷</span><div><small>Tahmini {delivery === "Kurye" ? "teslimat" : "hazırlanma"}</small><strong>{delivery === "Kurye" ? "35-45 dk" : "20-25 dk"}</strong></div></div><h2>Sipariş durumu</h2><div className="timeline">{stages.map((s, i) => <div key={s} className={i < 2 ? "complete" : "future"}><i>{i === 0 ? "✓" : i === 1 ? "●" : ""}</i><span><b>{s}</b><small>{i === 0 ? "Restoran siparişini onayladı · 18:25" : i === 1 ? "Şeflerimiz siparişini hazırlıyor" : i === 2 ? "Sıradaki aşama" : "Afiyet olsun!"}</small></span></div>)}</div></div><aside className="summary-card"><h3>Sipariş Özeti</h3><div className="summary-row"><span>Classic Burger Menü</span><b>1 × ₺245</b></div><div className="summary-row"><span>Teslimat</span><b>₺29</b></div><div className="summary-total"><span>Toplam</span><b>{money(total)}</b></div><button className="secondary-btn wide">Şubeyi Ara</button><button className="text-btn">Destek Al</button></aside></div></section>; }

function OrdersScreen({ go }: { go: (v: Screen) => void }) { return <section className="inner-page"><div className="page-top simple"><div><span className="eyebrow">LEZZET GEÇMİŞİ</span><h1>Siparişlerim</h1></div></div><div className="orders-tabs"><button className="active">Aktif Sipariş</button><button>Geçmiş</button></div><article className="order-card"><div className="order-head"><span><i className="live-dot" /> Hazırlanıyor</span><small>#BM260809 · Bugün 18:24</small></div><div className="order-body"><img src="https://burgermy-v1.ofrkcaliskan.chatgpt.site/products/classic.png" alt="Classic Burger Menü" /><div><h3>Classic Burger Menü</h3><p>1 ürün · Kurye ile teslimat</p><strong>₺274</strong></div><button className="primary-btn" onClick={() => go("track")}>Takip Et →</button></div></article><h2 className="minor-title">Son siparişler</h2><article className="order-card past"><div><b>#BM070826</b><small>7 Ağustos 2026</small></div><span>Çift Burger Menü</span><strong>₺465</strong><button>Tekrarla</button></article></section>; }

function ProfileScreen({ delivery, go }: any) { return <section className="inner-page"><div className="profile-head"><div className="avatar">ÖF</div><div><span className="eyebrow">BURGERMY MİSAFİRİ</span><h1>Hoş geldin!</h1><p>Bilgilerini ve sipariş tercihlerini buradan yönetebilirsin.</p></div></div><div className="profile-grid"><section className="form-card"><h2>Adreslerim</h2><div className="selected-address"><span>⌂</span><div><small>Varsayılan</small><b>Ev · Caferağa Mah., Kadıköy</b></div><button>Düzenle</button></div><button className="secondary-btn wide">+ Yeni Adres Ekle</button></section><section className="form-card"><h2>Tercihler</h2><div className="settings-row"><span>Varsayılan sipariş türü</span><b>{delivery}</b></div><div className="settings-row"><span>Kampanya bildirimleri</span><b>Açık</b></div><div className="settings-row"><span>Yardım ve destek</span><b>→</b></div></section></div><button className="text-btn" onClick={() => go("home")}>Misafir olarak alışverişe devam et</button></section>; }
