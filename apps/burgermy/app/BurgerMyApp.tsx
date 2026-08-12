"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; desc: string; price: number; image: string; badge?: string };
type Branch = { id: string; name: string; slug: string; address: string; district: string; deliveryFee: number; minimumOrder: number; supportsDelivery: boolean; supportsPickup: boolean; prepMin: number; prepMax: number };
type Operations = { deliveryEnabled: boolean; pickupEnabled: boolean; onlineCardEnabled: boolean; doorPosEnabled: boolean; cashEnabled: boolean; minimumOrder: number; freeDeliveryThreshold: number | null };
type CartItem = { product: Product; qty: number; options: { size: string; drink: string; extraCheese: boolean; extraPatty: boolean }; extra: number };
type Order = { id: string; order_no: string; status: string; payment_status: string; payment_method: string | null; total_amount: number | string; fulfillment_type: string; estimated_min: number | null; estimated_max: number | null; created_at: string };
type Screen = "login" | "service" | "address" | "home" | "cart" | "checkout" | "success" | "orders" | "profile";

const fallbackProducts: Product[] = [
  { id: "demo-classic", name: "Classic Burger Menü", desc: "120 g dana köfte, cheddar, turşu, özel sos, patates ve içecek", price: 245, image: "/products/classic.webp", badge: "Çok Sevilen" },
  { id: "demo-double", name: "Duble Burger Menü", desc: "İki dana köfte, çift cheddar, patates ve içecek", price: 315, image: "/products/double.webp" },
];

