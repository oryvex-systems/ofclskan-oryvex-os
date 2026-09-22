(()=>{
let rt=null,pid=null,contractRow=null;
const el=id=>document.getElementById(id);
const num=id=>Number(el(id)?.value||0);
const projectId=()=>new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("project_id");
async function start(r){if(!r?.sb||!r?.company_id)return;rt=r;pid=projectId();if(!pid){console.info("ORYVEX Taşeron: proje seçilmedi, localStorage aktif");return;}await loadContracts();}
async function loadContracts(){const q=await rt.sb.from("santiye_subcontractor_contracts").select("id,project_id,subcontractor_id,scope,contract_amount,status,santiye_subcontractors(name)").eq("project_id",pid);if(q.error){console.warn("ORYVEX sözleşme load",q.error);return;}window.oryvexSubcontracts=q.data||[];console.info("ORYVEX taşeron sözleşmeleri",window.oryvexSubcontracts.length);bindContracts();}
function bindContracts(){if(!window.oryvexSubcontracts?.length)return;const first=el("contract");if(!first)return;let s=document.getElementById("contractSelect");if(!s){s=document.createElement("select");s.id="contractSelect";first.parentElement.before(s);}s.innerHTML="<option value=\"\">Taşeron sözleşmesi seç</option>";window.oryvexSubcontracts.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=(x.santiye_subcontractors?.name||"Taşeron")+" · "+x.scope;s.appendChild(o);});s.onchange=()=>selectContract(s.value);}
function selectContract(id){contractRow=window.oryvexSubcontracts.find(x=>x.id===id)||null;if(!contractRow)return;el("contract").value=Number(contractRow.contract_amount||0);if(el("name"))el("name").value=contractRow.santiye_subcontractors?.name||"";}
async function save(){if(!rt?.sb||!pid||!contractRow)return;
const period=Math.max(1,Number(el("periodNo")?.value||1));
const row={contract_id:contractRow.id,project_id:pid,company_id:rt.company_id,subcontractor_id:contractRow.subcontractor_id,period_no:period,period_progress_percent:num("periodPct"),cumulative_progress_percent:num("cumPct"),gross_amount:num("gross"),vat_percent:num("vat"),withholding_percent:num("withholding"),retention_percent:num("retention"),ssk_percent:num("ssk"),tax_percent:num("tax"),other_deduction_percent:num("otherPct"),advance_offset:num("advance"),fixed_deduction:num("fixedCut"),net_amount:num("net"),amount:num("net"),title:(contractRow.scope||"Taşeron Hakedişi")+" - "+period,status:"draft",updated_at:new Date().toISOString()};
const q=await rt.sb.from("santiye_subcontractor_payments").select("id").eq("contract_id",contractRow.id).eq("period_no",period).limit(1);
if(q.error){console.warn("ORYVEX Taşeron lookup",q.error);return;}
const r=q.data?.[0]?await rt.sb.from("santiye_subcontractor_payments").update(row).eq("id",q.data[0].id):await rt.sb.from("santiye_subcontractor_payments").insert(row);
if(r.error)console.warn("ORYVEX Taşeron save",r.error);else console.info("ORYVEX Taşeron hakedişi kaydedildi",period);
}
async function save(){if(!rt?.sb||!pid||!contractRow)return;
const period=Math.max(1,Number(el("periodNo")?.value||1));
const row={contract_id:contractRow.id,project_id:pid,company_id:rt.company_id,subcontractor_id:contractRow.subcontractor_id,period_no:period,period_progress_percent:num("periodPct"),cumulative_progress_percent:num("cumPct"),gross_amount:num("gross"),vat_percent:num("vat"),withholding_percent:num("withholding"),retention_percent:num("retention"),ssk_percent:num("ssk"),tax_percent:num("tax"),other_deduction_percent:num("otherPct"),advance_offset:num("advance"),fixed_deduction:num("fixedCut"),net_amount:num("net"),amount:num("net"),title:(contractRow.scope||"Taşeron Hakedişi")+" - "+period,status:"draft",updated_at:new Date().toISOString()};
const q=await rt.sb.from("santiye_subcontractor_payments").select("id").eq("contract_id",contractRow.id).eq("period_no",period).limit(1);
if(q.error){console.warn("ORYVEX Taşeron lookup",q.error);return;}
const r=q.data?.[0]?await rt.sb.from("santiye_subcontractor_payments").update(row).eq("id",q.data[0].id):await rt.sb.from("santiye_subcontractor_payments").insert(row);
if(r.error)console.warn("ORYVEX Taşeron save",r.error);else console.info("ORYVEX Taşeron hakedişi kaydedildi",period);
}
document.addEventListener("click",e=>{if(e.target?.matches("button[onclick=\"calc()\"]"))setTimeout(save,150);});
window.addEventListener("oryvex:ready",e=>start(e.detail),{once:true});
if(window.ORYVEX)start(window.ORYVEX);
})();
