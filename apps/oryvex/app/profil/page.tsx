import BottomNav from "../components/BottomNav";

export default function ProfilePage(){
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div></header>
    <h1 className="section-title">Profil</h1><p className="section-subtitle">Hesabınızı ve uygulama tercihlerinizi yönetin.</p>
    <section className="glass-card profile-card"><div className="avatar">ÖF</div><h2 style={{margin:"0 0 5px"}}>Ömer Faruk Çalışkan</h2><p style={{margin:0,color:"#9ca6b8"}}>Yönetici • ORYVEX</p></section>
    <section className="settings-list"><a className="setting-row" href="#"><span>Hesap Bilgileri</span><span>›</span></a><a className="setting-row" href="#"><span>Bildirimler</span><span>›</span></a><a className="setting-row" href="#"><span>Güvenlik</span><span>›</span></a><a className="setting-row" href="#"><span>Tema</span><span>›</span></a><a className="setting-row" href="#"><span>Dil</span><span>Türkçe</span></a><a className="setting-row" href="/"><span>Çıkış Yap</span><span>→</span></a></section>
    <BottomNav active="/profil" />
  </main>
}