const defaultOps: Operations = { deliveryEnabled: true, pickupEnabled: true, onlineCardEnabled: true, doorPosEnabled: false, cashEnabled: true, minimumOrder: 150, freeDeliveryThreshold: null };
const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export default function BurgerMyApp() {
  const [screen, setScreen] = useState<Screen>("login");
  const [userEmail, setUserEmail] = useState("");
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operations, setOperations] = useState<Operations>(defaultOps);
  const [branchId, setBranchId] = useState("");
  const [delivery, setDelivery] = useState<"Kurye" | "Gel-Al">("Kurye");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("Normal");
  const [drink, setDrink] = useState("Kola");
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraPatty, setExtraPatty] = useState(false);
  const [payment, setPayment] = useState<"paytr" | "door_pos" | "cash">("cash");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastOrder, setLastOrder] = useState<{ id: string; no: string; total: number } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const selectedBranch = branches.find(b => b.id === branchId) ?? branches[0];
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price + item.extra) * item.qty, 0), [cart]);
  const deliveryFee = delivery === "Kurye" ? Number(selectedBranch?.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  useEffect(() => {
    const saved = localStorage.getItem("burgermy-cart-v2");
    if (saved) try { setCart(JSON.parse(saved)); } catch {}
    Promise.all([
      fetch("/api/catalog", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()),
    ]).then(([catalog, session]) => {
      if (Array.isArray(catalog.products) && catalog.products.length) setProducts(catalog.products);
      if (Array.isArray(catalog.branches) && catalog.branches.length) { setBranches(catalog.branches); setBranchId(catalog.branches[0].id); }
      if (catalog.operations) {
        setOperations(catalog.operations);
        if (catalog.operations.cashEnabled) setPayment("cash");
        else if (catalog.operations.onlineCardEnabled) setPayment("paytr");
        else if (catalog.operations.doorPosEnabled) setPayment("door_pos");
      }
      if (session.authenticated) { setUserEmail(session.email || ""); setScreen("home"); }
    }).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") { setScreen("success"); refreshOrders(); }
    if (params.get("payment") === "fail") { setError("Ödeme tamamlanamadı. Kart bilgilerini kontrol edip yeniden deneyin."); setScreen("checkout"); }

    if (window.location.hash.includes("access_token=")) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const expiresIn = Number(hash.get("expires_in") || 3600);
      if (accessToken) fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken, expiresIn }) })
        .then(r => r.json()).then(data => { if (data.ok) { history.replaceState(null, "", "/"); setUserEmail(data.email || ""); setScreen("home"); } });
    }
  }, []);

  useEffect(() => { localStorage.setItem("burgermy-cart-v2", JSON.stringify(cart)); }, [cart]);

  async function refreshOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.orders)) {
      setOrders(data.orders);
      if (data.orders[0]) setLastOrder({ id: data.orders[0].id, no: data.orders[0].order_no, total: Number(data.orders[0].total_amount) });
    }
  }

  function go(next: Screen) { setError(""); setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function addSelected() {
    if (!selected) return;
    const extra = (size === "Büyük" ? 35 : 0) + (extraCheese ? 25 : 0) + (extraPatty ? 65 : 0);
    setCart(items => [...items, { product: selected, qty: 1, extra, options: { size, drink, extraCheese, extraPatty } }]);
    setSelected(null); setSize("Normal"); setDrink("Kola"); setExtraCheese(false); setExtraPatty(false);
  }

  async function placeOrder() {
    if (!accepted || !selectedBranch || !cart.length) return;
    if (!phone.replace(/\D/g, "").match(/5\d{9}$/)) { setError("Sipariş için geçerli bir cep telefonu girin."); return; }
    if (delivery === "Kurye" && !address.trim()) { setError("Teslimat adresini girin."); return; }
    setBusy(true); setError("");
    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranch.id,
          fulfillmentType: delivery === "Gel-Al" ? "pickup" : "delivery",
          paymentMethod: payment,
          customerNote: note,
          items: cart.map(item => ({ productId: item.product.id, quantity: item.qty, selectedOptions: item.options })),
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || "Sipariş oluşturulamadı.");
      setLastOrder({ id: order.orderId, no: order.orderNo, total: Number(order.total) });
      if (payment === "door_pos" || payment === "cash") { setCart([]); go("success"); return; }
      const payResponse = await fetch("/api/payments/paytr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, userAddress: delivery === "Gel-Al" ? selectedBranch.address : address, userPhone: phone }),
      });
      const pay = await payResponse.json();
      if (!payResponse.ok || !pay.iframeUrl) throw new Error(pay.error || "Ödeme ekranı açılamadı.");
      window.location.href = pay.iframeUrl;
    } catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/auth/session", { method: "DELETE" }); setUserEmail(""); setOrders([]); go("login"); }

  const authMode = ["login", "service", "address"].includes(screen);
  return <div className={`app-shell ${authMode ? "auth-mode" : ""}`}>
    {!authMode && <aside className="side-nav"><Brand /><nav><Nav active={screen === "home"} label="Ana Sayfa" onClick={() => go("home")} /><Nav active={screen === "orders"} label="Siparişlerim" onClick={() => { refreshOrders(); go("orders"); }} /><Nav active={screen === "profile"} label="Profil" onClick={() => go("profile")} /></nav></aside>}
    <main className="main-canvas">
      {screen === "login" && <Login onDone={email => { setUserEmail(email); go("service"); }} />}
      {screen === "service" && <AuthShell step="2 / 3 · SİPARİŞ TÜRÜ" title="Nasıl buluşalım?" copy="Açık olan sipariş yöntemlerinden birini seç."><div className="service-cards">{operations.deliveryEnabled && <button className={delivery === "Kurye" ? "selected" : ""} onClick={() => setDelivery("Kurye")}><b>Kurye ile Teslimat</b><small>Adresine sıcak teslim</small></button>}{operations.pickupEnabled && <button className={delivery === "Gel-Al" ? "selected" : ""} onClick={() => setDelivery("Gel-Al")}><b>Gel-Al</b><small>Şubeden hızlı teslim</small></button>}</div><button className="primary-btn wide" onClick={() => go("address")}>Devam Et →</button></AuthShell>}
      {screen === "address" && <AuthShell step="3 / 3 · KONUM" title={delivery === "Kurye" ? "Nereye getirelim?" : "Hangi şubeden alacaksın?"} copy="Siparişin için şubeyi ve teslimat bilgisini netleştirelim."><div className="address-options">{branches.filter(b => delivery === "Kurye" ? b.supportsDelivery : b.supportsPickup).map(b => <button key={b.id} className={branchId === b.id ? "selected" : ""} onClick={() => setBranchId(b.id)}><b>{b.name}</b><small>{b.address}</small></button>)}</div>{delivery === "Kurye" && <label className="auth-label">Teslimat adresi<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Mahalle, sokak, bina, daire ve adres tarifi" /></label>}<button className="primary-btn wide" disabled={!branchId || (delivery === "Kurye" && !address.trim())} onClick={() => go("home")}>Menüyü Aç →</button></AuthShell>}
      {screen === "home" && <><section className="hero"><div className="hero-copy"><span className="eyebrow">BURGERMY · PAKET FAST-FOOD</span><h1>Canın burger istediyse,<br /><em>mesele kapanmıştır.</em></h1><p>{selectedBranch ? `${selectedBranch.name} · ${selectedBranch.prepMin}-${selectedBranch.prepMax} dk` : "Taze hazırlanır, sıcak teslim edilir."}</p></div><div className="hero-art"><img src="/products/hero.webp" alt="BURGERMY burger" /></div></section><section id="menu" className="menu-section"><div className="section-head"><div><span className="eyebrow">MENÜ</span><h2>Ne yiyoruz?</h2></div></div><div className="product-grid">{products.map(p => <article className="product-card" key={p.id} onClick={() => setSelected(p)}><div className="product-img"><img src={p.image} alt={p.name} />{p.badge && <span className="badge">{p.badge}</span>}</div><div className="product-info"><h3>{p.name}</h3><p>{p.desc}</p><div><strong>{money(p.price)}</strong><button>+</button></div></div></article>)}</div></section></>}
      {screen === "cart" && <section className="inner-page"><PageTop title="Sepetim" back={() => go("home")} />{!cart.length ? <div className="empty-state"><h2>Sepetin boş</h2><button className="primary-btn" onClick={() => go("home")}>Menüye Dön</button></div> : <div className="checkout-layout"><div className="cart-list">{cart.map((item, i) => <article className="cart-item" key={`${item.product.id}-${i}`}><img src={item.product.image} alt="" /><div className="cart-copy"><h3>{item.product.name}</h3><p>{item.options.size} · {item.options.drink}</p><strong>{money((item.product.price + item.extra) * item.qty)}</strong></div><div className="qty"><button onClick={() => setCart(x => x.map((v, n) => n === i ? { ...v, qty: Math.max(0, v.qty - 1) } : v).filter(v => v.qty))}>−</button><b>{item.qty}</b><button onClick={() => setCart(x => x.map((v, n) => n === i ? { ...v, qty: v.qty + 1 } : v))}>+</button></div></article>)}</div><Summary subtotal={subtotal} deliveryFee={deliveryFee} total={total}><button className="primary-btn wide" onClick={() => go("checkout")}>Siparişe Devam Et →</button></Summary></div>}</section>}
      {screen === "checkout" && <section className="inner-page"><PageTop title="Siparişi Tamamla" back={() => go("cart")} /><div className="checkout-layout"><div className="form-card"><h2>Teslimat ve iletişim</h2><label>Telefon<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XX XXX XX XX" inputMode="tel" /></label>{delivery === "Kurye" && <label>Adres<textarea value={address} onChange={e => setAddress(e.target.value)} /></label>}<label>Sipariş notu<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="İsteğe bağlı" /></label><h2>Ödeme yöntemi</h2>{operations.cashEnabled && <Choice selected={payment === "cash"} label="Kapıda Nakit" onClick={() => setPayment("cash")} />}{operations.onlineCardEnabled && <Choice selected={payment === "paytr"} label="Online Kart · PayTR" onClick={() => setPayment("paytr")} />}{operations.doorPosEnabled && <Choice selected={payment === "door_pos"} label="Kapıda POS" onClick={() => setPayment("door_pos")} />}<label className="consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okudum, onaylıyorum.</span></label>{error && <p className="form-error">{error}</p>}<button className="primary-btn wide" disabled={!accepted || busy || !cart.length} onClick={placeOrder}>{busy ? "İşleniyor…" : `Siparişi Onayla — ${money(total)}`}</button></div><Summary subtotal={subtotal} deliveryFee={deliveryFee} total={total} /></div></section>}
      {screen === "success" && <section className="success-page"><div className="success-check">✓</div><span className="eyebrow">SİPARİŞ NO · {lastOrder?.no || "BURGERMY"}</span><h1>Siparişin alındı!</h1><p>{payment === "paytr" ? "Ödeme sonucunu sistemden takip ediyoruz." : payment === "cash" ? "Ödemeni teslimatta nakit yapabilirsin. Siparişin mutfağa iletildi." : "Siparişin mutfağa iletildi."}</p><button className="primary-btn wide" onClick={() => { refreshOrders(); go("orders"); }}>Siparişlerimi Gör →</button><button className="secondary-btn wide" onClick={() => go("home")}>Ana Sayfaya Dön</button></section>}
      {screen === "orders" && <section className="inner-page"><PageTop title="Siparişlerim" back={() => go("home")} />{!orders.length ? <div className="empty-state"><h2>Henüz sipariş yok</h2><button className="primary-btn" onClick={() => go("home")}>İlk Siparişi Ver</button></div> : <div className="cart-list">{orders.map(o => <article className="order-card" key={o.id}><div className="order-head"><b>#{o.order_no}</b><small>{new Date(o.created_at).toLocaleString("tr-TR")}</small></div><div className="order-body"><div><h3>{statusText(o.status)}</h3><p>{o.fulfillment_type === "pickup" ? "Gel-Al" : "Kurye"} · {paymentMethodText(o.payment_method)} · Ödeme: {paymentText(o.payment_status)}</p><strong>{money(Number(o.total_amount))}</strong></div></div></article>)}</div>}</section>}
      {screen === "profile" && <section className="inner-page"><PageTop title="Profil" back={() => go("home")} /><div className="form-card"><h2>Hesabım</h2><p>{userEmail || "BURGERMY müşterisi"}</p><p>Telefon numaran sipariş sırasında iletişim bilgisi olarak kullanılır.</p><button className="secondary-btn wide" onClick={logout}>Çıkış Yap</button></div></section>}
    </main>
    {!authMode && count > 0 && screen === "home" && <button className="floating-cart" onClick={() => go("cart")}><span className="cart-count">{count}</span><b>Sepeti Gör</b><span>{money(total)}</span></button>}
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="product-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}>×</button><div className="modal-image"><img src={selected.image} alt={selected.name} /></div><div className="modal-body"><h2>{selected.name}</h2><p>{selected.desc}</p><Choice selected={size === "Normal"} label="Normal Boy" onClick={() => setSize("Normal")} /><Choice selected={size === "Büyük"} label="Büyük Boy +₺35" onClick={() => setSize("Büyük")} /><label>İçecek<select value={drink} onChange={e => setDrink(e.target.value)}><option>Kola</option><option>Kola Zero</option><option>Ayran</option><option>Su</option></select></label><Choice selected={extraCheese} label="Ekstra cheddar +₺25" onClick={() => setExtraCheese(!extraCheese)} /><Choice selected={extraPatty} label="Ekstra dana köfte +₺65" onClick={() => setExtraPatty(!extraPatty)} /><button className="primary-btn wide" onClick={addSelected}>Sepete Ekle</button></div></section></div>}
  </div>;
}

function Login({ onDone }: { onDone: (email: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [info, setInfo] = useState("");
  async function submit() { setBusy(true); setError(""); setInfo(""); try { const response = await fetch("/api/auth/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Giriş yapılamadı."); if (data.confirmationRequired) { setInfo("E-posta adresine gelen onay bağlantısını açtıktan sonra giriş yapabilirsin."); setMode("signin"); return; } onDone(data.email || email); } catch (e) { setError(e instanceof Error ? e.message : "Giriş yapılamadı."); } finally { setBusy(false); } }
  return <AuthShell step="1 / 3 · ÜYELİK" title="BURGERMY’ye hoş geldin." copy="E-posta ile giriş yap veya Google hesabını kullan."><label className="auth-label">E-posta<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ornek@mail.com" /></label><label className="auth-label">Şifre<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="En az 6 karakter" /></label>{error && <p className="form-error">{error}</p>}{info && <p>{info}</p>}<button className="primary-btn wide" disabled={busy || !email || password.length < 6} onClick={submit}>{busy ? "İşleniyor…" : mode === "signin" ? "Giriş Yap →" : "Hesap Oluştur →"}</button><button className="secondary-btn wide" onClick={() => { window.location.href = "/api/auth/google"; }}>Google ile Devam Et</button><button className="text-btn wide" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Yeni hesap oluştur" : "Zaten hesabım var"}</button><p className="legal-note">SMS doğrulaması şimdilik kullanılmıyor.</p></AuthShell>;
}

function AuthShell({ step, title, copy, children }: { step: string; title: string; copy: string; children: React.ReactNode }) { return <section className="auth-page"><div className="auth-brand"><Brand /><span>PAKET FAST-FOOD</span></div><div className="auth-card"><span className="eyebrow">{step}</span><h1>{title}</h1><p>{copy}</p>{children}</div></section>; }
function Brand() { return <div className="brand"><span>BURGER</span><em>MY</em></div>; }
function Nav({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><small>{label}</small></button>; }
function PageTop({ title, back }: { title: string; back: () => void }) { return <div className="page-top"><button className="back-btn" onClick={back}>←</button><div><h1>{title}</h1></div></div>; }
function Choice({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) { return <button className={`choice ${selected ? "selected" : ""}`} onClick={onClick}><span className="radio">{selected ? "●" : ""}</span><b>{label}</b></button>; }
function Summary({ subtotal, deliveryFee, total, children }: { subtotal: number; deliveryFee: number; total: number; children?: React.ReactNode }) { return <aside className="summary-card"><h3>Sipariş Özeti</h3><div className="summary-row"><span>Ara toplam</span><b>{money(subtotal)}</b></div><div className="summary-row"><span>Teslimat</span><b>{deliveryFee ? money(deliveryFee) : "Ücretsiz"}</b></div><div className="summary-total"><span>Toplam</span><b>{money(total)}</b></div>{children}</aside>; }
function statusText(status: string) { return ({ received: "Sipariş alındı", preparing: "Hazırlanıyor", courier_assigned: "Kurye atandı", on_the_way: "Yolda", delivered: "Teslim edildi", cancelled: "İptal edildi" } as Record<string, string>)[status] || status; }
function paymentText(status: string) { return ({ pending: "Bekliyor", paid: "Ödendi", failed: "Başarısız", refunded: "İade edildi" } as Record<string, string>)[status] || status; }
function paymentMethodText(method: string | null) { return ({ cash: "Kapıda Nakit", door_pos: "Kapıda POS", paytr: "Online Kart" } as Record<string, string>)[method || ""] || "Ödeme yöntemi"; }
