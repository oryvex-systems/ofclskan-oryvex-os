import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('Authorization')||'';
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await userClient.auth.getUser(); if(!user) return new Response(JSON.stringify({error:'Giriş yapmalısınız.'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
  const admin=createClient(url,service);
  if(req.method==='GET'){
   const {data,error}=await admin.from('orders').select('id,order_no,status,payment_status,payment_method,subtotal,delivery_fee,total_amount,fulfillment_type,estimated_min,estimated_max,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);
   if(error)throw error; return new Response(JSON.stringify({orders:data||[]}),{headers:{...cors,'Content-Type':'application/json'}});
  }
  const body=await req.json(); const incoming=Array.isArray(body.items)?body.items.filter((x:any)=>x.productId&&Number(x.quantity)>0):[]; if(!incoming.length)throw new Error('Sepet boş.');
  const {data:sellers}=await admin.from('sellers').select('id').eq('slug','burgermy').limit(1); const seller=sellers?.[0]; if(!seller)throw new Error('BURGERMY mağazası bulunamadı.');
  const [{data:settingsRows},{data:branchRows}]=await Promise.all([admin.from('seller_settings').select('*').eq('seller_id',seller.id).limit(1),admin.from('branches').select('*').eq('id',body.branchId).eq('seller_id',seller.id).eq('is_active',true).limit(1)]);
  const settings=settingsRows?.[0], branch=branchRows?.[0]; if(!branch)throw new Error('Geçerli bir şube seçin.');
  const fulfillment=body.fulfillmentType==='pickup'?'pickup':'delivery'; const payment=['cash','door_pos'].includes(body.paymentMethod)?body.paymentMethod:'paytr';
  if(fulfillment==='delivery'&&!branch.supports_delivery)throw new Error('Bu şube paket servis vermiyor.'); if(fulfillment==='pickup'&&!branch.supports_pickup)throw new Error('Bu şubede Gel-Al kapalı.');
  if(payment==='cash'&&settings&&!settings.cash_enabled)throw new Error('Kapıda nakit ödeme kapalı.'); if(payment==='door_pos'&&settings&&!settings.door_pos_enabled)throw new Error('Kapıda POS kapalı.'); if(payment==='paytr'&&settings&&!settings.online_card_enabled)throw new Error('Online ödeme kapalı.');
  const ids=[...new Set(incoming.map((x:any)=>x.productId))]; const {data:products,error:pe}=await admin.from('products').select('id,name,price').in('id',ids).eq('seller_id',seller.id).eq('is_active',true); if(pe)throw pe; if((products||[]).length!==ids.length)throw new Error('Sepette satışta olmayan ürün var.');
  const byId=new Map((products||[]).map((p:any)=>[p.id,p])); const norm=incoming.map((x:any)=>{const p:any=byId.get(x.productId);const q=Math.min(20,Math.max(1,Math.floor(Number(x.quantity))));const unit=Number(p.price);return{product:p,quantity:q,unitPrice:unit,lineTotal:unit*q,selectedOptions:x.selectedOptions||[]}});
  const subtotal=norm.reduce((a:number,x:any)=>a+x.lineTotal,0); const min=Math.max(Number(branch.minimum_order||0),Number(settings?.minimum_order||0)); if(subtotal<min)throw new Error(`Minimum sipariş tutarı ₺${min.toFixed(0)}.`);
  const deliveryFee=fulfillment==='delivery'?Number(branch.delivery_fee||0):0,total=subtotal+deliveryFee,now=new Date(),orderNo=`BM${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const {data:orders,error:oe}=await admin.from('orders').insert({order_no:orderNo,user_id:user.id,seller_id:seller.id,branch_id:branch.id,fulfillment_type:fulfillment,status:'received',payment_status:'pending',payment_method:payment,subtotal,delivery_fee:deliveryFee,discount_amount:0,total_amount:total,estimated_min:branch.prep_minutes_min,estimated_max:branch.prep_minutes_max,customer_note:String(body.customerNote||'').slice(0,500)||null}).select('id,order_no'); if(oe||!orders?.[0])throw oe||new Error('Sipariş oluşturulamadı.'); const order=orders[0];
  const {error:ie}=await admin.from('order_items').insert(norm.map((x:any)=>({order_id:order.id,product_id:x.product.id,product_name:x.product.name,quantity:x.quantity,unit_price:x.unitPrice,selected_options:x.selectedOptions,line_total:x.lineTotal}))); if(ie){await admin.from('orders').delete().eq('id',order.id);throw ie;}
  return new Response(JSON.stringify({ok:true,orderId:order.id,orderNo:order.order_no,subtotal,deliveryFee,total,paymentMethod:payment}),{headers:{...cors,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'orders_error'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
});