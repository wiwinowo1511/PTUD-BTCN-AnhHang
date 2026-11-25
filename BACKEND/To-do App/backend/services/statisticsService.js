const db = require('../config/database');
const { ymd, shift } = require('../utils/date');

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Thứ 2 đến Chủ nhật (strftime %w: 0 = Chủ nhật)
const DAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Toàn bộ số liệu được tính trực tiếp từ bảng tasks. Một task thuộc kỳ thống kê nếu start_date nằm trong kỳ.
exports.get = (range = 'all') => {
  const days = { 7: 7, 30: 30 }[range];
  const today = ymd();
  const from = days ? shift(-(days - 1)) : null;
  const where = from ? 'WHERE t.start_date >= ? AND t.start_date <= ?' : 'WHERE 1 = 1';
  const p = from ? [from, today] : [];

  const o = db.prepare(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(t.status = 'Completed'), 0)   AS completed,
      COALESCE(SUM(t.status = 'In Progress'), 0) AS inProgress,
      COALESCE(SUM(t.status = 'To Do'), 0)       AS todo,
      COALESCE(SUM(t.status != 'Completed' AND t.due_date < ?), 0) AS overdue
    FROM tasks t ${where}`).get(today, ...p);

  const prio = Object.fromEntries(db.prepare(`SELECT t.priority AS k, COUNT(*) AS n FROM tasks t ${where} GROUP BY t.priority`)
    .all(...p).map(r => [r.k, r.n]));

  const byCategory = db.prepare(`
    SELECT COALESCE(c.name, 'Chưa phân loại') AS name, COALESCE(c.color, '#cbd5e1') AS color, COUNT(*) AS n
    FROM tasks t LEFT JOIN categories c ON c.id = t.category_id ${where}
    GROUP BY t.category_id ORDER BY n DESC, name`).all(...p).map(r => ({ name: r.name, color: r.color, count: r.n }));

  const wd = Object.fromEntries(db.prepare(`
    SELECT CAST(strftime('%w', t.completed_at) AS INTEGER) AS k, COUNT(*) AS n
    FROM tasks t ${where} AND t.status = 'Completed' GROUP BY k`).all(...p).map(r => [r.k, r.n]));
  const weekday = DAY_ORDER.map(d => wd[d] || 0);
  const best = Math.max(...weekday);
  const bestIdx = best > 0 ? DAY_ORDER[weekday.indexOf(best)] : null;

  const completedThisWeek = db.prepare(`SELECT COUNT(*) AS n FROM tasks
    WHERE status = 'Completed' AND date(completed_at) BETWEEN ? AND ?`).get(shift(-6), today).n;
  const completionRate = o.total ? Math.round((o.completed / o.total) * 100) : 0;

  return {
    range: days ? String(days) : 'all', from,
    overview: { total: o.total, completed: o.completed, pending: o.total - o.completed, overdue: o.overdue, completionRate },
    charts: {
      status: { labels: ['To Do', 'In Progress', 'Completed'], data: [o.todo, o.inProgress, o.completed] },
      weekday: { labels: DAY_ORDER.map(d => DAY_SHORT[d]), data: weekday },
      priority: { labels: ['Low', 'Medium', 'High'], data: ['Low', 'Medium', 'High'].map(k => prio[k] || 0) },
      category: byCategory,
    },
    insights: {
      bestDay: bestIdx === null ? null : { name: DAY_NAMES[bestIdx], count: best },
      topCategory: byCategory.length ? byCategory[0] : null,
      completedThisWeek, completionRate,
    },
  };
};
