/* Flappy Bird 2: vẽ bằng canvas + requestAnimationFrame (chuyển động theo thời gian nên mượt, không cần jQuery) */
(function () {
'use strict';

// ---- Cấu hình (chỉnh ở đây để đổi độ khó) ----
var W = 800, H = 480, GR = 24;        // khung game rộng 800x480, GR = độ cao mặt đất
var PW = 64, SPC = 380;               // độ rộng cột, khoảng cách giữa 2 cặp cột
var SPD = [170, 195, 220, 245];       // tốc độ cột (px/giây) theo Level 1..4
var GAP = [190, 180, 170, 160];       // độ rộng khe hở theo Level
var WIN = 50, CYCLE = 60;             // điểm thắng; số giây cho 1 vòng ngày-đêm

var D = Math.min(window.devicePixelRatio || 1, 2);
var cv = document.getElementById('c'), c = cv.getContext('2d'), ui = document.getElementById('ui'), pauseBtn = document.getElementById('pauseBtn');
cv.width = W * D; cv.height = H * D;

var st = 'menu', mode = 1, pl = [], ps = [], co = [], bo = [], it = [], tc = [], pb = [], fo = null, fx = [];
var T = 0, Z = 0, dist = 0, shake = 0, run = 0, wn = -1, pairN = 0, K = {}, ptr = [0, 0], pid = {};
var paused = 0, pst = '', pscr = 0, cd = 0, pOn = false;   // tạm dừng: cờ, trạng thái trước đó, đang ở màn con (cửa hàng/cài đặt), đếm ngược 3-2-1

// ---- Dữ liệu lưu: xu, skin đã mua, kỷ lục ----
var S = { coins: 0, own: [0], skin: 0, best: 0, mus: .5, sfx: .7 };   // mus / sfx: âm lượng nhạc nền / hiệu ứng (0..1)
try { var sv = JSON.parse(localStorage.getItem('flappy2')); if (sv) S = Object.assign(S, sv); } catch (e) {}
function save() { try { localStorage.setItem('flappy2', JSON.stringify(S)); } catch (e) {} }

// ---- Âm thanh: nhạc nền và hiệu ứng tạo bằng Web Audio API (không cần file âm thanh) ----
var AU = { c: null, mg: null, sg: null, step: 0, next: 0, theme: 'menu' };
var CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];     // 4 hợp âm lặp lại: C, Am, F, G (số nốt MIDI)
var ARP = [0, 1, 2, 1, 0, 2, 1, 2], ARP2 = [0, 1, 2, 1, 2, 1, 0, 1];   // thứ tự nốt rải của nhạc chơi / nhạc menu
function mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }             // số nốt MIDI -> tần số (Hz)
function audioInit() {                                                  // trình duyệt chỉ cho phát âm thanh sau khi người dùng bấm/chạm
  if (AU.c) { if (AU.c.state == 'suspended') AU.c.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    AU.c = new AC(); AU.mg = AU.c.createGain(); AU.sg = AU.c.createGain();
    AU.mg.connect(AU.c.destination); AU.sg.connect(AU.c.destination);
    if (AU.c.state == 'suspended') AU.c.resume();
    AU.next = AU.c.currentTime + .1; volumes(); setInterval(seq, 100);
  } catch (e) { AU.c = null; }
}
function volumes() {                                                    // áp dụng âm lượng; nhạc nền nhỏ lại khi đang tạm dừng
  if (!AU.c) return;
  var t = AU.c.currentTime;
  AU.mg.gain.setTargetAtTime(S.mus * (paused ? .3 : 1) * .35, t, .05);
  AU.sg.gain.setTargetAtTime(S.sfx * .7, t, .02);
}
function tone(f, t, d, type, vol, dest) {                               // 1 nốt: lên nhanh rồi tắt dần
  var o = AU.c.createOscillator(), g = AU.c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(dest || AU.sg); o.start(t); o.stop(t + d + .05);
}
function slide(f1, f2, t, d, type, vol) {                               // âm trượt từ tần số f1 sang f2
  var o = AU.c.createOscillator(), g = AU.c.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(AU.sg); o.start(t); o.stop(t + d + .05);
}
function noise(t, d, vol, fq) {                                         // tiếng ồn qua bộ lọc thấp (nổ, sấm, vỡ)
  var n = Math.floor(AU.c.sampleRate * d), b = AU.c.createBuffer(1, n, AU.c.sampleRate), a = b.getChannelData(0), i;
  for (i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
  var s = AU.c.createBufferSource(), f = AU.c.createBiquadFilter(), g = AU.c.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = fq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f); f.connect(g); g.connect(AU.sg); s.start(t);
}
function notes(list, t, step, type, vol) { list.forEach(function (f, i) { tone(f, t + i * step, step * 1.7, type, vol); }); }
function snd(n, delay) {                                                // phát hiệu ứng theo tên
  if (!AU.c || AU.c.state != 'running' || S.sfx <= 0) return;
  var t = AU.c.currentTime + (delay || 0);
  switch (n) {
    case 'flap':     slide(380, 640, t, .08, 'square', .22); break;
    case 'mash':     slide(700, 1000, t, .05, 'triangle', .3); break;
    case 'coin':     tone(988, t, .07, 'square', .2); tone(1319, t + .07, .18, 'square', .2); break;
    case 'point':    tone(660, t, .06, 'square', .12); break;
    case 'item':     notes([523, 659, 784, 1047], t, .06, 'triangle', .35); break;
    case 'die':      slide(440, 90, t, .45, 'sawtooth', .25); noise(t, .25, .3, 900); break;
    case 'boom':     noise(t, .5, .6, 700); slide(120, 40, t, .5, 'sine', .6); break;
    case 'crumble':  noise(t, .3, .5, 1800); break;
    case 'zap':      noise(t, .35, .5, 3000); slide(1800, 120, t, .3, 'sawtooth', .18); break;
    case 'spawn':    slide(300, 900, t, .25, 'sine', .3); break;
    case 'charm':    notes([784, 988, 1175, 988], t, .09, 'sine', .25); break;
    case 'win':      notes([523, 659, 784, 1047, 1319], t, .07, 'square', .2); break;
    case 'victory':  notes([523, 659, 784, 1047, 784, 1047, 1319], t, .12, 'square', .22); break;
    case 'gameover': notes([392, 349, 311, 262], t, .18, 'triangle', .35); break;
    case 'click':    tone(600, t, .05, 'square', .15); break;
    case 'buy':      notes([880, 1175], t, .07, 'square', .22); break;
    case 'pause':    slide(600, 300, t, .12, 'triangle', .25); break;
    case 'tick':     tone(800, t, .08, 'square', .2); break;
    case 'go':       tone(1200, t, .2, 'square', .25); break;
  }
}
function seq() {                                                        // xếp lịch các nốt nhạc nền trước ~0,5 giây
  if (!AU.c || AU.c.state != 'running') return;
  var ct = AU.c.currentTime;
  if (S.mus <= 0 || AU.next < ct - .2) { AU.next = ct + .05; if (S.mus <= 0) return; }
  var spb = AU.theme == 'play' ? .19 : .3;                              // thời lượng 1 bước: nhạc chơi nhanh, nhạc menu chậm
  while (AU.next < ct + .5) {
    var i = AU.step & 7, ch = CH[(AU.step >> 3) & 3], t = AU.next;
    if (AU.theme == 'play') {
      tone(mf(ch[ARP[i]] + (i % 4 == 3 ? 12 : 0)), t, spb * .9, 'square', .16, AU.mg);
      if (i % 2 == 0) tone(mf(ch[0] - 12), t, spb * 1.6, 'triangle', .5, AU.mg);
    } else {
      tone(mf(ch[ARP2[i]]), t, spb * 1.8, 'triangle', .35, AU.mg);
      if (i == 0) tone(mf(ch[0] - 12), t, spb * 6, 'sine', .5, AU.mg);
    }
    AU.next += spb; AU.step++;
  }
}
function theme(n) { if (AU.theme != n) { AU.theme = n; AU.step = 0; } }

