// ── Analytics — usage gauges (moved from Subscription) + day-by-day chart ──
import { SERVER_URL } from './config.js';

const METRICS = {
  cover_letters:  { label: 'Cover letters',  singular: 'cover letter',  color: '#2dd4bf' },
  job_audits:     { label: 'Job audits',     singular: 'job audit',     color: '#6366f1' },
  profile_audits: { label: 'Profile audits', singular: 'profile audit', color: '#ec4899' },
};

function pluralize(count, meta) {
  return count === 1 ? meta.singular : meta.label.toLowerCase();
}

const RANGES = ['7d', '30d', '90d', 'year'];

function rangeLabel(range) {
  if (range === '7d')  return 'Last 7 days';
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  if (range === 'year') return String(new Date().getFullYear());
  return '';
}

// Single chart, one metric shown at a time — switched via the tabs.
let currentMetric = 'cover_letters';
let currentRange  = '7d';
let historyCache = null; // { buckets: [...], granularity, from, to }

function fmtDate(d) { return d.toISOString().slice(0, 10); }

function fmtDayLabel(day) {
  const d = new Date(day + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtMonthLabel(yearMonth, monthOnly) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', monthOnly
    ? { month: 'short', timeZone: 'UTC' }
    : { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function rangeToDates(range) {
  const to = new Date();
  const from = new Date();
  if (range === '7d')        from.setDate(to.getDate() - 6);
  else if (range === '30d')  from.setDate(to.getDate() - 29);
  else if (range === '90d')  from.setDate(to.getDate() - 89);
  else if (range === 'year') {
    // Show the full calendar year, Jan through Dec (future months render as
    // empty bars) — matches Upwork's year view rather than stopping at today.
    from.setTime(Date.UTC(to.getFullYear(), 0, 1));
    to.setTime(Date.UTC(to.getFullYear(), 11, 31));
  }
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

// Fill every day in range so buckets are computed from a complete series,
// not just the days that happen to have a row — the server only returns
// rows that exist.
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

// Plotting 180+ individual daily bars (mostly zero, with real activity
// crammed into whatever slice of the range actually has history) reads as
// an illegible mess. Roll longer ranges up into weekly/monthly buckets —
// same reasoning any dashboard uses: granularity should match the range.
function bucketDays(days, monthOnlyLabels) {
  const span = days.length;
  let granularity = 'day';
  if (span > 120) granularity = 'month';
  else if (span > 31) granularity = 'week';

  if (granularity === 'day') {
    return { granularity, buckets: days.map(d => ({ label: fmtDayLabel(d.day), ...d })) };
  }

  if (granularity === 'month') {
    const map = new Map();
    days.forEach(d => {
      const key = d.day.slice(0, 7);
      if (!map.has(key)) map.set(key, { label: fmtMonthLabel(key, monthOnlyLabels), day: key, cover_letters: 0, job_audits: 0, profile_audits: 0 });
      const b = map.get(key);
      b.cover_letters  += d.cover_letters;
      b.job_audits     += d.job_audits;
      b.profile_audits += d.profile_audits;
    });
    return { granularity, buckets: Array.from(map.values()) };
  }

  // week — sequential 7-day chunks starting from the range's first day
  const buckets = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    buckets.push({
      label: fmtDayLabel(chunk[0].day),
      day: chunk[0].day,
      cover_letters:  chunk.reduce((s, d) => s + d.cover_letters, 0),
      job_audits:     chunk.reduce((s, d) => s + d.job_audits, 0),
      profile_audits: chunk.reduce((s, d) => s + d.profile_audits, 0),
    });
  }
  return { granularity: 'week', buckets };
}

function niceStep(safeMax, divisions) {
  const rawStep = safeMax / divisions;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  if (residual > 5)      return 10 * magnitude;
  if (residual > 2)      return 5 * magnitude;
  if (residual > 1)      return 2 * magnitude;
  return magnitude;
}

// Rounds the axis max up to a "nice" number (like a real chart axis: 0/10/
// 20/30, not 0/17/34/51). Smaller ranges get 3 gridlines (0/X/2X/3X);
// once the axis gets tall the gridlines thin out to just 0/X/2X — same
// sparser look real dashboards use once the numbers get bigger.
function niceScale(maxValue) {
  const safeMax = Math.max(maxValue, 1);
  let step = niceStep(safeMax, 3);
  let axisMax = Math.ceil(safeMax / step) * step;
  if (axisMax >= 50) {
    step = niceStep(safeMax, 2);
    axisMax = Math.ceil(safeMax / step) * step;
  }
  const ticks = [];
  for (let t = 0; t <= axisMax + step * 0.001; t += step) ticks.push(Math.round(t));
  return { axisMax, ticks };
}

// Only every Nth x-axis label is shown once there are more bars than fit
// legibly — same bar count, just less crowded text underneath.
function labelStride(n) {
  const maxLabels = 8;
  return n <= maxLabels ? 1 : Math.ceil(n / maxLabels);
}

function buildPlotHtml(buckets, field, color) {
  const values = buckets.map(b => b[field] || 0);
  const max = Math.max(...values);
  const { axisMax, ticks } = niceScale(max);
  const stride = labelStride(buckets.length);

  const axisRows = ticks.map(t => {
    const pct = axisMax > 0 ? (1 - t / axisMax) * 100 : 100;
    return `<div class="an-axis-row" style="top:${pct}%"><span class="an-axis-label">${t}</span></div>`;
  }).join('');

  const barCols = buckets.map((b, i) => {
    const v = b[field] || 0;
    const pct = axisMax > 0 ? Math.max(v > 0 ? 2 : 0, (v / axisMax) * 100) : 0;
    return `<div class="an-bar-col" data-i="${i}"><div class="an-bar" style="height:${pct}%;background:${color};opacity:.82"></div></div>`;
  }).join('');

  const xLabels = buckets.map((b, i) =>
    `<div class="an-xaxis-label">${i % stride === 0 ? b.label : ''}</div>`
  ).join('');

  return `
    <div class="an-chart-plot">
      <div class="an-axis-area">${axisRows}</div>
      <div class="an-bars-row">${barCols}</div>
      <div class="an-xaxis-row">${xLabels}</div>
      <div class="an-chart-tooltip" id="an-chart-tooltip">
        <div class="day" id="an-tooltip-day"></div>
        <div class="val" id="an-tooltip-val"></div>
      </div>
    </div>
  `;
}

// Hovering a bar brightens it and shows a small tooltip anchored right
// above that bar's own top edge — not a generic cursor-follow tooltip.
function attachHover(plot, buckets, field, meta) {
  const tooltip = document.getElementById('an-chart-tooltip');
  const tDay    = document.getElementById('an-tooltip-day');
  const tVal    = document.getElementById('an-tooltip-val');

  plot.querySelectorAll('.an-bar-col').forEach((col) => {
    const bar = col.querySelector('.an-bar');
    col.addEventListener('mouseenter', () => {
      const b = buckets[Number(col.dataset.i)];
      if (!b || !bar) return;
      bar.style.opacity = '1';

      const plotRect = plot.getBoundingClientRect();
      const barRect  = bar.getBoundingClientRect();
      const left = barRect.left - plotRect.left + barRect.width / 2;
      const top  = barRect.top  - plotRect.top;

      if (tooltip) {
        tooltip.style.display = 'block';
        tooltip.style.left = left + 'px';
        tooltip.style.top  = top + 'px';
        if (tDay) tDay.textContent = b.label;
        if (tVal) tVal.textContent = `${b[field] || 0} ${meta.label.toLowerCase()}`;
      }
    });
    col.addEventListener('mouseleave', () => {
      if (bar) bar.style.opacity = '.82';
      if (tooltip) tooltip.style.display = 'none';
    });
  });
}

function renderChart() {
  const container = document.getElementById('an-chart');
  if (!container) return;
  const field = currentMetric;
  const meta  = METRICS[field];
  const buckets = historyCache?.buckets || [];
  const total = buckets.reduce((sum, b) => sum + (b[field] || 0), 0);
  const hasData = total > 0;

  container.innerHTML = `
    <div class="an-chart-topbar">
      <div class="an-tabs-row" id="an-tabs-row">
        ${Object.entries(METRICS).map(([key, m]) => `
          <button class="an-tab ${key === field ? 'active' : ''}" data-metric="${key}">${m.label}</button>
        `).join('')}
      </div>
      <div class="an-range-dd">
        <button class="an-range-btn" id="an-range-btn">
          <span id="an-range-btn-label">${rangeLabel(currentRange)}</span>
          <span class="car"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="an-range-menu" id="an-range-menu">
          ${RANGES.map(r => `
            <div class="an-range-item ${r === currentRange ? 'active' : ''}" data-range="${r}">
              <span class="an-range-check">${r === currentRange ? '✓' : ''}</span>${rangeLabel(r)}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="an-chart-total">${total} ${pluralize(total, meta)}</div>
    <div class="an-chart-svg-wrap" id="an-chart-svg-wrap">
      ${hasData ? '' : `<div class="an-chart-empty">No ${meta.label.toLowerCase()} recorded in this range yet.</div>`}
    </div>
  `;

  const rangeBtn  = document.getElementById('an-range-btn');
  const rangeMenu = document.getElementById('an-range-menu');
  rangeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    rangeMenu.classList.toggle('open');
    rangeBtn.classList.toggle('open');
  });
  rangeMenu?.querySelectorAll('.an-range-item').forEach(item => {
    item.addEventListener('click', () => {
      currentRange = item.dataset.range;
      loadAndRender();
    });
  });

  document.getElementById('an-tabs-row')?.querySelectorAll('.an-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentMetric = tab.dataset.metric;
      renderChart();
    });
  });

  const wrap = document.getElementById('an-chart-svg-wrap');
  if (hasData && wrap) {
    wrap.insertAdjacentHTML('afterbegin', buildPlotHtml(buckets, field, meta.color));
    const plot = wrap.querySelector('.an-chart-plot');
    if (plot) attachHover(plot, buckets, field, meta);
  }
}

async function loadAndRender() {
  const { from, to } = rangeToDates(currentRange);
  const rows = await fetchHistory(from, to);
  const days = fillDays(rows, from, to);
  const { granularity, buckets } = bucketDays(days, currentRange === 'year');
  historyCache = { buckets, granularity, from, to };
  renderChart();
}

export function initAnalytics() {
  // Click-outside closes the open range dropdown
  document.addEventListener('click', () => {
    document.querySelectorAll('.an-range-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.an-range-btn.open').forEach(b => b.classList.remove('open'));
  });

  loadAndRender();
}
