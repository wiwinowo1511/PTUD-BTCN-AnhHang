const Task = require('../models/taskModel');
const Category = require('../models/categoryModel');
const statistics = require('../services/statisticsService');
const { ymd } = require('../utils/date');

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['To Do', 'In Progress', 'Completed'];
const SORTS = ['due_date', 'start_date', 'created_at', 'priority', 'title'];

const ok = (res, data, code = 200, meta) => res.status(code).json({ success: true, data, ...(meta && { meta }) });
const fail = (res, code, message, details) => res.status(code).json({ success: false, error: { message, ...(details && { details }) } });
const notFound = res => fail(res, 404, 'Không tìm thấy công việc');

const getId = (req, res) => {
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) return id;
  fail(res, 400, 'ID không hợp lệ');
  return null;
};

const isDate = s => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const date = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s;
};

// Chuẩn hóa + kiểm tra dữ liệu đầu vào. Trả về { errors, data }.
function clean(b = {}) {
  const errors = {};
  const title = String(b.title ?? '').trim();
  if (!title) errors.title = 'Tiêu đề không được để trống';
  else if (title.length > 150) errors.title = 'Tiêu đề tối đa 150 ký tự';

  const description = String(b.description ?? '').trim();
  if (description.length > 1000) errors.description = 'Mô tả tối đa 1000 ký tự';

  const priority = b.priority || 'Medium';
  if (!PRIORITIES.includes(priority)) errors.priority = 'Mức ưu tiên không hợp lệ';
  const status = b.status || 'To Do';
  if (!STATUSES.includes(status)) errors.status = 'Trạng thái không hợp lệ';

  const start_date = b.start_date || ymd();
  const due_date = b.due_date || start_date;
  if (!isDate(start_date)) errors.start_date = 'Ngày bắt đầu không hợp lệ';
  if (!isDate(due_date)) errors.due_date = 'Hạn chót không hợp lệ';
  else if (!errors.start_date && due_date < start_date) errors.due_date = 'Hạn chót không được trước ngày bắt đầu';

  let category_id = null;
  if (b.category_id !== undefined && b.category_id !== null && b.category_id !== '') {
    category_id = Number(b.category_id);
    if (!Number.isInteger(category_id) || !Category.exists(category_id)) errors.category_id = 'Danh mục không tồn tại';
  }
  return { errors, data: { title, description, category_id, priority, status, start_date, due_date } };
}

const filters = q => ({
  q: String(q.q || '').trim().slice(0, 100),
  status: q.status === 'overdue' ? '' : q.status,
  overdue: q.status === 'overdue' || q.overdue === '1',
  priority: q.priority, category: q.category, sort: q.sort, order: q.order,
});

function filterErrors(q) {
  const errors = {};
  const validString = value => value === undefined || value === '' || typeof value === 'string';
  if (!validString(q.q) || (q.q && q.q.length > 100)) errors.q = 'Từ khóa tối đa 100 ký tự';
  if (!validString(q.status) || (q.status && ![...STATUSES, 'overdue'].includes(q.status))) errors.status = 'Trạng thái lọc không hợp lệ';
  if (!validString(q.priority) || (q.priority && !PRIORITIES.includes(q.priority))) errors.priority = 'Mức ưu tiên lọc không hợp lệ';
  if (!validString(q.category) || (q.category && q.category !== 'none' && !/^[1-9]\d*$/.test(q.category))) errors.category = 'Danh mục lọc không hợp lệ';
  if (!validString(q.sort) || (q.sort && !SORTS.includes(q.sort))) errors.sort = 'Trường sắp xếp không hợp lệ';
  if (!validString(q.order) || (q.order && !['asc', 'desc'].includes(q.order))) errors.order = 'Thứ tự sắp xếp không hợp lệ';
  if (!validString(q.overdue) || (q.overdue && !['0', '1'].includes(q.overdue))) errors.overdue = 'Bộ lọc quá hạn không hợp lệ';
  return errors;
}

exports.list = (req, res) => {
  const errors = filterErrors(req.query);
  if (Object.keys(errors).length) return fail(res, 400, 'Bộ lọc không hợp lệ', errors);
  ok(res, Task.list(filters(req.query)));
};

exports.today = (req, res) => {
  const errors = filterErrors(req.query);
  if (Object.keys(errors).length) return fail(res, 400, 'Bộ lọc không hợp lệ', errors);
  const all = Task.list({ todayOnly: true }); // không áp bộ lọc: dùng cho phần tóm tắt
  const count = fn => all.filter(fn).length;
  const summary = {
    total: all.length,
    completed: count(t => t.status === 'Completed'),
    inProgress: count(t => t.status === 'In Progress'),
    todo: count(t => t.status === 'To Do'),
    overdue: count(t => t.is_overdue),
  };
  ok(res, Task.list({ ...filters(req.query), todayOnly: true }), 200, { summary });
};

exports.getOne = (req, res) => {
  const id = getId(req, res); if (!id) return;
  const t = Task.getById(id);
  t ? ok(res, t) : notFound(res);
};

exports.create = (req, res) => {
  const { errors, data } = clean(req.body);
  if (Object.keys(errors).length) return fail(res, 400, 'Dữ liệu không hợp lệ', errors);
  ok(res, Task.create(data), 201);
};

exports.update = (req, res) => {
  const id = getId(req, res); if (!id) return;
  const { errors, data } = clean(req.body);
  if (Object.keys(errors).length) return fail(res, 400, 'Dữ liệu không hợp lệ', errors);
  const t = Task.update(id, data);
  t ? ok(res, t) : notFound(res);
};

exports.patchStatus = (req, res) => {
  const id = getId(req, res); if (!id) return;
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) return fail(res, 400, 'Trạng thái không hợp lệ', { status: `Chọn một trong: ${STATUSES.join(', ')}` });
  const t = Task.setStatus(id, status);
  t ? ok(res, t) : notFound(res);
};

exports.remove = (req, res) => {
  const id = getId(req, res); if (!id) return;
  Task.remove(id) ? ok(res, { id }) : notFound(res);
};

exports.categories = (_req, res) => ok(res, Category.list());

exports.statistics = (req, res) => {
  const range = String(req.query.range || 'all');
  if (!['7', '30', 'all'].includes(range)) return fail(res, 400, 'Khoảng thống kê không hợp lệ');
  ok(res, statistics.get(range));
};
