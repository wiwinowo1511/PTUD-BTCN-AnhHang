// Nạp dữ liệu mẫu từ mock/mock-data.json. Các mốc ngày là offset so với HÔM NAY,
// nên mỗi lần seed dữ liệu luôn nhất quán (task quá hạn, task hôm nay, 30+ ngày lịch sử...).
const fs = require('fs');
const path = require('path');
const db = require('./config/database');
const { shift } = require('./utils/date');

const mock = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock', 'mock-data.json'), 'utf8'));

db.transaction(() => {
  db.exec(`DELETE FROM tasks; DELETE FROM categories; DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'categories');`);
  const addCat = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
  const ids = {};
  mock.categories.forEach(c => { ids[c.name] = addCat.run(c.name, c.color).lastInsertRowid; });

  const addTask = db.prepare(`INSERT INTO tasks
    (title, description, category_id, priority, status, start_date, due_date, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  mock.tasks.forEach(t => {
    const done = t.status === 'Completed' ? `${shift(t.completedOffset)} ${t.completedTime}:00` : null;
    const created = `${shift(t.startOffset - 1)} 08:00:00`;
    addTask.run(t.title, t.description, ids[t.category], t.priority, t.status,
      shift(t.startOffset), shift(t.dueOffset), done, created, done || created);
  });
})();

const n = db.prepare('SELECT (SELECT COUNT(*) FROM tasks) AS t, (SELECT COUNT(*) FROM categories) AS c').get();
console.log(`Đã seed ${n.t} task và ${n.c} danh mục.`);
