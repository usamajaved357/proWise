const SERVER = 'https://prowise-4e5t.onrender.com';

// Checkout URLs — replace with your Paddle hosted checkout links
const PRICE_IDS = {
  starter: 'pri_01kqatq4f1st85p5q2xgx792qj',
  pro:     'pri_01kqats15v2v1kcx355gw24s5j',
  agency:  'pri_01kqatwfp1fr3ch8xq32qpmdnt',
};

function openCheckout(plan) {
  // Open landing page with plan pre-selected — Paddle overlay fires there
  chrome.tabs.create({ url: 'https://snagai.netlify.app/checkout.html?plan=' + plan });
}

// Navigation
document.querySelectorAll('.sb-item[data-section]').forEach(item => {
  item.addEventListener('click', () => showSection(item.dataset.section));
});

function showSection(id) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const navItem = document.querySelector(`.sb-item[data-section="${id}"]`);
  if (navItem) navItem.classList.add('active');
  const section = document.getElementById('section-' + id);
  if (section) section.classList.add('active');
}

// Load status
async function loadStatus() {
  try {
    const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);
    const res = await fetch(SERVER + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail || null, anonId: anonId || null })
    });
    const data = await res.json();
    updateStatusUI(data);
  } catch(e) { console.log('Status error:', e); }
}

function updateStatusUI(data) {
  const { plan = 'free', used = 0, limit = 2, remaining = 2 } = data;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const labels = { free:'Free', starter:'Starter', pro:'Pro', agency:'Agency' };

  // Sidebar
  const sbBadge = document.getElementById('sb-plan-badge');
  if (sbBadge) {
    sbBadge.textContent = labels[plan] || plan;
    const colors = {
      free: 'background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.25)',
      starter: 'background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.25)',
      pro: 'background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.25)',
      agency: 'background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.25)',
    };
    sbBadge.style.cssText = colors[plan] || colors.free;
  }
  const sbBar = document.getElementById('sb-bar');
  if (sbBar) sbBar.style.width = pct + '%';
  const sbCount = document.getElementById('sb-count');
  if (sbCount) sbCount.textContent = `${used} / ${limit} used`;
  const sbRemaining = document.getElementById('sb-remaining');
  if (sbRemaining) sbRemaining.textContent = `${remaining} left`;

  // Hide upgrade button if paid plan with good usage
  const sbUpgrade = document.getElementById('sb-upgrade');
  if (sbUpgrade) sbUpgrade.style.display = (plan === 'free' || pct >= 80) ? 'block' : 'none';

  // Usage detail in subscription tab
  const udPlan = document.getElementById('ud-plan');
  if (udPlan) udPlan.textContent = labels[plan] + ' plan';
  const udBar = document.getElementById('ud-bar');
  if (udBar) {
    udBar.style.width = pct + '%';
    udBar.style.background = pct >= 90 ? 'linear-gradient(90deg,#ef4444,#f87171)'
      : pct >= 70 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
      : 'linear-gradient(90deg,#c9a84c,#e8c878)';
  }
  const udUsed = document.getElementById('ud-used');
  if (udUsed) udUsed.textContent = used;
  const udLimit = document.getElementById('ud-limit');
  if (udLimit) udLimit.textContent = limit + ' total';

  // Mark current plan — only disable current plan button, leave others clickable
  ['starter','pro','agency'].forEach(p => {
    const card = document.getElementById('plan-' + p);
    if (!card) return;
    card.classList.toggle('current', p === plan);
    const btn = card.querySelector('button');
    if (!btn) return;
    if (p === plan) {
      btn.className = 'plan-current-badge';
      btn.textContent = '✓ Current plan';
      btn.removeAttribute('data-plan');
    } else {
      // Re-attach click listener for upgrade buttons
      btn.replaceWith(btn.cloneNode(true));
      const newBtn = card.querySelector('button');
      newBtn.setAttribute('data-plan', p);
      newBtn.addEventListener('click', () => openCheckout(p));
    }
  });
}

// Email management
async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail || '');
}

function updateEmailUI(email) {
  const dot    = document.getElementById('email-dot-opt');
  const val    = document.getElementById('email-val-opt');
  const toggle = document.getElementById('email-toggle-opt');
  if (email) {
    dot.className = 'email-dot on';
    val.textContent = email;
    toggle.textContent = 'Change';
    document.getElementById('email-inp-opt').value = email;
  } else {
    dot.className = 'email-dot';
    val.textContent = 'Not set';
    toggle.textContent = 'Add email';
  }
}

