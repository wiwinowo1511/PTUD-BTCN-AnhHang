const db = require('../config/database');

exports.list = () => db.prepare(`
  SELECT c.*, COUNT(t.id) AS task_count
  FROM categories c LEFT JOIN tasks t ON t.category_id = c.id
  GROUP BY c.id ORDER BY c.id`).all();

exports.exists = id => !!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
