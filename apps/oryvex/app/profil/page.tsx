import BottomNav from "../components/BottomNav";
import LogoutButton from "../components/LogoutButton";
import { requireUser } from "../../lib/session";

export default async function ProfilePage(){
  const user = await requireUser();
  const displayName = String(user.user_metadata?.full_name || user.email?.split("@")[0] || "ORYVEX Kullanıcısı");
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("") || "OX";

  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div></header>
    <h1 className="section-title">Profil</h1><p className="section-subtitle">Hesabınızı ve uygulama tercihlerinizi yönetin.</p>
    <section className="glass-card profile-card"><div className="avatar">{initials}</div><h2 style={{margin:"0 0 5px"}}>{displayName}</h2><p style={{margin:0,color:"#9ca6b8"}}>{user.email} • ORYVEX</p></section>
    <section className="settings-list"><div className="setting-row"><span>Hesap Durumu</span><span>Aktif</span></div><div className="setting-row"><span>Kimlik Doğrulama</span><span>Supabase Auth</span></div><div className="setting-row"><span>Dil</span><span>Türkçe</span></div><LogoutButton /></section>
    <BottomNav active="/profil" />
  </main>
}