document.getElementById('email-toggle-opt').addEventListener('click', () => {
  const wrap = document.getElementById('email-edit-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'flex' : 'none';
  if (wrap.style.display === 'flex') document.getElementById('email-inp-opt').focus();
});

document.getElementById('email-save-opt').addEventListener('click', async () => {
  const email = document.getElementById('email-inp-opt').value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    document.getElementById('email-inp-opt').style.borderColor = '#f87171';
    setTimeout(() => document.getElementById('email-inp-opt').style.borderColor = '', 2000);
    return;
  }
  await chrome.storage.sync.set({ userEmail: email });
  document.getElementById('email-edit-wrap').style.display = 'none';
  updateEmailUI(email);
  loadStatus();
});

// Load profile
async function loadProfile() {
  const { profile = {}, settings = {} } = await chrome.storage.sync.get(['profile', 'settings']);

  // Show/hide auto-read status
  if (profile._autoRead && (profile.name || profile.jss)) {
    const notRead = document.getElementById('profile-not-read');
    const readInfo = document.getElementById('profile-read-info');
    if (notRead) notRead.style.display = 'none';
    if (readInfo) readInfo.style.display = 'block';
    const readAt = profile._readAt ? new Date(profile._readAt).toLocaleDateString() : '';
    const timeEl = document.getElementById('profile-read-time');
    if (timeEl) timeEl.textContent = readAt ? '(synced ' + readAt + ')' : '';
    const detailsEl = document.getElementById('profile-read-details');
    if (detailsEl) {
      const skillPreview = (profile.skillsArr || profile.skills || '').toString().slice(0, 100);
      detailsEl.innerHTML = [
        '<strong>' + (profile.name || '') + '</strong>',
        profile.title ? '· ' + profile.title : '',
        profile.tier ? '· ' + profile.tier : '',
        profile.jss  ? '· ' + profile.jss + ' JSS' : '',
        profile.rate ? '· ' + profile.rate : '',
        skillPreview ? '<br><span style="color:rgba(240,238,234,.4)">Skills: </span>' + skillPreview + (profile.skills?.length > 100 ? '…' : '') : '',
        profile.employment?.length ? '<br><span style="color:rgba(240,238,234,.4)">Employment: </span>' + profile.employment.length + ' entries' : '',
        profile.certifications?.length ? '<br><span style="color:rgba(240,238,234,.4)">Certifications: </span>' + profile.certifications.length : '',
      ].filter(Boolean).join(' ');
    }
  } else {
    const notRead = document.getElementById('profile-not-read');
    const readInfo = document.getElementById('profile-read-info');
    if (notRead) notRead.style.display = 'block';
    if (readInfo) readInfo.style.display = 'none';
  }

  // Settings
  document.getElementById('extra').value = profile.extra || '';
  document.getElementById('tone').value  = settings.tone   || 'professional';
  document.getElementById('length').value = settings.length || 'medium';
  document.getElementById('always-include').value = settings.alwaysInclude || '';

  // Portfolio (manual entries)
  const portfolioItems = profile.portfolio || [];
  if (portfolioItems.length) portfolioItems.forEach(p => addPortLink(typeof p === 'string' ? {url:p} : p));
}


