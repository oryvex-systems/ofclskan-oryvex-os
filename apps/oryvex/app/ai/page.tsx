import BottomNav from "../components/BottomNav";
import { getTasks, getWorkspaces, requireUser } from "../../lib/session";

const quick = ["Günlük İş Özeti","Finans Analizi","Personel Durumu","Rapor Oluştur"];

export default async function AIPage(){
  const user = await requireUser();
  const [systems,tasks] = await Promise.all([getWorkspaces(),getTasks()]);
  const name = String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Kullanıcı");
  const waiting = tasks.filter((task)=>task.status === "todo" || task.status === "overdue").length;
  const active = systems.filter((system)=>system.status === "active").length;

  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX AI</div><span className="icon-button">○</span></header>
    <h1 className="section-title">Merhaba {name}</h1><p className="section-subtitle">Bugün size nasıl yardımcı olabilirim?</p>
    <section className="glass-card ai-hero"><div className="ai-core">X</div><h2 style={{margin:"0 0 6px"}}>ORYVEX AI CORE</h2><p style={{margin:0,color:"#98a3b6"}}>Veri • Yapay Zekâ • İnsan • Otomasyon</p></section>
    <section className="quick-grid">{quick.map((item)=><article className="glass-card quick-card" key={item}><h3 style={{margin:"0 0 6px"}}>{item}</h3><p style={{margin:0,color:"#96a0b2"}}>Akıllı analiz ve hızlı aksiyon.</p></article>)}</section>
    <section className="glass-card chat-box"><p style={{margin:"0 0 10px",color:"#b875ff",fontWeight:700}}>✦ ORYVEX AI</p><div className="chat-message">Şu anda <strong style={{color:"#5bb7ff"}}>{active} aktif sistem</strong> ve <strong style={{color:"#b96dff"}}>{waiting} bekleyen görev</strong> bulunuyor. ORYVEX çekirdeği bağlı ve çalışıyor.</div><div className="chat-input"><input placeholder="ORYVEX AI’ya bir şey sor..." disabled/><button aria-label="Yakında" disabled>➤</button></div><p style={{color:"#7f899b",fontSize:12,marginBottom:0}}>Canlı AI sohbeti bir sonraki çekirdek sürümünde etkinleştirilecek.</p></section>
    <BottomNav active="/ai" />
  </main>
}
