import BottomNav from "../components/BottomNav";

const systems = [
  ["TEKNOM YAPI","Şantiye Yönetim Sistemi","Aktif",78],
  ["WOODLIFE","Satış ve CRM","Devam Ediyor",62],
  ["TIKLADOY","Paket Yemek Platformu","Aktif",84],
  ["BURGERMY","Sipariş ve Operasyon Sistemi","Aktif",88],
  ["DOME LIGHTING","Teklif Yönetimi","Aktif",85],
  ["KAYNAŞALIM","Topluluk Platformu","Devam Ediyor",48],
] as const;

export default function SystemsPage(){
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div><a className="icon-button" href="#">＋</a></header>
    <h1 className="section-title">Sistemler</h1><p className="section-subtitle">Tüm çalışma alanlarınızı tek merkezden yönetin.</p>
    <section className="summary-grid"><article className="summary-card"><span>Aktif</span><strong>12</strong></article><article className="summary-card"><span>Devam Eden</span><strong>7</strong></article><article className="summary-card"><span>Bekleyen</span><strong>3</strong></article><article className="summary-card"><span>Tamamlanan</span><strong>24</strong></article></section>
    <section className="system-list">{systems.map(([name,desc,status,progress])=><article className="glass-card system-card" key={name}><div className="system-head"><div><h2 style={{margin:"0 0 5px"}}>{name}</h2><p style={{margin:0,color:"#9ca6b8"}}>{desc}</p></div><span className="badge">{status}</span></div><div className="progress"><span style={{width:`${progress}%`}} /></div><div style={{display:"flex",justifyContent:"space-between",color:"#8f99ab",fontSize:13}}><span>Son durum</span><strong style={{color:"#a783ff"}}>%{progress}</strong></div></article>)}</section>
    <a className="primary-button" href="#" style={{marginTop:22}}>＋ Yeni Sistem</a>
    <BottomNav active="/sistemler" />
  </main>
}
