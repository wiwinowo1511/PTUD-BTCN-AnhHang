/* Lumi: tiện ích dùng chung, danh sách task (Dashboard + Tasks) và Dashboard */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUS_CLS = { 'To Do': 'todo', 'In Progress': 'doing', Completed: 'done' };

const ICON = {
  today: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
};
const svg = k => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = s => (s ? s.split('-').reverse().join('/') : '–');
const fmtDateTime = s => (s ? `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}` : '–');
const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

/* ---------- API + toast ---------- */
async function api(path, opt = {}) {
  let res;
  try {
    res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  } catch {
    throw new Error('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success) {
    const e = new Error((json && json.error && json.error.message) || 'Đã có lỗi xảy ra');
    e.details = json && json.error && json.error.details;
    throw e;
  }
  return json;
}

function toast(msg, type = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg; box.append(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3300);
}

let _cats = null;
async function getCategories() { if (!_cats) _cats = (await api('/categories')).data; return _cats; }

/* ---------- Sidebar + dialogs ---------- */
function mountSidebar() {
  const page = document.body.dataset.page;
  const items = [['dashboard', 'index.html', 'Hôm nay', 'today'], ['tasks', 'tasks.html', 'Công việc', 'list'], ['stats', 'statistics.html', 'Thống kê', 'chart']];
  $('#sidebar').innerHTML = `
    <a class="brand" href="index.html"><span class="logo">✦</span><b>Lumi</b></a>
    <nav>${items.map(([k, href, label, ic]) => `<a href="${href}" class="${k === page ? 'active' : ''}" ${k === page ? 'aria-current="page"' : ''}>${svg(ic)}<span>${label}</span></a>`).join('')}</nav>
    <div class="side-note"><b>Mẹo nhỏ</b>Chia việc lớn thành các bước ngắn, mỗi bước chỉ vài chục phút.</div>`;
}

function mountDialogs() {
  const opts = a => a.map(v => `<option>${v}</option>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
  <dialog id="dlg-form"><form id="task-form" novalidate>
    <header><h2 id="form-title"></h2><button type="button" class="icon-btn" data-close aria-label="Đóng">✕</button></header>
    <label>Tiêu đề *<input name="title" maxlength="150" placeholder="Bạn cần làm gì?" autocomplete="off"><small class="err" data-err="title"></small></label>
    <label>Mô tả<textarea name="description" rows="3" maxlength="1000" placeholder="Ghi chú ngắn về công việc"></textarea><small class="err" data-err="description"></small></label>
    <div class="row">
      <label>Danh mục<select name="category_id"></select></label>
      <label>Ưu tiên<select name="priority">${opts(PRIORITIES)}</select></label>
      <label>Trạng thái<select name="status">${opts(STATUSES)}</select></label>
    </div>
    <div class="row">
      <label>Ngày bắt đầu<input type="date" name="start_date"><small class="err" data-err="start_date"></small></label>
      <label>Hạn chót<input type="date" name="due_date"><small class="err" data-err="due_date"></small></label>
    </div>
    <footer><button type="button" class="btn ghost" data-close>Hủy</button><button class="btn primary" id="form-save">Lưu công việc</button></footer>
  </form></dialog>
  <dialog id="dlg-confirm"><h2>Xóa công việc này?</h2><p class="muted" id="confirm-text" style="margin-top:8px"></p>
    <footer><button class="btn ghost" data-close>Giữ lại</button><button class="btn danger" id="confirm-ok">Xóa</button></footer></dialog>
  <dialog id="dlg-detail"></dialog>`);
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }));
}

/* ---------- Form thêm/sửa ---------- */
function showErrors(errs) {
  $$('[data-err]').forEach(el => { el.textContent = errs[el.dataset.err] || ''; el.closest('label').classList.toggle('bad', !!errs[el.dataset.err]); });
}
function validate(b) {
  const e = {};
  if (!b.title.trim()) e.title = 'Tiêu đề không được để trống';
  if (!b.start_date) e.start_date = 'Chọn ngày bắt đầu';
  if (!b.due_date) e.due_date = 'Chọn hạn chót';
  if (b.start_date && b.due_date && b.due_date < b.start_date) e.due_date = 'Hạn chót không được trước ngày bắt đầu';
  return e;
}

