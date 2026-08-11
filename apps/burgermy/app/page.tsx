"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateOrder, money, selectionSummary, type Branch, type CartItem, type DeliveryType, type Product } from "@oryvex/shared";

type Screen = "login" | "verify" | "service" | "address" | "home" | "cart" | "checkout" | "success" | "track" | "orders" | "profile";

const fallbackProducts: Product[] = [
  { id: 1, name: "Classic Burger Menü", desc: "120 g dana köfte, cheddar, turşu, özel sos, patates ve içecek", price: 245, image: "/products/classic.webp", badge: "Çok Sevilen" },
  { id: 2, name: "Duble Burger Menü", desc: "Tek ekmekte iki dana köfte, çift cheddar, patates ve içecek", price: 315, image: "/products/double.webp", badge: "Doyuran Menü" },
  { id: 3, name: "Crispy Chicken Menü", desc: "Çıtır tavuk, taze marul, domates, özel sos, patates ve içecek", price: 225, image: "/products/chicken.webp" },
  { id: 4, name: "Çift Burger Menü", desc: "İki ayrı burger, büyük patates ve iki içecek", price: 465, image: "/products/twin.webp", badge: "Paylaşmalık" },
  { id: 5, name: "BBQ Burger Menü", desc: "Dana köfte, isli barbekü sos, çıtır soğan, cheddar ve içecek", price: 275, image: "/products/bbq.webp" },
  { id: 6, name: "Öğrenci Menü", desc: "Classic burger, patates ve içecek; tam porsiyon, net fiyat", price: 199, image: "/products/student.webp", badge: "Avantajlı" },
];

const fallbackBranches: Branch[] = [
  { id: "kadikoy", name: "Kadıköy Şubesi", slug: "kadikoy", address: "Rıhtım Cad., Kadıköy", district: "Kadıköy", deliveryFee: 29, prepMin: 20, prepMax: 35 },
  { id: "bostanci", name: "Bostancı Şubesi", slug: "bostanci", address: "Bağdat Cad., Bostancı", district: "Kadıköy", deliveryFee: 29, prepMin: 20, prepMax: 35 },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [delivery, setDelivery] = useState<DeliveryType>("Kurye");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [size, setSize] = useState<"Normal" | "Büyük">("Normal");
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraPatty, setExtraPatty] = useState(false);
  const [drink, setDrink] = useState("Kola");
  const [sauces, setSauces] = useState<string[]>(["BURGERMY Sos"]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [productQty, setProductQty] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [payment, setPayment] = useState("Online Kart");
  const [accepted, setAccepted] = useState(false);
  const [category, setCategory] = useState("Menüler");
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [branches, setBranches] = useState<Branch[]>(fallbackBranches);
  const [selectedBranchId, setSelectedBranchId] = useState(fallbackBranches[0].id);
  const [catalogLive, setCatalogLive] = useState(false);

  const selectedBranch = branches.find(branch => branch.id === selectedBranchId) ?? branches[0];

  const { subtotal, deliveryFee, discount, total } = useMemo(() => calculateOrder(cart, delivery), [cart, delivery]);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  function openProduct(product: Product) {
    setSelected(product);
    setSize("Normal"); setExtraCheese(false); setExtraPatty(false); setDrink("");
    setSauces(["BURGERMY Sos"]); setRemoved([]); setProductQty(1);
  }

  function addToCart() {
    if (!selected || !drink) return;
    const extras = (size === "Büyük" ? 35 : 0) + (extraCheese ? 25 : 0) + (extraPatty ? 65 : 0);
    setCart(items => [...items, { product: selected, qty: productQty, extras, selection: { size, drink, sauces, removed, extraCheese, extraPatty } }]);
    setSelected(null);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("burgermy-cart-v1");
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch { window.localStorage.removeItem("burgermy-cart-v1"); }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("burgermy-cart-v1", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Katalog yüklenemedi");
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data.products) && data.products.length) setProducts(data.products);
        if (Array.isArray(data.branches) && data.branches.length) {
          setBranches(data.branches);
          setSelectedBranchId(current => data.branches.some((branch: Branch) => branch.id === current) ? current : data.branches[0].id);
        }
        setCatalogLive(true);
      })
      .catch(error => {
        if (error.name !== "AbortError") setCatalogLive(false);
      });
    return () => controller.abort();
  }, []);

  function changeQty(index: number, delta: number) {
    setCart(items => items.map((item, i) => i === index ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
  }

  function go(next: Screen) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`app-shell ${["login", "verify", "service", "address"].includes(screen) ? "auth-mode" : ""}`}>
      <aside className={`side-nav ${["login", "verify", "service", "address"].includes(screen) ? "auth-hidden" : ""}`}>
        <Brand />
        <nav>
          <NavButton active={screen === "home"} icon="⌂" label="Ana Sayfa" onClick={() => go("home")} />
          <NavButton active={screen === "orders" || screen === "track"} icon="▤" label="Siparişlerim" onClick={() => go("orders")} />
          <NavButton active={screen === "profile"} icon="◎" label="Profil" onClick={() => go("profile")} />
        </nav>
        <div className="branch-mini"><span className="live-dot" /><div><b>{selectedBranch?.name ?? "BURGERMY"}</b><small>Açık · {selectedBranch?.prepMin ?? 20}-{selectedBranch?.prepMax ?? 35} dk</small></div></div>
      </aside>

      <header className={`mobile-header ${["login", "verify", "service", "address"].includes(screen) ? "auth-hidden" : ""}`}>
        <Brand />
        <button className="icon-btn" onClick={() => go("profile")} aria-label="Profil">◎</button>
      </header>

      <main className="main-canvas">
        {screen === "login" && <LoginScreen go={go} />}
        {screen === "verify" && <VerifyScreen go={go} />}
        {screen === "service" && <ServiceScreen delivery={delivery} setDelivery={setDelivery} go={go} />}
        {screen === "address" && <AddressScreen delivery={delivery} branches={branches} selectedBranchId={selectedBranchId} setSelectedBranchId={setSelectedBranchId} go={go} />}
        {screen === "home" && <HomeScreen products={products} selectedBranch={selectedBranch} catalogLive={catalogLive} delivery={delivery} setDelivery={setDelivery} category={category} setCategory={setCategory} openProduct={openProduct} go={go} />}
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

      <nav className={`bottom-nav ${["login", "verify", "service", "address", "success"].includes(screen) ? "auth-hidden" : ""}`}>
        <NavButton active={screen === "home"} icon="⌂" label="Ana Sayfa" onClick={() => go("home")} />
        <NavButton active={screen === "cart" || screen === "checkout"} icon="▱" label="Sepet" onClick={() => go("cart")} />
        <NavButton active={screen === "orders" || screen === "track"} icon="▤" label="Siparişler" onClick={() => go("orders")} />
        <NavButton active={screen === "profile"} icon="◎" label="Profil" onClick={() => go("profile")} />
      </nav>

      {selected && <ProductModal product={selected} size={size} setSize={setSize} drink={drink} setDrink={setDrink} sauces={sauces} setSauces={setSauces} removed={removed} setRemoved={setRemoved} productQty={productQty} setProductQty={setProductQty} extraCheese={extraCheese} setExtraCheese={setExtraCheese} extraPatty={extraPatty} setExtraPatty={setExtraPatty} close={() => setSelected(null)} add={addToCart} />}
    </div>
  );
}

