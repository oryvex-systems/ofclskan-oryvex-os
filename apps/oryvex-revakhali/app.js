import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  'https://wdimzayfvtlrxljpsvza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkaW16YXlmdnRscnhsanBzdnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTQwMTYsImV4cCI6MjEwMTg5MDAxNn0.yTfnKJV2je1P4I12VNT1LZz78mF0ge9Y1ymtnoRqVfU'
);

const $ = (id) => document.getElementById(id);
const state = { user: null, systems: [], tasks: [] };

function safe(value='') {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function setAuthMessage(message, type='') {
  const el = $('auth-message');
  el.textContent = message;
  el.className = `notice ${type}`;
  el.classList.toggle('hidden', !message);
}

function systemHref(system) {
  if (system.slug === 'tikladoy') return '/tikladoy/';
  if (system.slug === 'burgermy') return '/burgermy/';
  return system.app_url || '#';
}

function renderPublicSystems() {
  const systems = [
    ['TIKLADOY','Paket yemek platformu','/tikladoy/','AKTİF'],
    ['BURGERMY','Sipariş ve operasyon sistemi','/burgermy/','AKTİF'],
    ['WOODLIFE','Satış, teklif ve CRM','#','GELİŞTİRİLİYOR'],
    ['TEKNOM YAPI','Şantiye ve proje yönetimi','#','GELİŞTİRİLİYOR'],
    ['DOME LIGHTING','Teklif ve üretim yönetimi','#','PLANLANDI'],
    ['KAYNAŞALIM','Topluluk platformu','#','PLANLANDI'],
  ];
  $('public-systems').innerHTML = systems.map(([name,desc,href,status]) => `
    <a class="system" href="${href}">
      <div><b>${name}</b><div class="muted">${desc}</div></div>
      <span class="status ${status==='AKTİF'?'active':'dev'}">${status==='AKTİF'?'● ':''}${status}</span>
    </a>`).join('');
}

function renderPrivate() {
  const active = state.systems.filter(s => s.status === 'active').length;
  const pending = state.tasks.filter(t => ['todo','overdue'].includes(t.status)).length;
  $('metric-active').textContent = active;
  $('metric-systems').textContent = state.systems.length;
  $('metric-tasks').textContent = pending;

  $('live-systems').innerHTML = state.systems.map(system => {
    const href = systemHref(system);
    const canOpen = href !== '#';
    const label = system.status === 'active' ? 'AKTİF' : system.status === 'development' ? 'GELİŞTİRİLİYOR' : system.status.toUpperCase();
    const inner = `<div><b>${safe(system.name)}</b><div class="muted">${safe(system.description || '')}</div></div><span class="status ${system.status==='active'?'active':'dev'}">${system.status==='active'?'● ':''}${label}</span>`;
    return canOpen ? `<a class="system" href="${href}">${inner}</a>` : `<div class="system">${inner}</div>`;
  }).join('') || '<div class="notice">Bu hesap için çalışma alanı bulunamadı.</div>';

  const statusLabel = {todo:'Yapılacak',in_progress:'Devam Ediyor',done:'Tamamlandı',overdue:'Geciken'};
  const priorityLabel = {low:'Düşük',medium:'Orta',high:'Yüksek',critical:'Kritik'};
  $('live-tasks').innerHTML = state.tasks.map(task => `
    <article class="task">
      <div class="task-top"><strong>${safe(task.title)}</strong><span class="priority gradient">${priorityLabel[task.priority] || task.priority}</span></div>
      <div class="muted" style="margin-top:8px">${safe(task.oryvex_workspaces?.name || 'ORYVEX')} · ${statusLabel[task.status] || task.status}${task.due_date ? ` · ${safe(task.due_date)}` : ''}</div>
    </article>`).join('') || '<div class="notice">Görev bulunamadı.</div>';

  const displayName = state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'Kullanıcı';
  $('welcome-name').textContent = displayName;
  $('user-email').textContent = state.user?.email || '';
  $('ai-summary').innerHTML = `Şu anda <strong>${active} aktif sistem</strong> ve <strong>${pending} bekleyen görev</strong> bulunuyor. ORYVEX çekirdeği Supabase ile canlı bağlı.`;
}

async function loadPrivateData() {
  const [{ data: systems, error: systemsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from('oryvex_workspaces').select('id,slug,name,description,status,app_url,updated_at').order('name'),
    supabase.from('oryvex_tasks').select('id,title,status,priority,due_date,workspace_id,oryvex_workspaces(name)').order('due_date', { ascending: true, nullsFirst: false })
  ]);
  if (systemsError) console.error(systemsError);
  if (tasksError) console.error(tasksError);
  state.systems = systems || [];
  state.tasks = tasks || [];
  renderPrivate();
}

function applySession(user) {
  state.user = user;
  const signedIn = Boolean(user);
  $('public-view').classList.toggle('hidden', signedIn);
  $('private-view').classList.toggle('hidden', !signedIn);
  $('login-open').classList.toggle('hidden', signedIn);
  $('userbar').classList.toggle('hidden', !signedIn);
  if (signedIn) loadPrivateData();
}

$('login-open').addEventListener('click', () => {
  $('auth-panel').classList.toggle('hidden');
  $('email').focus();
});

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthMessage('Giriş yapılıyor...');
  const email = $('email').value.trim();
  const password = $('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage('Giriş başarısız. E-posta veya şifreyi kontrol edin.', 'error');
  setAuthMessage('Giriş başarılı.', 'success');
  applySession(data.user);
  $('auth-panel').classList.add('hidden');
});

$('logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  applySession(null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

renderPublicSystems();
const { data: { session } } = await supabase.auth.getSession();
applySession(session?.user || null);
supabase.auth.onAuthStateChange((_event, sessionData) => applySession(sessionData?.user || null));
