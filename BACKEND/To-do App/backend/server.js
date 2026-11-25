const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));
app.use('/api', require('./routes'));
app.use('/api', (req, res) => res.status(404).json({ success: false, error: { message: 'Endpoint không tồn tại' } }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Xử lý lỗi tập trung: không trả chi tiết lỗi nội bộ cho client.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ success: false, error: { message: 'Dữ liệu gửi lên không hợp lệ' } });
  }
  console.error(err);
  res.status(500).json({ success: false, error: { message: 'Đã có lỗi xảy ra phía máy chủ, vui lòng thử lại sau' } });
});

app.listen(PORT, () => console.log(`Lumi đang chạy tại http://localhost:${PORT}`));
