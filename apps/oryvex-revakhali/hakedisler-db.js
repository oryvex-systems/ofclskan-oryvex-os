(()=>{
let rt=null,pid=null;
const el=id=>document.getElementById(id);
const num=id=>Number(el(id)?.value||0);
const projectId=()=>new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("project_id");
async function start(r){if(!r?.sb||!r?.company_id)return;rt=r;pid=projectId();if(!pid){console.info("ORYVEX Hakediş: localStorage aktif");return;}await load();}
async function load(){const q=await rt.sb.from("santiye_employer_payments").select("*").eq("project_id",pid).eq("company_id",rt.company_id).order("payment_no",{ascending:false}).limit(1);
if(q.error){console.warn("ORYVEX Hakediş load",q.error);return;}
const x=q.data?.[0];if(!x)return;
const set=(id,v)=>{if(el(id)&&v!==null&&v!==undefined)el(id).value=v};
set("no",x.payment_no);set("period",x.period_label);set("contract",x.contract_amount);set("progress",x.period_progress_percent);set("cumProgress",x.cumulative_progress_percent);
set("vat",x.vat_percent);set("withholding",x.vat_withholding_percent);set("retention",x.retention_percent);set("ssk",x.ssk_percent);set("tax",x.tax_percent);set("otherPct",x.other_cut_percent);
set("advanceCut",x.advance_offset);set("previousPaid",x.previous_payment);
el("calc")?.click();
}
async function save(){if(!rt?.sb||!pid)return;
const row={project_id:pid,company_id:rt.company_id,payment_no:Math.max(1,Math.trunc(num("no")||1)),period_label:el("period")?.value||"",contract_amount:num("contract"),period_progress_percent:num("progress"),cumulative_progress_percent:num("cumProgress"),gross_amount:num("base"),vat_percent:num("vat"),vat_withholding_percent:num("withholding"),retention_percent:num("retention"),ssk_percent:num("ssk"),tax_percent:num("tax"),other_cut_percent:num("otherPct"),advance_offset:num("advanceCut"),previous_payment:num("previousPaid"),net_amount:num("net"),status:"draft",updated_at:new Date().toISOString()};
const q=await rt.sb.from("santiye_employer_payments").select("id").eq("project_id",pid).eq("company_id",rt.company_id).eq("payment_no",row.payment_no).limit(1);
if(q.error){console.warn("ORYVEX Hakediş lookup",q.error);return;}
const r=q.data?.[0]?await rt.sb.from("santiye_employer_payments").update(row).eq("id",q.data[0].id):await rt.sb.from("santiye_employer_payments").insert(row);
if(r.error)console.warn("ORYVEX Hakediş save",r.error);else console.info("ORYVEX Hakediş kaydedildi",row.payment_no);
}
el("calc")?.addEventListener("click",()=>setTimeout(save,100));
window.addEventListener("oryvex:ready",e=>start(e.detail),{once:true});
if(window.ORYVEX)start(window.ORYVEX);
})();