function addPortLink(item = {}) {
  const list = document.getElementById('port-list');
  const row = document.createElement('div');
  row.className = 'port-row';

  const nameVal  = item.name   || '';
  const urlVal   = item.url    || '';
  const descVal  = item.desc   || '';
  const skillVal = item.skills || '';

  const urlsHtml = (item.urls || [urlVal]).filter(Boolean)
    .map(u => `<div class="port-url-row"><input data-field="urls" type="url" value="${u}" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button></div>`)
    .join('') || '<div class="port-url-row"><input data-field="urls" type="url" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button></div>';

  row.innerHTML = `
    <div class="port-row-head">
      <div class="port-row-info">
        <div class="port-row-name">${nameVal || 'New project'}</div>
        <div class="port-row-url">${urlVal || 'No URL yet'}</div>
      </div>
      <div class="port-row-actions">
        <button class="port-edit-btn">Edit</button>
        <button class="port-del-btn">×</button>
      </div>
    </div>
    <div class="port-row-fields">
      <div class="field"><label>Project name</label><input data-field="name" type="text" value="${nameVal}" placeholder="e.g. TollBugata iOS App"></div>
      <div class="field">
        <label>URLs <span style="font-size:10px;font-weight:400;color:var(--white3)">(App Store, Play Store, website etc)</span></label>
        <div class="port-urls-list">${urlsHtml}</div>
        <button class="port-add-url" style="width:100%;padding:7px;margin-top:6px;border:1px dashed rgba(255,255,255,.12);border-radius:7px;background:transparent;color:var(--white3);font-size:11px;cursor:pointer;font-family:inherit">+ Add another URL</button>
      </div>
      <div class="field"><label>One-line description</label><input data-field="desc" type="text" value="${descVal}" placeholder="e.g. Live toll payment app, 10k+ downloads"></div>
      <div class="field"><label>Skills used</label><input data-field="skills" type="text" value="${skillVal}" placeholder="e.g. Flutter, Firebase, Stripe"></div>
      <button class="port-save-btn">Done</button>
    </div>
  `;

  const head   = row.querySelector('.port-row-head');
  const fields = row.querySelector('.port-row-fields');
  const editBtn = row.querySelector('.port-edit-btn');
  const delBtn  = row.querySelector('.port-del-btn');
  const saveBtn = row.querySelector('.port-save-btn');
  const nameEl  = row.querySelector('.port-row-name');
  const urlEl   = row.querySelector('.port-row-url');

  // Auto-open if new (no name)
  if (!nameVal) fields.classList.add('open');

  editBtn.addEventListener('click', () => {
    fields.classList.toggle('open');
    editBtn.textContent = fields.classList.contains('open') ? 'Close' : 'Edit';
  });

  // Add URL button
  fields.querySelector('.port-add-url').addEventListener('click', () => {
    const urlsList = fields.querySelector('.port-urls-list');
    const newRow = document.createElement('div');
    newRow.className = 'port-url-row';
    newRow.innerHTML = '<input data-field="urls" type="url" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button>';
    newRow.querySelector('.port-url-del').addEventListener('click', () => newRow.remove());
    urlsList.appendChild(newRow);
    newRow.querySelector('input').focus();
  });

  // Existing URL delete buttons
  fields.querySelectorAll('.port-url-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const urlRows = fields.querySelectorAll('.port-url-row');
      if (urlRows.length > 1) btn.closest('.port-url-row').remove();
    });
  });

  saveBtn.addEventListener('click', () => {
    const n = row.querySelector('[data-field="name"]').value.trim();
    const urls = Array.from(row.querySelectorAll('[data-field="urls"]')).map(i => i.value.trim()).filter(Boolean);
    nameEl.textContent = n || 'Unnamed project';
    urlEl.textContent  = urls.length ? urls[0] + (urls.length > 1 ? ' +' + (urls.length-1) + ' more' : '') : 'No URL';
    fields.classList.remove('open');
    editBtn.textContent = 'Edit';
  });

  delBtn.addEventListener('click', () => row.remove());

  list.appendChild(row);
}
document.getElementById('add-port').addEventListener('click', () => addPortLink({}));

function showSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

document.getElementById('save-profile').addEventListener('click', async () => {
  const portfolio = Array.from(document.querySelectorAll('#port-list .port-row')).map(wrap => {
    const urls = Array.from(wrap.querySelectorAll('[data-field="urls"]')).map(i => i.value.trim()).filter(Boolean);
    return {
      name:   wrap.querySelector('[data-field="name"]')?.value.trim()   || '',
      url:    urls[0] || '',
      urls:   urls,
      desc:   wrap.querySelector('[data-field="desc"]')?.value.trim()   || '',
      skills: wrap.querySelector('[data-field="skills"]')?.value.trim() || '',
    };
  }).filter(p => p.name || p.url);
  const portfolioLinks = portfolio.map(p => p.url).filter(Boolean);
  await chrome.storage.sync.set({ profile: {
    name:           document.getElementById('name').value.trim(),
    title:          document.getElementById('title').value.trim(),
    skills:         document.getElementById('skills').value.trim(),
    hourlyRate:     document.getElementById('hourly-rate').value.trim(),
    pitch:          document.getElementById('pitch').value.trim(),
    extra:          document.getElementById('extra').value.trim(),
    jss:            document.getElementById('jss').value.trim(),
    tier:           document.getElementById('tier').value,
    jobsCompleted:  document.getElementById('jobs-completed').value.trim(),
    upworkRating:   document.getElementById('upwork-rating').value.trim(),
    portfolio,
    portfolioLinks,
  }});
  showSaved('saved-profile-msg');
});

