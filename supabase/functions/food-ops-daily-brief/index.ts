import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('Authorization')||'';
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await userClient.auth.getUser();
    if(!user)return json({error:'Giriş yapmalısınız.'},401);
    const admin=createClient(url,service);
    const {data:members}=await admin.from('seller_members').select('seller_id,role,sellers(name,slug)').eq('user_id',user.id).eq('is_active',true);
    const sellerIds=(members||[]).map((m:any)=>m.seller_id);
    if(!sellerIds.length)return json({summary:'Yetkili olduğunuz marka bulunamadı.',brands:[]});
    const today=new Date().toISOString().slice(0,10);
    const [{data:sales},{data:tasks},{data:incidents},{data:stock},{data:support}]=await Promise.all([
      admin.from('ops_sales_daily').select('*').in('seller_id',sellerIds).eq('metric_date',today),
      admin.from('ops_tasks').select('seller_id,priority,status,title').in('seller_id',sellerIds).not('status','in','("done","cancelled")'),
      admin.from('ops_incidents').select('seller_id,severity,status,title').in('seller_id',sellerIds).not('status','in','("resolved","closed")'),
      admin.from('ops_stock_items').select('seller_id,name,current_qty,minimum_qty,unit').in('seller_id',sellerIds).eq('is_active',true),
      admin.from('ops_support_tickets').select('seller_id,priority,status,subject').in('seller_id',sellerIds).not('status','in','("resolved","closed")')
    ]);
    const brands=(members||[]).map((m:any)=>{
      const rows=(sales||[]).filter((x:any)=>x.seller_id===m.seller_id);
      const orders=rows.reduce((s:number,x:any)=>s+Number(x.orders_count||0),0);
      const revenue=rows.reduce((s:number,x:any)=>s+Number(x.gross_revenue||0),0);
      const openTasks=(tasks||[]).filter((x:any)=>x.seller_id===m.seller_id).length;
      const critical=(incidents||[]).filter((x:any)=>x.seller_id===m.seller_id&&['high','critical'].includes(x.severity)).length;
      const lowStock=(stock||[]).filter((x:any)=>x.seller_id===m.seller_id&&Number(x.current_qty)<=Number(x.minimum_qty)).length;
      const openSupport=(support||[]).filter((x:any)=>x.seller_id===m.seller_id).length;
      return {sellerId:m.seller_id,name:m.sellers?.name||'Marka',slug:m.sellers?.slug||'',orders,revenue,openTasks,critical,lowStock,openSupport};
    });
    const totals=brands.reduce((a:any,b:any)=>({orders:a.orders+b.orders,revenue:a.revenue+b.revenue,openTasks:a.openTasks+b.openTasks,critical:a.critical+b.critical,lowStock:a.lowStock+b.lowStock,openSupport:a.openSupport+b.openSupport}),{orders:0,revenue:0,openTasks:0,critical:0,lowStock:0,openSupport:0});
    const warnings:string[]=[];
    if(totals.critical)warnings.push(`${totals.critical} kritik/yüksek olay açık.`);
    if(totals.lowStock)warnings.push(`${totals.lowStock} stok kalemi minimum seviyede veya altında.`);
    if(totals.openSupport)warnings.push(`${totals.openSupport} müşteri destek kaydı açık.`);
    if(totals.openTasks)warnings.push(`${totals.openTasks} operasyon görevi tamamlanmayı bekliyor.`);
    return json({date:today,totals,brands,warnings,summary:`Bugün ${totals.orders} sipariş ve ₺${totals.revenue.toFixed(2)} ciro. ${warnings.join(' ')||'Kritik operasyon uyarısı yok.'}`});
  }catch(e){return json({error:e instanceof Error?e.message:'Özet oluşturulamadı.'},500)}
});