function AuthShell({ step, title, copy, children }: { step: string; title: string; copy: string; children: React.ReactNode }) {
  return <section className="auth-page"><div className="auth-brand"><Brand /><span>PAKET FAST-FOOD</span></div><div className="auth-card"><span className="eyebrow">{step}</span><h1>{title}</h1><p>{copy}</p>{children}</div><small className="auth-foot">Sıcak hazırlanır · Güvenle paketlenir · Hızla ulaşır</small></section>;
}

function LoginScreen({ go }: { go: (v: Screen) => void }) {
  const [phone, setPhone] = useState("");
  const valid = phone.replace(/\D/g, "").length >= 10;
  return <AuthShell step="1 / 4 · GİRİŞ" title="Lezzete bir adım kaldı." copy="Sipariş durumunu paylaşabilmemiz için telefon numaranı doğrulayalım."><label className="auth-label">Telefon numarası<div className="phone-input"><b>+90</b><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5XX XXX XX XX" inputMode="tel" autoFocus /></div></label><button className="primary-btn wide" disabled={!valid} onClick={() => go("verify")}>Doğrulama Kodu Gönder <span>→</span></button><button className="text-btn wide" onClick={() => go("service")}>Misafir olarak devam et</button><p className="legal-note">Devam ederek kullanım koşullarını ve gizlilik bildirimini kabul etmiş olursun.</p></AuthShell>;
}

function VerifyScreen({ go }: { go: (v: Screen) => void }) {
  const [code, setCode] = useState("");
  return <AuthShell step="2 / 4 · DOĞRULAMA" title="Kod sende, burger bizde." copy="Telefonuna gelen 4 haneli kodu gir. Demo için herhangi dört rakam yeterli."><label className="auth-label">Doğrulama kodu<input className="otp-input" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="— — — —" inputMode="numeric" autoFocus /></label><button className="primary-btn wide" disabled={code.length !== 4} onClick={() => go("service")}>Doğrula ve Devam Et <span>→</span></button><button className="text-btn wide" onClick={() => go("login")}>← Telefon numarasını değiştir</button></AuthShell>;
}