// ---- Skin chim: c = [thân, bụng, cánh, đuôi]; h = mũ, b = râu, o = quần áo (hc/oc = màu mũ/áo). Giữ nguyên thứ tự 0..5 để không mất skin đã mua ----
var CA = ['#ff7a59', '#ffe2b8', '#ffa07a', '#e8553a'], CB = ['#4aa3ff', '#e3f2ff', '#82c0ff', '#2d78c8'], CG = ['#4cc96a', '#e4f8e8', '#82dd98', '#2f9a4b'],
    CP = ['#9b6bff', '#eee6ff', '#b99cff', '#6e45cc'], CR = ['#e8433a', '#ffd9d4', '#ff7a70', '#a52a22'], CW = ['#f4f4f4', '#fff', '#dcdcdc', '#b5b5b5'],
    CY = ['#ffc83d', '#fff2c4', '#ffdc78', '#d9a017'], CN = ['#b07a4a', '#f1dcc2', '#c99466', '#7d5230'], CK = ['#3a3a4a', '#9a9aab', '#55556a', '#1f1f2b'];
var SK = [
  { n: 'Cam', p: 0, c: CA },
  { n: 'Xanh lam', p: 10, c: CB },
  { n: 'Hồng', p: 15, c: ['#ff7eb6', '#ffe3ef', '#ffa8cf', '#d9568f'] },
  { n: 'Tím', p: 20, c: CP },
  { n: 'Xanh lá', p: 25, c: CG },
  { n: 'Cầu vồng', p: 40, rb: 1 },
  { n: 'Cao bồi', p: 30, c: CA, h: 3, hc: '#8b5a2b', b: 2, o: 2, oc: '#d33' },
  { n: 'Quý ông', p: 35, c: CB, h: 2, hc: '#d33', b: 1, o: 3, oc: '#d33' },
  { n: 'Ông già Noel', p: 40, c: CR, h: 6, hc: '#e02d3c', b: 3, o: 2, oc: '#2fa84f' },
  { n: 'Nông dân', p: 25, c: CG, h: 7, hc: '#e8d27a', o: 6, oc: '#4a6fa5' },
  { n: 'Đầu bếp', p: 30, c: CW, h: 8, b: 1, o: 5 },
  { n: 'Phù thủy', p: 45, c: CP, h: 9, hc: '#5b2db3', b: 3, o: 4, oc: '#3b1d80' },
  { n: 'Hoàng đế', p: 60, c: CY, h: 4, b: 4, o: 4, oc: '#c0283a' },
  { n: 'Cử nhân', p: 35, c: CG, h: 10, o: 1, oc: '#fff' },
  { n: 'Tiệc tùng', p: 20, c: ['#ff7eb6', '#ffe3ef', '#ffa8cf', '#d9568f'], h: 5, hc: '#4aa3ff', o: 3, oc: '#9b6bff' },
  { n: 'Vận động viên', p: 20, c: CB, h: 1, hc: '#e8433a', o: 1, oc: '#e8433a' },
  { n: 'Thám tử', p: 25, c: CN, h: 1, hc: '#6b4a2b', b: 1, o: 2, oc: '#c0283a' },
  { n: 'Hải tặc', p: 40, c: CK, h: 3, hc: '#222', b: 4, o: 1, oc: '#e8433a' },
  { n: 'Giáo sư', p: 40, c: CW, h: 10, b: 3, o: 3, oc: '#2b6cb0' },
  { n: 'Vua cầu vồng', p: 100, rb: 1, h: 4, b: 4, o: 4, oc: '#9b6bff' }
];
function cols(i) {
  if (!SK[i].rb) return SK[i].c;
  var h = function (a, l) { return 'hsl(' + ((Z * 140 + a) % 360) + ',85%,' + l + '%)'; };
  return [h(0, 60), '#fff', h(40, 72), h(300, 50)];
}

// ---- Hình chim (giữ nguyên hình dáng cũ, vẽ bằng Path2D) ----
var TAIL = new Path2D('M10 18L1 12L4 22L0 30L12 27Z'), WING = new Path2D('M16 20Q26 6 40 20Q28 32 16 20Z'),
    CREST = new Path2D('M34 6Q36 1 40 5'), BEAK = new Path2D('M54 18L64 22L54 28Z'),
    BODY = new Path2D(), BELLY = new Path2D(), EYE = new Path2D(), PUP = new Path2D();
BODY.ellipse(32, 22, 24, 18, 0, 0, 7); BELLY.ellipse(34, 30, 15, 8, 0, 0, 7);
EYE.arc(46, 14, 7, 0, 7); PUP.arc(48, 14, 3.2, 0, 7);

function poly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
function fsk(g, col) { g.fillStyle = col; g.fill(); g.stroke(); }          // tô màu + viền theo đường vừa vẽ

