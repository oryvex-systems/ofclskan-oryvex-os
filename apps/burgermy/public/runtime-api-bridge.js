(() => {
  const SUPABASE_URL = 'https://wdimzayfvtlrxljpsvza.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_FZwX09JGrJt3Q9WXW3V1dQ_-g9aegh4';
  const TOKEN_KEY = 'burgermy-auth-token';
  const BASE_PATH = location.pathname.startsWith('/burgermy') ? '/burgermy' : '';
  const nativeFetch = window.fetch.bind(window);

  const json = (data, init = {}) => new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const setToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
  const edge = (name) => `${SUPABASE_URL}/functions/v1/${name}`;
  const baseHeaders = (token = '') => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json' });

  async function callEdge(name, init = {}, token = '') {
    return nativeFetch(edge(name), { ...init, headers: { ...baseHeaders(token), ...(init.headers || {}) } });
  }

  function normalizeStaticPaths(root = document) {
    root.querySelectorAll?.('img[src^="/products/"]').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && BASE_PATH && !src.startsWith(`${BASE_PATH}/`)) img.setAttribute('src', `${BASE_PATH}${src}`);
    });
    root.querySelectorAll?.('a[href="/"]').forEach((a) => a.setAttribute('href', `${BASE_PATH || ''}/`));
  }

  const observer = new MutationObserver(() => normalizeStaticPaths());
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => normalizeStaticPaths());

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith('/api/')) return nativeFetch(input, init);
    const method = String(init.method || 'GET').toUpperCase();
    const token = getToken();

    try {
      if (url === '/api/catalog') return callEdge('burgermy-catalog', { method: 'GET' });
      if (url === '/api/auth/email' && method === 'POST') {
        const response = await callEdge('burgermy-auth', { method: 'POST', body: init.body || '{}' });
        const data = await response.clone().json().catch(() => ({}));
        if (response.ok && data.access_token) {
          setToken(data.access_token);
          return json({ ok: true, userId: data.user?.id, email: data.user?.email || data.email });
        }
        if (response.ok && data.confirmationRequired) return json(data);
        return response;
      }
      if (url === '/api/auth/session') {
        if (method === 'DELETE') { setToken(''); return json({ ok: true }); }
        if (method === 'POST') {
          const body = JSON.parse(init.body || '{}');
          if (body.accessToken) setToken(body.accessToken);
        }
        const current = getToken();
        if (!current) return json({ authenticated: false });
        const response = await callEdge('burgermy-session', { method: 'GET' }, current);
        if (!response.ok) { setToken(''); return json({ authenticated: false }); }
        const data = await response.json();
        return json({ authenticated: true, userId: data.userId || data.user?.id, email: data.email || data.user?.email || null, metadata: data.metadata || data.user?.user_metadata || {} });
      }
      if (url === '/api/orders') {
        if (!token) return json({ error: 'Giriş yapmalısınız.' }, { status: 401 });
        return callEdge('burgermy-orders', { method, body: method === 'POST' ? (init.body || '{}') : undefined }, token);
      }
      if (url === '/api/payments/paytr' && method === 'POST') {
        if (!token) return json({ error: 'Ödeme için giriş yapmalısınız.' }, { status: 401 });
        const body = JSON.parse(init.body || '{}');
        const response = await callEdge('paytr-create-token', { method: 'POST', body: JSON.stringify({ orderId: body.orderId, userName: body.userName, userAddress: body.userAddress, userPhone: body.userPhone }) }, token);
        if (!response.ok) return response;
        const data = await response.json();
        return json({ ok: true, iframeUrl: data.iframeUrl, token: data.token });
      }
      if (url === '/api/auth/delete-account' && method === 'POST') {
        if (!token) return json({ error: 'Oturum bulunamadı.' }, { status: 401 });
        const response = await callEdge('delete-account', { method: 'POST', body: JSON.stringify({ confirm: true }) }, token);
        if (response.ok) setToken('');
        return response;
      }
      if (url === '/api/admin') {
        if (!token) return json({ error: 'Yönetim yetkisi gerekli.' }, { status: 401 });
        return callEdge('burgermy-admin', { method, body: method === 'PATCH' ? (init.body || '{}') : undefined }, token);
      }
      return nativeFetch(input, init);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' }, { status: 500 });
    }
  };
})();
