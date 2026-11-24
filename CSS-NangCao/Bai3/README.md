# Bài 3 – Flappy Bird

## Truy cập game

- [Game chưa cải tiến – bản gốc](https://wiwinowo1511.github.io/PTUD-BTCN-AnhHang/CSS-NangCao/Bai3/Flappy%20bird%20original/)
- [Game đã cải tiến](https://wiwinowo1511.github.io/PTUD-BTCN-AnhHang/CSS-NangCao/Bai3/Flappy%20bird%20c%E1%BA%A3i%20ti%E1%BA%BFn/)

## Tổng quan

Bản gốc hiển thị chim và chướng ngại vật bằng các phần tử DOM, dùng jQuery để điều khiển. Bản cải tiến chuyển phần chơi sang Canvas 2D và bổ sung hệ thống cấp độ, vật phẩm, chế độ nhiều người chơi, cửa hàng skin, âm thanh và giao diện trong game.

## Các cải tiến

1. **Canvas 2D:** Thay cách dựng gameplay bằng DOM/jQuery; canvas giữ kích thước logic `800 × 480`, còn giao diện menu được đặt ở lớp phủ.
2. **Vòng lặp theo thời gian thực:** Dùng `requestAnimationFrame` và `delta time`, giới hạn bước thời gian để chuyển động ổn định; khi tạm dừng, logic game ngừng cập nhật.
3. **Vật lý bay mượt:** Có gia tốc khi giữ phím, trọng lực khi thả phím, giới hạn vận tốc và góc nghiêng theo chuyển động.
4. **Chim và hoạt ảnh:** Dùng `Path2D` để vẽ chim, tạo hoạt ảnh vỗ cánh và hỗ trợ phụ kiện cho skin.
5. **Bốn cấp độ:** Cấp độ dựa trên điểm cao nhất của người chơi; tốc độ cột tăng và khoảng trống giảm dần.
6. **Sinh cột có kiểm soát:** Các cặp cột được đặt cách nhau; vị trí khe được giới hạn để thay đổi vừa phải và giữ khoảng an toàn với mép màn hình.
7. **Cột đặc biệt:** Có cột đổi màu theo thời gian và cột màu be có thể sụp khi va chạm.
8. **Va chạm theo kích thước:** Vùng va chạm thay đổi theo kích thước chim; chạm đất gây mất mạng, còn trạng thái bất tử tạm thời bỏ qua sát thương.
9. **Xu vàng:** Xu xuất hiện giữa các cặp cột; nhặt xu cộng vào tổng xu và số xu của ván.
10. **Bom:** Bom lơ lửng, dao động lên xuống và gây mất mạng khi chạm phải.
11. **Mạng và hồi sinh:** Mỗi người có 5 mạng; khi còn mạng, chim hồi sinh sau 1 giây và được bất tử trong 1,5 giây.
12. **Vật phẩm hỗ trợ:** Đèn pin vàng phóng to chim, đèn pin xanh thu nhỏ chim trong 3 giây; kẹo mút làm chim nhấp nháy 7 màu trong 5 giây.
13. **Mây sấm sét:** Có tín hiệu cảnh báo trước khi sét đánh để người chơi nhận biết vùng nguy hiểm.
14. **Thử thách chim hồng:** Xuất hiện trong chế độ một người; người chơi nhấn Space liên tục để giữ thanh kháng cự.
15. **Chu kỳ ngày – đêm:** Bầu trời chuyển qua ban ngày, hoàng hôn, ban đêm và bình minh; mặt trời, mặt trăng và sao được vẽ động.
16. **Hiệu ứng:** Tạo hạt khi có sự kiện như ăn xu, va chạm hoặc cột vỡ; một số va chạm làm rung màn hình.
17. **Điều khiển và tạm dừng:** Hỗ trợ phím, cảm ứng, Esc/P và nút tạm dừng; game tự tạm dừng khi chuyển tab hoặc cửa sổ.
18. **Hai người chơi:** Hai người chơi cùng màn hình với điều khiển, điểm số và số mạng riêng.
19. **Menu và âm thanh:** Có menu chính, màn hình kết thúc, menu tạm dừng và cài đặt âm lượng cho nhạc nền/hiệu ứng.
20. **Cửa hàng skin:** Có 20 skin với phụ kiện; xu, skin đã sở hữu/đang dùng, kỷ lục và âm lượng được lưu bằng `localStorage`.
21. **HUD và hướng dẫn:** Canvas hiển thị điểm, cấp độ, xu, mạng, nhãn người chơi và hướng dẫn điều khiển theo chế độ.

## Một số đoạn code tiêu biểu

### Canvas và lớp giao diện

Trong [index.html bản cải tiến](<./Flappy bird cải tiến/index.html>), canvas dùng để vẽ gameplay; `#ui` chứa menu và các màn hình phủ lên trên.

```html
<div id="stage">
  <canvas id="c"></canvas>
  <div id="ui"></div>
  <button id="pauseBtn" title="Tạm dừng (Esc / P)" aria-label="Tạm dừng">⏸</button>
</div>
```

### Vòng lặp và delta time

`dt` giúp chuyển động dựa trên thời gian thực thay vì số pixel cố định mỗi khung hình.

```js
var last = 0;
function loop(t) {
  requestAnimationFrame(loop);
  var dt = Math.min((t - last) / 1000 || 0, .033);
  last = t;

  if (!paused) {
    Z += dt;
    if (cd > 0) {
      var pc = Math.ceil(cd);
      cd -= dt;
      if (Math.ceil(cd) != pc) snd(cd > 0 ? 'tick' : 'go');
    }
    else update(dt);
  }
  draw();
}
```

### Vật lý bay và giới hạn vận tốc

Đoạn rút gọn từ `update(dt)` trong [js/script.js bản cải tiến](<./Flappy bird cải tiến/js/script.js>):

```js
q.vy += (held(i) ? -2400 : 1400) * dt;
q.vy = Math.max(-320, Math.min(440, q.vy));
q.y += q.vy * dt;
q.a += (Math.max(-.45, Math.min(.9, q.vy / 480)) - q.a)
  * Math.min(1, dt * 10);
```

### Cấp độ và khoảng trống

```js
function lvl() {
  var m = 0;
  pl.forEach(function (q) { m = Math.max(m, q.sc); });
  return m >= 40 ? 4 : m >= 20 ? 3 : m >= 5 ? 2 : 1;
}

var SPD = [170, 195, 220, 245];
var GAP = [190, 180, 170, 160];
```

### Mất mạng và hồi sinh

```js
function die(q) {
  if (!q.alive) return;
  q.alive = 0; q.vy = -260; shake = .4;
  burst(q.x, q.y, cols(q.k)[0], 12); snd('die');
  if (--q.lives > 0) q.rs = 1;
}

function respawn(q) {
  var p = null;
  for (var i = 0; i < ps.length; i++) {
    if (ps[i].x + PW > q.x - 30) { p = ps[i]; break; }
  }
  snd('spawn');
  q.y = p ? p.gy + p.g / 2 : 230;
  q.vy = 0; q.a = 0; q.alive = 1; q.inv = 1.5;
  q.tz = 1; q.zt = 0; q.rt = 0;
}
```

### Lưu dữ liệu cửa hàng

```js
var S = { coins: 0, own: [0], skin: 0, best: 0, mus: .5, sfx: .7 };
try {
  var sv = JSON.parse(localStorage.getItem('flappy2'));
  if (sv) S = Object.assign(S, sv);
} catch (e) {}

function save() {
  try { localStorage.setItem('flappy2', JSON.stringify(S)); } catch (e) {}
}
```

## Mã nguồn

- Bản gốc: [index.html](<./Flappy bird original/index.html>), [js/script.js](<./Flappy bird original/js/script.js>), [css/style.css](<./Flappy bird original/css/style.css>)
- Bản cải tiến: [index.html](<./Flappy bird cải tiến/index.html>), [js/script.js](<./Flappy bird cải tiến/js/script.js>), [css/style.css](<./Flappy bird cải tiến/css/style.css>)