function hat(g, t, hc) {                                                    // mũ: gốc mũ đặt ở đỉnh đầu (38, 6)
  g.save(); g.translate(38, 6); hc = hc || '#c0283a';
  switch (t) {
    case 1: g.beginPath(); g.moveTo(-11, 1); g.quadraticCurveTo(-10, -14, 6, -10); g.lineTo(6, 1); g.closePath(); fsk(g, hc);   // mũ lưỡi trai
            g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(18, -5, 20, 2); g.lineTo(4, 1); g.closePath(); fsk(g, hc); break;
    case 2: g.beginPath(); g.ellipse(0, 1, 15, 3.5, 0, 0, 7); fsk(g, '#2b2b3a');                                               // mũ chóp cao
            g.beginPath(); g.rect(-9, -22, 18, 22); fsk(g, '#2b2b3a'); g.beginPath(); g.rect(-9, -7, 18, 4); fsk(g, hc); break;
    case 3: g.beginPath(); g.ellipse(0, 1, 19, 4, 0, 0, 7); fsk(g, hc);                                                        // mũ cao bồi
            g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(-10, -14, -4, -12); g.quadraticCurveTo(0, -8, 4, -12); g.quadraticCurveTo(10, -14, 9, 0); g.closePath(); fsk(g, hc); break;
    case 4: poly(g, [-10, 1, -10, -12, -5, -5, 0, -14, 5, -5, 10, -12, 10, 1]); fsk(g, '#ffd400');                              // vương miện
            g.beginPath(); g.arc(0, -3, 2.5, 0, 7); fsk(g, '#ff3b5c'); break;
    case 5: poly(g, [-9, 1, 0, -26, 9, 1]); fsk(g, hc);                                                                        // mũ sinh nhật
            g.fillStyle = '#fff'; g.fillRect(-4, -10, 3, 3); g.fillRect(2, -4, 3, 3); g.beginPath(); g.arc(0, -27, 3.5, 0, 7); fsk(g, '#ffe600'); break;
    case 6: g.beginPath(); g.moveTo(-11, 1); g.quadraticCurveTo(-9, -20, 8, -19); g.quadraticCurveTo(15, -18, 18, -8); g.lineTo(11, -9);   // mũ ông già Noel
            g.quadraticCurveTo(7, -11, 6, 1); g.closePath(); fsk(g, hc);
            g.beginPath(); g.ellipse(0, 1, 13, 3.5, 0, 0, 7); fsk(g, '#fff'); g.beginPath(); g.arc(18, -8, 4, 0, 7); fsk(g, '#fff'); break;
    case 7: poly(g, [-21, 3, 0, -19, 21, 3]); fsk(g, hc); g.strokeStyle = '#8b6b2b'; g.lineWidth = 1;                          // nón lá
            g.beginPath(); for (var j = -1; j < 2; j++) { g.moveTo(0, -19); g.lineTo(j * 11, 3); } g.stroke(); break;
    case 8: [[-7, -10, 7], [7, -10, 7], [0, -15, 8]].forEach(function (e) { g.beginPath(); g.arc(e[0], e[1], e[2], 0, 7); fsk(g, '#fff'); });   // mũ đầu bếp
            g.beginPath(); g.rect(-9, -8, 18, 9); fsk(g, '#fff'); break;
    case 9: g.beginPath(); g.ellipse(0, 1, 18, 4, 0, 0, 7); fsk(g, hc); poly(g, [-10, 1, 3, -32, 10, 1]); fsk(g, hc);          // mũ phù thủy
            g.fillStyle = '#ffe600'; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.fillText('★', 1, -8); break;
    case 10: poly(g, [-9, -4, -9, 3, 0, 6, 9, 3, 9, -4]); fsk(g, '#222'); poly(g, [-19, -8, 0, -14, 19, -8, 0, -2]); fsk(g, '#222');   // mũ cử nhân
            g.strokeStyle = '#ffd400'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -8); g.lineTo(15, -6); g.lineTo(15, 3); g.stroke(); break;
  }
  g.restore();
}
function beard(g, t) {                                                      // râu: 1 ria mép, 2 râu dê, 3 râu trắng dài, 4 râu quai nón
  var bc = t == 3 ? '#fff' : '#3a2a1a';
  if (t == 2) { poly(g, [52, 28, 60, 28, 56, 40]); fsk(g, bc); }
  if (t == 3) { g.beginPath(); g.moveTo(40, 29); g.quadraticCurveTo(44, 50, 58, 44); g.quadraticCurveTo(61, 36, 57, 28); g.closePath(); fsk(g, bc); }
  if (t == 4) { g.beginPath(); g.moveTo(26, 36); g.quadraticCurveTo(44, 52, 58, 32); g.lineTo(54, 29); g.quadraticCurveTo(44, 40, 32, 33); g.closePath(); fsk(g, bc); }
  if (t != 2) { g.beginPath(); g.ellipse(58, 17.5, 7, 2.6, 0, 0, 7); fsk(g, bc); }
}

function bird(g, px, py, a, k, fl, al, sc, flip, ac) {                      // ac = skin có phụ kiện (mũ, râu, áo); chim hồng không truyền ac
  ac = ac || {}; var o = ac.o, oc = ac.oc || '#e8433a';
  g.save(); g.globalAlpha = al == null ? 1 : al;
  g.translate(px, py); g.rotate(a); g.scale(.8 * (sc || 1) * (flip ? -1 : 1), .8 * (sc || 1)); g.translate(-32, -21);
  g.lineJoin = g.lineCap = 'round'; g.lineWidth = 2; g.strokeStyle = '#6b2616';
  if (o == 4) { poly(g, [22, 8, -4, 22, -10, 44, 28, 38]); fsk(g, oc); }   // áo choàng nằm sau lưng
  g.fillStyle = k[3]; g.fill(TAIL); g.stroke(TAIL);
  g.fillStyle = k[0]; g.fill(BODY); g.stroke(BODY);
  g.fillStyle = k[1]; g.fill(BELLY);
  if (o == 1 || o == 5 || o == 6) {                                        // áo sọc / vest / yếm: vẽ gọn trong thân chim
    g.save(); g.clip(BODY);
    if (o == 1) { g.fillStyle = oc; for (var y = 14; y < 42; y += 7) g.fillRect(6, y, 52, 3.5); }
    else if (o == 5) { g.fillStyle = '#2b2b3a'; g.fillRect(6, 20, 52, 24); poly(g, [38, 20, 54, 20, 46, 40]); g.fillStyle = '#fff'; g.fill(); }
    else { g.fillStyle = oc; g.fillRect(18, 26, 30, 20); g.strokeStyle = oc; g.lineWidth = 4; g.beginPath(); g.moveTo(24, 27); g.lineTo(28, 8); g.moveTo(42, 27); g.lineTo(42, 9); g.stroke();
           g.fillStyle = '#ffd400'; g.fillRect(23, 26, 4, 4); g.fillRect(40, 26, 4, 4); }
    g.restore();
  }
  g.save(); g.translate(0, fl); g.fillStyle = k[2]; g.fill(WING); g.stroke(WING); g.restore();
  if (o == 2) { g.beginPath(); g.rect(40, 36, 7, 10); fsk(g, oc); g.save(); g.strokeStyle = oc; g.lineWidth = 8; g.beginPath(); g.moveTo(41, 38); g.quadraticCurveTo(48, 36, 54, 26); g.stroke(); g.restore(); }   // khăn quàng
  if (o == 3) { poly(g, [46, 33, 38, 27, 38, 39]); fsk(g, oc); poly(g, [46, 33, 54, 27, 54, 39]); fsk(g, oc); g.beginPath(); g.arc(46, 33, 3, 0, 7); fsk(g, oc); }   // nơ
  g.stroke(CREST);
  g.fillStyle = '#fff'; g.fill(EYE); g.stroke(EYE);
  g.fillStyle = '#1b1b1b'; g.fill(PUP);
  g.fillStyle = '#ffc400'; g.fill(BEAK); g.stroke(BEAK);
  if (ac.b) beard(g, ac.b);
  if (ac.h) hat(g, ac.h, ac.hc);
  g.restore();
}

// ---- Bầu trời theo chu kỳ: [pha, màu trên rgb, màu dưới rgb, độ sáng sao] ----
var KF = [
  [0, 93, 183, 242, 230, 246, 255, 0], [.25, 93, 183, 242, 230, 246, 255, 0],  // ban ngày
  [.37, 98, 70, 150, 255, 150, 80, .2],                                         // hoàng hôn
  [.5, 12, 16, 48, 34, 44, 96, 1], [.75, 12, 16, 48, 34, 44, 96, 1],           // đêm
  [.87, 120, 110, 185, 255, 175, 140, .2],                                      // bình minh
  [1, 93, 183, 242, 230, 246, 255, 0]                                           // trở lại ban ngày
];
function sky(p) {
  for (var i = 1; i < KF.length; i++) if (p <= KF[i][0]) {
    var a = KF[i - 1], b = KF[i], f = (p - a[0]) / (b[0] - a[0]);
    return a.map(function (v, j) { return j ? v + (b[j] - v) * f : 0; });
  }
  return KF[0];
}
var STARS = [], CL = [[80, 70, 1], [330, 120, .8], [560, 60, 1.2], [720, 150, .9], [200, 210, .7]];
for (var si = 0; si < 70; si++) STARS.push([Math.random() * W, Math.random() * (H - 160), 1 + Math.random() * 1.8]);
var PINK = ['#ff4fa3', '#ffd1e8', '#ff86c1', '#d12d7c'];
var RB = ['#ff2d2d', '#ff8a00', '#ffe600', '#2fd04a', '#1ea0ff', '#3d4cff', '#a43dff']; // 7 màu

function flashCols() {                                            // kẹo mút: chim nhấp nháy 7 màu
  var j = Math.floor(Z * 10);
  return [RB[j % 7], '#fff', RB[(j + 3) % 7], RB[(j + 5) % 7]];
}

