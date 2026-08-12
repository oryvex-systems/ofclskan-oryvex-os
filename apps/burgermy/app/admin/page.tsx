"use client";

import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string; order_no: string; status: string; payment_status: string; payment_method: string | null;
  total_amount: number | string; fulfillment_type: string; created_at: string;
};

type Settings = {
  delivery_enabled: boolean; pickup_enabled: boolean; online_card_enabled: boolean; door_pos_enabled: boolean;
  cash_enabled: boolean; minimum_order: number | string; free_delivery_threshold: number | string | null;
  order_notifications_enabled: boolean; customer_notifications_enabled: boolean;
};

const statusLabels: Record<string, string> = {
  received: "Sipariş alındı", preparing: "Hazırlanıyor", courier_assigned: "Kurye atandı",
  on_the_way: "Yolda", delivered: "Teslim edildi", cancelled: "İptal edildi",
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  async function load() {
    setLoading(true); setError("");
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Yönetim paneli açılamadı."); setLoading(false); return; }
    setOrders(Array.isArray(data.orders) ? data.orders : []);
    setSettings(data.settings || null);
    setRole(data.role || ""); setEmail(data.email || ""); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const activeOrders = useMemo(() => orders.filter(o => !["delivered", "cancelled"].includes(o.status)), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => ["delivered", "cancelled"].includes(o.status)), [orders]);

  async function updateStatus(orderId: string, status: string) {
    setSaving(orderId); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "order_status", orderId, status }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Sipariş güncellenemedi."); else await load();
    setSaving("");
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving("settings"); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "settings", settings }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Ayarlar kaydedilemedi."); else setSettings(data.settings || settings);
    setSaving("");
  }

  if (loading) return <main style={styles.page}><div style={styles.card}>Yönetim paneli yükleniyor…</div></main>;
  if (error && !settings) return <main style={styles.page}><div style={styles.card}><h1>BURGERMY Yönetim</h1><p>{error}</p><a href="/" style={styles.link}>Müşteri ekranına dön</a></div></main>;

  return <main style={styles.page}>
    <header style={styles.header}><div><b style={styles.brand}>BURGER<span style={{color:"#ff7a00"}}>MY</span></b><h1 style={{margin:"8px 0"}}>Operasyon Paneli</h1><small>{email} · {role}</small></div><div style={styles.stat}><strong>{activeOrders.length}</strong><span>Aktif sipariş</span></div></header>
    {error && <div style={{...styles.card,borderColor:"#a33"}}>{error}</div>}

    <section style={styles.grid}>
      <div style={styles.card}><h2>Sipariş Modları</h2>{settings && <>
        <Toggle label="Paket Servis" checked={settings.delivery_enabled} onChange={v => setSettings({...settings, delivery_enabled:v})}/>
        <Toggle label="Gel-Al" checked={settings.pickup_enabled} onChange={v => setSettings({...settings, pickup_enabled:v})}/>
        <Toggle label="Online Kart / PayTR" checked={settings.online_card_enabled} onChange={v => setSettings({...settings, online_card_enabled:v})}/>
        <Toggle label="Kapıda POS" checked={settings.door_pos_enabled} onChange={v => setSettings({...settings, door_pos_enabled:v})}/>
        <Toggle label="Kapıda Nakit" checked={false} disabled onChange={()=>{}}/><small style={{opacity:.65}}>Kapıda nakit sistem gereği kapalıdır.</small>
        <label style={styles.label}>Minimum sipariş<input style={styles.input} type="number" value={Number(settings.minimum_order || 0)} onChange={e=>setSettings({...settings,minimum_order:Number(e.target.value)})}/></label>
        <button style={styles.primary} disabled={saving==="settings"} onClick={saveSettings}>{saving==="settings"?"Kaydediliyor…":"Ayarları Kaydet"}</button>
      </>}</div>
      <div style={styles.card}><h2>Bildirimler</h2>{settings && <>
        <Toggle label="İşletme sipariş bildirimi" checked={settings.order_notifications_enabled} onChange={v => setSettings({...settings, order_notifications_enabled:v})}/>
        <Toggle label="Müşteri durum bildirimi" checked={settings.customer_notifications_enabled} onChange={v => setSettings({...settings, customer_notifications_enabled:v})}/>
        <button style={styles.primary} disabled={saving==="settings"} onClick={saveSettings}>Kaydet</button>
      </>}</div>
    </section>

    <section style={styles.card}><h2>Aktif Siparişler</h2>{activeOrders.length===0?<p style={{opacity:.7}}>Şu an aktif sipariş yok.</p>:activeOrders.map(o=><OrderRow key={o.id} order={o} saving={saving===o.id} updateStatus={updateStatus}/>)}</section>
    <section style={styles.card}><h2>Son Tamamlananlar</h2>{completedOrders.slice(0,20).map(o=><OrderRow key={o.id} order={o} saving={saving===o.id} updateStatus={updateStatus}/>)}</section>
    <a href="/" style={styles.link}>← Müşteri ekranına dön</a>
  </main>;
}

function Toggle({label,checked,onChange,disabled=false}:{label:string;checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean}) {
  return <label style={styles.toggleRow}><span>{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)} /></label>;
}

function OrderRow({order,saving,updateStatus}:{order:Order;saving:boolean;updateStatus:(id:string,status:string)=>void}) {
  const next = order.fulfillment_type === "pickup" ? ["received","preparing","delivered","cancelled"] : ["received","preparing","courier_assigned","on_the_way","delivered","cancelled"];
  return <article style={styles.order}><div><b>{order.order_no}</b><small style={{display:"block",opacity:.65}}>{new Date(order.created_at).toLocaleString("tr-TR")}</small></div><div><span>{statusLabels[order.status] || order.status}</span><small style={{display:"block",opacity:.65}}>{order.payment_status} · {order.payment_method || "-"}</small></div><strong>₺{Number(order.total_amount).toFixed(2)}</strong><select style={styles.select} value={order.status} disabled={saving} onChange={e=>updateStatus(order.id,e.target.value)}>{next.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></article>;
}

const styles:Record<string,React.CSSProperties> = {
  page:{minHeight:"100vh",background:"#111",color:"#f7f7f7",padding:"24px",fontFamily:"Arial, sans-serif"},
  header:{maxWidth:1180,margin:"0 auto 20px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16},
  brand:{fontSize:28,letterSpacing:-1},stat:{background:"#1c1c1c",border:"1px solid #333",borderRadius:16,padding:"16px 22px",display:"grid",textAlign:"center"},
  grid:{maxWidth:1180,margin:"0 auto 20px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16},
  card:{maxWidth:1140,margin:"0 auto 16px",background:"#1b1b1b",border:"1px solid #303030",borderRadius:18,padding:20},
  toggleRow:{display:"flex",justifyContent:"space-between",padding:"13px 0",borderBottom:"1px solid #2b2b2b"},label:{display:"grid",gap:7,marginTop:16},input:{padding:12,borderRadius:10,border:"1px solid #444",background:"#111",color:"#fff"},
  primary:{marginTop:16,padding:"12px 16px",border:0,borderRadius:12,background:"#ff7a00",color:"#111",fontWeight:800,cursor:"pointer"},
  order:{display:"grid",gridTemplateColumns:"1.3fr 1fr .6fr 1fr",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid #2d2d2d"},select:{padding:10,borderRadius:10,background:"#111",color:"#fff",border:"1px solid #444"},link:{color:"#ff9b3d",display:"block",maxWidth:1180,margin:"18px auto"}
};