function ServiceScreen({ delivery, setDelivery, go }: { delivery: DeliveryType; setDelivery: (v: DeliveryType) => void; go: (v: Screen) => void }) {
  return <AuthShell step="3 / 4 · SİPARİŞ TÜRÜ" title="Nasıl buluşalım?" copy="Sipariş yöntemini seç; süre ve uygun şube buna göre netleşsin."><div className="service-cards"><button className={delivery === "Kurye" ? "selected" : ""} onClick={() => setDelivery("Kurye")}><span>⌁</span><b>Kurye ile Teslimat</b><small>Adresine sıcak teslim · 35-45 dk</small></button><button className={delivery === "Gel-Al" ? "selected" : ""} onClick={() => setDelivery("Gel-Al")}><span>⌂</span><b>Gel-Al</b><small>Şubeden hızlı teslim · 20-25 dk</small></button></div><button className="primary-btn wide" onClick={() => go("address")}>Seçimle Devam Et <span>→</span></button></AuthShell>;
}

function AddressScreen({ delivery, branches, selectedBranchId, setSelectedBranchId, go }: { delivery: DeliveryType; branches: Branch[]; selectedBranchId: string; setSelectedBranchId: (id: string) => void; go: (v: Screen) => void }) {
  const [selectedAddress, setSelectedAddress] = useState(0);
  const options = delivery === "Kurye" ? ["Ev · Caferağa Mah., Kadıköy", "Yeni adres ekle"] : branches.map(branch => `BURGERMY ${branch.name.replace(" Şubesi", "")} · ${branch.address}`);
  const activeIndex = delivery === "Kurye" ? selectedAddress : Math.max(0, branches.findIndex(branch => branch.id === selectedBranchId));
  const choose = (index: number) => {
    if (delivery === "Kurye") setSelectedAddress(index);
    else if (branches[index]) setSelectedBranchId(branches[index].id);
  };
  return <AuthShell step="4 / 4 · KONUM" title={delivery === "Kurye" ? "Nereye getirelim?" : "Hangi şubeden alacaksın?"} copy={delivery === "Kurye" ? "Teslimat adresini seç veya yeni adresini ekle." : "Sana en uygun açık şubeyi seç."}><div className="address-options">{options.map((option, i) => <button key={option} className={activeIndex === i ? "selected" : ""} onClick={() => choose(i)}><span>{delivery === "Gel-Al" || i === 0 ? "⌂" : "+"}</span><b>{option}</b><i>{activeIndex === i ? "●" : ""}</i></button>)}</div>{delivery === "Kurye" && selectedAddress === 1 && <div className="new-address"><input placeholder="Mahalle ve sokak" /><div><input placeholder="Bina no" /><input placeholder="Daire" /></div><textarea placeholder="Adres tarifi (isteğe bağlı)" /></div>}<button className="primary-btn wide" onClick={() => go("home")}>Menüyü Aç <span>→</span></button><button className="text-btn wide" onClick={() => go("service")}>← Sipariş türüne dön</button></AuthShell>;
}

function Brand() { return <div className="brand" aria-label="BURGERMY"><span>BURGER</span><em>MY</em></div>; }

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><small>{label}</small></button>;
}

