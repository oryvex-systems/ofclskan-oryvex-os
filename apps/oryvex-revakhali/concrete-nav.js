(() => {
function add(){
if(document.querySelector('[data-concrete-link]'))return;
const a=document.createElement('a');
a.href='beton.html';
a.textContent='🧱 Beton Takip';
a.dataset.concreteLink='1';
a.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9998;background:#f59e0b;color:#07111f;text-decoration:none;font-weight:900;padding:11px 14px;border-radius:14px;box-shadow:0 10px 30px #0007';
document.body.appendChild(a);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);
else add();
})();
