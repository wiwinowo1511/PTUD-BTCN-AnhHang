const db = require('../config/database');
const { ymd, now } = require('../utils/date');

// Tham số đầu tiên (?) luôn là ngày hôm nay, dùng để tính is_overdue.
const BASE = `
  SELECT t.*, c.name AS category_name, c.color AS category_color,
         (t.status != 'Completed' AND t.due_date < ?) AS is_overdue
  FROM tasks t LEFT JOIN categories c ON c.id = t.category_id`;

const SORTS = {
  due_date: 't.due_date',
  start_date: 't.start_date',
  created_at: 't.created_at',
  title: 't.title COLLATE NOCASE',
  priority: "CASE t.priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END",
};
const fmt = r => r && { ...r, is_overdue: !!r.is_overdue };
const completedAt = (status, prev) => (status === 'Completed' ? prev || now() : null);

exports.list = (f = {}) => {
  const today = ymd(), where = [], p = [today];
  if (f.todayOnly) {
    // Task hôm nay = đang diễn ra hôm nay + task quá hạn chưa hoàn thành
    where.push(`((t.start_date <= ? AND t.due_date >= ?) OR (t.status != 'Completed' AND t.due_date < ?))`);
    p.push(today, today, today);
  }
  if (f.q) {
    const k = `%${f.q.replace(/[\\%_]/g, '\\$&')}%`;
    where.push(`(t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')`);
    p.push(k, k);
  }
  if (f.status) { where.push('t.status = ?'); p.push(f.status); }
  if (f.priority) { where.push('t.priority = ?'); p.push(f.priority); }
  if (f.category === 'none') where.push('t.category_id IS NULL');
  else if (f.category) { where.push('t.category_id = ?'); p.push(f.category); }
  if (f.overdue) { where.push(`(t.status != 'Completed' AND t.due_date < ?)`); p.push(today); }

  const sort = SORTS[f.sort] || SORTS.due_date;
  const dir = f.order === 'desc' ? 'DESC' : 'ASC';
  const sql = `${BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${sort} ${dir}, t.id DESC`;
  return db.prepare(sql).all(...p).map(fmt);
};

exports.getById = id => fmt(db.prepare(`${BASE} WHERE t.id = ?`).get(ymd(), id));

exports.create = d => {
  const info = db.prepare(`INSERT INTO tasks (title, description, category_id, priority, status, start_date, due_date, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(d.title, d.description, d.category_id, d.priority, d.status, d.start_date, d.due_date, completedAt(d.status));
  return exports.getById(info.lastInsertRowid);
};

exports.update = (id, d) => {
  const cur = exports.getById(id);
  if (!cur) return null;
  db.prepare(`UPDATE tasks SET title = ?, description = ?, category_id = ?, priority = ?, status = ?,
    start_date = ?, due_date = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
    .run(d.title, d.description, d.category_id, d.priority, d.status, d.start_date, d.due_date,
      completedAt(d.status, cur.completed_at), now(), id);
  return exports.getById(id);
};

exports.setStatus = (id, status) => {
  const cur = exports.getById(id);
  if (!cur) return null;
  db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
    .run(status, completedAt(status, cur.completed_at), now(), id);
  return exports.getById(id);
};

exports.remove = id => db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
