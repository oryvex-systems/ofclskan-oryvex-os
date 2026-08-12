import BottomNav from "../components/BottomNav";

const quick = ["Günlük İş Özeti","Finans Analizi","Personel Durumu","Rapor Oluştur"];

export default function AIPage(){
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX AI</div><a className="icon-button" href="#">○</a></header>
    <h1 className="section-title">Merhaba Ömer</h1><p className="section-subtitle">Bugün size nasıl yardımcı olabilirim?</p>
    <section className="glass-card ai-hero"><div className="ai-core">X</div><h2 style={{margin:"0 0 6px"}}>ORYVEX AI CORE</h2><p style={{margin:0,color:"#98a3b6"}}>Veri • Yapay Zekâ • İnsan • Otomasyon</p></section>
    <section className="quick-grid">{quick.map((item)=><article className="glass-card quick-card" key={item}><h3 style={{margin:"0 0 6px"}}>{item}</h3><p style={{margin:0,color:"#96a0b2"}}>Akıllı analiz ve hızlı aksiyon.</p></article>)}</section>
    <section className="glass-card chat-box"><p style={{margin:"0 0 10px",color:"#b875ff",fontWeight:700}}>✦ ORYVEX AI</p><div className="chat-message">Bugün <strong style={{color:"#5bb7ff"}}>3 kritik görev</strong>, <strong style={{color:"#b96dff"}}>2 bekleyen onay</strong> ve <strong style={{color:"#6f8cff"}}>1 finans uyarısı</strong> tespit edildi.</div><div className="chat-input"><input placeholder="ORYVEX AI’ya bir şey sor..."/><button aria-label="Gönder">➤</button></div></section>
    <BottomNav active="/ai" />
  </main>
}