async function openForm(task, onSaved) {
  const f = $('#task-form'), btn = $('#form-save');
  const cs = await getCategories().catch(() => []);
  f.elements.category_id.innerHTML = '<option value="">Chưa phân loại</option>' + cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const d = task || { title: '', description: '', category_id: '', priority: 'Medium', status: 'To Do', start_date: todayStr(), due_date: todayStr() };
  ['title', 'description', 'category_id', 'priority', 'status', 'start_date', 'due_date'].forEach(k => { f.elements[k].value = d[k] ?? ''; });
  $('#form-title').textContent = task ? 'Chỉnh sửa công việc' : 'Công việc mới';
  showErrors({});
  f.onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(f));
    const errs = validate(body);
    showErrors(errs);
    if (Object.keys(errs).length) return;
    btn.disabled = true;
    try {
      await api(task ? `/tasks/${task.id}` : '/tasks', { method: task ? 'PUT' : 'POST', body });
      $('#dlg-form').close();
      toast(task ? 'Đã cập nhật công việc' : 'Đã thêm công việc mới');
      onSaved();
    } catch (err) {
      if (err.details) showErrors(err.details);
      toast(err.message, 'err');
    } finally { btn.disabled = false; }
  };
  $('#dlg-form').showModal();
  f.elements.title.focus();
}

function confirmDelete(task, onDone) {
  $('#confirm-text').textContent = `“${task.title}” sẽ bị xóa vĩnh viễn.`;
  $('#confirm-ok').onclick = async () => {
    try { await api(`/tasks/${task.id}`, { method: 'DELETE' }); $('#dlg-confirm').close(); toast('Đã xóa công việc'); onDone(); }
    catch (e) { toast(e.message, 'err'); }
  };
  $('#dlg-confirm').showModal();
}

function openDetail(t, reload) {
  const dlg = $('#dlg-detail');
  dlg.innerHTML = `<header><h2>${esc(t.title)}</h2><button class="icon-btn" data-close aria-label="Đóng">✕</button></header>
    <p class="muted">${esc(t.description) || 'Không có mô tả.'}</p>
    <dl class="detail">
      <dt>Danh mục</dt><dd>${esc(t.category_name || 'Chưa phân loại')}</dd>
      <dt>Ưu tiên</dt><dd><span class="chip ${t.priority}">${t.priority}</span></dd>
      <dt>Trạng thái</dt><dd>${t.status}${t.is_overdue ? ' <span class="late-text">(quá hạn)</span>' : ''}</dd>
      <dt>Bắt đầu</dt><dd>${fmtDate(t.start_date)}</dd><dt>Hạn chót</dt><dd>${fmtDate(t.due_date)}</dd>
      <dt>Hoàn thành lúc</dt><dd>${fmtDateTime(t.completed_at)}</dd>
      <dt>Tạo lúc</dt><dd>${fmtDateTime(t.created_at)}</dd><dt>Cập nhật</dt><dd>${fmtDateTime(t.updated_at)}</dd>
    </dl>
    <footer><button class="btn danger" data-d>Xóa</button><button class="btn primary" data-e>Chỉnh sửa</button></footer>`;
  $('[data-e]', dlg).onclick = () => { dlg.close(); openForm(t, reload); };
  $('[data-d]', dlg).onclick = () => { dlg.close(); confirmDelete(t, reload); };
  dlg.showModal();
}

/* ---------- Danh sách task (dùng cho Dashboard và Tasks) ---------- */
function taskCard(t) {
  const done = t.status === 'Completed';
  return `<article class="task ${done ? 'is-done' : ''}" data-id="${t.id}" style="--cat:${esc(t.category_color || '#cbd5e1')}">
    <button class="check" aria-label="${done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}" aria-pressed="${done}"></button>
    <div class="body" data-act="detail">
      <h3>${esc(t.title)}</h3>${t.description ? `<p>${esc(t.description)}</p>` : ''}
      <div class="meta">
        <span class="chip cat"><i></i>${esc(t.category_name || 'Chưa phân loại')}</span>
        <span class="chip ${t.priority}">${t.priority}</span>
        ${t.is_overdue ? '<span class="chip late">Quá hạn</span>' : ''}
        <span class="when">${svg('today')} ${fmtDate(t.start_date)} – ${fmtDate(t.due_date)}</span>
      </div>
    </div>
    <div class="side">
      <select class="status ${STATUS_CLS[t.status]}" data-act="status" aria-label="Trạng thái">${STATUSES.map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="acts"><button class="icon-btn" data-act="edit" aria-label="Sửa">${svg('edit')}</button><button class="icon-btn danger" data-act="del" aria-label="Xóa">${svg('trash')}</button></div>
    </div>
  </article>`;
}

