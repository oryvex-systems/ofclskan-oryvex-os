const BASE=(import.meta.env.BASE_URL||'/').replace(/\/$/,'')
function fixPaths(root=document){
  if(!BASE)return
  root.querySelectorAll?.('img[src^="/products/"]').forEach(img=>{
    const src=img.getAttribute('src')
    if(src&&!src.startsWith(`${BASE}/`))img.setAttribute('src',`${BASE}${src}`)
  })
}
new MutationObserver(()=>fixPaths()).observe(document.documentElement,{childList:true,subtree:true})
document.addEventListener('DOMContentLoaded',()=>fixPaths())
