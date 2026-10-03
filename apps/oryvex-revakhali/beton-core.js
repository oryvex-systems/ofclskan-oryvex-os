/* ORYVEX_BETON_ZEMIN_V14_4 */
(() => {
'use strict';

const U='https://wdimzayfvtlrxljpsvza.supabase.co';
const K='sb_publishable_FZwX09JGrJt3Q9WXW3V1dQ_-g9aegh4';

const sb=window.supabase.createClient(U,K);
const $=id=>document.getElementById(id);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const num=v=>Number(v||0);

const m3=v=>new Intl.NumberFormat('tr-TR',{
  minimumFractionDigits:0,
  maximumFractionDigits:3
}).format(num(v))+' m³';

const trDate=v=>{
  if(!v) return '-';
  const parts=String(v).slice(0,10).split('-');
  if(parts.length!==3) return String(v);
  return parts[2]+'.'+parts[1]+'.'+parts[0];
};

let session=null;
let companyId=null;
let projectId=null;
let project=null;
let role='viewer';
let planned=4400;

let pours=[];
let slips=[];

const selected=new Set();


/* ORYVEX_V85_SAFE_CLASSIFICATION_DEFAULTS */

/* ORYVEX_V91_LIVE_GUARD */

function betonLiveMode(){
  try{
    return new URLSearchParams(location.search).get('mode') === 'live';
  }catch(_){
    return false;
  }
}

function betonHasAuthenticatedSession(){
  return !!(
    typeof session !== 'undefined' &&
    session &&
    session.user &&
    session.user.id
  );
}

function betonSetLiveStatus(message, kind){
  const el =
    document.getElementById('cloudStatus') ||
    document.getElementById('cloud') ||
    document.querySelector('[data-cloud-status]');

  if(!el) return;

  el.textContent = message;

  if(kind){
    el.dataset.status = kind;
  }
}

function betonApplyWriteGuard(){
  const live = betonLiveMode();
  const authenticated = betonHasAuthenticatedSession();

  const assign =
    document.getElementById('assignBtn');

  const savePour =
    document.getElementById('saveBtn');

  const saveSlip =
    document.getElementById('slipSaveBtn');

  if(live && !authenticated){
    if(assign){
      assign.disabled = true;
      assign.title =
        'Canlı kayıt için yetkili Supabase oturumu gerekli.';
    }

    if(savePour){
      savePour.disabled = true;
      savePour.title =
        'Canlı kayıt için yetkili Supabase oturumu gerekli.';
    }

    if(saveSlip){
      saveSlip.disabled = true;
      saveSlip.title =
        'Canlı kayıt için yetkili Supabase oturumu gerekli.';
    }

    betonSetLiveStatus(
      '● CANLI OTURUM YOK · YAZMA KAPALI',
      'locked'
    );

    return false;
  }

  if(live && authenticated){
    if(savePour){
      savePour.disabled = false;
      savePour.title = '';
    }

    if(saveSlip){
      saveSlip.disabled = false;
      saveSlip.title = '';
    }

    betonSetLiveStatus(
      '● CANLI SUPABASE · YETKİLİ OTURUM',
      'live'
    );
  }

  return true;
}

function betonGuardWriteAction(){
  if(
    betonLiveMode() &&
    !betonHasAuthenticatedSession()
  ){
    betonApplyWriteGuard();

    alert(
      'Canlı veriye kayıt için yetkili Supabase oturumu gerekli.'
    );

    return false;
  }

  return true;
}

function resetConcreteClassificationDefaults(){
  const scope =
    document.getElementById('classScope') ||
    document.getElementById('scopeType') ||
    document.getElementById('classificationScope');

  const workGroup =
    document.getElementById('classWorkGroup') ||
    document.getElementById('workGroup');

  const workItem =
    document.getElementById('classWorkItem') ||
    document.getElementById('workItem');

  const costCenter =
    document.getElementById('classCostCenter') ||
    document.getElementById('costCenter');

  if(scope){
    const unclassified =
      Array.from(scope.options || [])
        .find(o => String(o.value || '').toUpperCase() === 'UNCLASSIFIED');

    if(unclassified){
      scope.value = unclassified.value;
    }else{
      scope.selectedIndex = 0;
    }
  }

  if(workGroup){
    const atanacak =
      Array.from(workGroup.options || [])
        .find(o =>
          String(o.value || '').toLocaleLowerCase('tr-TR') ===
          'atanacak'
        );

    if(atanacak){
      workGroup.value = atanacak.value;
    }else{
      workGroup.selectedIndex = 0;
    }
  }

  if(workItem){
    workItem.value = '';
  }

  if(costCenter){
    const empty =
      Array.from(costCenter.options || [])
        .find(o => String(o.value || '') === '');

    const atanacak =
      Array.from(costCenter.options || [])
        .find(o =>
          String(o.value || '').toLocaleLowerCase('tr-TR') ===
          'atanacak'
        );

    if(empty){
      costCenter.value = '';
    }else if(atanacak){
      costCenter.value = atanacak.value;
    }else{
      costCenter.selectedIndex = 0;
    }
  }
}

async function authenticate(){
  const {
    data:{session:s},
    error:sessionError
  }=await sb.auth.getSession();

  if(sessionError){
    throw sessionError;
  }

  session=s;

  if(!s){
    session=null;
    companyId=null;
    role='viewer';

    return false;
  }

  const [
    {data:user,error:userError},
    {data:member,error:memberError}
  ]=await Promise.all([
    sb.from('santiye_internal_users')
      .select('role,active')
      .eq('auth_user_id',s.user.id)
      .maybeSingle(),

    sb.from('santiye_company_members')
      .select('company_id,role,active')
      .eq('user_id',s.user.id)
      .eq('active',true)
      .limit(1)
      .maybeSingle()
  ]);

  if(userError){
    throw userError;
  }

  if(memberError){
    throw memberError;
  }

  if(!user?.active || !member?.company_id){
    companyId=null;
    role='viewer';

    return false;
  }

  role=
    user.role ||
    member.role ||
    'viewer';

  companyId=member.company_id;

  updateBetonReceiptVisionState();
  return true;
}

async function resolveProject(){
  const params=new URLSearchParams(location.search);
  const requested=params.get('project_id') || params.get('id');

  let data=null;
  let error=null;

  if(requested){
    ({data,error}=await sb.from('santiye_projects')
      .select('*')
      .eq('id',requested)
      .eq('company_id',companyId)
      .maybeSingle());

    if(error) throw error;
    if(!data) throw new Error('Projeye erişilemiyor.');
  }else{
    ({data,error}=await sb.from('santiye_projects')
      .select('*')
      .eq('company_id',companyId)
      .ilike('name','%Taşpazar%')
      .limit(1)
      .maybeSingle());

    if(error) throw error;
    if(!data) throw new Error('Taşpazar Camii projesi bulunamadı.');

    const u=new URL(location.href);
    u.searchParams.set('id',data.id);
    history.replaceState({},'',u);
  }

  project=data;
  projectId=data.id;

  $('projectName').textContent=project.name;
  $('projectLocation').textContent=
    project.location || 'TAŞPAZAR CAMİİ ŞANTİYESİ';
}

async function loadSettings(){
  const {data,error}=await sb.from('santiye_concrete_settings')
    .select('planned_concrete_m3')
    .eq('project_id',projectId)
    .maybeSingle();

  if(error) throw error;

  planned=num(data?.planned_concrete_m3 || 4400);
}

async function loadPours(){
  const {data,error}=await sb.from('santiye_concrete_pours')
    .select('*')
    .eq('project_id',projectId)
    .order('pour_date',{ascending:false})
    .order('created_at',{ascending:false});

  if(error) throw error;

  pours=data || [];
}

async function loadSlips(){
  const {data,error}=await sb.from('santiye_concrete_slips')
    .select('*')
    .eq('project_id',projectId)
    .order('slip_date',{ascending:false})
    .order('created_at',{ascending:false});

  if(error) throw error;

  slips=data || [];

  for(const id of [...selected]){
    if(!slips.some(x=>x.id===id)) selected.delete(id);
  }
}

function pourMap(){
  return new Map(pours.map(x=>[x.id,x]));
}

function classificationForSlip(slip,map){
  if(!slip.pour_id) return 'UNCLASSIFIED';

  const pour=map.get(slip.pour_id);

  if(!pour) return 'UNCLASSIFIED';

  if(pour.scope_type==='PROJECT') return 'PROJECT';
  if(pour.scope_type==='NON_PROJECT') return 'NON_PROJECT';

  return 'UNCLASSIFIED';
}

function totals(){
  const map=pourMap();

  let projectM3=0;
  let outsideM3=0;
  let unclassifiedM3=0;
  let total=0;

  for(const slip of slips){
    const q=num(slip.quantity_m3);

    total+=q;

    const type=classificationForSlip(slip,map);

    if(type==='PROJECT') projectM3+=q;
    else if(type==='NON_PROJECT') outsideM3+=q;
    else unclassifiedM3+=q;
  }

  return {
    projectM3,
    outsideM3,
    unclassifiedM3,
    total,
    remaining:Math.max(0,planned-projectM3),
    pct:planned ? projectM3/planned*100 : 0
  };
}

function linkedM3(pourId){
  return slips
    .filter(x=>x.pour_id===pourId)
    .reduce((a,x)=>a+num(x.quantity_m3),0);
}

function classificationLabel(type){
  if(type==='PROJECT') return 'PROJE';
  if(type==='NON_PROJECT') return 'PROJE DIŞI';
  return 'ATANACAK';
}

function classificationLong(type){
  if(type==='PROJECT') return 'PROJE / İMALAT BETONU';
  if(type==='NON_PROJECT') return 'PROJE DIŞI / ŞANTİYE GİDERİ';
  return 'SINIFLANDIRILMAMIŞ';
}

function renderDashboard(){
  const t=totals();

  $('planned').textContent=m3(planned);
  $('projectUsed').textContent=m3(t.projectM3);
  $('remaining').textContent=m3(t.remaining);
  $('usage').textContent='%'+t.pct.toFixed(2);
  $('outside').textContent=m3(t.outsideM3);
  $('unclassified').textContent=m3(t.unclassifiedM3);
  $('total').textContent=m3(t.total);
  $('usageBar').style.width=Math.min(100,t.pct)+'%';
}

function renderPours(){
  if(!pours.length){
    $('records').innerHTML=
      '<div class="empty">Henüz döküm / kullanım yeri oluşturulmadı.</div>';
    return;
  }

  $('records').innerHTML=pours.map(r=>{
    const q=linkedM3(r.id);
    const slipCount=slips.filter(x=>x.pour_id===r.id).length;

    return `
      <div class="record">
        <div>
          <strong>
            ${esc(
              r.work_item ||
              r.work_group ||
              'Kullanım yeri belirtilmedi'
            )}
          </strong>

          <small>
            ${classificationLong(r.scope_type)}
            ${r.work_group ? ' · '+esc(r.work_group) : ''}
          </small>

          <small>
            Masraf Merkezi:
            ${esc(r.cost_center || 'Atanacak')}
          </small>

          <small>
            ${trDate(r.pour_date)}
            ${r.concrete_class ? ' · '+esc(r.concrete_class) : ''}
            · ${m3(q)}
          </small>

          <small>
            ${slipCount} beton fişi bağlı
            ${r.supplier_name ? ' · '+esc(r.supplier_name) : ''}
          </small>
        </div>

        <span class="tag ${
          r.scope_type==='PROJECT'
            ? 'project'
            : r.scope_type==='NON_PROJECT'
              ? 'outside'
              : 'unclassified'
        }">
          ${classificationLabel(r.scope_type)}
        </span>
      </div>
    `;
  }).join('');
}

function renderSlips(){
  const map=pourMap();

  if(!slips.length){
    $('slipRows').innerHTML=
      '<tr><td colspan="10"><div class="empty">Henüz beton fişi yok.</div></td></tr>';
    renderSelection();
    return;
  }

  $('slipRows').innerHTML=slips.map(s=>{
    const type=classificationForSlip(s,map);
    const pour=s.pour_id ? map.get(s.pour_id) : null;

    return `
      <tr
        class="slip-row"
        data-slip-row="${esc(s.id)}"
        style="cursor:pointer"
      >
        <td>
          <input
            class="check slip-check"
            type="checkbox"
            data-slip-id="${esc(s.id)}"
            ${selected.has(s.id)?'checked':''}
          >
        </td>

        <td>
          <strong>${esc(s.slip_no)}</strong>
          ${s.production_start || s.production_finish
            ? `<small>${esc(s.production_start || '')} → ${esc(s.production_finish || '')}</small>`
            : ''
          }
        </td>

        <td>${trDate(s.slip_date)}</td>

        <td><strong>${m3(s.quantity_m3)}</strong></td>

        <td>${esc(s.concrete_class || '-')}</td>

        <td>${esc(s.supplier_name || '-')}</td>

        <td>
          ${esc(s.vehicle_plate || '-')}
          <small>${esc(s.driver_name || '')}</small>
        </td>

        <td>${esc(s.printed_site_name || '-')}</td>

        <td>${esc(s.actual_site_name || '-')}</td>

        <td>
          <span class="tag ${
            type==='PROJECT'
              ? 'project'
              : type==='NON_PROJECT'
                ? 'outside'
                : 'unclassified'
          }">
            ${classificationLabel(type)}
          </span>

          ${pour
            ? `<small>${esc(pour.work_group || '')}${pour.work_item ? ' · '+esc(pour.work_item) : ''}</small>`
            : '<small>Döküme bağlanmadı</small>'
          }
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.slip-check').forEach(box=>{
    box.addEventListener('click',e=>{
      e.stopPropagation();
    });

    box.addEventListener('change',()=>{
      const id=box.dataset.slipId;

      if(box.checked){
        selected.add(id);
      }else{
        selected.delete(id);
      }

      renderSelection();
    });
  });

  document.querySelectorAll('.slip-row').forEach(row=>{
    row.addEventListener('click',e=>{
      if(
        e.target.closest(
          'input,button,a,select,textarea,label'
        )
      ){
        return;
      }

      const id=row.dataset.slipRow;

      const box=row.querySelector(
        '.slip-check'
      );

      if(!id || !box){
        return;
      }

      box.checked=!box.checked;

      if(box.checked){
        selected.add(id);
      }else{
        selected.delete(id);
      }

      renderSelection();
    });
  });

  renderSelection();
}

function renderSelection(){
  const chosen=slips.filter(x=>selected.has(x.id));
  const q=chosen.reduce((a,x)=>a+num(x.quantity_m3),0);

  $('selectedCount').textContent=chosen.length;
  $('selectedM3').textContent=m3(q);
  $('assignBtn').disabled=!chosen.length;
}

function render(){
  renderDashboard();
  renderPours();
  renderSlips();
  syncBetonReportData();
}

async function reload(){
  await Promise.all([
    loadSettings(),
    loadPours(),
    loadSlips()
  ]);

  render();
}

async function savePour(e){
  if(!betonGuardWriteAction()) return;
  e.preventDefault();

  const f=new FormData(e.currentTarget);

  const row={
    company_id:companyId,
    project_id:projectId,
    pour_date:String(f.get('pour_date') || ''),
    scope_type:String(f.get('scope_type') || 'UNCLASSIFIED'),
    work_group:String(f.get('work_group') || 'Atanacak').trim() || 'Atanacak',
    work_item:String(f.get('work_item') || '').trim() || null,
    cost_center:String(f.get('cost_center') || '').trim() || null,
    concrete_class:String(f.get('concrete_class') || '').trim() || 'Atanacak',
    total_m3:0,
    supplier_name:String(f.get('supplier_name') || '').trim() || null,
    subcontractor_name:String(f.get('subcontractor_name') || '').trim() || null,
    location_name:'TAŞPAZAR CAMİİ ŞANTİYESİ',
    note:String(f.get('note') || '').trim() || null,
    created_by:session.user.id
  };

  if(!row.pour_date){
    $('msg').textContent='Döküm tarihi zorunlu.';
    return;
  }

  $('saveBtn').disabled=true;
  $('saveBtn').textContent='Oluşturuluyor...';

  const {error}=await sb.from('santiye_concrete_pours').insert(row);

  $('saveBtn').disabled=false;
  $('saveBtn').textContent='Döküm / Kullanım Yeri Oluştur';

  if(error){
    $('msg').textContent=error.message;
    return;
  }

  $('msg').textContent='Döküm / kullanım yeri oluşturuldu. Şimdi beton fişlerini bağlayabilirsin.';

  e.currentTarget.reset();
  $('pourDate').value=new Date().toISOString().slice(0,10);

  await reload();
}


/* ORYVEX_BETON_RECEIPT_V15_1 */

function betonReceiptSafeName(name){
  return String(name || 'beton-fisi.jpg')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g,'_')
    .replace(/_+/g,'_')
    .slice(-120);
}

async function uploadBetonReceipt(file){
  if(!file) return null;

  if(!session?.user?.id){
    throw new Error('Fiş fotoğrafı yüklemek için yetkili oturum gerekli.');
  }

  if(!/^image\/(jpeg|png|webp)$/i.test(file.type || '')){
    throw new Error('Fiş fotoğrafı JPEG, PNG veya WEBP olmalı.');
  }

  if(Number(file.size || 0) > 10 * 1024 * 1024){
    throw new Error('Fiş fotoğrafı en fazla 10 MB olabilir.');
  }

  const uid=session.user.id;
  const safe=betonReceiptSafeName(file.name);
  const path=
    uid+
    '/beton-fisleri/'+
    projectId+'/'+
    Date.now()+'-'+
    safe;

  const {data,error}=await sb.storage
    .from('santiye-photos')
    .upload(path,file,{
      cacheControl:'3600',
      upsert:false,
      contentType:file.type
    });

  if(error) throw error;

  return {
    bucket:'santiye-photos',
    path:data?.path || path
  };
}

async function removeBetonReceipt(storagePath){
  if(!storagePath) return;

  try{
    await sb.storage
      .from('santiye-photos')
      .remove([storagePath]);
  }catch(e){
    console.warn('Beton fiş fotoğrafı rollback uyarısı:',e);
  }
}

async function registerBetonReceiptPhoto(storagePath,slipNo){
  if(!storagePath) return null;

  const payload={
    project_id:projectId,
    storage_path:storagePath,
    caption:'Beton Fişi · '+String(slipNo || ''),
    created_by:session.user.id
  };

  const {data,error}=await sb
    .from('santiye_photos')
    .insert(payload)
    .select('id,storage_path')
    .single();

  if(error) throw error;

  return data;
}

async function unregisterBetonReceiptPhoto(photoId){
  if(!photoId) return;

  try{
    await sb
      .from('santiye_photos')
      .delete()
      .eq('id',photoId);
  }catch(e){
    console.warn('Beton foto kayıt rollback uyarısı:',e);
  }
}


/* ORYVEX_BETON_RECEIPT_V15_2_AI_VISION */

let betonVisionReading=false;

const BETON_VISION_FIELDS=[
  ['slip_no','Fiş No'],
  ['slip_date','Tarih'],
  ['quantity_m3','Miktar'],
  ['concrete_class','Beton Sınıfı'],
  ['supplier_name','Tedarikçi'],
  ['customer_name','Müşteri'],
  ['vehicle_plate','Plaka'],
  ['driver_name','Şoför'],
  ['production_start','Üretim Başlangıç'],
  ['production_finish','Üretim Bitiş'],
  ['printed_site_name','Basılı Şantiye'],
  ['other_text','Diğer Metin']
];

function betonVisionHasAuthenticatedSession(){
  return !!(session?.user?.id && session?.access_token);
}

function betonVisionSelectedFile(){
  return document.getElementById('betonReceiptPhoto')?.files?.[0] || null;
}

function updateBetonReceiptVisionState(){
  const btn=document.getElementById('betonReceiptReadBtn');
  if(!btn) return;
  const file=betonVisionSelectedFile();
  const valid=!!(
    file &&
    /^image\/(jpeg|png|webp)$/i.test(file.type || '') &&
    Number(file.size || 0)>0 &&
    Number(file.size || 0)<=10*1024*1024
  );
  btn.disabled=betonVisionReading || !valid || !betonVisionHasAuthenticatedSession();
  btn.title=!betonVisionHasAuthenticatedSession()
    ? 'Fişi okumak için yetkili canlı oturum gerekli.'
    : !valid ? 'Önce JPEG, PNG veya WEBP fiş fotoğrafı seç.' : '';
}

function betonVisionSetStatus(message){
  const el=document.getElementById('betonReceiptStatus');
  if(el) el.textContent=message;
}

function betonVisionResetResult(){
  const box=document.getElementById('betonReceiptVisionResult');
  if(!box) return;
  box.hidden=true;
  box.textContent='';
}

function betonVisionFileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result || ''));
    reader.onerror=()=>reject(new Error('Fiş fotoğrafı okunamadı.'));
    reader.readAsDataURL(file);
  });
}

function betonVisionFieldValue(result,key){
  const field=result?.fields?.[key];
  if(!field || field.value===null || field.value===undefined) return null;
  const value=String(field.value).trim();
  return value || null;
}

function betonVisionSetFormValue(form,name,value){
  if(value===null || value===undefined || value==='') return;
  const input=form?.querySelector('[name="'+name+'"]');
  if(!input) return;
  const text=String(value).trim();
  if(!text) return;

  if(input.tagName==='SELECT'){
    const exists=Array.from(input.options || []).some(o=>String(o.value)===text);
    if(!exists){
      const option=document.createElement('option');
      option.value=text;
      option.textContent=text;
      option.dataset.aiVision='1';
      input.appendChild(option);
    }
  }

  input.value=text;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

function betonVisionAppendNotes(form,result){
  const note=form?.querySelector('[name="raw_note"]');
  if(!note) return;
  const customer=betonVisionFieldValue(result,'customer_name');
  const other=betonVisionFieldValue(result,'other_text');
  const additions=[];
  if(customer) additions.push('Müşteri / Alt Yüklenici: '+customer);
  if(other) additions.push('Fişten okunan diğer bilgi: '+other);
  if(!additions.length) return;

  const current=String(note.value || '').trim();
  const missing=additions.filter(line=>!current.includes(line));
  if(!missing.length) return;

  note.value=(current ? current+'\n' : '')+missing.join('\n');
  note.dispatchEvent(new Event('input',{bubbles:true}));
}

function betonVisionApplyResult(result){
  const form=document.getElementById('slipForm');
  if(!form) return;

  [
    'slip_no','slip_date','quantity_m3','concrete_class',
    'supplier_name','vehicle_plate','driver_name',
    'production_start','production_finish','printed_site_name'
  ].forEach(key=>{
    betonVisionSetFormValue(form,key,betonVisionFieldValue(result,key));
  });

  betonVisionAppendNotes(form,result);
}

function betonVisionEscape(value){
  return String(value ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function betonVisionRenderResult(result,duplicate){
  const box=document.getElementById('betonReceiptVisionResult');
  if(!box) return;

  const rows=BETON_VISION_FIELDS.map(([key,label])=>{
    const field=result?.fields?.[key] || {};
    const hasValue=field.value!==null &&
      field.value!==undefined &&
      String(field.value).trim()!=='';
    const confidence=Number(field.confidence);
    const hasConfidence=Number.isFinite(confidence);
    let state='';
    let info='Okunamadı';

    if(hasValue){
      if(hasConfidence){
        const pct=Math.round(Math.max(0,Math.min(1,confidence))*100);
        info='%'+pct;
        if(confidence<0.80){
          state='needs-check';
          info+=' · Kontrol gerekli';
        }
      }else{
        state='needs-check';
        info='Kontrol gerekli';
      }
    }else{
      state='unreadable';
    }

    return '<div class="v15-confidence-row '+state+'">'+
      '<span>'+betonVisionEscape(label)+'</span>'+
      '<small>'+betonVisionEscape(info)+'</small>'+
      '</div>';
  }).join('');

  const warnings=[
    ...(Array.isArray(result?.warnings) ? result.warnings : []),
    ...(duplicate ? ['Bu fiş numarası sistemde mevcut olabilir.'] : [])
  ];

  box.innerHTML=
    '<div class="v15-vision-title">✓ Fiş okundu</div>'+
    '<div class="v15-confidence-grid">'+rows+'</div>'+
    warnings.map(w=>
      '<div class="v15-vision-warning">⚠ '+betonVisionEscape(w)+'</div>'
    ).join('');

  box.hidden=false;
}

async function betonVisionDuplicateExists(slipNo){
  if(!slipNo || !projectId || !betonVisionHasAuthenticatedSession()) return false;

  const {data,error}=await sb
    .from('santiye_concrete_slips')
    .select('id')
    .eq('project_id',projectId)
    .eq('slip_no',String(slipNo).trim())
    .limit(1);

  if(error){
    console.warn('Beton fişi duplicate kontrolü yapılamadı:',error.message);
    return false;
  }

  return Array.isArray(data) && data.length>0;
}

function betonVisionFriendlyError(error){
  const status=Number(error?.context?.status || error?.status || 0);
  if(status===401) return 'Oturum doğrulanamadı. Yeniden giriş yapıp tekrar dene.';
  if(status===403) return 'Bu projede AI fiş okuma yetkin bulunmuyor.';
  if(status===413) return 'Fiş fotoğrafı 10 MB sınırını aşıyor.';
  if(status===429) return 'AI servisi şu an yoğun. Biraz sonra tekrar dene.';

  const message=String(error?.message || '');
  if(/timeout|aborted|zaman/i.test(message)){
    return 'Fiş okuma zaman aşımına uğradı. Tekrar deneyebilirsin.';
  }
  return 'Fiş okunamadı. Fotoğrafı kontrol edip tekrar dene.';
}

async function readBetonReceiptVision(){
  if(betonVisionReading) return;
  const file=betonVisionSelectedFile();

  if(!betonVisionHasAuthenticatedSession()){
    betonVisionSetStatus('Fişi okumak için yetkili canlı oturum gerekli.');
    updateBetonReceiptVisionState();
    return;
  }
  if(!file){
    betonVisionSetStatus('Önce fiş fotoğrafı seç.');
    updateBetonReceiptVisionState();
    return;
  }
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type || '')){
    betonVisionSetStatus('JPEG, PNG veya WEBP fotoğraf seç.');
    return;
  }
  if(Number(file.size || 0)>10*1024*1024){
    betonVisionSetStatus('Fiş fotoğrafı en fazla 10 MB olabilir.');
    return;
  }

  betonVisionReading=true;
  updateBetonReceiptVisionState();
  betonVisionResetResult();
  betonVisionSetStatus('Fiş okunuyor...');

  try{
    const dataUrl=await betonVisionFileToDataUrl(file);
    const {data,error}=await sb.functions.invoke(
      'santiye-beton-receipt-vision',
      {
        body:{
          project_id:projectId,
          image:{mime_type:file.type,data_url:dataUrl}
        }
      }
    );

    if(error) throw error;
    if(!data?.ok || !data?.fields){
      throw new Error('AI fiş okuma geçerli sonuç döndürmedi.');
    }

    betonVisionApplyResult(data);
    const slipNo=betonVisionFieldValue(data,'slip_no');
    const duplicate=slipNo ? await betonVisionDuplicateExists(slipNo) : false;
    betonVisionRenderResult(data,duplicate);

    betonVisionSetStatus(
      duplicate
        ? 'Fiş okundu · Bu fiş numarası sistemde mevcut olabilir. Alanları kontrol et.'
        : 'Fiş okundu · Alanları kontrol edip sonra kaydet.'
    );
  }catch(error){
    console.error('Beton AI Vision hatası:',error?.message || 'İstek başarısız');
    betonVisionSetStatus(betonVisionFriendlyError(error));
  }finally{
    betonVisionReading=false;
    updateBetonReceiptVisionState();
  }
}

function bindBetonReceiptVision(){
  const input=document.getElementById('betonReceiptPhoto');
  const btn=document.getElementById('betonReceiptReadBtn');

  if(input && input.dataset.v152VisionBound!=='1'){
    input.dataset.v152VisionBound='1';
    input.addEventListener('change',()=>{
      betonVisionResetResult();
      updateBetonReceiptVisionState();
    });
  }

  if(btn && btn.dataset.v152VisionBound!=='1'){
    btn.dataset.v152VisionBound='1';
    btn.addEventListener('click',readBetonReceiptVision);
  }

  updateBetonReceiptVisionState();
}


async function saveSlip(e){
  e.preventDefault();

  if(!session?.user?.id){
    $('slipMsg').textContent=
      'Beton fişi kaydetmek için yetkili oturum gerekli.';
    return;
  }

  const f=new FormData(e.currentTarget);

  const row={
    company_id:companyId,
    project_id:projectId,
    pour_id:null,
    slip_no:String(f.get('slip_no') || '').trim(),
    slip_date:String(f.get('slip_date') || ''),
    quantity_m3:num(f.get('quantity_m3')),
    concrete_class:
      String(f.get('concrete_class') || '').trim() || null,
    supplier_name:
      String(f.get('supplier_name') || '').trim() || null,
    vehicle_plate:
      String(f.get('vehicle_plate') || '').trim() || null,
    driver_name:
      String(f.get('driver_name') || '').trim() || null,
    production_start:
      String(f.get('production_start') || '').trim() || null,
    production_finish:
      String(f.get('production_finish') || '').trim() || null,
    printed_site_name:
      String(f.get('printed_site_name') || '').trim() || null,
    actual_site_name:
      String(f.get('actual_site_name') || '').trim() ||
      'TAŞPAZAR CAMİİ ŞANTİYESİ',
    receipt_file_url:null,
    raw_note:
      String(f.get('raw_note') || '').trim() || null,
    created_by:session.user.id
  };

  if(!row.slip_no || !row.slip_date || row.quantity_m3<=0){
    $('slipMsg').textContent=
      'Fiş no, tarih ve miktar zorunlu.';
    return;
  }

  const photoInput=
    document.getElementById('betonReceiptPhoto');

  const receiptFile=
    photoInput?.files?.[0] || null;

  let uploaded=null;
  let photoRecord=null;
  let insertedSlip=null;

  $('slipSaveBtn').disabled=true;
  $('slipSaveBtn').textContent='Kaydediliyor...';

  try{
    if(receiptFile){
      $('slipMsg').textContent=
        'Fiş fotoğrafı güvenli depoya yükleniyor...';

      uploaded=await uploadBetonReceipt(receiptFile);

      /*
       * Private bucket kullanıldığı için burada public URL saklamıyoruz.
       * receipt_file_url alanında storage path tutuluyor.
       */
      row.receipt_file_url=uploaded.path;
    }

    $('slipMsg').textContent='Beton fişi kaydediliyor...';

    const {data,error}=await sb
      .from('santiye_concrete_slips')
      .insert(row)
      .select('id,slip_no,receipt_file_url')
      .single();

    if(error) throw error;

    insertedSlip=data;

    if(uploaded?.path){
      try{
        photoRecord=
          await registerBetonReceiptPhoto(
            uploaded.path,
            row.slip_no
          );
      }catch(photoError){
        /*
         * Fotoğraf okunabilirliğini garanti etmek için
         * santiye_photos kaydı oluşmazsa işlemi geri al.
         */
        await sb
          .from('santiye_concrete_slips')
          .delete()
          .eq('id',insertedSlip.id);

        insertedSlip=null;

        await removeBetonReceipt(uploaded.path);
        uploaded=null;

        throw new Error(
          'Fiş fotoğrafı proje fotoğraf kaydına bağlanamadı: '+
          (photoError?.message || photoError)
        );
      }
    }

    $('slipMsg').textContent=
      receiptFile
        ? 'Beton fişi ve fiş fotoğrafı kaydedildi. Sınıflandırma bekliyor.'
        : 'Beton fişi kaydedildi ve sınıflandırılmamış havuza eklendi.';

    e.currentTarget.reset();

    const preview=
      document.getElementById('betonReceiptPreviewWrap');

    if(preview) preview.style.display='none';

    const receiptStatus=
      document.getElementById('betonReceiptStatus');

    if(receiptStatus){
      receiptStatus.textContent='Fotoğraf bekleniyor.';
    }

    betonVisionResetResult();
    updateBetonReceiptVisionState();

    $('slipDate').value=
      new Date().toISOString().slice(0,10);

    const supplier=
      e.currentTarget.querySelector(
        '[name="supplier_name"]'
      );

    const actual=
      e.currentTarget.querySelector(
        '[name="actual_site_name"]'
      );

    if(supplier){
      supplier.value=
        'EKS Göktaş Hazır Beton San. Tic. Ltd. Şti.';
    }

    if(actual){
      actual.value=
        'TAŞPAZAR CAMİİ ŞANTİYESİ';
    }

    await reload();

  }catch(error){

    console.error('Beton fişi kayıt hatası:',error);

    /*
     * Slip insert başarısız olduysa ama fotoğraf yüklenmişse
     * orphan storage nesnesi bırakma.
     */
    if(!insertedSlip && uploaded?.path){
      await removeBetonReceipt(uploaded.path);
    }

    /*
     * Çok nadir durumda photo row oluşup sonraki adım hata verirse
     * referans kaydını temizle.
     */
    if(!insertedSlip && photoRecord?.id){
      await unregisterBetonReceiptPhoto(photoRecord.id);
    }

    $('slipMsg').textContent=
      error?.message ||
      'Beton fişi kaydedilemedi.';

  }finally{

    $('slipSaveBtn').disabled=false;
    $('slipSaveBtn').textContent='Beton Fişini Kaydet';
  }
}


function updateScopePreview(){
  const scopeEl=$('assignScope');
  const tag=$('scopePreview');

  if(!scopeEl || !tag) return;

  const type=scopeEl.value;

  tag.className='tag '+
    (
      type==='PROJECT'
        ? 'project'
        : type==='NON_PROJECT'
          ? 'outside'
          : 'unclassified'
    );

  tag.textContent=classificationLabel(type);
}

function applyGroupDefaults(){
  const group=$('assignWorkGroup')?.value || '';
  const scope=$('assignScope');
  const cost=$('assignCostCenter');

  if(!scope || !cost) return;

  if(group==='Kule Vinç'){
    scope.value='NON_PROJECT';
    cost.value='Kule Vinç';
  }else if(group==='Mobilizasyon'){
    scope.value='NON_PROJECT';
    cost.value='Mobilizasyon';
  }else if(group==='Çevre İşleri'){
    scope.value='PROJECT';
    cost.value='Çevre İşleri';
  }else if([
    'Grobeton',
    'Zemin',
    'Temel',
    'Perde',
    'Kolon',
    'Kiriş',
    'Döşeme',
    'Merdiven',
    'Kubbe',
    'Minare'
  ].includes(group)){
    scope.value='PROJECT';
    cost.value='Kaba İnşaat';
  }

  updateScopePreview();
}

function demoClassifySelected(chosen){
  const scopeType=
    $('assignScope')?.value || 'UNCLASSIFIED';

  const workGroup=
    $('assignWorkGroup')?.value?.trim() || '';

  const workItem=
    $('assignWorkItem')?.value?.trim() || '';

  const costCenter=
    $('assignCostCenter')?.value?.trim() || '';

  const msg=$('assignMsg');

  if(scopeType==='UNCLASSIFIED'){
    if(msg){
      msg.textContent=
        'Proje Betonu veya Proje Dışı seç.';
    }
    return;
  }

  if(!workGroup){
    if(msg) msg.textContent='İş grubu seç.';
    return;
  }

  if(!workItem){
    if(msg){
      msg.textContent=
        'İmalat / kullanım yerini gir.';
    }
    return;
  }

  if(!costCenter){
    if(msg){
      msg.textContent=
        'Masraf merkezini seç.';
    }
    return;
  }

  const totalChosen=chosen.reduce(
    (a,x)=>a+num(x.quantity_m3),
    0
  );

  const classes=[
    ...new Set(
      chosen
        .map(x=>x.concrete_class)
        .filter(Boolean)
    )
  ];

  const suppliers=[
    ...new Set(
      chosen
        .map(x=>x.supplier_name)
        .filter(Boolean)
    )
  ];

  const demoPourId=
    'demo-pour-'+Date.now();

  pours.unshift({
    id:demoPourId,
    company_id:companyId,
    project_id:projectId,
    pour_date:
      chosen[0]?.slip_date ||
      new Date().toISOString().slice(0,10),
    scope_type:scopeType,
    work_group:workGroup,
    work_item:workItem,
    cost_center:costCenter,
    concrete_class:
      classes.join(', ') || 'Atanacak',
    total_m3:totalChosen,
    supplier_name:
      suppliers.join(', ') || null,
    subcontractor_name:null,
    location_name:
      'TAŞPAZAR CAMİİ ŞANTİYESİ',
    note:'Lokal demo sınıflandırması',
    created_by:
      session?.user?.id || null,
    created_at:
      new Date().toISOString(),
    updated_at:
      new Date().toISOString()
  });

  for(const slip of chosen){
    slip.pour_id=demoPourId;
  }

  selected.clear();

  $('assignScope').value='UNCLASSIFIED';
  $('assignWorkGroup').value='';
  $('assignWorkItem').value='';
  $('assignCostCenter').value='';

  if(msg){
    msg.textContent=
      classificationLong(scopeType)+
      ' · '+workGroup+
      ' · '+workItem+
      ' · '+m3(totalChosen)+
      ' sınıflandırıldı. '+
      'Lokal demo; canlı veri değişmedi.';
  }

  render();
  updateScopePreview();
}

async function assignSelected(){
  if(!betonGuardWriteAction()) return;
  const chosen=slips.filter(
    x=>selected.has(x.id)
  );

  if(!chosen.length){
    return;
  }

  if(isLocalDemo()){
    demoClassifySelected(chosen);
    return;
  }

  const msg=$('assignMsg');

  const scopeType=
    $('assignScope')?.value ||
    'UNCLASSIFIED';

  const workGroup=
    $('assignWorkGroup')?.value?.trim() ||
    '';

  const workItem=
    $('assignWorkItem')?.value?.trim() ||
    '';

  const costCenter=
    $('assignCostCenter')?.value?.trim() ||
    '';

  if(scopeType==='UNCLASSIFIED'){
    if(msg){
      msg.textContent=
        'Proje Betonu veya Proje Dışı seç.';
    }
    return;
  }

  if(!workGroup){
    if(msg){
      msg.textContent='İş grubu seç.';
    }
    return;
  }

  if(!workItem){
    if(msg){
      msg.textContent=
        'İmalat / kullanım yerini gir.';
    }
    return;
  }

  if(!costCenter){
    if(msg){
      msg.textContent=
        'Masraf merkezini seç.';
    }
    return;
  }

  const totalChosen=chosen.reduce(
    (a,x)=>a+num(x.quantity_m3),
    0
  );

  const ok=confirm(
    'BETON SINIFLANDIRMA\n\n'+
    chosen.length+' fiş · '+
    m3(totalChosen)+'\n\n'+
    classificationLong(scopeType)+'\n'+
    workGroup+' · '+workItem+'\n'+
    'Masraf Merkezi: '+costCenter+
    '\n\nKalıcı olarak kaydedilsin mi?'
  );

  if(!ok){
    return;
  }

  const btn=$('assignBtn');

  btn.disabled=true;
  btn.textContent='Kaydediliyor...';

  if(msg){
    msg.textContent=
      'Atomik sınıflandırma yapılıyor...';
  }

  try{
    const ids=chosen.map(x=>x.id);

    const {
      data,
      error
    }=await sb.rpc(
      'santiye_classify_concrete_slips',
      {
        p_project_id:projectId,
        p_slip_ids:ids,
        p_scope_type:scopeType,
        p_work_group:workGroup,
        p_work_item:workItem,
        p_cost_center:costCenter
      }
    );

    if(error){
      throw new Error(
        'Sınıflandırma yapılamadı: '+
        error.message
      );
    }

    if(!data || data.ok!==true){
      throw new Error(
        'RPC geçerli sonuç döndürmedi.'
      );
    }

    selected.clear();

    $('assignScope').value=
      'UNCLASSIFIED';

    $('assignWorkGroup').value='';
    $('assignWorkItem').value='';
    $('assignCostCenter').value='';

    await reload();

    updateScopePreview();

    if(msg){
      msg.textContent=
        classificationLong(
          data.scope_type
        )+
        ' · '+data.work_group+
        ' · '+data.work_item+
        ' · '+m3(data.total_m3)+
        ' kalıcı olarak kaydedildi.';
    }

  }catch(error){
    console.error(error);

    if(msg){
      msg.textContent=
        error?.message ||
        'Sınıflandırma kaydedilemedi.';
    }

    alert(
      error?.message ||
      'Sınıflandırma kaydedilemedi.'
    );

  }finally{
    btn.disabled=false;

    btn.textContent=
      'KAYDET';

    renderSelection();
  }
}

function isLiveModeRequested(){
  const params=new URLSearchParams(
    window.location.search
  );

  return params.get('mode')==='live';
}

function isLocalDemo(){
  const params=new URLSearchParams(
    window.location.search
  );

  const liveRequested=
    params.get('mode')==='live';

  const local=
    window.location.hostname==='127.0.0.1' ||
    window.location.hostname==='localhost';

  return local && !liveRequested;
}

function loadLocalDemo(){
  session={
    user:{
      id:'846f2c75-7a8a-4d51-8344-b0388b6661cb'
    }
  };

  companyId='f5408082-74e7-4d2a-a7e9-12ed8dca7641';
  projectId='62e1d67f-c1c5-47e1-9aec-e2d79e6c08cf';
  role='viewer';
  planned=4400;

  project={
    id:projectId,
    company_id:companyId,
    name:'Taşpazar Camii',
    location:'Aksaray İli, Merkez İlçesi, Taşpazar Mahallesi, 9248 Ada, 3 No.lu Parsel'
  };

  pours=[];

  slips=[
    {
      id:'demo-0014121',
      company_id:companyId,
      project_id:projectId,
      pour_id:null,
      slip_no:'0014121',
      slip_date:'2026-10-01',
      quantity_m3:8,
      concrete_class:'C20/25 Katkısız',
      supplier_name:'EKS Göktaş Hazır Beton San. Tic. Ltd. Şti.',
      vehicle_plate:'68 AEY 174',
      driver_name:'Abdullah Düzgün',
      production_start:'16:04:24',
      production_finish:'16:58:48',
      printed_site_name:'Harman Büfe Karşısı',
      actual_site_name:'TAŞPAZAR CAMİİ ŞANTİYESİ',
      raw_note:'Müşteri / Alt Yüklenici: Aktan Petrol İnş. Ltd. Şti. | İş Grubu: Atanacak | Sınıflandırma: UNCLASSIFIED | Kullanım yeri henüz atanmadı.'
    }
  ];

  $('projectName').textContent=project.name;
  $('projectLocation').textContent=project.location;
}


/* ORYVEX_BETON_SEARCH_CENTER_V15_3_ENGINE */
const ORYVEXBetonReport=(()=>{
  const PAGE_SIZE=50;
  const selectedRows=new Set();
  let source=[];
  let filtered=[];
  let transfers=new Map();
  let page=1;
  let photoObjectUrl=null;

  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'');
  const norm=v=>txt(v).toLocaleLowerCase('tr-TR').trim();
  const number=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const html=v=>txt(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:2,maximumFractionDigits:2}).format(number(v));
  const m3text=v=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:3}).format(number(v))+' m³';

  function pourMap(){return new Map(pours.map(p=>[String(p.id),p]));}
  function pourFor(slip){return slip?.pour_id?pourMap().get(String(slip.pour_id))||null:null;}

  function scopeFor(slip){
    const pour=pourFor(slip);
    if(!slip?.pour_id||!pour) return 'UNCLASSIFIED';
    const scope=txt(pour.scope_type).toUpperCase();
    return scope==='PROJECT'||scope==='NON_PROJECT'?scope:'UNCLASSIFIED';
  }

  function scopeLabel(scope){
    if(scope==='PROJECT') return 'Proje Betonu';
    if(scope==='NON_PROJECT') return 'Proje Dışı';
    return 'Sınıflandırılmamış';
  }

  function scopeClass(scope){
    if(scope==='PROJECT') return 'v153-project';
    if(scope==='NON_PROJECT') return 'v153-nonproject';
    return 'v153-unclassified';
  }

  function normalizedClass(value){
    const v=txt(value).toUpperCase().trim().replaceAll(' ','').replaceAll('-','/').replaceAll('_','/');
    if(v.startsWith('C16')) return 'C16';
    if(v.startsWith('C20/25')||(v.startsWith('C20')&&v.includes('25'))) return 'C20/25';
    if(v.startsWith('C30/35')||(v.startsWith('C30')&&v.includes('35'))) return 'C30/35';
    return v;
  }

  function unitPrice(slip){
    const cls=normalizedClass(slip?.concrete_class||pourFor(slip)?.concrete_class||'');
    const prices=window.ORYVEXConcretePriceV14?.prices||{'C16':2600,'C20/25':2700,'C30/35':2800};
    return number(prices[cls]);
  }

  function transferFor(slip){return transfers.get(String(slip.id))||null;}

  function cariState(slip){
    if(transferFor(slip)) return {code:'TRANSFERRED',label:'Cariye Aktarıldı',className:'v153-transferred'};
    if(scopeFor(slip)==='UNCLASSIFIED') return {code:'UNCLASSIFIED',label:'Sınıflandırma Bekliyor',className:'v153-unclassified'};
    if(!(unitPrice(slip)>0)) return {code:'PRICE_WAITING',label:'Fiyat Bekliyor',className:'v153-price'};
    return {code:'READY',label:'Cariye Hazır',className:'v153-ready'};
  }

  async function loadTransfers(){
    transfers=new Map();
    if(!session?.user?.id||!projectId) return;
    const {data,error}=await sb.from('santiye_account_transactions')
      .select('id,source_id,source_type,amount,unit_price,cost_center,supplier_name,created_at')
      .eq('project_id',projectId)
      .eq('source_type','CONCRETE_SLIP')
      .order('created_at',{ascending:false});
    if(error) throw error;
    (data||[]).forEach(row=>{
      if(row.source_id&&!transfers.has(String(row.source_id))) transfers.set(String(row.source_id),row);
    });
  }

  function filters(){
    return {
      from:q('v153DateFrom')?.value||'',
      to:q('v153DateTo')?.value||'',
      slipNo:norm(q('v153SlipNo')?.value),
      supplier:norm(q('v153Supplier')?.value),
      concrete:norm(q('v153ConcreteClass')?.value),
      scope:q('v153Scope')?.value||'',
      group:norm(q('v153WorkGroup')?.value),
      item:norm(q('v153WorkItem')?.value),
      cost:norm(q('v153CostCenter')?.value),
      cari:q('v153CariStatus')?.value||''
    };
  }

  function matches(slip,f){
    const date=txt(slip.slip_date).slice(0,10);
    if(f.from&&date<f.from) return false;
    if(f.to&&date>f.to) return false;
    if(f.slipNo&&!norm(slip.slip_no).includes(f.slipNo)) return false;
    if(f.supplier&&!norm(slip.supplier_name).includes(f.supplier)) return false;
    if(f.concrete&&!norm(slip.concrete_class||pourFor(slip)?.concrete_class).includes(f.concrete)) return false;
    if(f.scope&&scopeFor(slip)!==f.scope) return false;
    const pour=pourFor(slip);
    if(f.group&&!norm(pour?.work_group).includes(f.group)) return false;
    if(f.item&&!norm(pour?.work_item).includes(f.item)) return false;
    if(f.cost&&!norm(pour?.cost_center).includes(f.cost)) return false;
    if(f.cari&&cariState(slip).code!==f.cari) return false;
    return true;
  }

  function filterSummary(){
    const f=filters(),parts=[];
    if(f.from) parts.push('Başlangıç: '+f.from);
    if(f.to) parts.push('Bitiş: '+f.to);
    if(f.slipNo) parts.push('Fiş No: '+q('v153SlipNo').value);
    if(f.supplier) parts.push('Tedarikçi: '+q('v153Supplier').value);
    if(f.concrete) parts.push('Beton: '+q('v153ConcreteClass').value);
    if(f.scope) parts.push('Sınıflandırma: '+f.scope);
    if(f.group) parts.push('İş Grubu: '+q('v153WorkGroup').value);
    if(f.item) parts.push('İmalat: '+q('v153WorkItem').value);
    if(f.cost) parts.push('Maliyet Merkezi: '+q('v153CostCenter').value);
    if(f.cari) parts.push('Cari: '+q('v153CariStatus').selectedOptions[0]?.textContent);
    return parts.length?parts.join(' · '):'Aktif filtre: Tümü';
  }

  function reconcileSelection(){
    const allowed=new Set(filtered.map(s=>String(s.id)));
    [...selectedRows].forEach(id=>{if(!allowed.has(id)) selectedRows.delete(id);});
  }

  function renderSummary(){
    const t=totals();
    if(q('v153Planned')) q('v153Planned').textContent=m3text(planned);
    if(q('v153Project')) q('v153Project').textContent=m3text(t.projectM3);
    if(q('v153NonProject')) q('v153NonProject').textContent=m3text(t.outsideM3);
    if(q('v153Unclassified')) q('v153Unclassified').textContent=m3text(t.unclassifiedM3);
    if(q('v153Total')) q('v153Total').textContent=m3text(t.total);
    if(q('v153Remaining')) q('v153Remaining').textContent=m3text(t.remaining);
    if(q('v153Usage')) q('v153Usage').textContent='%'+t.pct.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function currentRows(){
    const start=(page-1)*PAGE_SIZE;
    return filtered.slice(start,start+PAGE_SIZE);
  }

  function renderTable(){
    const body=q('v153Body');
    if(!body) return;
    const rows=currentRows();

    if(!rows.length){
      body.innerHTML='<tr><td colspan="16" class="v153-empty">Filtrelere uygun beton fişi bulunamadı.</td></tr>';
      return;
    }

    body.innerHTML=rows.map(slip=>{
      const id=String(slip.id);
      const pour=pourFor(slip);
      const scope=scopeFor(slip);
      const cari=cariState(slip);
      const price=unitPrice(slip);
      const amount=price*number(slip.quantity_m3);
      const hasPhoto=!!txt(slip.receipt_file_url).trim();
      const classified=scope!=='UNCLASSIFIED';
      return '<tr data-v153-slip="'+html(id)+'">'+
        '<td class="v153-no-print"><input class="v153-slip-check" type="checkbox" data-slip-id="'+html(id)+'" aria-label="Fiş '+html(slip.slip_no)+' seç" '+(selectedRows.has(id)?'checked':'')+'></td>'+
        '<td><strong>'+html(slip.slip_no)+'</strong></td>'+
        '<td>'+html(trDate(slip.slip_date))+'</td>'+
        '<td>'+html(slip.supplier_name||'—')+'</td>'+
        '<td>'+html(slip.concrete_class||pour?.concrete_class||'—')+'</td>'+
        '<td><strong>'+html(number(slip.quantity_m3).toLocaleString('tr-TR',{maximumFractionDigits:3}))+'</strong></td>'+
        '<td>'+html(slip.vehicle_plate||'—')+(slip.driver_name?'<small>'+html(slip.driver_name)+'</small>':'')+'</td>'+
        '<td>'+html(pour?.work_group||'—')+'</td>'+
        '<td>'+html(pour?.work_item||'—')+'</td>'+
        '<td>'+html(pour?.cost_center||'—')+'</td>'+
        '<td><span class="v153-badge '+scopeClass(scope)+'">'+html(scopeLabel(scope))+'</span>'+(classified?'<span class="v153-already">Zaten sınıflandırılmış</span>':'')+'</td>'+
        '<td>'+html(price>0?money(price)+' / m³':'—')+'</td>'+
        '<td>'+html(price>0?money(amount):'—')+'</td>'+
        '<td><span class="v153-badge '+cari.className+'">'+html(cari.label)+'</span></td>'+
        '<td>'+(hasPhoto?'<button type="button" class="v153-photo-btn v153-no-print" data-v153-photo="'+html(id)+'">Fişi Gör</button>':'<span class="v153-photo-none">Fotoğraf Yok</span>')+'</td>'+
        '<td class="v153-no-print">'+(classified?'<span class="v153-already">Korumalı</span>':'<span class="muted">Sınıflandırılabilir</span>')+'</td>'+
      '</tr>';
    }).join('');

    body.querySelectorAll('.v153-slip-check').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const id=String(cb.dataset.slipId||'');
        if(cb.checked) selectedRows.add(id); else selectedRows.delete(id);
        renderSelection();
      });
    });
    body.querySelectorAll('[data-v153-photo]').forEach(btn=>btn.addEventListener('click',()=>openPhoto(btn.dataset.v153Photo)));
  }

  function renderPagination(){
    const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    if(page>pages) page=pages;
    if(q('v153ResultCount')) q('v153ResultCount').textContent=filtered.length+' fiş';
    if(q('v153PageInfo')) q('v153PageInfo').textContent='Sayfa '+page+' / '+pages+' · Toplam '+filtered.length+' kayıt';
    if(q('v153PrevBtn')) q('v153PrevBtn').disabled=page<=1;
    if(q('v153NextBtn')) q('v153NextBtn').disabled=page>=pages;
  }

  function selectedSlips(){return source.filter(s=>selectedRows.has(String(s.id)));}

  function renderSelection(){
    const chosen=selectedSlips();
    const canWrite=!!session?.user?.id;
    const classifyBlocked=chosen.some(s=>scopeFor(s)!=='UNCLASSIFIED');
    const classifyReady=chosen.length>0&&!classifyBlocked;

    if(q('v153Selection')) q('v153Selection').textContent=chosen.length+' fiş seçildi · '+m3text(chosen.reduce((sum,s)=>sum+number(s.quantity_m3),0));
    if(q('v153SelectionNote')){
      q('v153SelectionNote').textContent=
        !canWrite?'Canlı yazma işlemleri için yetkili oturum gerekli.':
        classifyBlocked?'Seçimde zaten sınıflandırılmış fiş var; toplu sınıflandırma kilitli.':
        chosen.length?'Seçim toplu sınıflandırmaya uygun.':'';
    }
    if(q('v153ClassifyBtn')) q('v153ClassifyBtn').disabled=!canWrite||!classifyReady;

    const states=chosen.map(cariState);
    const allReady=chosen.length>0&&states.every(st=>st.code==='READY');
    if(q('v153CariBtn')) q('v153CariBtn').disabled=!canWrite||!allReady;
    if(q('v153CariReason')){
      q('v153CariReason').textContent=
        !canWrite?'Canlı Cari aktarımı için yetkili oturum gerekli.':
        !chosen.length?'Cariye aktarmak için uygun fiş seçin.':
        states.some(st=>st.code==='TRANSFERRED')?'Seçimde daha önce cariye aktarılmış fiş var.':
        states.some(st=>st.code==='UNCLASSIFIED')?'Seçimde sınıflandırma bekleyen fiş var.':
        states.some(st=>st.code==='PRICE_WAITING')?'Seçimde fiyat bekleyen fiş var.':
        allReady?'Tüm seçili fişler Cariye Hazır.':'Seçim Cari aktarımına uygun değil.';
    }

    const all=q('v153SelectAll');
    if(all){
      const ids=filtered.map(s=>String(s.id));
      all.checked=ids.length>0&&ids.every(id=>selectedRows.has(id));
      all.indeterminate=ids.some(id=>selectedRows.has(id))&&!all.checked;
    }
  }

  function render(){
    renderSummary();
    renderTable();
    renderPagination();
    renderSelection();
    if(q('v153PrintFilterSummary')) q('v153PrintFilterSummary').textContent=filterSummary();
  }

  function applyFilters(){
    filtered=source.filter(slip=>matches(slip,filters()));
    page=1;
    reconcileSelection();
    render();
  }

  function clearFilters(){
    ['v153DateFrom','v153DateTo','v153SlipNo','v153Supplier','v153ConcreteClass','v153Scope','v153WorkGroup','v153WorkItem','v153CostCenter','v153CariStatus']
      .forEach(id=>{if(q(id)) q(id).value='';});
    filtered=[...source];
    page=1;
    reconcileSelection();
    render();
  }

  function toggleAll(checked){
    filtered.forEach(slip=>{const id=String(slip.id);if(checked) selectedRows.add(id);else selectedRows.delete(id);});
    render();
  }

  function applyGroupDefaults(){
    const group=q('v153AssignWorkGroup')?.value||'';
    const scope=q('v153AssignScope');
    const cost=q('v153AssignCostCenter');
    if(!scope||!cost) return;
    if(group==='Kule Vinç'){scope.value='NON_PROJECT';cost.value='Kule Vinç';}
    else if(group==='Mobilizasyon'){scope.value='NON_PROJECT';cost.value='Mobilizasyon';}
    else if(group==='Çevre İşleri'){scope.value='PROJECT';cost.value='Çevre İşleri';}
    else if(['Zemin','Grobeton','Temel','Perde','Kolon','Kiriş','Döşeme','Merdiven','Kubbe','Minare'].includes(group)){
      scope.value='PROJECT';cost.value='Kaba İnşaat';
    }
  }

  async function classify(){
    const chosen=selectedSlips();
    if(!chosen.length) return;
    if(chosen.some(s=>scopeFor(s)!=='UNCLASSIFIED')){
      alert('Zaten sınıflandırılmış fişler yeniden sınıflandırılamaz.');
      return;
    }

    const scope=q('v153AssignScope')?.value||'UNCLASSIFIED';
    const group=txt(q('v153AssignWorkGroup')?.value).trim();
    const item=txt(q('v153AssignWorkItem')?.value).trim();
    const cost=txt(q('v153AssignCostCenter')?.value).trim();

    if(scope==='UNCLASSIFIED'||!group||!item||!cost){
      q('v153SelectionNote').textContent='Sınıflandırma, iş grubu, imalat ve maliyet merkezi zorunlu.';
      return;
    }

    const totalM3=chosen.reduce((sum,s)=>sum+number(s.quantity_m3),0);
    const ok=confirm('TOPLU SINIFLANDIRMA\n\nFiş sayısı: '+chosen.length+'\nToplam: '+m3text(totalM3)+'\nSınıflandırma: '+scope+'\nİş Grubu: '+group+'\nİmalat: '+item+'\nMaliyet Merkezi: '+cost+'\n\nDevam edilsin mi?');
    if(!ok) return;

    const btn=q('v153ClassifyBtn');
    if(btn){btn.disabled=true;btn.textContent='Sınıflandırılıyor...';}
    try{
      const {data,error}=await sb.rpc('santiye_classify_concrete_slips',{
        p_project_id:projectId,
        p_slip_ids:chosen.map(s=>s.id),
        p_scope_type:scope,
        p_work_group:group,
        p_work_item:item,
        p_cost_center:cost
      });
      if(error) throw error;
      if(!data||data.ok!==true) throw new Error('RPC geçerli sonuç döndürmedi.');
      selectedRows.clear();
      await reload();
      await loadTransfers();
      q('v153SelectionNote').textContent='Sınıflandırma tamamlandı.';
    }catch(err){
      console.error('V15.3 sınıflandırma:',err);
      q('v153SelectionNote').textContent='Sınıflandırma tamamlanamadı. Bağlantı ve yetkiyi kontrol et.';
    }finally{
      if(btn) btn.textContent='Seçilenleri Sınıflandır';
      renderSelection();
    }
  }

  async function transferCari(){
    const chosen=selectedSlips();
    if(!chosen.length) return;
    await loadTransfers();
    const states=chosen.map(cariState);
    if(states.some(st=>st.code!=='READY')){
      q('v153CariReason').textContent='Seçili fişlerin tamamı Cariye Hazır değil.';
      renderSelection();
      return;
    }

    let totalM3=0,totalTL=0;
    const suppliers=new Set(),costs=new Set();
    chosen.forEach(slip=>{
      totalM3+=number(slip.quantity_m3);
      totalTL+=unitPrice(slip)*number(slip.quantity_m3);
      if(slip.supplier_name) suppliers.add(slip.supplier_name);
      const cost=pourFor(slip)?.cost_center;if(cost) costs.add(cost);
    });

    const ok=confirm('CARİYE AKTARIM\n\nFiş sayısı: '+chosen.length+'\nToplam m³: '+m3text(totalM3)+'\nToplam TL: '+money(totalTL)+'\nTedarikçi: '+([...suppliers].join(', ')||'—')+'\nMaliyet Merkezi: '+([...costs].join(', ')||'—')+'\n\nBu işlem cari borç hareketi oluşturacaktır. Devam edilsin mi?');
    if(!ok) return;

    const btn=q('v153CariBtn');
    if(btn){btn.disabled=true;btn.textContent='Aktarılıyor...';}
    try{
      const {data,error}=await sb.rpc('santiye_transfer_concrete_slips_to_cari',{
        p_project_id:projectId,
        p_slip_ids:chosen.map(s=>s.id)
      });
      if(error) throw error;
      selectedRows.clear();
      await loadTransfers();
      render();
      q('v153CariReason').textContent='Cari aktarımı tamamlandı · '+number(data?.transferred_count||chosen.length)+' fiş.';
    }catch(err){
      console.error('V15.3 Cari:',err);
      q('v153CariReason').textContent='Cari aktarımı tamamlanamadı. Bağlantı ve yetkiyi kontrol et.';
    }finally{
      if(btn) btn.textContent='Seçilenleri Cariye Aktar';
      renderSelection();
    }
  }

  function csvEscape(value){return '"'+txt(value).replaceAll('"','""')+'"';}

  function exportCSV(){
    if(!filtered.length){alert('Dışa aktarılacak beton fişi bulunamadı.');return;}
    const header=['Fiş No','Tarih','Tedarikçi','Beton Sınıfı','Miktar','Araç','Şoför','İş Grubu','İmalat','Maliyet Merkezi','Sınıflandırma','Birim Fiyat','Tutar','Cari Durumu'];
    const rows=filtered.map(slip=>{
      const pour=pourFor(slip),scope=scopeFor(slip),price=unitPrice(slip),cari=cariState(slip);
      return [slip.slip_no,slip.slip_date,slip.supplier_name,slip.concrete_class||pour?.concrete_class,number(slip.quantity_m3).toFixed(3),slip.vehicle_plate,slip.driver_name,pour?.work_group,pour?.work_item,pour?.cost_center,scopeLabel(scope),price>0?price.toFixed(2):'',price>0?(price*number(slip.quantity_m3)).toFixed(2):'',cari.label];
    });
    const csv='\ufeff'+[header,...rows].map(row=>row.map(csvEscape).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='taspazar-beton-fisleri-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }

  function printReport(){
    if(!filtered.length){alert('Yazdırılacak beton fişi bulunamadı.');return;}
    window.print();
  }

  async function openPhoto(id){
    const slip=source.find(s=>String(s.id)===String(id));
    const path=txt(slip?.receipt_file_url).trim();
    if(!path){alert('Bu fişte fotoğraf bulunmuyor.');return;}
    if(!session?.user?.id){alert('Fiş fotoğrafını görmek için yetkili oturum gerekli.');return;}

    const modal=q('v153PhotoModal'),img=q('v153PhotoImage'),status=q('v153PhotoStatus');
    if(!modal||!img||!status) return;
    modal.hidden=false;img.hidden=true;status.textContent='Fotoğraf yükleniyor...';
    try{
      const {data,error}=await sb.storage.from('santiye-photos').createSignedUrl(path,60);
      if(error) throw error;
      if(!data?.signedUrl) throw new Error('Signed URL üretilemedi.');
      img.src=data.signedUrl;img.hidden=false;status.textContent='Güvenli bağlantı 60 saniye geçerlidir.';
    }catch(err){
      console.error('V15.3 fotoğraf:',err);
      status.textContent='Fotoğraf açılamadı. Yetki veya bağlantıyı kontrol et.';
    }
  }

  function closePhoto(){
    const modal=q('v153PhotoModal'),img=q('v153PhotoImage');
    if(modal) modal.hidden=true;
    if(img){img.src='';img.hidden=true;}
  }

  function bind(){
    if(q('betonSearchCenter')?.dataset.v153Bound==='1') return;
    if(q('betonSearchCenter')) q('betonSearchCenter').dataset.v153Bound='1';

    q('v153FilterBtn')?.addEventListener('click',applyFilters);
    q('v153ClearBtn')?.addEventListener('click',clearFilters);
    q('v153CsvBtn')?.addEventListener('click',exportCSV);
    q('v153PrintBtn')?.addEventListener('click',printReport);
    q('v153NewSlipBtn')?.addEventListener('click',()=>{
      const entry=q('betonPhotoPanel');if(entry){entry.scrollIntoView({behavior:'smooth',block:'center'});q('betonReceiptPhoto')?.focus();}
    });
    q('v153SelectAll')?.addEventListener('change',e=>toggleAll(e.target.checked));
    q('v153AssignWorkGroup')?.addEventListener('change',applyGroupDefaults);
    q('v153ClassifyBtn')?.addEventListener('click',classify);
    q('v153CariBtn')?.addEventListener('click',transferCari);
    q('v153PrevBtn')?.addEventListener('click',()=>{if(page>1){page--;render();}});
    q('v153NextBtn')?.addEventListener('click',()=>{const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));if(page<pages){page++;render();}});
    q('v153PhotoClose')?.addEventListener('click',closePhoto);
    q('v153PhotoModal')?.addEventListener('click',e=>{if(e.target===q('v153PhotoModal')) closePhoto();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!q('v153PhotoModal')?.hidden) closePhoto();});
  }

  async function setData(rows){
    source=Array.isArray(rows)?[...rows]:[];
    await loadTransfers().catch(err=>console.warn('V15.3 Cari durumları okunamadı:',err?.message||err));
    filtered=source.filter(slip=>matches(slip,filters()));
    reconcileSelection();
    render();
  }

  async function init(){
    bind();
    await setData(slips);
  }

  return {init,setData,applyFilters,selectedSlips,refreshCari:loadTransfers,cariStateForSlip:cariState,unitPrice};
})();

window.ORYVEXBetonReport=ORYVEXBetonReport;

/* ORYVEX_V101A_REPORT_SYNC */
function syncBetonReportData(){
  try{
    if(
      typeof slips !== 'undefined' &&
      Array.isArray(slips)
    ){
      window.ORYVEXBetonReport?.setData(slips);
    }
  }catch(err){
    console.warn(
      'Beton rapor verisi senkronlanamadı:',
      err
    );
  }
}



async function boot(){
  /* ORYVEX_V101A_BOOT_REPORT */
  setTimeout(() => {
    try{
      window.ORYVEXBetonReport?.init();
    }catch(err){
      console.warn(
        'Beton rapor modülü başlatılamadı:',
        err
      );
    }
  },0);

  resetConcreteClassificationDefaults();
  bindBetonReceiptVision();
  try{
    const demo=isLocalDemo();

    if(demo){
      loadLocalDemo();
    }else{
      const authenticated=await authenticate();

      if(authenticated===false){
        $('cloud').textContent=
          '● CANLI OTURUM YOK · YAZMA KAPALI';

        if($('entry')){
          $('entry').style.display='';
        }

        if($('assignBtn')){
          $('assignBtn').style.display='';
        }

        if($('records')){
          $('records').innerHTML=
            '<div class="empty">'+
            'Canlı Supabase oturumu bulunamadı. '+
            'Giriş ekranına yönlendirme kapalıdır.'+
            '</div>';
        }

        if($('slipRows')){
          $('slipRows').innerHTML=
            '<tr><td colspan="10">'+
            '<div class="empty">'+
            'Canlı veri için yetkili oturum gerekli.'+
            '</div></td></tr>';
        }

        return;
      }

      await resolveProject();

      await Promise.all([
        loadSettings(),
        loadPours(),
        loadSlips()
      ]);
    }

    const today=new Date().toISOString().slice(0,10);

    $('pourDate').value=today;
    $('slipDate').value=today;

    const canWrite=demo===false && [
      'owner',
      'admin',
      'project_manager',
      'site_manager',
      'field'
    ].includes(role);

    if(!canWrite){
      $('entry').style.display='';

      if(demo){
        $('assignBtn').style.display='';
        $('assignBtn').disabled=true;
        $('assignBtn').textContent=
          'KAYDET';

        $('assignBtn').addEventListener(
          'click',
          assignSelected
        );

        const demoScope=$('assignScope');

        if(demoScope){
          demoScope.addEventListener(
            'change',
            updateScopePreview
          );
        }

        const demoGroup=
          $('assignWorkGroup');

        if(demoGroup){
          demoGroup.addEventListener(
            'change',
            applyGroupDefaults
          );
        }

        updateScopePreview();

      }else{
        $('assignBtn').style.display='';
      }
    }else{
      $('pourForm').addEventListener('submit',savePour);
      $('slipForm').addEventListener('submit',saveSlip);
      
      /* ORYVEX_V41_EVENTS */
      const assignButton=$('assignBtn');

      if(assignButton){
        assignButton.addEventListener(
          'click',
          assignSelected
        );
      }

      const assignScope=$('assignScope');

      if(assignScope){
        assignScope.addEventListener(
          'change',
          updateScopePreview
        );
      }

      const assignWorkGroup=
        $('assignWorkGroup');

      if(assignWorkGroup){
        assignWorkGroup.addEventListener(
          'change',
          applyGroupDefaults
        );
      }

      updateScopePreview();

    }

    render();

    $('cloud').textContent=demo
      ? '● LOKAL DEMO · CANLI VERİYE YAZMAZ'
      : (
          isLiveModeRequested()
            ? '● CANLI SUPABASE · YETKİLİ OTURUM'
            : '● BULUT BAĞLI'
        );

  }catch(e){
    console.error(e);

    $('cloud').textContent='● BAĞLANTI HATASI';

    if($('records')){
      $('records').innerHTML=
        '<div class="empty">'+esc(e.message)+'</div>';
    }
  }
}

window.ORYVEXConcrete={
  boot,
  reload,
  sb,
  get slips(){ return slips; },
  get pours(){ return pours; },
  get selectedSlips(){ return selected; },
  get state(){ return {slips,pours,planned,projectId,companyId}; }
};

})();
