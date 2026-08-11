import { supabase } from './supabase.js'

let products=[];
let categories=[];
let cart=JSON.parse(localStorage.getItem('tikladoy_cart')||'[]');
let session=null;
let authMode='login';
const app=document.querySelector('#app');
const money=v=>`${Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ₺`;
const iconFor=name=>/tost|sandviç/i.test(name)?'breakfast_dining':/salata/i.test(name)?'nutrition':/peynir|kahvalt/i.test(name)?'lunch_dining':'restaurant';
const saveCart=()=>localStorage.setItem('tikladoy_cart',JSON.stringify(cart));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function loadCatalog(){
 const [p,c]=await Promise.all([
  supabase.from('products').select('id,name,price,description,image_url,is_featured,seller_id,category_id').eq('is_active',true).order('created_at'),
  supabase.from('categories').select('id,name,slug,sort_order').eq('is_active',true).order('sort_order')
 ]);
 if(p.error) console.error('Supabase products:',p.error); else products=p.data||[];
 if(c.error) console.error('Supabase categories:',c.error); else categories=c.data||[];
}
function shell(content,active='home'){
 app.innerHTML=`<div class="app"><header class="top"><div class="brand">TIKLADOY</div><button class="iconbtn" id="topAccount"><span class="material-symbols-outlined icon">${session?'account_circle':'notifications'}</span></button></header>${content}<nav class="bottom">${[['home','Ana Sayfa'],['search','Keşfet'],['orders','Siparişler'],['person','Hesabım']].map(([i,t])=>`<div class="nav ${active===i?'active':''}" data-nav="${i}"><span class="material-symbols-outlined">${i==='orders'?'receipt_long':i}</span>${t}${i==='orders'&&cart.length?` <b class="badge">${cart.length}</b>`:''}</div>`).join('')}</nav></div>`;
 document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{location.hash=x.dataset.nav;route(x.dataset.nav)});
 const top=document.querySelector('#topAccount');if(top)top.onclick=()=>authPage();
}
function productCard(p){return `<article class="card"><div class="photo">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover">`:`<span class="material-symbols-outlined" style="font-size:48px">${iconFor(p.name)}</span>`}</div><div class="cardbody"><button class="add" data-product-id="${p.id}">+</button><h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span></div></article>`}
function categoryChips(active='all'){return `<div class="cats"><button class="chip ${active==='all'?'active':''}" data-cat="all">Tümü</button>${categories.map(c=>`<button class="chip ${active===c.id?'active':''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div>`}
function home(){
 shell(`<section class="hero"><h1>Ne yiyeceksen,<br>TIKLADOY.</h1><p>Hazır yemek, kahvaltı, atıştırmalık ve günlük ihtiyaçlar tek yerde.</p></section><input class="search" id="search" placeholder="Ne yemek istersin?"/><section class="section" id="catArea">${categoryChips()}</section><section class="section"><h2>Bugün ne yiyelim?</h2><div class="grid" id="productGrid">${products.map(productCard).join('')}</div></section><button class="cartfloat" id="openCart"><span>Sepet • ${cart.length} ürün</span><b>${money(cart.reduce((s,p)=>s+Number(p.price),0))}</b></button>`);
 bindProducts();bindCategories();
 document.querySelector('#openCart').onclick=cartPage;
 document.querySelector('#search').oninput=e=>renderProductGrid(products.filter(p=>`${p.name} ${p.description||''}`.toLocaleLowerCase('tr').includes(e.target.value.toLocaleLowerCase('tr'))));
}
function renderProductGrid(list){document.querySelector('#productGrid').innerHTML=list.map(productCard).join('');bindProducts()}
function bindProducts(){document.querySelectorAll('[data-product-id]').forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.productId);if(!p)return;cart.push(p);saveCart();home()})}
function bindCategories(){document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{const id=b.dataset.cat;document.querySelector('#catArea').innerHTML=categoryChips(id);bindCategories();renderProductGrid(id==='all'?products:products.filter(p=>p.category_id===id))})}
function discover(){shell(`<section class="hero"><h1>Keşfet</h1><p>Kategori veya ürün ara.</p></section><input class="search" id="discoverSearch" autofocus placeholder="Yemek, ürün veya kategori ara"/><section class="section"><h2>Kategoriler</h2>${categoryChips()}</section><section class="section"><div class="grid" id="productGrid">${products.map(productCard).join('')}</div></section>`,'search');bindProducts();bindCategories();document.querySelector('#discoverSearch').oninput=e=>renderProductGrid(products.filter(p=>`${p.name} ${p.description||''}`.toLocaleLowerCase('tr').includes(e.target.value.toLocaleLowerCase('tr'))))}
function cartPage(){const total=cart.reduce((s,p)=>s+Number(p.price),0);shell(`<section class="hero"><h1>Sepetim</h1><p>${cart.length} ürün</p></section><div class="panel">${cart.length?cart.map((p,i)=>`<div class="row"><div><b>${esc(p.name)}</b><div class="muted">1 adet</div></div><div><span class="price">${money(p.price)}</span> <button class="back" data-del="${i}">×</button></div></div>`).join(''):`<p class="muted">Sepetin henüz boş.</p>`}${cart.length?`<div class="row"><b>Toplam</b><b class="price">${money(total)}</b></div><button class="btn" id="checkout">Ödemeye Geç</button>`:''}</div>`,'orders');document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.del,1);saveCart();cartPage()});if(document.querySelector('#checkout'))document.querySelector('#checkout').onclick=()=>session?checkout():authPage('Sipariş vermek için giriş yap.')}
function checkout(){const total=cart.reduce((s,p)=>s+Number(p.price),0);shell(`<section class="hero"><h1>Ödeme</h1><p>Siparişini tamamla.</p></section><div class="panel"><div class="row"><span>Teslimat Adresi</span><b>V1 Test Adresi</b></div><div class="row"><span>Ödeme</span><b>Test / Tahsilat Yok</b></div><div class="row"><b>Toplam</b><b class="price">${money(total)}</b></div><button class="btn" id="complete">Siparişi Oluştur</button><p class="muted small">V1 test akışı: gerçek ödeme henüz tahsil edilmez.</p></div>`,'orders');document.querySelector('#complete').onclick=createOrder}
async function createOrder(){
 const btn=document.querySelector('#complete');btn.disabled=true;btn.textContent='Sipariş oluşturuluyor…';
 if(!session?.user){authPage('Oturum süren dolmuş. Tekrar giriş yap.');return;}
 if(!cart.length){cartPage();return;}
 const sellerId=cart[0]?.seller_id;
 if(cart.some(p=>p.seller_id!==sellerId)){showOrderError('V1 sürümünde tek siparişte aynı satıcının ürünleri bulunabilir.');return;}
 const subtotal=cart.reduce((s,p)=>s+Number(p.price),0);
 const orderNo=`TKD-${Date.now().toString().slice(-8)}`;
 const {data:order,error}=await supabase.from('orders').insert({order_no:orderNo,user_id:session.user.id,seller_id:sellerId,status:'received',payment_status:'pending',payment_method:'test',subtotal,delivery_fee:0,discount_amount:0,total_amount:subtotal,estimated_min:20,estimated_max:30}).select().single();
 if(error){console.error(error);showOrderError(error.message);return;}
 const grouped=[...cart.reduce((m,p)=>{const x=m.get(p.id)||{...p,quantity:0};x.quantity++;m.set(p.id,x);return m},new Map()).values()];
 const items=grouped.map(p=>({order_id:order.id,product_id:p.id,product_name:p.name,quantity:p.quantity,unit_price:Number(p.price),line_total:Number(p.price)*p.quantity}));
 const {error:itemError}=await supabase.from('order_items').insert(items);
 if(itemError){console.error(itemError);showOrderError(itemError.message);return;}
 cart=[];saveCart();success(order);
}
function showOrderError(message){shell(`<section class="hero"><h1>Sipariş tamamlanamadı</h1><p>Sepetin korunuyor; tekrar deneyebilirsin.</p></section><div class="panel"><div class="status err">${esc(message)}</div><button class="btn" id="backCart">Sepete Dön</button></div>`,'orders');document.querySelector('#backCart').onclick=cartPage}
function success(order){shell(`<section class="hero" style="text-align:center"><span class="material-symbols-outlined icon" style="font-size:80px">check_circle</span><h1>Siparişin Alındı!</h1><p>Lezzetin hazırlanıyor.</p></section><div class="panel"><div class="row"><span>Sipariş No</span><b>${esc(order.order_no)}</b></div><div class="row"><span>Toplam</span><b class="price">${money(order.total_amount)}</b></div><div class="row"><span>Tahmini Teslimat</span><b class="price">${order.estimated_min||20}–${order.estimated_max||30} dk</b></div><button class="btn" id="trackOrder">Siparişimi Takip Et</button><button class="btn secondary" id="goHome">Ana Sayfaya Dön</button></div>`,'orders');document.querySelector('#trackOrder').onclick=()=>orderTracking(order.id);document.querySelector('#goHome').onclick=home}
async function ordersPage(){
 if(!session?.user){authPage('Siparişlerini görmek için giriş yap.');return;}
 shell(`<section class="hero"><h1>Siparişlerim</h1><p>Aktif ve geçmiş siparişlerin.</p></section><div class="panel"><p class="muted">Siparişler yükleniyor…</p></div>`,'orders');
 const {data,error}=await supabase.from('orders').select('id,order_no,status,total_amount,estimated_min,estimated_max,created_at,payment_status').order('created_at',{ascending:false}).limit(30);
 if(error){shell(`<section class="hero"><h1>Siparişlerim</h1></section><div class="panel"><div class="status err">${esc(error.message)}</div></div>`,'orders');return;}
 const list=data||[];
 shell(`<section class="hero"><h1>Siparişlerim</h1><p>${list.length} sipariş</p></section><div class="panel">${list.length?list.map(o=>`<button class="ordercard" data-order="${o.id}"><div><b>${esc(o.order_no)}</b><div class="muted small">${new Date(o.created_at).toLocaleString('tr-TR')}</div><div class="statusline">${statusText(o.status)}</div></div><div><b class="price">${money(o.total_amount)}</b><span class="material-symbols-outlined">chevron_right</span></div></button>`).join(''):'<p class="muted">Henüz siparişin yok.</p>'}</div>`,'orders');document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>orderTracking(b.dataset.order));
}
const statusText=s=>({received:'Sipariş Alındı',preparing:'Hazırlanıyor',courier_assigned:'Kurye Atandı',on_the_way:'Yola Çıktı',delivered:'Teslim Edildi',cancelled:'İptal Edildi'}[s]||s);
const statusIndex=s=>['received','preparing','courier_assigned','on_the_way','delivered'].indexOf(s);
async function orderTracking(id){
 shell(`<section class="hero"><h1>Sipariş Takibi</h1><p>Durum yükleniyor…</p></section>`,'orders');
 const {data:o,error}=await supabase.from('orders').select('id,order_no,status,total_amount,estimated_min,estimated_max,created_at,payment_status').eq('id',id).single();
 if(error||!o){shell(`<section class="hero"><h1>Sipariş bulunamadı</h1></section><div class="panel"><div class="status err">${esc(error?.message||'Sipariş bulunamadı')}</div></div>`,'orders');return;}
 const steps=['received','preparing','courier_assigned','on_the_way','delivered'];const idx=statusIndex(o.status);
 shell(`<section class="hero"><h1>${statusText(o.status)}</h1><p>${esc(o.order_no)} • ${money(o.total_amount)}</p></section><div class="panel"><div class="row"><span>Tahmini Teslimat</span><b class="price">${o.estimated_min||20}–${o.estimated_max||30} dk</b></div><div class="timeline">${steps.map((s,i)=>`<div class="step ${i<idx?'done':''} ${i===idx?'current':''}"><span></span><div><b>${statusText(s)}</b>${i===idx?'<div class="muted small">Şu an</div>':''}</div></div>`).join('')}</div><button class="btn secondary" id="allOrders">Tüm Siparişler</button></div>`,'orders');document.querySelector('#allOrders').onclick=ordersPage;
}
function authPage(note=''){shell(`<section class="hero"><h1>${session?'Hesabım':'Hoş geldin'}</h1><p>${session?'Hesap ve sipariş bilgilerin.':'Siparişlerini takip etmek için giriş yap veya hesap oluştur.'}</p></section>${note?`<div class="status">${esc(note)}</div>`:''}${session?accountPanel():authForm()}`,'person');bindAuth()}
function authForm(){return `<div class="tabs"><button class="tab ${authMode==='login'?'active':''}" data-mode="login">Giriş Yap</button><button class="tab ${authMode==='register'?'active':''}" data-mode="register">Kayıt Ol</button></div>${authMode==='register'?'<input class="field" id="name" placeholder="Ad Soyad"/>':''}<input class="field" id="email" type="email" placeholder="E-posta"/><input class="field" id="password" type="password" placeholder="Şifre"/><div class="panel"><button class="btn" id="authSubmit">${authMode==='login'?'Giriş Yap':'Hesap Oluştur'}</button><div id="authStatus"></div></div>`}
function accountPanel(){const email=session?.user?.email||'';return `<div class="panel"><div class="userbox"><div class="avatar"><span class="material-symbols-outlined">person</span></div><div><b>${esc(email)}</b><div class="muted small">Supabase kullanıcı hesabı</div></div></div><button class="menubtn" id="myOrders"><span>Siparişlerim</span><span>›</span></button><button class="menubtn"><span>Adreslerim</span><span>›</span></button><button class="menubtn"><span>TIKLADOY Hakkında</span><span>›</span></button><button class="btn secondary" id="logout">Çıkış Yap</button></div>`}
function bindAuth(){document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{authMode=b.dataset.mode;authPage()});if(document.querySelector('#myOrders'))document.querySelector('#myOrders').onclick=ordersPage;if(document.querySelector('#logout'))document.querySelector('#logout').onclick=async()=>{await supabase.auth.signOut();session=null;authPage('Çıkış yapıldı.')};if(document.querySelector('#authSubmit'))document.querySelector('#authSubmit').onclick=submitAuth}
async function submitAuth(){const email=document.querySelector('#email').value.trim();const password=document.querySelector('#password').value;const name=document.querySelector('#name')?.value.trim();const status=document.querySelector('#authStatus');if(!email||password.length<6){status.innerHTML='<div class="status err">Geçerli e-posta ve en az 6 karakter şifre gir.</div>';return;}status.innerHTML='<div class="status">İşlem yapılıyor…</div>';if(authMode==='login'){const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error){status.innerHTML=`<div class="status err">${esc(error.message)}</div>`;return;}session=data.session;authPage('Giriş başarılı.');return;}const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error){status.innerHTML=`<div class="status err">${esc(error.message)}</div>`;return;}session=data.session;if(session)authPage('Hesabın oluşturuldu ve giriş yapıldı.');else status.innerHTML='<div class="status ok">Hesabın oluşturuldu. E-posta doğrulama bağlantısını kontrol et.</div>'}
function route(r){if(r==='search')return discover();if(r==='orders')return ordersPage();if(r==='cart')return cartPage();if(r==='person')return authPage();home()}
async function start(){shell(`<section class="hero"><h1>TIKLADOY</h1><p>Supabase'e bağlanıyor…</p></section>`);const {data:{session:s}}=await supabase.auth.getSession();session=s;supabase.auth.onAuthStateChange((_event,s)=>{session=s});await loadCatalog();route(location.hash.slice(1)||'home')}
window.addEventListener('hashchange',()=>route(location.hash.slice(1)||'home'));
start();