// ---- Điều khiển ----
function held(i) {
  if (mode == 1) return K.ArrowDown || K.ArrowUp || K.KeyW || K.Space || ptr[0] || ptr[1];
  return i ? (K.ArrowUp || K.ArrowDown || ptr[1]) : (K.KeyW || K.Space || ptr[0]);
}
addEventListener('keydown', function (e) {
  audioInit();
  if ((st == 'ready' || st == 'play') && !paused && /^(Arrow|Space)/.test(e.code)) e.preventDefault();
  K[e.code] = 1;
  if (e.code == 'Space' && !e.repeat) mash();
  if (!e.repeat && !paused && !fo && (st == 'ready' || st == 'play') && /^(ArrowUp|ArrowDown|KeyW|Space)$/.test(e.code)) snd('flap');
  if ((e.code == 'Escape' || e.code == 'KeyP') && !e.repeat) {          // Esc / P: tạm dừng, tiếp tục, hoặc quay lại menu tạm dừng
    if (paused) { if (pscr) showPause(); else resume(); }
    else if (st == 'play' || st == 'ready') pause();
    else if (e.code == 'Escape' && st != 'menu') menu();
  }
  if (e.code == 'Enter' && st == 'over' && ui.innerHTML) start(mode);
});
addEventListener('keyup', function (e) { K[e.code] = 0; });
addEventListener('blur', function () { K = {}; ptr = [0, 0]; pause(); });          // chuyển cửa sổ/tab thì tự tạm dừng
addEventListener('pointerdown', audioInit); addEventListener('pointerup', audioInit);
document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
addEventListener('pagehide', save);
cv.addEventListener('pointerdown', function (e) {
  var r = cv.getBoundingClientRect(), i = mode == 2 && e.clientX - r.left > r.width / 2 ? 1 : 0;
  ptr[i] = 1; pid[e.pointerId] = i; mash(); e.preventDefault();
  if (!paused && !fo && (st == 'ready' || st == 'play')) snd('flap');
});
function pu(e) { var i = pid[e.pointerId]; if (i != null) { ptr[i] = 0; delete pid[e.pointerId]; } }
addEventListener('pointerup', pu); addEventListener('pointercancel', pu);

// ---- Giao diện: menu, cửa hàng, kết thúc ----
function show(h) { ui.innerHTML = h; }
function menu() {
  save(); st = 'menu'; paused = 0; pscr = 0; cd = 0; volumes(); T = 0; pl = []; ps = []; co = []; bo = []; it = []; tc = []; pb = []; fo = null; fx = [];
  show('<h1>🐦 Flappy Bird</h1><button data-a="p1">1 người chơi</button><button data-a="p2">2 người chơi</button>' +
       '<button class="alt" data-a="shop">🛒 Cửa hàng skin</button><button class="alt" data-a="set">🔊 Cài đặt âm lượng</button><p>🪙 ' + S.coins + ' xu · Kỷ lục: ' + S.best + '</p>');
}
function shop() {
  st = 'shop'; if (paused) pscr = 1;
  var h = '<h2>Cửa hàng skin</h2><p>🪙 ' + S.coins + ' xu</p><div class="grid">';
  SK.forEach(function (k, i) {
    var own = S.own.indexOf(i) >= 0;
    h += '<div class="card"><canvas width="90" height="70"></canvas><b>' + k.n + '</b><button data-a="sk" data-i="' + i + '"' +
         (!own && S.coins < k.p ? ' disabled' : '') + '>' + (S.skin == i ? 'Đang dùng' : own ? 'Dùng' : 'Mua ' + k.p + ' xu') + '</button></div>';
  });
  show(h + '</div><button class="alt" data-a="' + (paused ? 'pmenu' : 'menu') + '">← Quay lại</button>');
  [].forEach.call(ui.querySelectorAll('.card canvas'), function (cn, i) { bird(cn.getContext('2d'), 45, 46, -.1, cols(i), 0, 1, 1, 0, SK[i]); });
}
function over() {
  if (st != 'over') return;
  var h = mode == 1
    ? (wn == 0 ? '<h2>🏆 Chiến thắng!</h2>' : '<h2>Game over</h2>') + '<p>Điểm: ' + pl[0].sc + ' · Kỷ lục: ' + S.best + '</p>'
    : '<h2>' + (wn < 0 ? 'Hòa!' : '🏆 Chim ' + (wn + 1) + ' thắng!') + '</h2><p>P1: ' + pl[0].sc + ' điểm · P2: ' + pl[1].sc + ' điểm</p>';
  show(h + '<p>🪙 +' + run + ' xu (tổng ' + S.coins + ')</p><button data-a="again">Chơi lại</button>' +
       '<button class="alt" data-a="shop">Cửa hàng</button><button class="alt" data-a="menu">Menu</button>');
}

// ---- Tạm dừng và cài đặt âm lượng ----
function showPause() {                                            // menu tạm dừng
  st = pst; pscr = 0;
  show('<h2>⏸ Tạm dừng</h2><button data-a="resume">▶ Tiếp tục</button><button class="alt" data-a="home">🏠 Về trang chủ</button>' +
       '<button class="alt" data-a="pshop">🛒 Cửa hàng skin</button><button class="alt" data-a="set">🔊 Cài đặt âm lượng</button>');
}
function pause() {
  if (paused || (st != 'play' && st != 'ready')) return;          // chỉ tạm dừng khi đang chơi hoặc đang chờ bắt đầu
  paused = 1; pst = st; volumes(); snd('pause'); showPause();
}
function resume() {
  paused = 0; pscr = 0; st = pst; show(''); volumes(); K = {}; ptr = [0, 0];
  pl.forEach(function (q, i) { q.k = i ? (S.skin == 1 ? 0 : 1) : S.skin; });   // áp dụng ngay skin vừa chọn trong cửa hàng
  cd = st == 'play' ? 3 : 0;                                      // đếm ngược 3-2-1 trước khi chạy tiếp
}
function settings() {
  if (paused) pscr = 1; else st = 'settings';
  var row = function (ic, nm, a, v) { return '<label class="row">' + ic + ' ' + nm + ' <input type="range" min="0" max="100" value="' + Math.round(v * 100) + '" data-a="' + a + '"><b>' + Math.round(v * 100) + '%</b></label>'; };
  show('<h2>🔊 Cài đặt âm lượng</h2>' + row('🎵', 'Nhạc nền', 'vm', S.mus) + row('🔔', 'Hiệu ứng', 'vs', S.sfx) +
       '<button class="alt" data-a="' + (paused ? 'pmenu' : 'menu') + '">← Quay lại</button>');
}
ui.onclick = function (e) {
  var b = e.target.closest('button'); if (!b) return;
  snd('click');
  var a = b.dataset.a, i = +b.dataset.i;
  if (a == 'p1') start(1); else if (a == 'p2') start(2); else if (a == 'again') start(mode);
  else if (a == 'shop' || a == 'pshop') shop(); else if (a == 'menu' || a == 'home') menu();
  else if (a == 'resume') resume(); else if (a == 'pmenu') showPause(); else if (a == 'set') settings();
  else if (a == 'sk') {
    if (S.own.indexOf(i) < 0 && S.coins >= SK[i].p) { S.coins -= SK[i].p; S.own.push(i); snd('buy'); }
    if (S.own.indexOf(i) >= 0) S.skin = i;
    save(); shop();
  }
};
ui.oninput = function (e) {                                       // kéo thanh trượt âm lượng
  var r = e.target, b = r.parentNode.querySelector('b');
  if (b) b.textContent = r.value + '%';
  if (r.dataset.a == 'vm') S.mus = r.value / 100; else if (r.dataset.a == 'vs') S.sfx = r.value / 100;
  volumes(); save();
};
ui.onchange = function (e) { if (e.target.dataset.a == 'vs') snd('coin'); };   // thả thanh hiệu ứng thì phát thử
pauseBtn.onmousedown = function (e) { e.preventDefault(); };      // nút không nhận focus để phím Space không bấm nhầm
pauseBtn.onclick = function () { pauseBtn.blur(); pause(); };