function HomeScreen({ products, selectedBranch, catalogLive, delivery, setDelivery, category, setCategory, openProduct, go }: { products: Product[]; selectedBranch?: Branch; catalogLive: boolean; delivery: "Kurye" | "Gel-Al"; setDelivery: (v: "Kurye" | "Gel-Al") => void; category: string; setCategory: (v: string) => void; openProduct: (p: Product) => void; go: (v: Screen) => void }) {
  const categories = ["Menüler", "Burgerler", "Çıtır Lezzetler", "İçecekler"];
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">PAKET FAST-FOOD · TAZE HAZIRLANIR{catalogLive ? " · CANLI MENÜ" : ""}</span>
        <h1>Canın burger istediyse,<br /><em>mesele kapanmıştır.</em></h1>
        <p>Gerçek dana köftesi, günlük hazırlanan malzemeler ve bol porsiyon. Siparişin sıcak, keyfin yerinde.</p>
        <button className="primary-btn" onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>Menüyü İncele <span>↓</span></button>
      </div>
      <div className="hero-art"><img src="/products/hero.webp" alt="BURGERMY Classic Burger menüsü" /><span className="hero-stamp">%100<br />DANA</span></div>
    </section>

    <section className="service-bar">
      <div className="service-switch">
        <button className={delivery === "Kurye" ? "selected" : ""} onClick={() => setDelivery("Kurye")}><span>⌁</span><b>Kurye ile Teslimat</b><small>35-45 dakika</small></button>
        <button className={delivery === "Gel-Al" ? "selected" : ""} onClick={() => setDelivery("Gel-Al")}><span>⌂</span><b>Gel-Al</b><small>20-25 dakika</small></button>
      </div>
      <div className="address"><span>●</span><div><small>{delivery === "Kurye" ? "Teslimat adresi" : "Seçilen şube"}</small><b>{delivery === "Kurye" ? "Ev · Caferağa, Kadıköy" : `BURGERMY ${selectedBranch?.name ?? "Şubesi"}`}</b></div><button onClick={() => go("address")}>Değiştir</button></div>
    </section>

    <section id="menu" className="menu-section">
      <div className="section-head"><div><span className="eyebrow">NE YİYORUZ?</span><h2>Menüyü keşfet</h2></div><p>Her ürün siparişinle birlikte hazırlanır. Fotoğrafta ne görüyorsan, pakette de o var.</p></div>
      <div className="categories">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {category === "Menüler" ? <div className="product-grid">{products.map(p => <article className="product-card" key={p.id} onClick={() => openProduct(p)}><div className="product-img"><img src={p.image} alt={p.name} />{p.badge && <span className="badge">{p.badge}</span>}</div><div className="product-info"><h3>{p.name}</h3><p>{p.desc}</p><div><strong>{money(p.price)}</strong><button aria-label={`${p.name} ekle`}>+</button></div></div></article>)}</div> : <div className="empty-category"><span>🍔</span><h3>{category} çok yakında</h3><p>V1 menüsünde en sevilen BURGERMY menüleri şu an siparişe açık.</p><button className="secondary-btn" onClick={() => setCategory("Menüler")}>Menülere Dön</button></div>}
    </section>
  </>;
}

function ProductModal({ product, size, setSize, drink, setDrink, sauces, setSauces, removed, setRemoved, productQty, setProductQty, extraCheese, setExtraCheese, extraPatty, setExtraPatty, close, add }: any) {
  const extra = (size === "Büyük" ? 35 : 0) + (extraCheese ? 25 : 0) + (extraPatty ? 65 : 0);
  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter(v => v !== value) : [...values, value]);
  return <div className="modal-backdrop" onMouseDown={close}><section className="product-modal" onMouseDown={e => e.stopPropagation()}>
    <button className="modal-close" onClick={close} aria-label="Kapat">×</button>
    <div className="modal-image"><img src={product.image} alt={product.name} /></div>
    <div className="modal-body"><span className="eyebrow">MENÜNÜ OLUŞTUR</span><h2>{product.name}</h2><p>{product.desc}</p>
      <Option title="Menü Boyutu" required>{["Normal", "Büyük"].map(v => <Choice key={v} label={v} price={v === "Büyük" ? "+₺35" : "Dahil"} selected={size === v} onClick={() => setSize(v)} />)}</Option>
      <Option title="İçecek" required><div className="chips">{["Kola", "Kola Zero", "Ayran", "Su"].map(v => <button key={v} className={drink === v ? "active" : ""} onClick={() => setDrink(v)}>{v}</button>)}</div>{!drink && <small className="required-note">Sepete eklemek için içecek seç.</small>}</Option>
      <Option title="Soslar · Birden fazla seçebilirsin"><div className="chips">{["BURGERMY Sos", "Ketçap", "Mayonez", "Acı Sos"].map(v => <button key={v} className={sauces.includes(v) ? "active" : ""} onClick={() => toggle(v, sauces, setSauces)}>{v}</button>)}</div></Option>
      <Option title="Ekstralar"><Choice label="Ekstra cheddar" price="+₺25" selected={extraCheese} onClick={() => setExtraCheese(!extraCheese)} /><Choice label="Ekstra dana köfte" price="+₺65" selected={extraPatty} onClick={() => setExtraPatty(!extraPatty)} /></Option>
      <Option title="Çıkarılacak Malzemeler"><div className="chips muted-chips">{["Turşu", "Soğan", "Domates", "Marul"].map(v => <button key={v} className={removed.includes(v) ? "active" : ""} onClick={() => toggle(v, removed, setRemoved)}>{v}</button>)}</div></Option>
      <div className="modal-order-row"><div className="qty"><button onClick={() => setProductQty(Math.max(1, productQty - 1))}>−</button><b>{productQty}</b><button onClick={() => setProductQty(productQty + 1)}>+</button></div><button className="primary-btn" disabled={!drink} onClick={add}><span>Sepete Ekle</span><b>{money((product.price + extra) * productQty)}</b></button></div>
    </div>
  </section></div>;
}

