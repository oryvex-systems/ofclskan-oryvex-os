(()=>{
let rt=null,pid=null,events=[];

const $=id=>document.getElementById(id);
const projectId=()=>{
  const q=new URLSearchParams(location.search);
  return q.get("id")||q.get("project_id")||null;
};
const money=n=>new Intl.NumberFormat("tr-TR",{
  style:"currency",
  currency:"TRY",
  maximumFractionDigits:2
}).format(Number(n)||0);

function currentPeriod(){
  let h={};
  try{
    h=JSON.parse(localStorage.getItem("oryvex_hakedis_settings")||"{}");
  }catch(e){}
  return Math.max(1,Math.trunc(Number($("financePaymentNo")?.value||h.no)||1));
}

function setDefaults(){
  const date=$("financeEventDate");
  if(date&&!date.value) date.value=new Date().toISOString().slice(0,10);
  const no=$("financePaymentNo");
  if(no) no.value=currentPeriod();
}

function periodEvents(){
  const no=currentPeriod();
  return events.filter(x=>Number(x.payment_no||1)===no);
}

function syncSnapshot(){
  const rows=periodEvents();
  const collected=rows
    .filter(x=>x.event_type==="cash_in")
    .reduce((t,x)=>t+Number(x.amount||0),0);
  const paid=rows
    .filter(x=>x.event_type==="cash_out")
    .reduce((t,x)=>t+Number(x.amount||0),0);

  if($("financeCollected")) $("financeCollected").textContent=money(collected);
  if($("financePaid")) $("financePaid").textContent=money(paid);
  if($("financeCashBalance")) $("financeCashBalance").textContent=money(collected-paid);

  let f={};
  try{
    f=JSON.parse(localStorage.getItem("oryvex_finance_snapshot")||"{}");
  }catch(e){}

  f.payment_no=currentPeriod();
  f.collected_amount=collected;
  f.paid_amount=paid;
  f.cash_difference=Number(f.employer_earned||0)-Number(f.subcontractor_net||0)+collected-paid;
  f.updated_at=new Date().toISOString();

  localStorage.setItem("oryvex_finance_snapshot",JSON.stringify(f));
  window.dispatchEvent(new CustomEvent("oryvex:finance-updated",{detail:f}));
}

function render(){
  const body=$("financeEventRows");
  if(body){
    body.innerHTML=periodEvents()
      .sort((a,b)=>String(b.event_date||"").localeCompare(String(a.event_date||"")))
      .map(x=>`<tr>
        <td>${x.event_date||""}</td>
        <td>${x.payment_no||""}</td>
        <td>${x.event_type==="cash_in"?"Tahsilat":"Ödeme"}</td>
        <td>${x.note||""}</td>
        <td>${money(x.amount)}</td>
      </tr>`).join("") || `<tr><td colspan="5">Bu döneme ait finans hareketi yok.</td></tr>`;
  }
  syncSnapshot();
}

async function load(){
  if(!rt?.sb||!pid){
    try{
      const local=JSON.parse(localStorage.getItem("oryvex_finance_events")||"[]");
      events=Array.isArray(local)?local:[];
    }catch(e){events=[]}
    render();
    return;
  }

  const q=await rt.sb
    .from("santiye_finance_plan_events")
    .select("id,payment_no,event_date,event_type,amount,note,status,source_type,source_id")
    .eq("project_id",pid)
    .eq("company_id",rt.company_id)
    .order("event_date",{ascending:false});

  if(q.error){
    console.warn("ORYVEX Finans hareket load",q.error);
    return;
  }
  events=q.data||[];
  render();
}

async function save(){
  const amount=Math.max(0,Number($("financeEventAmount")?.value||0));
  if(amount<=0){
    alert("Tutar 0 dan büyük olmalıdır.");
    return;
  }

  const row={
    payment_no:currentPeriod(),
    event_date:$("financeEventDate")?.value||new Date().toISOString().slice(0,10),
    event_type:$("financeEventType")?.value||"cash_in",
    amount,
    note:$("financeEventNote")?.value||"",
    status:"actual",
    source_type:$("financeEventType")?.value==="cash_in"?"employer_collection":"project_payment"
  };

  if(!rt?.sb||!pid){
    row.id="local-"+Date.now();
    events.push(row);
    localStorage.setItem("oryvex_finance_events",JSON.stringify(events));
    render();
    return;
  }

  const payload={
    ...row,
    project_id:pid,
    company_id:rt.company_id
  };

  const r=await rt.sb
    .from("santiye_finance_plan_events")
    .insert(payload)
    .select("id,payment_no,event_date,event_type,amount,note,status,source_type,source_id")
    .single();

  if(r.error){
    console.warn("ORYVEX Finans hareket save",r.error);
    return;
  }

  events.push(r.data);
  $("financeEventAmount").value="0";
  $("financeEventNote").value="";
  render();
}

async function start(r){
  if(r?.sb&&r?.company_id) rt=r;
  pid=projectId();
  setDefaults();
  await load();
}

document.addEventListener("DOMContentLoaded",()=>{
  setDefaults();
  $("financeEventSave")?.addEventListener("click",save);
  $("financePaymentNo")?.addEventListener("change",render);
});

window.addEventListener("oryvex:ready",e=>start(e.detail),{once:true});

if(window.ORYVEX) start(window.ORYVEX);
else if(document.readyState!=="loading") start(null);
})();
