(()=>{
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page==='giris.html') return;

  const style=document.createElement('style');
  style.textContent=`
    html,body{max-width:100%;overflow-x:hidden}
    button,a,input,select,textarea{touch-action:manipulation}
    button,.btn,.primary{min-height:42px}
    input,select,textarea{font-size:16px}
    .oryvex-net{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9998;padding:7px 10px;border-radius:999px;font:700 10px Inter,system-ui,sans-serif;border:1px solid #23445f;background:#07111fe8;color:#7f91a8;display:none}
    .oryvex-net.show{display:block}.oryvex-net.off{color:#ff9b9b;border-color:#6b2834}
    @media(max-width:600px){main,.w,.wrap{padding-bottom:84px!important}.hero h1{overflow-wrap:anywhere}.row{min-width:0}.row>div{min-width:0}.nav{scrollbar-width:thin}}
  `;
  document.head.appendChild(style);

  const net=document.createElement('div');
  net.className='oryvex-net';
  document.body.appendChild(net);
  const showNet=()=>{
    if(navigator.onLine){net.textContent='● BAĞLANTI GERİ GELDİ';net.className='oryvex-net show';setTimeout(()=>net.className='oryvex-net',1800)}
    else{net.textContent='● ÇEVRİMDIŞI';net.className='oryvex-net show off'}
  };
  addEventListener('online',showNet);addEventListener('offline',showNet);if(!navigator.onLine)showNet();

  // Prevent accidental duplicate writes on slow mobile connections.
  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement)||form.dataset.oryvexSubmitting==='1')return;
    form.dataset.oryvexSubmitting='1';
    const btn=form.querySelector('button[type="submit"],button:not([type])');
    if(btn&&!btn.disabled){btn.dataset.oryvexText=btn.textContent;btn.disabled=true;btn.textContent='Kaydediliyor...'}
    setTimeout(()=>{form.dataset.oryvexSubmitting='0';if(btn){btn.disabled=false;if(btn.dataset.oryvexText)btn.textContent=btn.dataset.oryvexText}},4500);
  },true);

  // Project-bound modules must not query or submit against an empty project scope.
  if(page==='modul.html'){
    const mode=new URLSearchParams(location.search).get('m')||'projeler';
    const projectBound=['gunluk','isler','malzeme','satinalma','hakedis','fotograf'];
    if(projectBound.includes(mode)){
      const guard=()=>{
        const select=document.querySelector('#form select[name="project_id"]');
        if(!select)return;
        const hasProject=[...select.options].some(o=>o.value);
        if(hasProject)return;
        const form=document.getElementById('form');
        form?.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
        if(form&&!form.querySelector('.oryvex-no-project')){
          const note=document.createElement('div');note.className='oryvex-no-project';
          note.style.cssText='margin-top:12px;padding:11px;border:1px solid #6b4b20;border-radius:12px;color:#f8b83f;font-size:12px';
          note.textContent='Bu işlem için önce Projeler ekranından aktif bir proje oluşturun.';form.appendChild(note);
        }
      };
      setTimeout(guard,350);setTimeout(guard,1000);
    }
  }

  // Make external-window links safe by default.
  document.querySelectorAll('a[target="_blank"]').forEach(a=>{if(!a.rel)a.rel='noopener noreferrer'});
})();