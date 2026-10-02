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


/* ORYVEX_BETON_V101A_REPORT_ENGINE */

const ORYVEXBetonReport = (() => {

  let source = [];
  let filtered = [];
  const selected = new Set();

  const $r = id => document.getElementById(id);

  function esc(value){
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  function norm(value){
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .trim();
  }

  function num(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function slipScope(slip){
    if(
      !slip.pour_id ||
      !slip.pour ||
      !slip.pour.scope_type
    ){
      return 'UNCLASSIFIED';
    }

    return String(slip.pour.scope_type).toUpperCase();
  }

  function slipWorkGroup(slip){
    return slip?.pour?.work_group || '';
  }

  function slipWorkItem(slip){
    return slip?.pour?.work_item || '';
  }

  function slipCostCenter(slip){
    return slip?.pour?.cost_center || '';
  }

  function cariState(slip){
    /*
      V10.1A:
      Gerçek cari transfer tablosu henüz bağlanmadı.

      UNCLASSIFIED -> BLOCKED
      PROJECT/NON_PROJECT -> READY

      V10.1B gerçek aktarım tablosunu bulunca
      TRANSFERRED durumu source_id üzerinden okunacak.
    */

    const scope = slipScope(slip);

    if(scope === 'UNCLASSIFIED'){
      return 'BLOCKED';
    }

    return 'READY';
  }

  function scopeLabel(scope){
    switch(scope){
      case 'PROJECT':
        return 'Proje Betonu';

      case 'NON_PROJECT':
        return 'Proje Dışı';

      default:
        return 'Sınıflandırılmamış';
    }
  }

  function cariLabel(state){
    switch(state){
      case 'TRANSFERRED':
        return 'Aktarıldı';

      case 'READY':
        return 'Aktarıma Hazır';

      default:
        return 'Sınıflandırma Bekliyor';
    }
  }

  function badgeScope(scope){
    if(scope === 'PROJECT') return 'project';
    if(scope === 'NON_PROJECT') return 'non-project';
    return 'unclassified';
  }

  function badgeCari(state){
    if(state === 'READY') return 'ready';
    if(state === 'TRANSFERRED') return 'ready';
    return 'blocked';
  }

  function matches(slip){

    const from = $r('filterDateFrom')?.value || '';
    const to = $r('filterDateTo')?.value || '';

    const slipNo =
      norm($r('filterSlipNo')?.value);

    const supplier =
      norm($r('filterSupplier')?.value);

    const concreteClass =
      norm($r('filterConcreteClass')?.value);

    const scope =
      $r('filterScope')?.value || '';

    const workGroup =
      norm($r('filterWorkGroup')?.value);

    const costCenter =
      norm($r('filterCostCenter')?.value);

    const cari =
      $r('filterCariStatus')?.value || '';

    const date =
      String(slip.slip_date || '');

    if(from && date < from) return false;
    if(to && date > to) return false;

    if(
      slipNo &&
      !norm(slip.slip_no).includes(slipNo)
    ) return false;

    if(
      supplier &&
      !norm(slip.supplier_name).includes(supplier)
    ) return false;

    if(
      concreteClass &&
      !norm(slip.concrete_class).includes(concreteClass)
    ) return false;

    if(
      scope &&
      slipScope(slip) !== scope
    ) return false;

    if(
      workGroup &&
      !norm(slipWorkGroup(slip)).includes(workGroup)
    ) return false;

    if(
      costCenter &&
      !norm(slipCostCenter(slip)).includes(costCenter)
    ) return false;

    if(
      cari &&
      cariState(slip) !== cari
    ) return false;

    return true;
  }

  function applyFilters(){
    filtered = source.filter(matches);

    render();
  }

  function render(){

    const body = $r('betonReportBody');

    if(!body) return;

    $r('reportCount').textContent =
      `${filtered.length} fiş`;

    if(!filtered.length){
      body.innerHTML = `
        <tr>
          <td colspan="14" class="empty">
            Filtreye uygun beton fişi bulunamadı.
          </td>
        </tr>
      `;

      updateSelection();

      return;
    }

    body.innerHTML = filtered.map(slip => {

      const scope = slipScope(slip);
      const cari = cariState(slip);

      const checked =
        selected.has(String(slip.id))
          ? 'checked'
          : '';

      return `
        <tr data-report-slip-id="${esc(slip.id)}">

          <td class="no-print">
            <input
              type="checkbox"
              class="report-slip-check"
              data-id="${esc(slip.id)}"
              ${checked}>
          </td>

          <td>
            <strong>${esc(slip.slip_no)}</strong>
          </td>

          <td>
            ${esc(slip.slip_date)}
          </td>

          <td>
            <strong>${num(slip.quantity_m3).toFixed(3)} m³</strong>
          </td>

          <td>
            ${esc(slip.concrete_class)}
          </td>

          <td>
            ${esc(slip.supplier_name)}
          </td>

          <td>
            ${esc(slip.vehicle_plate)}
            <br>
            <small>${esc(slip.driver_name)}</small>
          </td>

          <td>
            ${esc(slip.printed_site_name)}
          </td>

          <td>
            ${esc(slip.actual_site_name)}
          </td>

          <td>
            <span class="beton-report-badge ${badgeScope(scope)}">
              ${esc(scopeLabel(scope))}
            </span>
          </td>

          <td>
            ${esc(slipWorkGroup(slip) || '—')}
          </td>

          <td>
            ${esc(slipWorkItem(slip) || '—')}
          </td>

          <td>
            ${esc(slipCostCenter(slip) || '—')}
          </td>

          <td>
            <span class="beton-report-badge ${badgeCari(cari)}">
              ${esc(cariLabel(cari))}
            </span>
          </td>

        </tr>
      `;
    }).join('');

    body
      .querySelectorAll('.report-slip-check')
      .forEach(check => {

        check.addEventListener('change', () => {

          const id = String(check.dataset.id);

          if(check.checked){
            selected.add(id);
          }else{
            selected.delete(id);
          }

          updateSelection();
        });
      });

    updateSelection();
  }

  function selectedSlips(){
    return source.filter(
      slip => selected.has(String(slip.id))
    );
  }

  function updateSelection(){

    const slips = selectedSlips();

    const total =
      slips.reduce(
        (sum, slip) =>
          sum + num(slip.quantity_m3),
        0
      );

    const summary =
      $r('reportSelectionSummary');

    if(summary){
      summary.textContent =
        `Seçili: ${slips.length} fiş · ${total.toFixed(3)} m³`;
    }

    const cariButton =
      $r('cariTransferBtn');

    if(cariButton){

      const ready =
        slips.length > 0 &&
        slips.every(
          slip => cariState(slip) === 'READY'
        );

      cariButton.disabled = !ready;

      if(!slips.length){
        cariButton.title =
          'Önce beton fişi seç.';
      }else if(!ready){
        cariButton.title =
          'Sınıflandırılmamış fiş cariye aktarılamaz.';
      }else{
        cariButton.title =
          'Cari entegrasyonu V10.1B ile bağlanacak.';
      }
    }

    const all =
      $r('reportSelectAll');

    if(all){

      const visibleIds =
        filtered.map(
          slip => String(slip.id)
        );

      all.checked =
        visibleIds.length > 0 &&
        visibleIds.every(
          id => selected.has(id)
        );
    }
  }

  function resetFilters(){

    [
      'filterDateFrom',
      'filterDateTo',
      'filterSlipNo',
      'filterSupplier',
      'filterConcreteClass',
      'filterScope',
      'filterWorkGroup',
      'filterCostCenter',
      'filterCariStatus'
    ].forEach(id => {

      const el = $r(id);

      if(el) el.value = '';
    });

    applyFilters();
  }

  function selectVisible(){

    filtered.forEach(
      slip => selected.add(String(slip.id))
    );

    render();
  }

  function toggleVisible(checked){

    filtered.forEach(slip => {

      const id = String(slip.id);

      if(checked){
        selected.add(id);
      }else{
        selected.delete(id);
      }
    });

    render();
  }

  function csvEscape(value){

    const text =
      String(value ?? '');

    return `"${text.replaceAll('"','""')}"`;
  }

  function exportCSV(){

    const rows =
      selected.size
        ? selectedSlips()
        : filtered;

    if(!rows.length){
      alert('Çıktı alınacak beton fişi bulunamadı.');
      return;
    }

    const header = [
      'Fiş No',
      'Tarih',
      'Miktar m3',
      'Beton Sınıfı',
      'Tedarikçi',
      'Araç',
      'Şoför',
      'Fişteki Yer',
      'Gerçek Şantiye',
      'Sınıflandırma',
      'İş Grubu',
      'İmalat / Kullanım Yeri',
      'Masraf Merkezi',
      'Cari Durumu'
    ];

    const data = rows.map(slip => {

      const scope =
        slipScope(slip);

      const cari =
        cariState(slip);

      return [
        slip.slip_no,
        slip.slip_date,
        num(slip.quantity_m3).toFixed(3),
        slip.concrete_class,
        slip.supplier_name,
        slip.vehicle_plate,
        slip.driver_name,
        slip.printed_site_name,
        slip.actual_site_name,
        scopeLabel(scope),
        slipWorkGroup(slip),
        slipWorkItem(slip),
        slipCostCenter(slip),
        cariLabel(cari)
      ];
    });

    const csv =
      '\ufeff' +
      [header,...data]
        .map(
          row =>
            row.map(csvEscape).join(';')
        )
        .join('\r\n');

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8'
        }
      );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    const today =
      new Date()
        .toISOString()
        .slice(0,10);

    a.download =
      `ORYVEX-Beton-Fisleri-${today}.csv`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
  }

  function printReport(){

    if(!filtered.length){
      alert('Yazdırılacak beton fişi bulunamadı.');
      return;
    }

    window.print();
  }

  function cariTransfer(){

    const slips =
      selectedSlips();

    if(!slips.length){
      alert('Önce beton fişi seç.');
      return;
    }

    const blocked =
      slips.filter(
        slip =>
          cariState(slip) !== 'READY'
      );

    if(blocked.length){
      alert(
        'Sınıflandırılmamış beton fişi cariye aktarılamaz.'
      );

      return;
    }

    /*
      V10.1A güvenlik:
      Henüz canlı cari tablosu bilinmediği için
      INSERT / RPC YAPMIYORUZ.
    */

    alert(
      'Cari aktarım altyapısı hazır. ' +
      'Mevcut Cari Takip tablosu doğrulandıktan sonra ' +
      'V10.1B ile gerçek aktarım açılacak.'
    );
  }

  function bind(){

    [
      'filterDateFrom',
      'filterDateTo',
      'filterSlipNo',
      'filterSupplier',
      'filterConcreteClass',
      'filterScope',
      'filterWorkGroup',
      'filterCostCenter',
      'filterCariStatus'
    ].forEach(id => {

      const el = $r(id);

      if(!el) return;

      el.addEventListener(
        el.tagName === 'SELECT'
          ? 'change'
          : 'input',
        applyFilters
      );
    });

    $r('filterResetBtn')
      ?.addEventListener(
        'click',
        resetFilters
      );

    $r('selectVisibleBtn')
      ?.addEventListener(
        'click',
        selectVisible
      );

    $r('reportSelectAll')
      ?.addEventListener(
        'change',
        e =>
          toggleVisible(
            e.target.checked
          )
      );

    $r('printBetonBtn')
      ?.addEventListener(
        'click',
        printReport
      );

    $r('csvBetonBtn')
      ?.addEventListener(
        'click',
        exportCSV
      );

    $r('cariTransferBtn')
      ?.addEventListener(
        'click',
        cariTransfer
      );
  }

  function setData(slips){

    source =
      Array.isArray(slips)
        ? slips
        : [];

    /*
      Mevcut beton-core.js farklı veri yapıları
      kullanıyorsa pour ilişkisini normalize ediyoruz.
    */

    source = source.map(slip => {

      if(slip.pour){
        return slip;
      }

      if(
        slip.pours &&
        !slip.pour
      ){
        return {
          ...slip,
          pour: slip.pours
        };
      }

      return slip;
    });

    applyFilters();
  }

  function init(){

    bind();

    /*
      beton-core.js içindeki global slips değişkeni
      mevcutsa ilk veriyi al.
    */

    try{

      if(
        typeof slips !== 'undefined' &&
        Array.isArray(slips)
      ){
        setData(slips);
      }else{
        render();
      }

    }catch(_){
      render();
    }
  }

  return {
    init,
    setData,
    applyFilters,
    selectedSlips
  };

})();

window.ORYVEXBetonReport =
  ORYVEXBetonReport;


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
  reload
};

})();
