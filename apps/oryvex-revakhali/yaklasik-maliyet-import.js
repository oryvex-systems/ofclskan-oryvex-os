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
