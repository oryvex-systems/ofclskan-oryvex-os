import { supabase } from './supabase.js'

const money=v=>`${Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ₺`
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
const readCart=()=>JSON.parse(localStorage.getItem('tikladoy_cart')||'[]')
const readProfile=()=>JSON.parse(localStorage.getItem('tikladoy_checkout_profile')||'{}')
const saveProfile=p=>localStorage.setItem('tikladoy_checkout_profile',JSON.stringify(p))

async function currentSession(){const {data}=await supabase.auth.getSession();return data.session}

async function loadSellerContext(sellerId){
  const [{data:settings},{data:branches}]=await Promise.all([
    supabase.from('seller_settings').select('*').eq('seller_id',sellerId).maybeSingle(),
    supabase.from('branches').select('id,name,is_active,supports_delivery,supports_pickup,delivery_fee,minimum_order').eq('seller_id',sellerId).eq('is_active',true).order('created_at')
  ])
  return {settings:settings||{},branches:branches||[]}
}

function renderCheckout(root,cart,ctx){
  const profile=readProfile();
  const subtotal=cart.reduce((s,p)=>s+Number(p.unit_price??p.price??0),0)
  const deliveryEnabled=ctx.settings.delivery_enabled!==false
  const pickupEnabled=ctx.settings.pickup_enabled===true
  const onlineEnabled=ctx.settings.online_card_enabled===true
  const doorPosEnabled=ctx.settings.door_pos_enabled===true
  const paymentOptions=[onlineEnabled?'<option value="paytr">Online kart</option>':'',doorPosEnabled?'<option value="door_pos">Kapıda POS</option>':''].join('')
  root.innerHTML=`<section class="simple-v2"><small>ÖDEME</small><h1>Siparişi tamamla</h1><p>Adres, teslimat ve ödeme bilgilerini kontrol et.</p></section><div class="form-v2" id="prodCheckout">
    <input id="pcName" placeholder="Ad Soyad" value="${esc(profile.name||'')}">
    <input id="pcPhone" inputmode="tel" autocomplete="tel" placeholder="Telefon (05xx xxx xx xx)" value="${esc(profile.phone||'')}">
    <select id="pcFulfillment">${deliveryEnabled?'<option value="delivery">Adrese teslim</option>':''}${pickupEnabled?'<option value="pickup">Gel-Al</option>':''}</select>
    <select id="pcBranch">${ctx.branches.map(b=>`<option value="${b.id}" data-fee="${Number(b.delivery_fee||0)}" data-min="${Number(b.minimum_order||0)}">${esc(b.name)}</option>`).join('')}</select>
    <textarea id="pcAddress" rows="4" autocomplete="street-address" placeholder="Teslimat adresi">${esc(profile.address||'')}</textarea>
    <textarea id="pcNote" rows="2" placeholder="Sipariş notu (isteğe bağlı)">${esc(profile.note||'')}</textarea>
    <select id="pcPayment">${paymentOptions||'<option value="">Aktif ödeme yöntemi yok</option>'}</select>
    <div class="panel-v2"><div><span>Ara Toplam</span><b>${money(subtotal)}</b></div><div><span>Teslimat</span><b id="pcFee">0,00 ₺</b></div><div><span>Toplam</span><b id="pcTotal">${money(subtotal)}</b></div></div>
    <div id="pcStatus"></div><button class="checkout-v2" id="pcComplete">Siparişi Onayla</button>
  </div>`

  const fulfillment=root.querySelector('#pcFulfillment'), address=root.querySelector('#pcAddress'), branch=root.querySelector('#pcBranch')
  const feeEl=root.querySelector('#pcFee'), totalEl=root.querySelector('#pcTotal')
  const recalc=()=>{const isDelivery=fulfillment.value==='delivery';address.style.display=isDelivery?'block':'none';const opt=branch.selectedOptions[0];const fee=isDelivery?Number(opt?.dataset.fee||0):0;feeEl.textContent=money(fee);totalEl.textContent=money(subtotal+fee)}
  fulfillment.onchange=recalc;branch.onchange=recalc;recalc()
  root.querySelector('#pcComplete').onclick=()=>completeOrder(root,cart)
}

