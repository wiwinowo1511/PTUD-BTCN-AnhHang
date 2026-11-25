const PALETTE = { status: ['#c7d2fe', '#fcd34d', '#86efac'], priority: ['#bae6fd', '#c4b5fd', '#f472b6'] };
const charts = {};

function draw(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($('#' + id), config);
}
const common = { responsive: true, maintainAspectRatio: false };
const barOpts = { ...common, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1ecfa' } }, x: { grid: { display: false } } } };
const doughnutOpts = { ...common, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } } } };

function paint(d) {
  const o = d.overview, i = d.insights;
  $('#k-total').textContent = o.total; $('#k-done').textContent = o.completed; $('#k-pending').textContent = o.pending;
  $('#k-overdue').textContent = o.overdue; $('#k-rate').textContent = o.completionRate + '%';
  $('#i-best').textContent = i.bestDay ? i.bestDay.name : 'Chưa có dữ liệu';
  $('#i-best-n').textContent = i.bestDay ? `${i.bestDay.count} task hoàn thành` : '';
  $('#i-cat').textContent = i.topCategory ? i.topCategory.name : 'Chưa có dữ liệu';
  $('#i-cat-n').textContent = i.topCategory ? `${i.topCategory.count} task` : '';
  $('#i-week').textContent = i.completedThisWeek; $('#i-rate').textContent = i.completionRate + '%';

  const c = d.charts;
  draw('c-status', { type: 'doughnut', data: { labels: c.status.labels, datasets: [{ data: c.status.data, backgroundColor: PALETTE.status, borderWidth: 3, borderColor: '#fff' }] }, options: doughnutOpts });
  draw('c-weekday', { type: 'bar', data: { labels: c.weekday.labels, datasets: [{ label: 'Task hoàn thành', data: c.weekday.data, backgroundColor: '#c4b5fd', hoverBackgroundColor: '#8b6cf0', borderRadius: 10 }] }, options: barOpts });
  draw('c-priority', { type: 'bar', data: { labels: c.priority.labels, datasets: [{ label: 'Số task', data: c.priority.data, backgroundColor: PALETTE.priority, borderRadius: 10 }] }, options: barOpts });
  draw('c-category', { type: 'doughnut', data: { labels: c.category.map(x => x.name), datasets: [{ data: c.category.map(x => x.count), backgroundColor: c.category.map(x => x.color), borderWidth: 3, borderColor: '#fff' }] }, options: doughnutOpts });
}

async function load(range) {
  $('#stats-loading').hidden = false; $('#stats-body').hidden = true; $('#stats-empty').hidden = true;
  try {
    if (typeof Chart === 'undefined') throw new Error('Không tải được thư viện Chart.js. Hãy kiểm tra kết nối Internet.');
    const { data } = await api('/statistics?range=' + range);
    $('#stats-loading').hidden = true;
    if (!data.overview.total) { $('#stats-empty').hidden = false; return; }
    $('#stats-body').hidden = false;
    paint(data);
  } catch (e) {
    $('#stats-loading').hidden = true;
    $('#stats-empty').hidden = false;
    $('#stats-empty h3').textContent = 'Không tải được thống kê';
    $('#stats-empty p').textContent = e.message;
    toast(e.message, 'err');
  }
}

$$('#range button').forEach(b => b.addEventListener('click', () => {
  $$('#range button').forEach(x => x.classList.toggle('active', x === b));
  load(b.dataset.range);
}));
load('30');
