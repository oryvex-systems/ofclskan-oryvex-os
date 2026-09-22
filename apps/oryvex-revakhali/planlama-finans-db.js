(()=>{
let rt=null,pid=null;
const projectId=()=>new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("project_id");
const finance=()=>{try{return JSON.parse(localStorage.getItem("oryvex_finance_snapshot")||"{}")}catch{return {}}};
async function save(){if(!rt?.sb||!pid)return;const f=finance();const day=new Date().toISOString().slice(0,10);const row={project_id:pid,company_id:rt.company_id,employer_earned:Number(f.employer_earned||0),subcontractor_net:Number(f.subcontractor_net||0),collected_amount:Number(f.collected_amount||0),paid_amount:Number(f.paid_amount||0),gross_margin:Number(f.gross_margin||0),cash_difference:Number(f.cash_difference||0),snapshot_date:day};const q=await rt.sb.from("santiye_finance_snapshots").select("id").eq("project_id",pid).eq("company_id",rt.company_id).eq("snapshot_date",day).limit(1);if(q.error){console.warn("ORYVEX Finans lookup",q.error);return;}const r=q.data?.[0]?await rt.sb.from("santiye_finance_snapshots").update(row).eq("id",q.data[0].id):await rt.sb.from("santiye_finance_snapshots").insert(row);if(r.error)console.warn("ORYVEX Finans save",r.error);else console.info("ORYVEX Finans snapshot kaydedildi",day);}
async function start(r){if(!r?.sb||!r?.company_id)return;rt=r;pid=projectId();if(!pid){console.info("ORYVEX Finans: proje seçilmedi, localStorage aktif");return;}setTimeout(save,500);}
window.addEventListener("oryvex:ready",e=>start(e.detail),{once:true});
window.addEventListener("storage",e=>{if(e.key==="oryvex_finance_snapshot")setTimeout(save,250);});
if(window.ORYVEX)start(window.ORYVEX);
})();