async function completeOrder(root,cart){
  const status=root.querySelector('#pcStatus'), btn=root.querySelector('#pcComplete')
  const session=await currentSession(); if(!session?.user){status.textContent='Oturum süren doldu. Lütfen yeniden giriş yap.';return}
  const name=root.querySelector('#pcName').value.trim(), phone=root.querySelector('#pcPhone').value.replace(/\s/g,''), fulfillment=root.querySelector('#pcFulfillment').value
  const branch=root.querySelector('#pcBranch'), address=root.querySelector('#pcAddress').value.trim(), note=root.querySelector('#pcNote').value.trim(), payment=root.querySelector('#pcPayment').value
  if(name.length<3){status.textContent='Ad soyad bilgisini gir.';return}
  if(!/^(?:\+90|0)?5\d{9}$/.test(phone)){status.textContent='Geçerli bir cep telefonu gir.';return}
  if(fulfillment==='delivery'&&address.length<10){status.textContent='Teslimat adresini eksiksiz gir.';return}
  if(!branch.value){status.textContent='Aktif şube bulunamadı.';return}
  if(!payment){status.textContent='Şu anda aktif ödeme yöntemi bulunmuyor.';return}

  const sellerId=cart[0]?.seller_id
  if(!sellerId||cart.some(p=>p.seller_id!==sellerId)){status.textContent='Aynı siparişte yalnızca tek işletmenin ürünleri olabilir.';return}
  saveProfile({name,phone,address,note})
  btn.disabled=true;status.textContent='Sipariş güvenli şekilde oluşturuluyor…'

  const items=cart.map(p=>({productId:p.id,quantity:1,selectedOptions:p.selected_options||[]}))
  const {data:order,error}=await supabase.functions.invoke('tikladoy-orders',{body:{sellerId,branchId:branch.value,fulfillmentType:fulfillment,paymentMethod:payment,deliveryAddress:fulfillment==='delivery'?address:null,customerNote:note,items}})
  if(error||!order?.orderId){status.textContent=order?.error||error?.message||'Sipariş oluşturulamadı.';btn.disabled=false;return}

  if(payment==='paytr'){
    status.textContent='Güvenli ödeme sayfası hazırlanıyor…'
    const {data,error:payError}=await supabase.functions.invoke('paytr-create-token',{body:{orderId:order.orderId,userName:name,userAddress:fulfillment==='delivery'?address:'Gel-Al',userPhone:phone}})
    if(payError||!data?.iframeUrl){status.textContent='Online ödeme şu anda başlatılamadı. Sipariş kaydı oluşturuldu; ödeme tamamlanmadan hazırlanmayacaktır.';btn.disabled=false;return}
    localStorage.removeItem('tikladoy_cart')
    location.href=data.iframeUrl
    return
  }

  localStorage.removeItem('tikladoy_cart')
  root.innerHTML=`<section class="success-v2"><div>✓</div><h1>Siparişin Alındı!</h1><p>${esc(order.orderNo)}</p><b>${money(order.total)}</b><p>Ödeme: Kapıda POS</p><button class="checkout-v2" id="pcHome">Ana Sayfaya Dön</button></section>`
  root.querySelector('#pcHome').onclick=()=>location.reload()
}

async function openProductionCheckout(){
  const cart=readCart(); if(!cart.length)return
  const session=await currentSession(); if(!session?.user)return
  const sellerId=cart[0]?.seller_id; if(!sellerId)return
  const ctx=await loadSellerContext(sellerId)
  const app=document.querySelector('#app'); if(app)renderCheckout(app,cart,ctx)
}

document.addEventListener('click',e=>{
  const checkout=e.target.closest?.('#checkout')
  if(checkout){e.preventDefault();e.stopImmediatePropagation();openProductionCheckout()}
},true)

const authObserver=new MutationObserver(()=>{
  const form=document.querySelector('.form-v2');
  if(!form||document.querySelector('#tikladoySocialAuth'))return
  const wrap=document.createElement('div');wrap.id='tikladoySocialAuth';wrap.style.cssText='display:grid;gap:10px;margin-top:12px'
  const google=document.createElement('button');google.type='button';google.className='checkout-v2 secondary';google.textContent='Google ile Devam Et'
  const apple=document.createElement('button');apple.type='button';apple.className='checkout-v2 secondary';apple.textContent='Apple ile Devam Et'
  const status=document.createElement('small');status.style.cssText='display:block;color:#9aa3a3;text-align:center'
  google.onclick=()=>socialLogin('google',status);apple.onclick=()=>socialLogin('apple',status)
  wrap.append(google,apple,status);form.appendChild(wrap)
})
authObserver.observe(document.body,{childList:true,subtree:true})

async function socialLogin(provider,status){
  status.textContent='Yönlendiriliyor…'
  const clean=location.href.split('#')[0].split('?')[0]
  const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:clean}})
  if(error)status.textContent=`Giriş başlatılamadı: ${error.message}`
}