document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:           document.getElementById('tone').value,
    length:         document.getElementById('length').value,
    alwaysInclude:  document.getElementById('always-include').value.trim(),
  }});
  showSaved('saved-settings-msg');
});

// Plan button event listeners
document.querySelectorAll('.plan-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const plan = btn.dataset.plan;
    if (plan) openCheckout(plan);
  });
});

// Sidebar upgrade button
const sbUpgradeBtn = document.getElementById('sb-upgrade-btn');
if (sbUpgradeBtn) sbUpgradeBtn.addEventListener('click', () => showSection('subscription'));

// Init
(async () => {
  await loadProfile();
  await loadEmail();
  await loadStatus();
})();

document.getElementById('save-profile').addEventListener('click', () => {
    const portfolio = Array.from(document.querySelectorAll('#port-list .port-row')).map(wrap => {
      const urls = Array.from(wrap.querySelectorAll('[data-field="urls"]')).map(i => i.value.trim()).filter(Boolean);
      return {
        name:   wrap.querySelector('[data-field="name"]')?.value.trim()   || '',
        url:    urls[0] || '',
        urls:   urls,
        desc:   wrap.querySelector('[data-field="desc"]')?.value.trim()   || '',
        skills: wrap.querySelector('[data-field="skills"]')?.value.trim() || '',
      };
    }).filter(p => p.name || p.url);

    const extra = document.getElementById('extra')?.value?.trim() || '';

    // Merge into existing profile (don't overwrite auto-read data)
    chrome.storage.sync.get(['profile'], (stored) => {
      const existing = stored.profile || {};
      chrome.storage.sync.set({ profile: { ...existing, portfolio, extra } }, () => {
        const msg = document.getElementById('saved-profile-msg');
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 2000);
      });
    });
  });



