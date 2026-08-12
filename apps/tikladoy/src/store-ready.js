import { supabase } from './supabase.js'

function addStoreFooter(){
  if(document.querySelector('#storeLegalFooter')) return;
  const footer=document.createElement('footer');
  footer.id='storeLegalFooter';
  footer.style.cssText='padding:22px 18px 110px;text-align:center;font:500 12px/1.6 Inter,system-ui;color:#8f9898';
  footer.innerHTML='<a href="/privacy.html" style="color:#cfd5d5">Gizlilik</a> · <a href="/terms.html" style="color:#cfd5d5">Kullanım Koşulları</a> · <a href="/account-delete.html" style="color:#cfd5d5">Hesap Silme</a>';
  document.querySelector('.app-v2')?.appendChild(footer);
}

async function injectAccountDelete(){
  const accountRoot=[...document.querySelectorAll('h1')].find(x=>/hoş geldin|hesabım/i.test(x.textContent||''))?.closest('section')?.parentElement;
  if(!accountRoot || document.querySelector('#deleteAccountBtn')) return;
  const { data:{ session } }=await supabase.auth.getSession();
  if(!session) return;
  const box=document.createElement('div');
  box.style.cssText='margin:18px;padding:18px;border:1px solid #5b2828;border-radius:16px;background:#1a1111';
  box.innerHTML='<strong style="display:block;margin-bottom:6px">Hesap ve veriler</strong><p style="margin:0 0 12px;color:#b9bebe;font-size:13px">Hesabını kalıcı olarak silebilirsin. Yasal olarak saklanması gereken işlem kayıtları gizlilik politikasındaki süreler boyunca tutulabilir.</p><button id="deleteAccountBtn" style="width:100%;padding:13px;border:0;border-radius:12px;background:#b3261e;color:#fff;font-weight:800">Hesabımı Sil</button><div id="deleteAccountStatus" style="margin-top:10px;font-size:12px"></div>';
  accountRoot.appendChild(box);
  document.querySelector('#deleteAccountBtn').onclick=async()=>{
    if(!confirm('TIKLADOY hesabın kalıcı olarak silinecek. Devam edilsin mi?')) return;
    const btn=document.querySelector('#deleteAccountBtn'); const status=document.querySelector('#deleteAccountStatus');
    btn.disabled=true; status.textContent='Hesap siliniyor…';
    const { error }=await supabase.functions.invoke('delete-account',{body:{confirm:true}});
    if(error){status.textContent='Hesap silme şu anda tamamlanamadı. Hesap Silme sayfasından talep oluşturabilirsin.';btn.disabled=false;return;}
    await supabase.auth.signOut(); localStorage.removeItem('tikladoy_cart'); location.href='/';
  };
}

const observer=new MutationObserver(()=>{addStoreFooter();injectAccountDelete()});
observer.observe(document.body,{childList:true,subtree:true});
addStoreFooter(); injectAccountDelete();