function initTaskView({ endpoint, sort = 'due_date:asc', onMeta }) {
  const list = $('#task-list'), items = new Map();
  const opt = (arr, all) => `<option value="">${all}</option>` + arr.map(v => `<option>${v}</option>`).join('');
  $('#toolbar').innerHTML = `<div class="toolbar">
    <label class="search">${svg('search')}<input id="f-q" type="search" placeholder="Tìm theo tên hoặc mô tả" aria-label="Tìm kiếm"></label>
    <select id="f-status" aria-label="Lọc trạng thái">${opt(STATUSES, 'Mọi trạng thái')}<option value="overdue">Quá hạn</option></select>
    <select id="f-priority" aria-label="Lọc ưu tiên">${opt(PRIORITIES, 'Mọi mức ưu tiên')}</select>
    <select id="f-category" aria-label="Lọc danh mục"><option value="">Mọi danh mục</option></select>
    <select id="f-sort" aria-label="Sắp xếp">
      <option value="due_date:asc">Hạn chót gần nhất</option><option value="priority:desc">Ưu tiên cao trước</option>
      <option value="created_at:desc">Mới tạo trước</option><option value="start_date:asc">Ngày bắt đầu</option><option value="title:asc">Tên A đến Z</option>
    </select></div>`;
  $('#f-sort').value = sort;
  getCategories().then(cs => { $('#f-category').insertAdjacentHTML('beforeend', cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')); }).catch(() => {});

  const filtered = () => $('#f-q').value.trim() || $('#f-status').value || $('#f-priority').value || $('#f-category').value;

  async function load(silent) {
    if (!silent) list.innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
    const [sortKey, order] = $('#f-sort').value.split(':');
    const p = new URLSearchParams({ q: $('#f-q').value.trim(), status: $('#f-status').value, priority: $('#f-priority').value, category: $('#f-category').value, sort: sortKey, order });
    [...p.keys()].forEach(k => !p.get(k) && p.delete(k));
    try {
      const r = await api(`${endpoint}?${p}`);
      items.clear(); r.data.forEach(t => items.set(t.id, t));
      if (!r.data.length) {
        list.innerHTML = filtered()
          ? `<div class="empty"><div class="art">?</div><h3>Không có công việc phù hợp</h3><p>Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p><button class="btn ghost" id="reset">Xóa bộ lọc</button></div>`
          : `<div class="empty"><div class="art">✦</div><h3>Chưa có công việc nào</h3><p>Thêm công việc đầu tiên để bắt đầu theo dõi tiến độ.</p><button class="btn primary" id="empty-add">Thêm task</button></div>`;
      } else list.innerHTML = r.data.map(taskCard).join('');
      const c = $('#count'); if (c) c.textContent = `${r.data.length} công việc`;
      if (onMeta && r.meta) onMeta(r.meta);
    } catch (e) {
      list.innerHTML = `<div class="empty"><div class="art">!</div><h3>Không tải được dữ liệu</h3><p>${esc(e.message)}</p><button class="btn ghost" id="retry">Thử lại</button></div>`;
      toast(e.message, 'err');
    }
  }
  const reload = () => load(true);
  const setStatus = async (t, status) => {
    try { await api(`/tasks/${t.id}/status`, { method: 'PATCH', body: { status } }); toast(status === 'Completed' ? 'Đã hoàn thành công việc' : 'Đã cập nhật trạng thái'); }
    catch (e) { toast(e.message, 'err'); }
    reload();
  };

  let timer;
  $('#f-q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => load(), 250); });
  ['status', 'priority', 'category', 'sort'].forEach(k => $('#f-' + k).addEventListener('change', () => load()));
  $('#btn-add').addEventListener('click', () => openForm(null, reload));

  list.addEventListener('click', e => {
    if (e.target.closest('#reset')) { ['q', 'status', 'priority', 'category'].forEach(k => { $('#f-' + k).value = ''; }); return load(); }
    if (e.target.closest('#retry')) return load();
    if (e.target.closest('#empty-add')) return openForm(null, reload);
    const card = e.target.closest('.task'); if (!card) return;
    const t = items.get(+card.dataset.id);
    if (e.target.closest('.check')) return setStatus(t, t.status === 'Completed' ? 'To Do' : 'Completed');
    const act = (e.target.closest('[data-act]') || {}).dataset?.act;
    if (act === 'edit') openForm(t, reload);
    else if (act === 'del') confirmDelete(t, reload);
    else if (act === 'detail') openDetail(t, reload);
  });
  list.addEventListener('change', e => {
    if (e.target.matches('[data-act="status"]')) setStatus(items.get(+e.target.closest('.task').dataset.id), e.target.value);
  });
  load();
  return { reload };
}

/* ---------- Dashboard ---------- */
function paintSummary(s) {
  ['total', 'completed', 'inProgress', 'todo', 'overdue'].forEach(k => { $('#s-' + k).textContent = s[k]; });
  const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;
  $('#pct').textContent = pct + '%';
  $('#bar-fill').style.width = pct + '%';
  $('#pct-note').textContent = s.total ? `Đã xong ${s.completed} trên ${s.total} công việc hôm nay` : 'Hôm nay chưa có công việc nào';
}

mountSidebar();
mountDialogs();
if (document.body.dataset.page === 'dashboard') {
  const h = new Date().getHours();
  $('#today-date').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#greeting').textContent = `Chào buổi ${h < 11 ? 'sáng' : h < 14 ? 'trưa' : h < 18 ? 'chiều' : 'tối'}, hôm nay mình làm gì nhé?`;
  initTaskView({ endpoint: '/tasks/today', onMeta: m => paintSummary(m.summary) });
}
