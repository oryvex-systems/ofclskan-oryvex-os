import { createClient } from '@supabase/supabase-js'

const supabase=createClient('https://wdimzayfvtlrxljpsvza.supabase.co','sb_publishable_FZwX09JGrJt3Q9WXW3V1dQ_-g9aegh4')
const money=v=>`${Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ₺`
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
let busy=false

async function inject(){
  if(busy||document.querySelector('#opsAnalytics'))return
  const host=document.querySelector('.shell main')
  if(!host)return
  busy=true
  try{
    const {data:{session}}=await supabase.auth.getSession();if(!session?.user)return
    const {data:members}=await supabase.from('seller_members').select('seller_id,sellers(name)').eq('user_id',session.user.id).eq('is_active',true)
    const ids=(members||[]).map(m=>m.seller_id);if(!ids.length)return
    const [{data:products},{data:finance},{data:sales}]=await Promise.all([
      supabase.from('ops_product_sales_30d').select('*').in('seller_id',ids).order('revenue',{ascending:false}).limit(10),
      supabase.from('ops_branch_finance_30d').select('*').in('seller_id',ids).order('revenue',{ascending:false}).limit(20),
      supabase.from('ops_sales_daily').select('*').in('seller_id',ids).order('metric_date',{ascending:false}).limit(90)
    ])
    const brand=id=>(members||[]).find(m=>m.seller_id===id)?.sellers?.name||'Marka'
    const last7={}
    for(const r of sales||[]){last7[r.seller_id]??={orders:0,revenue:0};const days=(Date.now()-new Date(`${r.metric_date}T00:00:00`).getTime())/86400000;if(days<7){last7[r.seller_id].orders+=Number(r.orders_count||0);last7[r.seller_id].revenue+=Number(r.gross_revenue||0)}}
    const wrap=document.createElement('section');wrap.id='opsAnalytics';wrap.className='analytics-grid'
    wrap.innerHTML=`<article class="panel analytics-wide"><div class="ph"><h2>Yönetici Özeti</h2><button id="dailyBriefBtn">Günlük Özeti Oluştur</button></div><div id="dailyBrief" class="brief">Son 7 gün marka performansı</div><div class="brand-performance">${Object.entries(last7).map(([id,v])=>`<div><b>${esc(brand(id))}</b><strong>${Number(v.orders)} sipariş</strong><span>${money(v.revenue)}</span></div>`).join('')||'<p class="empty">Henüz analiz verisi yok.</p>'}</div></article><article class="panel"><div class="ph"><h2>En Çok Satan Ürünler</h2><span>Son 30 gün</span></div>${(products||[]).map((p,i)=>`<div class="rank"><em>${i+1}</em><div><b>${esc(p.product_name)}</b><small>${esc(brand(p.seller_id))} · ${Number(p.quantity_sold)} adet</small></div><strong>${money(p.revenue)}</strong></div>`).join('')||'<p class="empty">Ürün satış verisi yok.</p>'}</article><article class="panel"><div class="ph"><h2>Şube Kâr/Nakit Görünümü</h2><span>Son 30 gün</span></div>${(finance||[]).map(f=>`<div class="row"><div><b>${esc(brand(f.seller_id))}</b><small>${Number(f.orders_count||0)} sipariş · Gider ${money(f.expenses)}</small></div><span></span><strong>${money(f.net_operating_cash)}</strong></div>`).join('')||'<p class="empty">Finans verisi yok.</p>'}</article>`
    host.appendChild(wrap)
    document.querySelector('#dailyBriefBtn').onclick=async()=>{
      const box=document.querySelector('#dailyBrief');box.textContent='Özet hazırlanıyor…'
      const {data,error}=await supabase.functions.invoke('food-ops-daily-brief')
      if(error){box.textContent='Günlük özet servisi henüz canlıya alınmadı.';return}
      box.innerHTML=`<b>${esc(data.summary||'')}</b>${(data.warnings||[]).length?`<ul>${data.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}`
    }
  }finally{busy=false}
}

new MutationObserver(()=>inject()).observe(document.body,{childList:true,subtree:true})
setTimeout(inject,0)