function addPortLink(item = {}) {
  const list = document.getElementById('port-list');
  const row = document.createElement('div');
  row.className = 'port-row';

  const nameVal  = item.name   || '';
  const urlVal   = item.url    || '';
  const descVal  = item.desc   || '';
  const skillVal = item.skills || '';

  const urlsHtml = (item.urls || [urlVal]).filter(Boolean)
    .map(u => `<div class="port-url-row"><input data-field="urls" type="url" value="${u}" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button></div>`)
    .join('') || '<div class="port-url-row"><input data-field="urls" type="url" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button></div>';

  row.innerHTML = `
    <div class="port-row-head">
      <div class="port-row-info">
        <div class="port-row-name">${nameVal || 'New project'}</div>
        <div class="port-row-url">${urlVal || 'No URL yet'}</div>
      </div>
      <div class="port-row-actions">
        <button class="port-edit-btn">Edit</button>
        <button class="port-del-btn">×</button>
      </div>
    </div>
    <div class="port-row-fields">
      <div class="field"><label>Project name</label><input data-field="name" type="text" value="${nameVal}" placeholder="e.g. TollBugata iOS App"></div>
      <div class="field">
        <label>URLs <span style="font-size:10px;font-weight:400;color:var(--white3)">(App Store, Play Store, website etc)</span></label>
        <div class="port-urls-list">${urlsHtml}</div>
        <button class="port-add-url" style="width:100%;padding:7px;margin-top:6px;border:1px dashed rgba(255,255,255,.12);border-radius:7px;background:transparent;color:var(--white3);font-size:11px;cursor:pointer;font-family:inherit">+ Add another URL</button>
      </div>
      <div class="field"><label>One-line description</label><input data-field="desc" type="text" value="${descVal}" placeholder="e.g. Live toll payment app, 10k+ downloads"></div>
      <div class="field"><label>Skills used</label><input data-field="skills" type="text" value="${skillVal}" placeholder="e.g. Flutter, Firebase, Stripe"></div>
      <button class="port-save-btn">Done</button>
    </div>
  `;

  const head   = row.querySelector('.port-row-head');
  const fields = row.querySelector('.port-row-fields');
  const editBtn = row.querySelector('.port-edit-btn');
  const delBtn  = row.querySelector('.port-del-btn');
  const saveBtn = row.querySelector('.port-save-btn');
  const nameEl  = row.querySelector('.port-row-name');
  const urlEl   = row.querySelector('.port-row-url');

  // Auto-open if new (no name)
  if (!nameVal) fields.classList.add('open');

  editBtn.addEventListener('click', () => {
    fields.classList.toggle('open');
    editBtn.textContent = fields.classList.contains('open') ? 'Close' : 'Edit';
  });

  // Add URL button
  fields.querySelector('.port-add-url').addEventListener('click', () => {
    const urlsList = fields.querySelector('.port-urls-list');
    const newRow = document.createElement('div');
    newRow.className = 'port-url-row';
    newRow.innerHTML = '<input data-field="urls" type="url" placeholder="https://..."><button class="port-url-del" title="Remove URL">×</button>';
    newRow.querySelector('.port-url-del').addEventListener('click', () => newRow.remove());
    urlsList.appendChild(newRow);
    newRow.querySelector('input').focus();
  });

  // Existing URL delete buttons
  fields.querySelectorAll('.port-url-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const urlRows = fields.querySelectorAll('.port-url-row');
      if (urlRows.length > 1) btn.closest('.port-url-row').remove();
    });
  });

  saveBtn.addEventListener('click', () => {
    const n = row.querySelector('[data-field="name"]').value.trim();
    const urls = Array.from(row.querySelectorAll('[data-field="urls"]')).map(i => i.value.trim()).filter(Boolean);
    nameEl.textContent = n || 'Unnamed project';
    urlEl.textContent  = urls.length ? urls[0] + (urls.length > 1 ? ' +' + (urls.length-1) + ' more' : '') : 'No URL';
    fields.classList.remove('open');
    editBtn.textContent = 'Edit';
  });

  delBtn.addEventListener('click', () => row.remove());

  list.appendChild(row);
}
document.getElementById('add-port').addEventListener('click', () => addPortLink({}));

function showSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

document.getElementById('save-profile').addEventListener('click', async () => {
  const portfolio = Array.from(document.querySelectorAll('#port-list .port-row')).map(wrap => {
    const urls = Array.from(wrap.querySelectorAll('[data-field="urls"]')).map(i => i.value.trim()).filter(Boolean);
    return {
      name:   wrap.querySelector('[data-field="name"]')?.value.trim()   || '',
      url:    urls[0] || '',
      urls:   urls,
      desc:   wrap.querySelector('[data-field="desc"]')?.value.trim()   || '',
      skills: wrap.querySelector('[data-field="skills"]')?.value.trim() || '',
    };
  }).filter(p => p.name || p.url);
  const portfolioLinks = portfolio.map(p => p.url).filter(Boolean);
  await chrome.storage.sync.set({ profile: {
    name:           document.getElementById('name').value.trim(),
    title:          document.getElementById('title').value.trim(),
    skills:         document.getElementById('skills').value.trim(),
    hourlyRate:     document.getElementById('hourly-rate').value.trim(),
    pitch:          document.getElementById('pitch').value.trim(),
    extra:          document.getElementById('extra').value.trim(),
    jss:            document.getElementById('jss').value.trim(),
    tier:           document.getElementById('tier').value,
    jobsCompleted:  document.getElementById('jobs-completed').value.trim(),
    upworkRating:   document.getElementById('upwork-rating').value.trim(),
    portfolio,
    portfolioLinks,
  }});
  showSaved('saved-profile-msg');
});

document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:           document.getElementById('tone').value,
    length:         document.getElementById('length').value,
    alwaysInclude:  document.getElementById('always-include').value.trim(),
  }});
  showSaved('saved-settings-msg');
});

// Plan button event listeners
document.querySelectorAll('.plan-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const plan = btn.dataset.plan;
    if (plan) openCheckout(plan);
  });
});

// Sidebar upgrade button

// Init
(async () => {
  await loadProfile();
  await loadEmail();
  await loadStatus();
})();
