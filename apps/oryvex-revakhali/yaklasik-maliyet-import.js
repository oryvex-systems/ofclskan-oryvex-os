(()=>{

  const state = {
    workbook: null,
    sheets: [],
    activeSheet: null,
    rows: [],
    mapped: []
  };

  const TR_MAP = {
    sira: ['sıra','sira','sıra no','sira no','no'],
    poz: ['poz','poz no','poz numarası','poz numarasi'],
    tanim: ['tanımı','tanimi','iş kalemi','is kalemi','açıklama','aciklama','imalat'],
    birim: ['birim'],
    miktar: ['miktar','metraj'],
    birim_fiyat: ['birim fiyat','fiyat','bf'],
    tutar: ['tutar','toplam']
  };

  function norm(v){
    return String(v ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g,' ');
  }

  function trNumber(v){
    if(typeof v === 'number') return v;
    let s = String(v ?? '').trim();
    if(!s) return 0;

    if(/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)){
      s = s.replace(/\./g,'').replace(',','.');
    } else if(/^-?\d+,\d+$/.test(s)){
      s = s.replace(',','.');
    } else {
      s = s.replace(/[^\d.-]/g,'');
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function detectHeader(rows){
    let best = {idx:0, score:-1};

    rows.slice(0,25).forEach((row,i)=>{
      const values = row.map(norm);
      let score = 0;

      Object.values(TR_MAP).flat().forEach(k=>{
        if(values.some(v=>v===k || v.includes(k))) score++;
      });

      if(score > best.score) best = {idx:i, score};
    });

    return best.idx;
  }

  function detectColumns(headers){
    const out = {};

    headers.forEach((h,i)=>{
      const n = norm(h);

      Object.entries(TR_MAP).forEach(([key,aliases])=>{
        if(out[key] == null && aliases.some(a=>n===a || n.includes(a))){
          out[key] = i;
        }
      });
    });

    return out;
  }

  function isGroupRow(row,map){
    const poz = row[map.poz] ?? '';
    const birim = row[map.birim] ?? '';
    const miktar = row[map.miktar] ?? '';
    const fiyat = row[map.birim_fiyat] ?? '';
    const tanim = row[map.tanim] ?? '';

    return !!tanim &&
      !poz &&
      !birim &&
      !miktar &&
      !fiyat;
  }

  function mapRows(rows){
    const hi = detectHeader(rows);
    const headers = rows[hi] || [];
    const map = detectColumns(headers);

    const result = [];

    rows.slice(hi+1).forEach((r,idx)=>{
      const tanim = r[map.tanim] ?? '';
      if(!String(tanim).trim()) return;

      if(isGroupRow(r,map)){
        result.push({
          type:'group',
          group:String(tanim).trim()
        });
        return;
      }

      const miktar = trNumber(r[map.miktar]);
      const fiyat = trNumber(r[map.birim_fiyat]);

      result.push({
        type:'item',
        source_row: hi + idx + 2,
        sira: r[map.sira] ?? '',
        poz_no: String(r[map.poz] ?? '').trim(),
        tanim: String(tanim).trim(),
        birim: String(r[map.birim] ?? '').trim(),
        miktar,
        birim_fiyat: fiyat,
        tutar: fiyat ? miktar * fiyat : trNumber(r[map.tutar]),
        fiyat_durumu: fiyat > 0 ? 'excel' : 'fiyatlandirilacak'
      });
    });

    return {headers,map,result};
  }

  function money(n){
    return Number(n||0).toLocaleString('tr-TR',{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    });
  }

  function renderPreview(){
    const body = document.getElementById('excelPreviewBody');
    const summary = document.getElementById('excelSummary');
    if(!body) return;

    body.innerHTML = '';

    let total = 0;
    let items = 0;
    let missing = 0;

    state.mapped.forEach(x=>{
      const tr = document.createElement('tr');

      if(x.type === 'group'){
        tr.innerHTML = `<td colspan="7" style="font-weight:800;background:#182235">${x.group}</td>`;
      } else {
        items++;
        total += Number(x.tutar||0);
        if(!x.birim_fiyat) missing++;

        tr.innerHTML = `
          <td>${x.sira ?? ''}</td>
          <td>${x.poz_no ?? ''}</td>
          <td>${x.tanim}</td>
          <td>${x.birim ?? ''}</td>
          <td>${money(x.miktar)}</td>
          <td>${x.birim_fiyat ? money(x.birim_fiyat) : '<span style="color:#ffb020">Fiyatlandırılacak</span>'}</td>
          <td>${money(x.tutar)}</td>`;
      }

      body.appendChild(tr);
    });

    summary.innerHTML =
      `<b>${items}</b> kalem · ` +
      `<b>${missing}</b> fiyat bekliyor · ` +
      `Toplam <b>${money(total)} TL</b>`;
  }

  async function handleFile(file){
    const buf = await file.arrayBuffer();
    state.workbook = XLSX.read(buf,{type:'array'});

    state.sheets = state.workbook.SheetNames;

    const select = document.getElementById('excelSheetSelect');
    select.innerHTML = state.sheets
      .map(x=>`<option value="${x}">${x}</option>`)
      .join('');

    select.disabled = false;
    loadSheet(state.sheets[0]);
  }

  function loadSheet(name){
    state.activeSheet = name;

    const ws = state.workbook.Sheets[name];
    state.rows = XLSX.utils.sheet_to_json(ws,{
      header:1,
      raw:false,
      defval:''
    });

    const parsed = mapRows(state.rows);
    state.mapped = parsed.result;

    renderPreview();
  }

  function inject(){
    const target =
      document.querySelector('main') ||
      document.querySelector('.container') ||
      document.body;

    const box = document.createElement('section');
    box.id = 'excelImportBox';

    box.innerHTML = `
      <div style="margin:18px 0;padding:18px;border:1px solid #26344d;border-radius:16px;background:#101827">
        <h2 style="margin:0 0 6px">📥 Doküman / Excel Girişi</h2>
        <p style="opacity:.75;margin:0 0 14px">
          Keşif, yaklaşık maliyet veya teklif cetvelini Excel/CSV olarak yükleyin.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input id="excelFileInput" type="file"
            accept=".xlsx,.xls,.csv"
            style="padding:10px;background:#0b1220;border:1px solid #334155;border-radius:10px">

          <select id="excelSheetSelect" disabled
            style="padding:10px;background:#0b1220;color:white;border:1px solid #334155;border-radius:10px"></select>
        </div>

        <div id="excelSummary" style="margin:14px 0"></div>

        <div style="overflow:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Poz No</th>
                <th>İş Kalemi</th>
                <th>Birim</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody id="excelPreviewBody"></tbody>
          </table>
        </div>

        <div style="margin-top:14px">
          <button id="excelImportBtn"
            style="padding:11px 16px;border:0;border-radius:10px;font-weight:800;cursor:pointer">
            Yaklaşık Maliyete Aktar
          </button>
        </div>
      </div>`;

    target.prepend(box);

    document.getElementById('excelFileInput')
      .addEventListener('change',e=>{
        if(e.target.files?.[0]) handleFile(e.target.files[0]);
      });

    document.getElementById('excelSheetSelect')
      .addEventListener('change',e=>loadSheet(e.target.value));

    document.getElementById('excelImportBtn')
      .addEventListener('click',()=>{
        window.dispatchEvent(new CustomEvent('oryvex:approx-import',{
          detail:{
            sheet:state.activeSheet,
            rows:state.mapped
          }
        }));

        alert('Excel verileri yaklaşık maliyet modülüne hazırlandı.');
      });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',inject);
  } else {
    inject();
  }

})();

window.addEventListener('oryvex:approx-import', async (ev) => {
  try {
    const detail = ev.detail || {};
    const rows = (detail.rows || []).filter(x => x.type === 'item');

    if (!rows.length) {
      alert('Aktarılacak maliyet kalemi bulunamadı.');
      return;
    }

    const { data: { session }, error: sessionError } = await sb.auth.getSession();

    if (sessionError || !session) {
      const localRows = rows.map(x => ({
        item_code: x.poz_no || '',
        item_name: x.tanim || '',
        unit: x.birim || '',
        quantity: Number(x.miktar || 0),
        unit_price: Number(x.birim_fiyat || 0),
        amount: Number(x.tutar || 0),
        price_status: x.fiyat_durumu || ''
      }));

      const draft = {
        id: 'LOCAL-' + Date.now(),
        revision_no: 0,
        title: (detail.sheet || 'Excel') + ' - Rev.0',
        sheet: detail.sheet || '',
        created_at: new Date().toISOString(),
        rows: localRows,
        total: localRows.reduce((sum, x) => sum + Number(x.amount || 0), 0),
        sync_status: 'pending'
      };

      localStorage.setItem('oryvex:estimate:draft', JSON.stringify(draft));

      alert(
        'Aktarım tamamlandı.\n\n' +
        'Revizyon: Rev.0\n' +
        'Kalem: ' + localRows.length + '\n' +
        'Toplam: ' + draft.total.toLocaleString('tr-TR', {
          style: 'currency',
          currency: 'TRY'
        }) +
        '\n\nSupabase senkronizasyonu yetkili oturum açıldığında yapılacak.'
      );

      window.dispatchEvent(
        new CustomEvent('oryvex:estimate-local-import', { detail: draft })
      );
      return;
    }

    const { data: member, error: memberError } = await sb
      .from('santiye_company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (memberError || !member?.company_id) {
      throw new Error(memberError?.message || 'Aktif şirket üyeliği bulunamadı.');
    }

    const companyId = member.company_id;

    const { data: projects, error: projectError } = await sb
      .from('santiye_projects')
      .select('id,name')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (projectError) throw projectError;

    if (!projects?.length) {
      alert('Aktarım için önce bir proje oluşturulmalı.');
      return;
    }

    const projectText = projects
      .map((p, i) => `${i + 1}. ${p.name}`)
      .join('\n');

    const choice = prompt(
      `Excel hangi projeye aktarılsın?\n\n${projectText}\n\nProje numarasını yaz:`,
      '1'
    );

    if (!choice) return;

    const project = projects[Number(choice) - 1];

    if (!project) {
      alert('Geçersiz proje seçimi.');
      return;
    }

    const { data: revisions, error: revListError } = await sb
      .from('santiye_estimate_revisions')
      .select('revision_no')
      .eq('company_id', companyId)
      .eq('project_id', project.id)
      .order('revision_no', { ascending: false })
      .limit(1);

    if (revListError) throw revListError;

    const nextRevision =
      revisions?.length
        ? Number(revisions[0].revision_no) + 1
        : 0;

    const sourceKey =
      `${project.id}|${detail.sheet}|${rows.length}|` +
      rows.slice(0, 5).map(x => `${x.poz_no}:${x.tanim}`).join('|');

    const duplicateCheck = localStorage.getItem('oryvex:last-estimate-import');

    if (duplicateCheck === sourceKey) {
      const again = confirm(
        'Bu Excel sayfası az önce aktarılmış görünüyor. Yeniden Rev.' +
        nextRevision +
        ' olarak aktarılsın mı?'
      );

      if (!again) return;
    }

    const { data: revision, error: revisionError } = await sb
      .from('santiye_estimate_revisions')
      .insert({
        company_id: companyId,
        project_id: project.id,
        revision_no: nextRevision,
        title: `${detail.sheet || 'Excel'} - Rev.${nextRevision}`,
        note: `Excel doküman aktarımı: ${detail.sheet || 'Bilinmeyen sayfa'}`,
        status: 'draft',
        created_by: session.user.id
      })
      .select('id')
      .single();

    if (revisionError) throw revisionError;

    const items = rows.map(x => ({
      revision_id: revision.id,
      measurement_id: null,
      item_code: x.poz_no || null,
      item_name: x.tanim,
      unit: x.birim || null,
      base_quantity: Number(x.miktar || 0),
      revised_quantity: Number(x.miktar || 0),
      base_unit_price: Number(x.birim_fiyat || 0),
      revised_unit_price: Number(x.birim_fiyat || 0),
      delta_amount: 0
    }));

    const batchSize = 250;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const { error: itemError } = await sb
        .from('santiye_estimate_revision_items')
        .insert(batch);

      if (itemError) {
        throw itemError;
      }
    }

    localStorage.setItem('oryvex:last-estimate-import', sourceKey);

    const total = rows.reduce(
      (sum, x) => sum + Number(x.tutar || 0),
      0
    );

    alert(
      `Aktarım tamamlandı.\n\n` +
      `Proje: ${project.name}\n` +
      `Revizyon: Rev.${nextRevision}\n` +
      `Kalem: ${rows.length}\n` +
      `Toplam: ${total.toLocaleString('tr-TR', {
        style: 'currency',
        currency: 'TRY'
      })}`
    );

  } catch (err) {
    console.error('ORYVEX Excel aktarım hatası:', err);
    alert('Aktarım hatası: ' + (err?.message || err));
  }
});