// ---- Logic game ----
function start(m) {
  mode = m; paused = 0; pscr = 0; cd = 0; T = 0; dist = 0; ps = []; co = []; bo = []; it = []; tc = []; pb = []; fo = null; fx = []; pairN = 0; run = 0; shake = 0; wn = -1; pl = [];
  for (var i = 0; i < m; i++) pl.push({ x: m > 1 ? 130 + i * 60 : 150, b: m > 1 ? 190 + i * 100 : 230, y: 230, vy: 0, a: 0, alive: 1, sc: 0, lives: 5, s: 1, tz: 1, zt: 0, rt: 0, inv: 0, rs: 0, k: i ? (S.skin == 1 ? 0 : 1) : S.skin });
  addPair(W - 40); show(''); st = 'ready';
}
function lvl() { var m = 0; pl.forEach(function (q) { m = Math.max(m, q.sc); }); return m >= 40 ? 4 : m >= 20 ? 3 : m >= 5 ? 2 : 1; }

// Tạo cặp cột mới; giữa 2 cặp cột có hàng xu (nằm đúng đường bay) và đôi khi có bom (nằm xa đường bay)
function addPair(px) {
  var g = GAP[lvl() - 1], pr = ps.length ? ps[ps.length - 1] : null, id = pairN++;
  var base = pr ? pr.gy : (H - GR - g) / 2, lo = Math.max(70, base - 140), hi = Math.min(H - GR - 70 - g, base + 140);
  var gy = lo + Math.random() * (hi - lo);
  ps.push({ x: px, gy: gy, g: g, id: id, s: [0, 0], rb: Math.random() < .25,
            ft: id > 2 && Math.random() < .22, fb: id > 2 && Math.random() < .22 });  // ft/fb: nửa cột trên/dưới dễ sụp
  if (pr) {
    var mx = (pr.x + px) / 2 + PW / 2, my = (pr.gy + pr.g / 2 + gy + g / 2) / 2;
    var pk = mode == 1 && id % 8 == 5, thn = !pk && id > 2 && Math.random() < .3;   // pk: khoảng này có chim hồng; thn: có mây sấm sét
    if (!pk && !thn && Math.random() < .8) for (var j = -1; j < 2; j++) co.push({ x: mx + j * 34, y: my, ph: Math.random() * 6 });
    if (!pk && !thn && id > 1 && Math.random() < .5) bo.push({ x: mx + (Math.random() - .5) * 40, y: my > H / 2 ? my - 120 : my + 120, ph: Math.random() * 6 });
    if (thn) tc.push({ x: mx, y: my - 95, tm: Math.random() * 2.6, ph: Math.random() * 6 });   // mây sấm sét nằm trên đường bay
    if (pk) pb.push({ x: mx, y: my, ph: Math.random() * 6 });                                  // chim hồng đứng chờ
    if (!pk && id > 0 && Math.random() < .35) {                          // vật phẩm: 0 = đèn pin phóng to, 1 = đèn pin thu nhỏ, 2 = kẹo mút
      var ix = mx + (Math.random() < .5 ? -110 : 110), t = (ix - pr.x - PW / 2) / (px - pr.x), c0 = pr.gy + pr.g / 2;
      it.push({ x: ix, y: c0 + (gy + g / 2 - c0) * t, t: Math.floor(Math.random() * 3), ph: Math.random() * 6 });
    }
  }
}
function burst(px, py, col, n) {
  for (var i = 0; i < n; i++) fx.push({ x: px, y: py, vx: (Math.random() - .5) * 320, vy: (Math.random() - .8) * 260, l: 1, c: col, s: 3 + Math.random() * 5 });
}
function die(q) {
  if (!q.alive) return;
  q.alive = 0; q.vy = -260; shake = .4; burst(q.x, q.y, cols(q.k)[0], 12); snd('die');
  if (--q.lives > 0) q.rs = 1;                       // còn mạng: hồi sinh sau 1 giây
}
function respawn(q) {                                             // hồi sinh giữa khe hở của cột gần nhất phía trước, nhấp nháy bất tử 1.5 giây
  var p = null;
  for (var i = 0; i < ps.length; i++) if (ps[i].x + PW > q.x - 30) { p = ps[i]; break; }
  snd('spawn'); q.y = p ? p.gy + p.g / 2 : 230; q.vy = 0; q.a = 0; q.alive = 1; q.inv = 1.5; q.tz = 1; q.zt = 0; q.rt = 0;
}
function mash() { if (fo && !paused && !fo.res && fo.t > .3) { fo.r = Math.min(1, fo.r + .075); snd('mash'); } }   // mỗi lần bấm Space làm thanh kháng cự tăng lên
function foUpdate(dt) {                                           // màn đối đầu: thế giới đứng yên, chim hồng bay tới trước mặt chim người chơi
  var q = pl[0], o = fo.o, k = Math.min(1, dt * 6);
  fo.t += dt;
  if (!fo.res) {
    o.x += (q.x + 120 - o.x) * k; o.y += (q.y - o.y) * k;
    fo.pd += ((1 - Math.max(0, fo.r)) * 36 - fo.pd) * k;          // chim người chơi bị kéo dần về phía chim hồng
    if (fo.r < 1 && fo.t > .5) fo.r -= (.30 + .025 * lvl()) * (fo.r < .2 ? .6 : 1) * dt;              // sức quyến rũ kéo thanh kháng cự tụt xuống
    if (fo.r >= 1) { fo.res = 1; fo.t = 0; snd('win'); S.coins += 5; run += 5; burst(q.x + 60, q.y, '#ffd400', 14); }
    else if (fo.r <= 0) { fo.res = -1; fo.t = 0; die(q); }        // thua: mất 1 mạng
  } else {
    fo.pd -= fo.pd * k; o.x += 260 * dt; o.y -= 120 * dt;         // chim hồng bay đi
    if (fo.t > 1) { o.gone = 1; fo = null; }
  }
}
function hitP(p, q, top) {
  if (top ? p.ft : p.fb) {            // cột dễ sụp: vỡ vụn, chim không chết, bị bật lại
    if (top) p.bt = 1; else p.bb = 1;
    snd('crumble');
    var y0 = top ? 0 : p.gy + p.g, y1 = top ? p.gy : H - GR;
    for (var i = 0; i < 18; i++) fx.push({ x: p.x + Math.random() * PW, y: y0 + Math.random() * (y1 - y0), vx: (Math.random() - .5) * 260, vy: -Math.random() * 240, l: 1, c: '#d9c7a0', s: 5 + Math.random() * 7 });
    shake = .35; q.vy = top ? 160 : -220;
  } else die(q);
}
function fin(w) {
  st = 'over'; wn = w; snd(w >= 0 ? 'victory' : 'gameover', w >= 0 ? .3 : .45);
  if (mode == 1) S.best = Math.max(S.best, pl[0].sc);
  save(); setTimeout(over, 800);
}

