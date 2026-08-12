import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,PATCH,OPTIONS"};
const allowedStatuses=new Set(["received","preparing","courier_assigned","on_the_way","delivered","cancelled"]);
const mutableSettings=new Set(["delivery_enabled","pickup_enabled","online_card_enabled","door_pos_enabled","cash_enabled","minimum_order","free_delivery_threshold","order_notifications_enabled","customer_notifications_enabled"]);
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const url=Deno.env.get("SUPABASE_URL")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader=req.headers.get("Authorization")||"";
    if(!authHeader.startsWith("Bearer ")) return out({error:"Yönetim yetkisi gerekli."},401);

    const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user) return out({error:"Yönetim yetkisi gerekli."},401);

    const admin=createClient(url,service);
    const {data:seller}=await admin.from("sellers").select("id,name").eq("slug","burgermy").maybeSingle();
    if(!seller) return out({error:"BURGERMY mağazası bulunamadı."},404);
    const {data:member}=await admin.from("seller_members").select("role").eq("seller_id",seller.id).eq("user_id",user.id).eq("is_active",true).maybeSingle();
    if(!member||!["owner","manager","kitchen"].includes(member.role)) return out({error:"Yönetim yetkisi gerekli."},403);

    if(req.method==="GET"){
      const [{data:orders,error:oe},{data:settings,error:se},{data:branches,error:be}]=await Promise.all([
        admin.from("orders").select("id,order_no,status,payment_status,payment_method,total_amount,fulfillment_type,estimated_min,estimated_max,created_at,branch_id").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(100),
        admin.from("seller_settings").select("*").eq("seller_id",seller.id).maybeSingle(),
        admin.from("branches").select("id,name,slug,is_active,supports_delivery,supports_pickup,delivery_fee,minimum_order").eq("seller_id",seller.id).order("created_at",{ascending:true})
      ]);
      if(oe||se||be) return out({error:"Yönetim verileri alınamadı."},502);
      return out({role:member.role,email:user.email??null,seller,orders:orders??[],settings:settings??null,branches:branches??[]});
    }

    if(req.method==="PATCH"){
      const body=await req.json();
      if(body.action==="order_status"){
        if(!body.orderId||!body.status||!allowedStatuses.has(body.status)) return out({error:"Geçersiz sipariş durumu."},400);
        const {data,error}=await admin.from("orders").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",body.orderId).eq("seller_id",seller.id).select().maybeSingle();
        if(error) return out({error:"Sipariş durumu güncellenemedi."},502);
        return out({ok:true,order:data??null});
      }
      if(body.action==="settings"){
        if(!["owner","manager"].includes(member.role)) return out({error:"Bu ayar için yönetici yetkisi gerekli."},403);
        const incoming=body.settings&&typeof body.settings==="object"?body.settings:{};
        const update:Record<string,unknown>={updated_at:new Date().toISOString()};
        for(const [key,value] of Object.entries(incoming)) if(mutableSettings.has(key)) update[key]=value;
        const {data,error}=await admin.from("seller_settings").update(update).eq("seller_id",seller.id).select().maybeSingle();
        if(error) return out({error:"Ayarlar güncellenemedi."},502);
        return out({ok:true,settings:data??null});
      }
      return out({error:"Geçersiz yönetim işlemi."},400);
    }

    return out({error:"method_not_allowed"},405);
  }catch(e){return out({error:e instanceof Error?e.message:"Yönetim işlemi tamamlanamadı."},500)}
});
