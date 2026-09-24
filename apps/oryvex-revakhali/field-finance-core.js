(()=>{
"use strict";
const n=v=>{const x=Number(String(v??0).replace(",", "."));return Number.isFinite(x)?x:0};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

function calculate(row={}){
 const planned=Math.max(0,n(row.planned_quantity??row.plannedQty??row.quantity));
 const previous=Math.max(0,n(row.previous_quantity??row.previousQty));
 const today=Math.max(0,n(row.today_quantity??row.todayQty));
 const cumulative=Math.max(0,n(row.cumulative_quantity)||(previous+today));
 const raw=planned>0?(cumulative/planned)*100:0;
 const progress=clamp(raw,0,100);
 const amount=Math.max(0,n(row.work_amount??row.contract_value??row.amount));
 const weight=Math.max(0,n(row.pursantaj_percent??row.pursantaj??row.weight));
 const period=planned>0?clamp((today/planned)*100,0,100):0;
 return {...row,
  planned_quantity:planned,
  previous_quantity:previous,
  today_quantity:today,
  cumulative_quantity:cumulative,
  progress_percent:Number(progress.toFixed(4)),
  cumulative_progress_percent:Number(progress.toFixed(4)),
  period_progress_percent:Number(period.toFixed(4)),
  work_amount:amount,
  cumulative_earned_value:Number((amount*progress/100).toFixed(2)),
  period_earned_value:Number((amount*period/100).toFixed(2)),
  pursantaj_percent:weight,
  weighted_progress:Number((progress*weight/100).toFixed(4)),
  overrun:planned>0&&cumulative>planned,
  overrun_quantity:planned>0&&cumulative>planned?Number((cumulative-planned).toFixed(4)):0
 };
}

function key(row,index){
 return String(row.work_package_id||row.measurement_id||row.item_name||row.work_code||("ROW-"+index)).trim();
}

function latestRows(rows=[]){
 const map=new Map();
 (Array.isArray(rows)?rows:[]).forEach((raw,index)=>{
  const row=calculate(raw),k=key(row,index),old=map.get(k);
  const t=Date.parse(row.updated_at||row.created_at||0)||0;
  const ot=old?(Date.parse(old.updated_at||old.created_at||0)||0):-1;
  if(!old||t>=ot)map.set(k,row);
 });
 return [...map.values()];
}

function summary(rows=[]){
 const normalized=latestRows(rows);
 let contract=0,earned=0,weighted=0,weightTotal=0;
 normalized.forEach(r=>{
  contract+=n(r.work_amount);
  earned+=n(r.cumulative_earned_value);
  weighted+=n(r.weighted_progress);
  weightTotal+=n(r.pursantaj_percent);
 });
 const amountPct=contract>0?(earned/contract)*100:0;
 return {
  rows:normalized,
  contract_value:Number(contract.toFixed(2)),
  earned_value:Number(earned.toFixed(2)),
  physical_progress:Number((weightTotal>0?weighted:amountPct).toFixed(4)),
  pursantaj_total:Number(weightTotal.toFixed(4)),
  overrun_count:normalized.filter(r=>r.overrun).length
 };
}

function periodCertification(rows=[],previousCertified=0){
 const s=summary(rows);
 const previous=Math.max(0,n(previousCertified));
 return {...s,previous_certified:previous,current_certifiable:Number(Math.max(0,s.earned_value-previous).toFixed(2))};
}

function readFieldRows(){
 try{
  const rows=JSON.parse(localStorage.getItem("oryvex_field_progress")||localStorage.getItem("santiye_location_progress")||"[]");
  return Array.isArray(rows)?rows:[];
 }catch(e){return []}
}

window.ORYVEX_FIELD_FINANCE={calculate,latestRows,summary,periodCertification,readFieldRows};
})();