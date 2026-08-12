import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const db=createClient(url,key);
  const {data:sellers,error:sellerErr}=await db.from('sellers').select('id').eq('slug','burgermy').limit(1);
  if(sellerErr||!sellers?.[0]) throw new Error('BURGERMY mağazası bulunamadı');
  const sellerId=sellers[0].id;
  const [{data:products,error:pe},{data:branches,error:be},{data:settings}]=await Promise.all([
   db.from('products').select('id,name,description,price,image_url,metadata').eq('seller_id',sellerId).eq('is_active',true).order('created_at'),
   db.from('branches').select('id,name,slug,full_address,district,delivery_fee,minimum_order,supports_delivery,supports_pickup,prep_minutes_min,prep_minutes_max').eq('seller_id',sellerId).eq('is_active',true).order('created_at'),
   db.from('seller_settings').select('delivery_enabled,pickup_enabled,online_card_enabled,door_pos_enabled,cash_enabled,minimum_order,free_delivery_threshold').eq('seller_id',sellerId).limit(1)
  ]);
  if(pe||be) throw pe||be;
  const s=settings?.[0];
  return new Response(JSON.stringify({
   products:(products||[]).map((p:any)=>({id:p.id,name:p.name,desc:p.description||'',price:Number(p.price),image:(p.image_url||'/products/classic.webp').replace(/\.png$/,'.webp'),badge:p.metadata?.badge})),
   branches:(branches||[]).map((b:any)=>({id:b.id,name:b.name,slug:b.slug,address:b.full_address||b.district||'',district:b.district||'',deliveryFee:Number(b.delivery_fee||0),minimumOrder:Number(b.minimum_order||0),supportsDelivery:b.supports_delivery,supportsPickup:b.supports_pickup,prepMin:b.prep_minutes_min,prepMax:b.prep_minutes_max})),
   operations:s?{deliveryEnabled:s.delivery_enabled,pickupEnabled:s.pickup_enabled,onlineCardEnabled:s.online_card_enabled,doorPosEnabled:s.door_pos_enabled,cashEnabled:s.cash_enabled,minimumOrder:Number(s.minimum_order||0),freeDeliveryThreshold:s.free_delivery_threshold==null?null:Number(s.free_delivery_threshold)}:{deliveryEnabled:true,pickupEnabled:true,onlineCardEnabled:true,doorPosEnabled:false,cashEnabled:false,minimumOrder:150,freeDeliveryThreshold:null}
  }),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'public,max-age=60'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'catalog_error'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
});