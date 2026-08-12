import { supabase } from './supabase.js'

export async function createPaytrToken({ orderId, userName, userAddress, userPhone }) {
  const { data, error } = await supabase.functions.invoke('paytr-create-token', {
    body: { orderId, userName, userAddress, userPhone }
  })
  if (error) throw error
  if (!data?.token) throw new Error(data?.error || 'PayTR ödeme oturumu oluşturulamadı')
  return data
}

export function renderPaytrIframe(container, token) {
  if (!container) throw new Error('Ödeme alanı bulunamadı')
  container.innerHTML = `<iframe src="https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}" id="paytriframe" frameborder="0" scrolling="no" style="width:100%;min-height:720px;border:0;border-radius:18px;background:#fff"></iframe>`
}
