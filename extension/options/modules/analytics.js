// ── Analytics — usage gauges (moved from Subscription) + day-by-day chart ──
import { SERVER_URL } from './config.js';

const METRICS = {
  cover_letters:  { label: 'Cover letters',  color: '#2dd4bf' },
  job_audits:     { label: 'Job audits',     color: '#a855f7' },
  profile_audits: { label: 'Profile audits', color: '#ec4899' },
};

const RANGE_LABELS = {
  '7d': 'Last 7 days', '30d': 'Last 30 days', '6m': 'Last 6 months',
  '1y': 'This year', 'custom': 'Custom range',
};

// Single chart, one metric shown at a time — switched via the dropdown.
let currentMetric = 'cover_letters';
let currentRange  = '7d';
let customFrom = null;
let customTo   = null;
let historyCache = null; // { filled: [...], from, to }

function fmtDate(d) { return d.toISOString().slice(0, 10); }

function fmtDayLabel(day) {
  const d = new Date(day + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function rangeToDates(range) {
  const to = new Date();
  const from = new Date();
  if (range === '7d')       from.setDate(to.getDate() - 6);
  else if (range === '30d') from.setDate(to.getDate() - 29);
  else if (range === '6m')  from.setMonth(to.getMonth() - 6);
  else if (range === '1y')  from.setFullYear(to.getFullYear() - 1);
  return { from: fmtDate(from), to: fmtDate(to) };
}

async function fetchHistory(from, to) {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  if (!userEmail) return [];
  try {
    const res  = await fetch(`${SERVER_URL}/usage-history?email=${encodeURIComponent(userEmail)}&from=${from}&to=${to}`);
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch(e) { return []; }
}

// Fill every day in range so the chart has an even x-axis even when most
// days have zero activity — the server only returns rows that exist.
function fillDays(rows, from, to) {
  const byDay = {};
  rows.forEach(r => { byDay[r.day] = r; });
  const out = [];
  const d   = new Date(from + 'T00:00:00Z');
  const end = new Date(to   + 'T00:00:00Z');
  while (d <= end) {
    const key = fmtDate(d);
    const row = byDay[key] || {};
    out.push({
      day: key,
      cover_letters:  row.cover_letters  || 0,
      job_audits:     row.job_audits     || 0,
      profile_audits: row.profile_audits || 0,
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// Shared coordinate math — used both to draw the line/area and to find the
// nearest point under the cursor on hover, so the two never drift apart.
function computePoints(rows, field) {
  const values = rows.map(r => r[field] || 0);
  const max = Math.max(1, ...values);
  const w = 300, h = 100;
  const n = values.length;
  const stepX = n > 1 ? w / (n - 1) : 0;
  return values.map((v, i) => ({
    x: n > 1 ? i * stepX : w / 2,
    y: h - (v / max) * (h - 14) - 6,
    value: v,
    day: rows[i].day,
  }));
}

function buildSvgMarkup(points, color, field) {
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const area = line + ` L${points[points.length - 1].x.toFixed(1)},100 L${points[0].x.toFixed(1)},100 Z`;
  const gradId = 'an-grad-' + field;
  return `
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gradId})" stroke="none"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.8"/>
      <circle id="an-chart-dot" r="3.5" fill="${color}" stroke="#0b0e17" stroke-width="1.5" style="display:none"/>
    </svg>
  `;
}

// Tracks cursor position over the chart, snaps to the nearest day, and
// updates the guide line / dot / tooltip to show that day's exact count.
function attachHover(wrap, points, meta) {
  const guide   = document.getElementById('an-chart-guide');
  const tooltip = document.getElementById('an-chart-tooltip');
  const tDay    = document.getElementById('an-tooltip-day');
  const tVal    = document.getElementById('an-tooltip-val');
  const dot     = document.getElementById('an-chart-dot');
  const n = points.length;

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const fx  = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = n > 1 ? Math.round(fx * (n - 1)) : 0;
    const p   = points[idx];
    if (!p) return;

    const pxX = (p.x / 300) * rect.width;
    const pxY = (p.y / 100) * rect.height;

    if (guide) { guide.style.display = 'block'; guide.style.left = pxX + 'px'; }
    if (dot)   { dot.style.display = 'block'; dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); }
    if (tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = pxX + 'px';
      if (tDay) tDay.textContent = fmtDayLabel(p.day);
      if (tVal) tVal.textContent = `${p.value} ${meta.label.toLowerCase()}`;
    }
  });

  wrap.addEventListener('mouseleave', () => {
    if (guide) guide.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    if (dot) dot.style.display = 'none';
  });
}

function renderChart() {
  const container = document.getElementById('an-chart');
  if (!container) return;
  const field = currentMetric;
  const meta  = METRICS[field];
  const rows  = historyCache?.filled || [];
  const total = rows.reduce((sum, r) => sum + (r[field] || 0), 0);
  const hasData = total > 0;

  container.innerHTML = `
    <div class="an-chart-head">
      <div class="an-chart-total">${total}</div>
      <button class="an-metric-btn" id="an-metric-btn">
        <span class="an-metric-dot" style="background:${meta.color}"></span>
        ${meta.label}
        <span class="car">▾</span>
      </button>
      <div class="an-metric-menu" id="an-metric-menu">
        ${Object.entries(METRICS).map(([key, m]) => `
          <div class="an-metric-item ${key === field ? 'active' : ''}" data-metric="${key}">
            <span class="an-metric-dot" style="background:${m.color}"></span>${m.label}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="an-chart-sub">${RANGE_LABELS[currentRange] || ''}</div>
    <div class="an-chart-svg-wrap" id="an-chart-svg-wrap">
      ${hasData ? '' : `<div class="an-chart-empty">No ${meta.label.toLowerCase()} recorded in this range yet.</div>`}
      <div class="an-chart-guide" id="an-chart-guide"></div>
      <div class="an-chart-tooltip" id="an-chart-tooltip">
        <div class="day" id="an-tooltip-day"></div>
        <div class="val" id="an-tooltip-val"></div>
      </div>
    </div>
  `;

  const btn  = document.getElementById('an-metric-btn');
  const menu = document.getElementById('an-metric-menu');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
    btn.classList.toggle('open');
  });
  menu?.querySelectorAll('.an-metric-item').forEach(item => {
    item.addEventListener('click', () => {
      currentMetric = item.dataset.metric;
      renderChart();
    });
  });

  const wrap = document.getElementById('an-chart-svg-wrap');
  if (hasData && wrap) {
    const points = computePoints(rows, field);
    wrap.insertAdjacentHTML('afterbegin', buildSvgMarkup(points, meta.color, field));
    attachHover(wrap, points, meta);
  }
}

async function loadAndRender() {
  let from, to;
  if (currentRange === 'custom' && customFrom && customTo) {
    from = customFrom; to = customTo;
  } else {
    ({ from, to } = rangeToDates(currentRange));
  }
  const rows = await fetchHistory(from, to);
  historyCache = { filled: fillDays(rows, from, to), from, to };
  renderChart();
}

export function initAnalytics() {
  document.querySelectorAll('.an-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.an-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentRange = pill.dataset.range;
      const customRow = document.getElementById('an-custom-range');
      if (currentRange === 'custom') {
        if (customRow) customRow.style.display = 'flex';
        return; // wait for Apply
      }
      if (customRow) customRow.style.display = 'none';
      loadAndRender();
    });
  });

  document.getElementById('an-apply-btn')?.addEventListener('click', () => {
    const from = document.getElementById('an-from')?.value;
    const to   = document.getElementById('an-to')?.value;
    if (!from || !to) return;
    customFrom = from;
    customTo   = to;
    loadAndRender();
  });

  // Click-outside closes the open metric dropdown
  document.addEventListener('click', () => {
    document.querySelectorAll('.an-metric-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.an-metric-btn.open').forEach(b => b.classList.remove('open'));
  });

  loadAndRender();
}
