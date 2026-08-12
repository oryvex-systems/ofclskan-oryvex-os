import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('Authorization')||'';
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return json({error:'Giriş yapmalısınız.'},401);
    const admin=createClient(url,service);

    if(req.method==='GET'){
      const {data,error}=await admin.from('orders').select('id,order_no,status,payment_status,payment_method,total_amount,fulfillment_type,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
      if(error)throw error;
      return json({orders:data||[]});
    }

    if(req.method!=='POST')return json({error:'method_not_allowed'},405);
    const body=await req.json();
    const sellerId=String(body.sellerId||'');
    const branchId=String(body.branchId||'');
    const incoming=Array.isArray(body.items)?body.items.filter((x:any)=>x.productId&&Number(x.quantity)>0):[];
    if(!sellerId||!branchId||!incoming.length)throw new Error('Sipariş bilgileri eksik.');

    const [{data:seller},{data:settings},{data:branch}]=await Promise.all([
      admin.from('sellers').select('id,name,is_active').eq('id',sellerId).eq('is_active',true).maybeSingle(),
      admin.from('seller_settings').select('*').eq('seller_id',sellerId).maybeSingle(),
      admin.from('branches').select('*').eq('id',branchId).eq('seller_id',sellerId).eq('is_active',true).maybeSingle()
    ]);
    if(!seller)throw new Error('İşletme aktif değil.');
    if(!branch)throw new Error('Geçerli bir şube seçin.');

    const fulfillment=body.fulfillmentType==='pickup'?'pickup':'delivery';
    const payment=body.paymentMethod==='door_pos'?'door_pos':'paytr';
    if(fulfillment==='delivery'&&!branch.supports_delivery)throw new Error('Bu şube paket servis vermiyor.');
    if(fulfillment==='pickup'&&!branch.supports_pickup)throw new Error('Bu şubede Gel-Al kapalı.');
    if(payment==='door_pos'&&settings&&!settings.door_pos_enabled)throw new Error('Kapıda POS kapalı.');
    if(payment==='paytr'&&settings&&!settings.online_card_enabled)throw new Error('Online ödeme kapalı.');

    const ids=[...new Set(incoming.map((x:any)=>String(x.productId)))];
    const {data:products,error:pe}=await admin.from('products').select('id,name,price').in('id',ids).eq('seller_id',sellerId).eq('is_active',true);
    if(pe)throw pe;
    if((products||[]).length!==ids.length)throw new Error('Sepette satışta olmayan ürün var.');
    const byId=new Map((products||[]).map((p:any)=>[p.id,p]));
    const norm=incoming.map((x:any)=>{const p:any=byId.get(String(x.productId));const q=Math.min(20,Math.max(1,Math.floor(Number(x.quantity)||1)));const selected=Array.isArray(x.selectedOptions)?x.selectedOptions:[];const optionDelta=selected.reduce((sum:number,o:any)=>sum+Number(o.price_delta||0),0);const unit=Number(p.price)+optionDelta;return{product:p,quantity:q,unitPrice:unit,lineTotal:unit*q,selectedOptions:selected}});
    const subtotal=norm.reduce((s:number,x:any)=>s+x.lineTotal,0);
    const minimum=Math.max(Number(branch.minimum_order||0),Number(settings?.minimum_order||0));
    if(subtotal<minimum)throw new Error(`Minimum sipariş tutarı ₺${minimum.toFixed(0)}.`);
    const deliveryFee=fulfillment==='delivery'?Number(branch.delivery_fee||0):0;
    const total=subtotal+deliveryFee;
    const now=new Date();
    const orderNo=`TKD${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;

    const payload={order_no:orderNo,user_id:user.id,seller_id:sellerId,branch_id:branchId,fulfillment_type:fulfillment,status:'received',payment_status:'pending',payment_method:payment,subtotal,delivery_fee:deliveryFee,discount_amount:0,total_amount:total,estimated_min:branch.prep_minutes_min||20,estimated_max:branch.prep_minutes_max||40,delivery_address:fulfillment==='delivery'?String(body.deliveryAddress||'').slice(0,1000)||null:null,customer_note:String(body.customerNote||'').slice(0,500)||null};
    const {data:order,error:oe}=await admin.from('orders').insert(payload).select('id,order_no').single();
    if(oe||!order)throw oe||new Error('Sipariş oluşturulamadı.');
    const {error:ie}=await admin.from('order_items').insert(norm.map((x:any)=>({order_id:order.id,product_id:x.product.id,product_name:x.product.name,quantity:x.quantity,unit_price:x.unitPrice,line_total:x.lineTotal,selected_options:x.selectedOptions})));
    if(ie){await admin.from('orders').delete().eq('id',order.id);throw ie;}
    return json({ok:true,orderId:order.id,orderNo:order.order_no,subtotal,deliveryFee,total,paymentMethod:payment});
  }catch(e){return json({error:e instanceof Error?e.message:'Sipariş işlemi tamamlanamadı.'},400)}
});
