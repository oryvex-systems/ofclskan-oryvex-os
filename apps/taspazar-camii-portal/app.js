const SUPABASE_URL="https://wdimzayfvtlrxljpsvza.supabase.co";
const SUPABASE_KEY="sb_publishable_FZwX09JGrJt3Q9WXW3V1dQ_-g9aegh4";
/** @type {any} */\nconst supabaseClient=/** @type {any} */ (window).supabase;\nconst sb=supabaseClient.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const folders=["01_PROJELER","02_TEKNIK_SARTNAMELER","03_MAHAL_LISTELERI","04_DETAY_PAFTALARI","05_METRAJ_KESIF","06_IS_PROGRAMI","07_ILERLEME_RAPORLARI","08_SANTIYE_FOTOGRAFLARI","09_TUTANAKLAR","10_PAYLASILAN_BELGELER"];
const locations=["Tüm Mahaller","Temel","Bodrum","Harim","Mahfil","Kubbe","Minare 1","Minare 2","Cephe","Mekanik","Elektrik","Çevre Düzenleme","Cami Özel İmalatları"];
const works=["Tüm İmalatlar","Kaba İnşaat","Duvar","Yalıtım","Kaplama","Elektrik","Mekanik","Tezyinat","Özel İmalat"];
const baseKpis=[["GENEL İLERLEME %","—","Henüz hesaplanmadı"],["BAŞLAMA TARİHİ","—","Veri bekleniyor"],["PLANLANAN BİTİŞ","—","Veri bekleniyor"],["TOPLAM ŞANTİYE SÜRESİ","—","Henüz hesaplanmadı"],["GEÇEN GÜN","—","Henüz hesaplanmadı"],["KALAN GÜN","—","Henüz hesaplanmadı"],["TAKVİM İLERLEME %","—","Henüz hesaplanmadı"],["FİZİKSEL İLERLEME %","—","Henüz hesaplanmadı"],["SON GÜNCELLEME","—","Veri bekleniyor"],["TOPLAM BELGE","—","Veri bekleniyor"],["TOPLAM FOTOĞRAF","—","Veri bekleniyor"],["SON RAPOR TARİHİ","—","Veri bekleniyor"]];
function renderKpis(rows=baseKpis){$("kpis").innerHTML=rows.map(x=>`<article class="card kpi"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]||""}</small></article>`).join("")}
function renderStatic(){$("folderGrid").innerHTML=folders.map(x=>`<div class="folder"><b>📁 ${x}</b><span>Henüz içerik yok</span></div>`).join("");$("photoLocation").innerHTML=locations.map(x=>`<option>${x}</option>`).join("");$("photoWork").innerHTML=works.map(x=>`<option>${x}</option>`).join("");renderKpis()}
function route(){const id=(location.hash||"#home").slice(1);document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===id));closeMenu();window.scrollTo({top:0,behavior:"instant"})}
function openMenu(){$("drawer").classList.add("open");$("backdrop").classList.add("open");$("drawer").setAttribute("aria-hidden","false")}
function closeMenu(){$("drawer").classList.remove("open");$("backdrop").classList.remove("open");$("drawer").setAttribute("aria-hidden","true")}
$("menuBtn").onclick=openMenu;$("menuClose").onclick=closeMenu;$("backdrop").onclick=closeMenu;window.addEventListener("hashchange",route);
async function session(){const {data:{session}}=await sb.auth.getSession();return session}
async function loadPortalData(){
 const s=await session(); if(!s)return;
 const [{data:me},{data:member}]=await Promise.all([
  sb.from("santiye_internal_users").select("username,display_name,role,active").eq("auth_user_id",s.user.id).maybeSingle(),
  sb.from("santiye_company_members").select("company_id,role,active").eq("user_id",s.user.id).eq("active",true).limit(1).maybeSingle()
 ]);
 if(!me?.active||!member?.company_id)return;
 $("loginForm").classList.add("hidden");$("accountBox").classList.remove("hidden");$("accountBox").innerHTML=`<b>${me.display_name||me.username||"ORYVEX kullanıcısı"}</b><p class="muted">Rol: ${member.role||me.role||"viewer"}</p>`;
 const {data:projects}=await sb.from("santiye_projects").select("id,name,progress,status,created_at").eq("company_id",member.company_id).ilike("name","%Taşpazar%").limit(1);
 const project=projects?.[0]; if(!project)return;
 const pid=project.id;
 const [progress,docs]=await Promise.all([
   sb.from("santiye_location_progress").select("progress_percent,updated_at").eq("project_id",pid).order("updated_at",{ascending:false}).limit(200),
   sb.from("santiye_project_documents").select("id,created_at").eq("project_id",pid).limit(1000)
 ]);
 const pr=progress.data||[];const physical=pr.length?pr.reduce((a,x)=>a+Number(x.progress_percent||0),0)/pr.length:null;
 const last=pr[0]?.updated_at?new Date(pr[0].updated_at).toLocaleString("tr-TR"):"—";
 const k=baseKpis.map(x=>[...x]); k[0][1]=project.progress==null?"—":`%${Number(project.progress).toFixed(1)}`;k[0][2]=project.progress==null?"Henüz hesaplanmadı":"ŞANTİYE-M";
 k[7][1]=physical==null?"—":`%${physical.toFixed(1)}`;k[7][2]=physical==null?"Henüz hesaplanmadı":"Saha kayıtlarından";
 k[8][1]=last;k[8][2]=last==="—"?"Veri bekleniyor":"ŞANTİYE-M";
 k[9][1]=docs.error?"—":String((docs.data||[]).length);k[9][2]=docs.error?"Metadata tablosu doğrulanmalı":"ŞANTİYE-M";
 renderKpis(k);$("latestStatus").textContent=last==="—"?"Veri bekleniyor.":`Son saha güncellemesi: ${last}`;
}
$("loginForm").onsubmit=async e=>{e.preventDefault();const form=/** @type {HTMLFormElement} */ (e.currentTarget);const f=new FormData(form);$("loginMsg").textContent="Giriş yapılıyor...";try{const r=await fetch(SUPABASE_URL+"/functions/v1/santiye-username-login",{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY},body:JSON.stringify({username:f.get("username"),password:f.get("password")})});const j=await r.json();if(!r.ok||!j.session)throw new Error(j.error||"Giriş başarısız.");const {error}=await sb.auth.setSession({access_token:j.session.access_token,refresh_token:j.session.refresh_token});if(error)throw error;$("loginMsg").textContent="Giriş başarılı.";await loadPortalData()}catch(err){$("loginMsg").textContent=err instanceof Error?err.message:"Giriş yapılamadı."}};
renderStatic();route();loadPortalData().catch(console.warn);