function update(dt) {
  CL.forEach(function (a) { a[0] -= 12 * a[2] * dt; if (a[0] < -100) a[0] = W + 100; });
  shake = Math.max(0, shake - dt);
  if (st == 'ready' && pl.some(function (q, j) { return held(j); })) st = 'play';
  var go = st == 'play' && !fo, sp = SPD[lvl() - 1];
  if (go) {
    T += dt; dist += sp * dt;
    ps.forEach(function (p) { p.x -= sp * dt; });
    co.forEach(function (o) { o.x -= sp * dt; });
    bo.forEach(function (o) { o.x -= sp * dt; });
    it.forEach(function (o) { o.x -= sp * dt; });
    tc.forEach(function (o) { var pt = o.tm; o.x -= sp * dt; o.tm = (o.tm + dt) % 2.6; if (pt < 2.3 && o.tm >= 2.3 && o.x > -20 && o.x < W + 20) snd('zap'); });
    pb.forEach(function (o) { if (!o.fly) o.x -= sp * dt; });
    var l = ps[ps.length - 1]; if (l.x <= W - SPC) addPair(l.x + SPC);
    ps = ps.filter(function (p) { return p.x > -PW - 10; });
    co = co.filter(function (o) { return o.x > -20 && !o.got; });
    bo = bo.filter(function (o) { return o.x > -30 && !o.hit; });
    it = it.filter(function (o) { return o.x > -30 && !o.got; });
    tc = tc.filter(function (o) { return o.x > -80; });
    pb = pb.filter(function (o) { return o.x > -60 && !o.gone; });
  }
  fx.forEach(function (f) { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.l -= dt * 1.4; });
  fx = fx.filter(function (f) { return f.l > 0; });

  if (go && mode == 1 && pl[0].alive) pb.forEach(function (o) {    // chim hồng tới gần: bắt buộc đối đầu, không né được
    if (!fo && !o.fly && o.x - pl[0].x <= 110 && o.x > pl[0].x - 40) { fo = { o: o, r: .35, t: 0, res: 0, pd: 0 }; o.fly = 1; snd('charm'); }
  });
  if (fo) foUpdate(dt);
  pl.forEach(function (q, i) {
    if (q.zt > 0 && (q.zt -= dt) <= 0) q.tz = 1;                  // hết 3 giây phóng to / thu nhỏ
    if (q.rt > 0) q.rt -= dt;                                     // đếm 5 giây nhấp nháy 7 màu
    if (q.inv > 0) q.inv -= dt;
    q.s += (q.tz - q.s) * Math.min(1, dt * 8);                    // đổi kích thước mượt
    if (!q.alive) {
      q.vy = Math.min(q.vy + 1400 * dt, 700); q.y = Math.min(q.y + q.vy * dt, H - GR - 14); q.a += dt * 5;
      if (go) ps.forEach(function (p) { if (p.x + PW < q.x) p.s[i] = 1; });   // cột trôi qua lúc đang chết thì không tính điểm
      if (q.rs > 0 && (q.rs -= dt) <= 0) respawn(q);
      return;
    }
    if (st == 'ready') { q.y = q.b + Math.sin(Z * 4 + i * 2) * 6; return; }
    if (!go) return;
    var hw = 19 * q.s, hh = 13 * q.s, vul = q.inv <= 0;           // vul = có thể bị thương (hết thời gian bất tử)
    // Vật lý mượt: giữ phím thì tăng tốc lên, thả ra thì trọng lực kéo xuống
    q.vy += (held(i) ? -2400 : 1400) * dt;
    q.vy = Math.max(-320, Math.min(440, q.vy));
    q.y += q.vy * dt;
    if (q.y < hh + 3) { q.y = hh + 3; if (q.vy < 0) q.vy = 0; }  // chạm trần không chết
    q.a += (Math.max(-.45, Math.min(.9, q.vy / 480)) - q.a) * Math.min(1, dt * 10);
    if (q.y > H - GR - hh - 1) { if (vul) die(q); else { q.y = H - GR - hh - 1; q.vy = 0; } }   // chạm đất thì mất mạng
    if (vul) ps.forEach(function (p) {
      if (q.x + hw > p.x && q.x - hw < p.x + PW) {
        if (!p.bt && q.y - hh < p.gy) hitP(p, q, 1);
        else if (!p.bb && q.y + hh > p.gy + p.g) hitP(p, q, 0);
      }
    });
    bo.forEach(function (b) {
      var by = b.y + Math.sin(Z * 3 + b.ph) * 14;
      if (vul && !b.hit && Math.hypot(b.x - q.x, by - q.y) < 12 + 14 * q.s) { b.hit = 1; burst(b.x, by, '#ff8a00', 24); snd('boom'); die(q); }
    });
    co.forEach(function (o) {
      if (!o.got && Math.hypot(o.x - q.x, o.y - q.y) < 14 + 14 * q.s) { o.got = 1; S.coins++; run++; burst(o.x, o.y, '#ffd400', 6); snd('coin'); }
    });
    it.forEach(function (o) {
      if (o.got || Math.hypot(o.x - q.x, o.y - q.y) >= 14 + 14 * q.s) return;
      o.got = 1; burst(o.x, o.y, '#fff', 8); snd('item');
      if (o.t == 2) q.rt = 5; else { q.tz = o.t ? .7 : 1.35; q.zt = 3; }   // phóng to x1.35 hoặc thu nhỏ x0.7 trong 3 giây
    });
    tc.forEach(function (o) {                                     // sét đánh xuống từ mây
      if (vul && o.tm >= 2.3 && Math.abs(o.x - q.x) < hw + 12 && q.y + hh > o.y + 12 && q.y - hh < o.y + 182) { burst(q.x, q.y, '#ffe600', 20); die(q); }
    });
    if (q.alive) ps.forEach(function (p) { if (!p.s[i] && p.x + PW < q.x) { p.s[i] = 1; q.sc++; snd('point'); } });
  });

  if (go) {
    var w = -9, d = pl.some(function (q) { return !q.alive && !(q.rs > 0); });
    pl.forEach(function (q, i) { if (q.alive && q.sc >= WIN) w = i; });
    if (w < 0 && d) {                                             // chế độ 2 người: ai hết mạng trước thì thua; cả hai cùng hết thì so điểm
      var o0 = !pl[0].alive && !(pl[0].rs > 0), o1 = mode == 2 && !pl[1].alive && !(pl[1].rs > 0);
      w = mode == 2 ? (o0 && o1 ? (pl[0].sc == pl[1].sc ? -1 : pl[0].sc > pl[1].sc ? 0 : 1) : o0 ? 1 : 0) : -1;
    }
    if (w != -9) fin(w);
  }
}

