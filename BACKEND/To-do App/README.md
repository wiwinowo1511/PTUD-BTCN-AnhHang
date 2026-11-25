# Lumi - Personal Task Management

Ứng dụng quản lý công việc cá nhân (Todo App) full-stack: **Node.js + Express** (REST API), **SQLite** (better-sqlite3), frontend HTML/CSS/JS thuần với **Chart.js**.
Ba trang: **Hôm nay** (Dashboard), **Công việc** (Task Management), **Thống kê** (Statistics).

## Yêu cầu
- Node.js 18 trở lên (khuyến nghị bản LTS).
- Có Internet khi mở giao diện (tải Google Fonts và Chart.js từ CDN).

## Chạy dự án từ đầu
```bash
cd backend
npm install        # cài express, better-sqlite3
npm run seed       # (tùy chọn) tạo lại dữ liệu mẫu, ngày tháng tính theo HÔM NAY
npm start          # chạy server tại http://localhost:3000
```
Mở trình duyệt vào **http://localhost:3000**. Backend vừa phục vụ API (`/api/...`) vừa phục vụ thư mục `frontend/`, nên không cần chạy thêm server nào khác và không gặp lỗi CORS.

- Đổi cổng: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`).
- Đổi file database: biến môi trường `DB_FILE`.
- Nếu file `database/tasks.db` bị xóa, server tự tạo lại bảng từ `schema.sql`; chạy `npm run seed` để nạp dữ liệu mẫu.
- Nên chạy `npm run seed` ở lần đầu: file `tasks.db` đi kèm được tạo theo ngày 25/11/2026, seed sẽ dời toàn bộ mốc thời gian về quanh hôm nay.

## Cấu trúc
```
todo-app/
├── frontend/   index.html, tasks.html, statistics.html, css/style.css, js/{app,tasks,statistics}.js
├── backend/
│   ├── server.js, seed.js, package.json
│   ├── config/database.js          kết nối SQLite, tự chạy schema.sql
│   ├── routes/ controllers/ models/ services/ utils/
│   ├── database/schema.sql, tasks.db
│   └── mock/mock-data.json         7 danh mục, 38 task
└── README.md
```
Kiến trúc phân tầng: `routes` → `controllers` (validate, HTTP) → `models` (SQL) và `services` (thống kê).

## Database
- `categories(id, name UNIQUE, color, created_at)`
- `tasks(id, title, description, category_id FK, priority, status, start_date, due_date, completed_at, created_at, updated_at)`
- Ràng buộc: `title` không rỗng, `priority IN (Low, Medium, High)`, `status IN (To Do, In Progress, Completed)`, `due_date >= start_date`, `completed_at` chỉ có khi `status = Completed`, `category_id` ON DELETE SET NULL.
- "Quá hạn" **không lưu**, được tính khi truy vấn: `status != 'Completed' AND due_date < hôm nay`. Mọi số liệu thống kê đều tính trực tiếp từ bảng `tasks`.

## API
Mọi phản hồi có dạng `{ "success": true, "data": ... }` hoặc `{ "success": false, "error": { "message", "details" } }`.

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/tasks` | Danh sách task (`q`, `status`, `priority`, `category`, `sort`, `order`) |
| GET | `/api/tasks/today` | Task hôm nay + `meta.summary` (tổng, hoàn thành, đang làm, chưa bắt đầu, quá hạn) |
| GET | `/api/tasks/:id` | Chi tiết task |
| POST | `/api/tasks` | Thêm task (201) |
| PUT | `/api/tasks/:id` | Cập nhật task |
| PATCH | `/api/tasks/:id/status` | Đổi trạng thái `{ "status": "Completed" }` |
| DELETE | `/api/tasks/:id` | Xóa task |
| GET | `/api/categories` | Danh mục (kèm `task_count`) |
| GET | `/api/statistics?range=7\|30\|all` | Dữ liệu thống kê |

- `status` nhận thêm giá trị `overdue` để lọc task quá hạn.
- `sort`: `due_date`, `start_date`, `created_at`, `priority`, `title`; `order`: `asc` hoặc `desc`.
- Mã lỗi: 400 dữ liệu sai, 404 không tìm thấy, 500 lỗi máy chủ (thông báo chung, chi tiết chỉ ghi ra console).

Thử nhanh:
```bash
curl "http://localhost:3000/api/tasks?q=báo cáo&priority=High&sort=due_date"
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" \
  -d '{"title":"Học Express","priority":"High","due_date":"2030-01-01","start_date":"2029-12-30"}'
```

## Quy ước nghiệp vụ
- **Task hôm nay**: task đang diễn ra hôm nay (`start_date <= hôm nay <= due_date`) cộng với task quá hạn chưa hoàn thành.
- **Kỳ thống kê** (7 ngày, 30 ngày, toàn bộ): lấy các task có `start_date` nằm trong kỳ. Biểu đồ "hoàn thành theo ngày trong tuần" dùng `completed_at` của các task đó.
- **Hoàn thành trong tuần**: số task có `completed_at` trong 7 ngày gần nhất, không phụ thuộc kỳ đang chọn.
- Đánh dấu hoàn thành lưu `completed_at`; chuyển về trạng thái khác sẽ xóa `completed_at`.

## Kiểm thử thủ công gợi ý
1. Dashboard: số liệu và progress bar khớp danh sách; tick checkbox và đổi trạng thái thì số liệu cập nhật.
2. Thêm task bỏ trống tiêu đề, hoặc hạn chót trước ngày bắt đầu: phải hiện lỗi dưới ô nhập.
3. Sửa, xóa (có hộp thoại xác nhận), tải lại trang: dữ liệu vẫn còn.
4. Tìm kiếm chuỗi không tồn tại: hiện trạng thái trống kèm nút "Xóa bộ lọc".
5. Thống kê: chuyển 7 ngày, 30 ngày, toàn bộ; sau khi hoàn thành thêm task, số liệu thay đổi.
6. Tắt server rồi thao tác: hiện thông báo lỗi kết nối, không treo giao diện.
