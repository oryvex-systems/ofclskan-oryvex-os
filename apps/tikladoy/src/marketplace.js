import { supabase } from './supabase.js'

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
let sellers=[]
let branches=[]

export async function loadMarketplace(){
  const [{data:s},{data:b}]=await Promise.all([
    supabase.from('sellers').select('id,name,slug,is_active').eq('is_active',true).order('name'),
    supabase.from('branches').select('id,seller_id,name,is_active,supports_delivery,supports_pickup,delivery_fee,minimum_order,prep_minutes_min,prep_minutes_max').eq('is_active',true)
  ])
  sellers=s||[];branches=b||[]
  return {sellers,branches}
}

export function marketplaceHome(products,onSeller,onProduct){
  const sellerCards=sellers.map(s=>{
    const b=branches.find(x=>x.seller_id===s.id)
    const count=products.filter(p=>p.seller_id===s.id).length
    const eta=b?`${b.prep_minutes_min||20}–${b.prep_minutes_max||40} dk`:'Yakında'
    return `<article class="restaurant-card" data-market-seller="${s.id}"><div class="restaurant-cover"><span class="material-symbols-outlined">storefront</span><b>${esc(s.name)}</b></div><div class="restaurant-body"><div><h3>${esc(s.name)}</h3><p>${count} ürün · ${eta}</p></div><div class="restaurant-meta"><span>★ Yeni</span><small>${b?.supports_delivery?'Paket Servis':''}${b?.supports_pickup?' · Gel-Al':''}</small></div></div></article>`
  }).join('')
  const featured=products.filter(p=>p.is_featured).slice(0,8)
  return `<section class="market-address"><span class="material-symbols-outlined">location_on</span><div><small>Teslimat adresi</small><b>Adresini seç</b></div><span class="material-symbols-outlined">expand_more</span></section><section class="market-hero"><div><span>⚡ TIKLADOY</span><h1>Canın ne çekiyorsa<br>kapına gelsin.</h1><p>Restoranları, mutfakları ve fırsatları keşfet.</p></div></section><div class="market-search"><span class="material-symbols-outlined">search</span><input id="marketSearch" placeholder="Restoran, yemek veya mutfak ara"></div><section class="market-categories"><button>🍔 Burger</button><button>🍕 Pizza</button><button>🍲 Ev Yemeği</button><button>🥐 Kahvaltı</button><button>🥗 Salata</button><button>🍰 Tatlı</button></section><section class="market-section"><div class="market-title"><div><small>YAKININDA</small><h2>Restoranlar</h2></div><button id="allRestaurants">Tümünü Gör</button></div><div class="restaurant-list" id="restaurantList">${sellerCards||'<div class="market-empty">Aktif işletmeler burada görünecek.</div>'}</div></section>${featured.length?`<section class="market-section"><div class="market-title"><div><small>POPÜLER</small><h2>Öne çıkan lezzetler</h2></div></div><div class="market-products">${featured.map(p=>`<article data-market-product="${p.id}"><div>${p.image_url?`<img src="${esc(p.image_url)}">`:'<span class="material-symbols-outlined">restaurant</span>'}</div><b>${esc(p.name)}</b><small>${esc(sellers.find(s=>s.id===p.seller_id)?.name||'TIKLADOY')}</small><strong>${Number(p.price||0).toLocaleString('tr-TR')} ₺</strong></article>`).join('')}</div></section>`:''}`
}

export function bindMarketplace(products,onSeller,onProduct){
  document.querySelectorAll('[data-market-seller]').forEach(x=>x.onclick=()=>onSeller(x.dataset.marketSeller))
  document.querySelectorAll('[data-market-product]').forEach(x=>x.onclick=()=>onProduct(x.dataset.marketProduct))
  const q=document.querySelector('#marketSearch')
  if(q)q.oninput=()=>{const term=q.value.toLocaleLowerCase('tr');document.querySelectorAll('[data-market-seller]').forEach(el=>{const s=sellers.find(x=>x.id===el.dataset.marketSeller);const match=(s?.name||'').toLocaleLowerCase('tr').includes(term)||products.some(p=>p.seller_id===s?.id&&`${p.name} ${p.description||''}`.toLocaleLowerCase('tr').includes(term));el.style.display=match?'':'none'})}
}

export function sellerView(sellerId,products,productCard){
  const s=sellers.find(x=>x.id===sellerId),b=branches.find(x=>x.seller_id===sellerId),list=products.filter(p=>p.seller_id===sellerId)
  if(!s)return ''
  return `<button class="detail-back" id="marketBack"><span class="material-symbols-outlined">arrow_back</span> Restoranlar</button><section class="seller-hero"><div class="seller-logo"><span class="material-symbols-outlined">storefront</span></div><div><small>TIKLADOY İŞLETME</small><h1>${esc(s.name)}</h1><p>★ Yeni · ${b?.prep_minutes_min||20}–${b?.prep_minutes_max||40} dk · ${b?.delivery_fee?Number(b.delivery_fee).toLocaleString('tr-TR')+' ₺ teslimat':'Teslimat bilgisi siparişte'}</p></div></section><section class="section"><div class="seller-tags"><span>${b?.supports_delivery?'🛵 Paket Servis':''}</span><span>${b?.supports_pickup?'🥡 Gel-Al':''}</span>${b?.minimum_order?`<span>Min. ${Number(b.minimum_order).toLocaleString('tr-TR')} ₺</span>`:''}</div><h2>Menü</h2><div class="grid">${list.map(productCard).join('')}</div></section>`
}