// ---- Vẽ ----
function orb(u, col, r) {                                         // mặt trời / mặt trăng bay theo vòng cung
  var bx = 60 + u * (W - 120), by = H - GR - Math.sin(u * Math.PI) * H * .62;
  c.fillStyle = col; c.globalAlpha = .25; c.beginPath(); c.arc(bx, by, r * 1.9, 0, 7); c.fill();
  c.globalAlpha = 1; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
  return [bx, by];
}
function pillar(p, top) {
  if (top ? p.bt : p.bb) return;
  var fr = top ? p.ft : p.fb, y0 = top ? 0 : p.gy + p.g, y1 = top ? p.gy : H - GR, h = y1 - y0, yy;
  var col = fr ? '#d9c7a0' : p.rb ? RB[Math.floor(Z * 5 + p.id) % 7] : '#c0563d';
  c.lineWidth = 2; c.strokeStyle = '#4a1d12';
  c.fillStyle = col; c.fillRect(p.x, y0, PW, h); c.strokeRect(p.x, y0, PW, h);
  c.beginPath(); c.strokeStyle = 'rgba(74,29,18,.3)';
  for (yy = y0 + 20; yy < y1; yy += 20) { c.moveTo(p.x, yy); c.lineTo(p.x + PW, yy); }
  c.stroke();
  if (fr) {                                                       // vết nứt
    c.beginPath(); c.strokeStyle = '#6b5a3a';
    c.moveTo(p.x + 10, y0 + h * .2); c.lineTo(p.x + 30, y0 + h * .35); c.lineTo(p.x + 18, y0 + h * .5);
    c.lineTo(p.x + 42, y0 + h * .7); c.lineTo(p.x + 30, y0 + h * .9); c.stroke();
  }
  var cy = top ? y1 - 24 : y0;                                    // miệng ống
  c.strokeStyle = '#4a1d12'; c.fillStyle = col; c.fillRect(p.x - 5, cy, PW + 10, 24); c.strokeRect(p.x - 5, cy, PW + 10, 24);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(p.x - 5, cy, PW + 10, 24);
}
function draw() {
  var ph = (T / CYCLE) % 1, k = sky(ph), n = k[7], f = 1 - .7 * n, i, xx;
  c.setTransform(D, 0, 0, D, 0, 0);
  if (shake > 0 && !paused) c.translate((Math.random() - .5) * shake * 20, (Math.random() - .5) * shake * 20);
  var g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(' + k.slice(1, 4).map(Math.round) + ')');
  g.addColorStop(1, 'rgb(' + k.slice(4, 7).map(Math.round) + ')');
  c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);

  if (n > .02) {                                                  // sao ban đêm
    c.fillStyle = '#fff';
    for (i = 0; i < STARS.length; i++) { c.globalAlpha = n * (.5 + .5 * Math.sin(Z * 2 + i)); c.fillRect(STARS[i][0], STARS[i][1], STARS[i][2], STARS[i][2]); }
    c.globalAlpha = 1;
  }
  var u = ((ph + .15) % 1) / .6;                                  // mặt trời
  if (u <= 1) orb(u, 'hsl(' + (25 + Math.sin(u * Math.PI) * 30) + ',100%,60%)', 34);
  u = (ph - .4) / .5;                                             // mặt trăng
  if (u >= 0 && u <= 1) {
    var m = orb(u, '#f4f1de', 28);
    c.fillStyle = '#d9d5bd';
    [[-8, -6, 6], [9, 4, 5], [-3, 11, 4]].forEach(function (a) { c.beginPath(); c.arc(m[0] + a[0], m[1] + a[1], a[2], 0, 7); c.fill(); });
  }
  c.fillStyle = 'rgba(255,255,255,' + (.9 - .65 * n) + ')';       // mây
  CL.forEach(function (a) {
    var s = a[2]; c.beginPath();
    c.ellipse(a[0], a[1], 50 * s, 16 * s, 0, 0, 7); c.ellipse(a[0] - 30 * s, a[1] + 4 * s, 34 * s, 12 * s, 0, 0, 7); c.ellipse(a[0] + 32 * s, a[1] + 5 * s, 36 * s, 12 * s, 0, 0, 7);
    c.fill();
  });
  c.fillStyle = 'rgb(' + [90 * f, 165 * f, 100 * f].map(Math.round) + ')';   // đồi xa
  c.beginPath(); c.moveTo(0, H);
  for (xx = 0; xx <= W; xx += 16) c.lineTo(xx, H - GR - 40 + Math.sin((xx + dist * .25) / 70) * 14 + Math.sin((xx + dist * .25) / 29) * 6);
  c.lineTo(W, H); c.fill();

  ps.forEach(function (p) { pillar(p, 1); pillar(p, 0); });
  co.forEach(function (a) {
    c.fillStyle = '#ffd400'; c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.beginPath();
    c.ellipse(a.x, a.y, Math.abs(Math.cos(Z * 4 + a.ph)) * 10 + 2, 11, 0, 0, 7); c.fill(); c.stroke();
  });
  bo.forEach(function (b) {
    var by = b.y + Math.sin(Z * 3 + b.ph) * 14;
    c.fillStyle = '#222'; c.beginPath(); c.arc(b.x, by, 14, 0, 7); c.fill();
    c.fillStyle = '#777'; c.beginPath(); c.arc(b.x - 5, by - 5, 4, 0, 7); c.fill();
    c.strokeStyle = '#8b5a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(b.x + 6, by - 11); c.quadraticCurveTo(b.x + 12, by - 20, b.x + 4, by - 24); c.stroke();
    c.fillStyle = (Z * 20) % 2 < 1 ? '#ff3d00' : '#ffd400'; c.beginPath(); c.arc(b.x + 4, by - 25, 4, 0, 7); c.fill();
  });
  it.forEach(function (o) {
    c.save(); c.translate(o.x, o.y); c.rotate(Math.sin(Z * 3 + o.ph) * .25); c.lineWidth = 2;
    if (o.t == 2) {                                               // cây kẹo mút
      c.strokeStyle = '#e8d9b5'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 30); c.stroke();
      c.fillStyle = '#ff4f8b'; c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.moveTo(9, 0); c.arc(0, 0, 9, 0, 4.7); c.stroke();
    } else {                                                      // đèn pin: vàng "+" = phóng to, xanh "-" = thu nhỏ
      c.strokeStyle = '#333'; c.rotate(-.6);
      c.fillStyle = o.t ? '#4aa3ff' : '#f2a516'; c.fillRect(-15, -6, 20, 12); c.strokeRect(-15, -6, 20, 12);
      c.fillStyle = '#ddd'; c.beginPath(); c.moveTo(5, -6); c.lineTo(15, -11); c.lineTo(15, 11); c.lineTo(5, 6); c.closePath(); c.fill(); c.stroke();
      c.rotate(.6); c.fillStyle = o.t ? '#ff3d3d' : '#2fd04a'; c.beginPath(); c.arc(12, -16, 9, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '700 16px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText(o.t ? '\u2212' : '+', 12, -11);
    }
    c.restore();
  });
  tc.forEach(function (o) {                                         // mây sấm sét: nháy cảnh báo 0.8 giây rồi mới đánh
    var w = o.tm >= 1.5 && o.tm < 2.3, z = o.tm >= 2.3;
    c.fillStyle = z || (w && Math.floor(Z * 12) % 2) ? '#8a8f9c' : '#4a4f5c';
    c.beginPath(); c.ellipse(o.x, o.y, 52, 20, 0, 0, 7); c.ellipse(o.x - 34, o.y + 6, 32, 14, 0, 0, 7); c.ellipse(o.x + 34, o.y + 6, 34, 14, 0, 0, 7); c.ellipse(o.x - 10, o.y - 12, 28, 16, 0, 0, 7); c.fill();
    if (w) { c.strokeStyle = 'rgba(255,230,0,.7)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(o.x, o.y + 16); c.lineTo(o.x, o.y + 182); c.stroke(); c.setLineDash([]); }
    if (z) {
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(-20, -20, W + 40, H + 40);
      c.beginPath(); c.moveTo(o.x, o.y + 16);
      for (var k = 1; k <= 5; k++) c.lineTo(o.x + (k % 2 ? -1 : 1) * (6 + Math.random() * 8), o.y + 16 + k * 33);
      c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,230,0,.45)'; c.lineWidth = 12; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    }
  });
  pb.forEach(function (o) {                                         // chim hồng: đứng quay mặt sang trái, đối diện chim người chơi
    if (!o.fly) { c.fillStyle = '#8b5a2b'; c.strokeStyle = '#4a2e12'; c.lineWidth = 2; c.fillRect(o.x - 34, o.y + 20, 68, 8); c.strokeRect(o.x - 34, o.y + 20, 68, 8); }
    bird(c, o.x, o.y, o.fly ? -.15 : 0, PINK, o.fly ? Math.sin(Z * 20) * 4 : 0, 1, 1, 1);
    c.font = '700 20px system-ui,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff4fa3';
    c.fillText('♥', o.x - 8 + Math.sin(Z * 3 + o.ph) * 6, o.y - 28 - (Z * 16 + o.ph * 5) % 14);
  });
  c.textAlign = 'center'; c.lineJoin = 'round';
  pl.forEach(function (q, i) {
    bird(c, q.x + (fo && i == 0 ? fo.pd : 0), q.y, q.a, q.rt > 0 ? flashCols() : cols(q.k), q.alive ? Math.sin(Z * (held(i) ? 30 : 10)) * 4 : 0, q.alive ? (q.inv > 0 && Math.floor(Z * 12) % 2 ? .35 : 1) : .8, q.s, 0, SK[q.k]);
    if (mode == 2) { c.font = '700 14px system-ui,sans-serif'; c.fillStyle = '#fff'; c.fillText('P' + (i + 1), q.x, q.y - 28); }
  });
  fx.forEach(function (f) { c.globalAlpha = Math.max(0, f.l); c.fillStyle = f.c; c.fillRect(f.x, f.y, f.s, f.s); });
  c.globalAlpha = 1;

  c.fillStyle = 'rgb(' + [196 * f, 150 * f, 90 * f].map(Math.round) + ')'; c.fillRect(-20, H - GR, W + 40, GR + 20);   // mặt đất
  c.fillStyle = 'rgb(' + [110 * f, 190 * f, 80 * f].map(Math.round) + ')'; c.fillRect(-20, H - GR, W + 40, 8);
  c.fillStyle = 'rgba(0,0,0,.12)';
  for (xx = -(dist % 40); xx < W; xx += 40) c.fillRect(xx, H - GR + 8, 20, GR);

  if (st == 'ready' || st == 'play' || st == 'over') {            // HUD
    c.font = '700 64px system-ui,sans-serif'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.35)'; c.fillStyle = '#fff';
    pl.forEach(function (q, i) {
      var m1 = mode == 1, t = m1 ? '' + q.sc : 'P' + (i + 1) + ': ' + q.sc, tx = m1 ? W / 2 : W * (.3 + .4 * i);
      var ty = m1 ? 104 : 64, hs = m1 ? 30 : 18, hy = m1 ? 36 : 30;   // 2 người: điểm và tim thu nhỏ để không che màn hình
      c.font = '700 ' + (m1 ? 64 : 28) + 'px system-ui,sans-serif'; c.lineWidth = m1 ? 5 : 3; c.fillStyle = '#fff';
      c.strokeText(t, tx, ty); c.fillText(t, tx, ty);
      c.font = '700 ' + hs + 'px system-ui,sans-serif';               // 5 trái tim = 5 mạng của mỗi người chơi
      for (var h = 0; h < 5; h++) {
        c.strokeText('\u2665', tx - 2 * hs + h * hs, hy);
        c.fillStyle = h < q.lives ? '#ff3b5c' : 'rgba(255,255,255,.35)'; c.fillText('\u2665', tx - 2 * hs + h * hs, hy);
      }
    });
    c.fillStyle = 'rgba(43,52,64,.8)'; c.fillRect(10, 10, 100, 28); c.fillRect(W - 118, 10, 108, 28);
    c.font = '700 16px system-ui,sans-serif'; c.textAlign = 'left'; c.fillStyle = '#fff';
    c.fillText('Level ' + lvl(), 20, 30); c.fillText('' + S.coins, W - 76, 30);
    c.fillStyle = '#ffd400'; c.beginPath(); c.arc(W - 92, 24, 8, 0, 7); c.fill();
    c.textAlign = 'center';
  }
  if (fo) {                                                       // thanh mức độ kháng cự
    var q0 = pl[0], r = Math.max(0, Math.min(1, fo.r)), bw = 380, bx = (W - bw) / 2, by = 392, h2, tt;
    if (!fo.res) {
      c.font = '700 22px system-ui,sans-serif'; c.fillStyle = '#ff4fa3';
      for (h2 = 0; h2 < 5; h2++) { tt = (Z * 1.3 + h2 / 5) % 1; c.globalAlpha = 1 - tt * .5; c.fillText('♥', fo.o.x + (q0.x - fo.o.x) * tt, fo.o.y + (q0.y - fo.o.y) * tt + Math.sin(Z * 8 + h2) * 10); }
      c.globalAlpha = 1;
    }
    c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.5)'; c.font = '700 22px system-ui,sans-serif'; c.fillStyle = '#fff';
    var msg = fo.res > 0 ? 'Thoát khỏi ánh mắt chim hồng! +5 xu' : fo.res < 0 ? 'Bị quyến rũ mất rồi! -1 ♥' : 'Chim hồng đang quyến rũ! Bấm SPACE thật nhanh!';
    c.strokeText(msg, W / 2, by - 12); c.fillText(msg, W / 2, by - 12);
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx - 4, by - 4, bw + 8, 34);
    c.fillStyle = 'hsl(' + r * 120 + ',85%,50%)'; c.fillRect(bx, by, bw * r, 26);
    c.fillStyle = '#fff'; c.font = '700 14px system-ui,sans-serif'; c.fillText('Kháng cự ' + Math.round(r * 100) + '%', W / 2, by + 18);
  }
  if (st == 'ready') {
    c.font = '700 20px system-ui,sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.45)'; c.fillStyle = '#fff';
    (mode == 1 ? ['Giữ ↓ / ↑ / W / Space (hoặc chạm giữ) để bay lên', 'Nhấn giữ để bắt đầu']
               : ['P1: giữ W hoặc Space   ·   P2: giữ ↑ hoặc ↓', 'Nhấn phím điều khiển để bắt đầu'])
      .forEach(function (s, j) { c.strokeText(s, W / 2, H * .6 + j * 30); c.fillText(s, W / 2, H * .6 + j * 30); });
  }
  if (cd > 0) {                                                   // đếm ngược 3-2-1 sau khi tiếp tục
    c.textAlign = 'center'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.45)'; c.fillStyle = '#fff';
    c.font = '700 22px system-ui,sans-serif'; c.lineWidth = 4; c.strokeText('Sẵn sàng!', W / 2, H / 2 - 70); c.fillText('Sẵn sàng!', W / 2, H / 2 - 70);
    c.font = '700 120px system-ui,sans-serif'; c.lineWidth = 8; c.strokeText('' + Math.ceil(cd), W / 2, H / 2 + 40); c.fillText('' + Math.ceil(cd), W / 2, H / 2 + 40);
  }
}

// ---- Vòng lặp chính: dt tính theo thời gian thật nên chạy mượt trên mọi màn hình ----
var last = 0;
function loop(t) {
  requestAnimationFrame(loop);
  var dt = Math.min((t - last) / 1000 || 0, .033); last = t;
  if (!paused) {                                                  // đang tạm dừng thì đóng băng toàn bộ game, chỉ vẽ lại khung hình
    Z += dt;
    if (cd > 0) { var pc = Math.ceil(cd); cd -= dt; if (Math.ceil(cd) != pc) snd(cd > 0 ? 'tick' : 'go'); }
    else update(dt);
  }
  draw();
  var on = !paused && (st == 'ready' || st == 'play');            // nút ⏸ chỉ hiện khi đang chơi
  if (on != pOn) { pOn = on; pauseBtn.style.display = on ? 'block' : 'none'; }
  theme(st == 'ready' || st == 'play' ? 'play' : 'menu');         // nhạc chơi / nhạc menu
}
menu();
requestAnimationFrame(loop);
})();