function Option({ title, required, children }: any) { return <div className="option-group"><div className="option-title"><b>{title}</b>{required && <small>Zorunlu</small>}</div>{children}</div>; }
function Choice({ label, price, selected, onClick }: any) { return <button className={`choice ${selected ? "selected" : ""}`} onClick={onClick}><span className="radio">{selected ? "●" : ""}</span><b>{label}</b><small>{price}</small></button>; }

function PageTop({ title, subtitle, back }: { title: string; subtitle?: string; back: () => void }) { return <div className="page-top"><button className="back-btn" onClick={back}>←</button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>; }

function CartScreen({ cart, subtotal, deliveryFee, discount, total, delivery, changeQty, go }: any) {
  return <section className="inner-page"><PageTop title="Sepetim" subtitle={`${cart.length} farklı ürün`} back={() => go("home")} />
    {!cart.length ? <div className="empty-state"><span>▱</span><h2>Sepetin henüz boş</h2><p>Bu sessizliği güzel bir burger bozabilir.</p><button className="primary-btn" onClick={() => go("home")}>Menüyü İncele</button></div> : <div className="checkout-layout"><div className="cart-list">{cart.map((item: CartItem, i: number) => <article className="cart-item" key={`${item.product.id}-${i}`}><img src={item.product.image} alt="" /><div className="cart-copy"><h3>{item.product.name}</h3><p>{selectionSummary(item)}</p><strong>{money((item.product.price + item.extras) * item.qty)}</strong></div><div className="qty"><button onClick={() => changeQty(i, -1)}>−</button><b>{item.qty}</b><button onClick={() => changeQty(i, 1)}>+</button></div></article>)}<button className="text-btn" onClick={() => go("home")}>+ Başka ürün ekle</button></div><Summary subtotal={subtotal} deliveryFee={deliveryFee} discount={discount} total={total}><div className="delivery-note"><span>⌁</span><div><small>{delivery}</small><b>{delivery === "Kurye" ? "35-45 dk içinde kapında" : "20-25 dk içinde hazır"}</b></div></div><button className="primary-btn wide" onClick={() => go("checkout")}>Siparişe Devam Et <span>→</span></button></Summary></div>}
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

function OrdersScreen({ go }: { go: (v: Screen) => void }) { return <section className="inner-page"><div className="page-top simple"><div><span className="eyebrow">LEZZET GEÇMİŞİ</span><h1>Siparişlerim</h1></div></div><div className="orders-tabs"><button className="active">Aktif Sipariş</button><button>Geçmiş</button></div><article className="order-card"><div className="order-head"><span><i className="live-dot" /> Hazırlanıyor</span><small>#BM260809 · Bugün 18:24</small></div><div className="order-body"><img src="/products/classic.webp" alt="Classic Burger Menü" /><div><h3>Classic Burger Menü</h3><p>1 ürün · Kurye ile teslimat</p><strong>₺274</strong></div><button className="primary-btn" onClick={() => go("track")}>Takip Et →</button></div></article><h2 className="minor-title">Son siparişler</h2><article className="order-card past"><div><b>#BM070826</b><small>7 Ağustos 2026</small></div><span>Çift Burger Menü</span><strong>₺465</strong><button>Tekrarla</button></article></section>; }

function ProfileScreen({ delivery, go }: any) { return <section className="inner-page"><div className="profile-head"><div className="avatar">ÖF</div><div><span className="eyebrow">BURGERMY MİSAFİRİ</span><h1>Hoş geldin!</h1><p>Bilgilerini ve sipariş tercihlerini buradan yönetebilirsin.</p></div></div><div className="profile-grid"><section className="form-card"><h2>Adreslerim</h2><div className="selected-address"><span>⌂</span><div><small>Varsayılan</small><b>Ev · Caferağa Mah., Kadıköy</b></div><button>Düzenle</button></div><button className="secondary-btn wide">+ Yeni Adres Ekle</button></section><section className="form-card"><h2>Tercihler</h2><div className="settings-row"><span>Varsayılan sipariş türü</span><b>{delivery}</b></div><div className="settings-row"><span>Kampanya bildirimleri</span><b>Açık</b></div><div className="settings-row"><span>Yardım ve destek</span><b>→</b></div></section></div><button className="text-btn" onClick={() => go("home")}>Misafir olarak alışverişe devam et</button></section>; }
