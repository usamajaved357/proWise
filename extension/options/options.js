// ── Snag AI Options v14 ───────────────────────────────────────────────────────

const PLAN_LIMITS  = { free: 1, starter: 1, pro: 3, agency: 5 };
const PLAN_LABELS  = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 900 };

let currentSlide = 0;

// ── Sidebar navigation ────────────────────────────────────────────────────────
function switchSection(name) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const item = document.querySelector(`.sb-item[data-section="${name}"]`);
  const sec  = document.getElementById('section-' + name);
  if (item) item.classList.add('active');
  if (sec)  sec.classList.add('active');
}

document.querySelectorAll('.sb-item[data-section]').forEach(item => {
  item.addEventListener('click', () => switchSection(item.dataset.section));
});

// ── URL param routing (e.g. options.html?tab=subscription) ────────────────────
const urlParams = new URLSearchParams(window.location.search);
const initTab = urlParams.get('tab');
if (initTab) switchSection(initTab);

// ── Storage change listener — re-render profile page when sync completes ──────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.registeredProfiles || changes.profile) {
    renderProfilesPage();
    renderProfileSlots();
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function openCheckout(plan) {
  chrome.tabs.create({ url: `https://snagai.netlify.app/checkout.html?plan=${plan}` });
}

// ── SAFE skill array helper — handles both array and string formats ────────────
function getSkillsArray(profile) {
  if (!profile) return [];
  // v3+: skillsArr is an array
  if (Array.isArray(profile.skillsArr) && profile.skillsArr.length) return profile.skillsArr;
  // v3+: skills is a comma-string
  if (typeof profile.skills === 'string' && profile.skills.trim()) {
    return profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  // v2 bug: skills was accidentally saved as array
  if (Array.isArray(profile.skills) && profile.skills.length) return profile.skills;
  return [];
}

// ── Status bar ────────────────────────────────────────────────────────────────
async function loadStatus() {
  let plan = 'free', used = 0, quota = 2;
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (status && !status.error) {
      plan  = status.plan  || 'free';
      used  = status.used  || 0;
      quota = status.limit || PLAN_QUOTAS[plan] || 2;
      await chrome.storage.sync.set({ userPlan: plan });
    }
  } catch(e) {
    const cached = await chrome.storage.sync.get(['userPlan', 'usageCount']);
    plan  = cached.userPlan   || 'free';
    used  = cached.usageCount || 0;
    quota = PLAN_QUOTAS[plan] || 2;
  }

  const rem = Math.max(0, quota - used);
  const pct = Math.min(100, (used / quota) * 100);

  document.getElementById('sb-plan-badge').textContent = PLAN_LABELS[plan] || 'Free';
  document.getElementById('sb-remaining').textContent  = rem + ' left';
  document.getElementById('sb-count').textContent      = used + ' / ' + quota + ' used';
  document.getElementById('sb-bar').style.width        = pct + '%';
  document.getElementById('ud-plan').textContent       = (PLAN_LABELS[plan] || 'Free') + ' plan';
  document.getElementById('ud-used').textContent       = used;
  document.getElementById('ud-limit').textContent      = quota + ' total';
  document.getElementById('ud-bar').style.width        = pct + '%';

  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('current'));
  const active = document.getElementById('plan-' + plan);
  if (active) active.classList.add('current');
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail);
}

function updateEmailUI(email) {
  const dot = document.getElementById('email-dot');
  const val = document.getElementById('email-val');
  const tog = document.getElementById('email-toggle');
  if (email) {
    dot.style.background = '#34d399';
    val.textContent      = email;
    tog.textContent      = 'Change';
  } else {
    dot.style.background = '#374151';
    val.textContent      = 'Not set';
    tog.textContent      = 'Add';
  }
}

document.getElementById('email-toggle').addEventListener('click', () => {
  const wrap = document.getElementById('email-edit');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('email-save').addEventListener('click', async () => {
  const email = document.getElementById('email-inp').value.trim();
  if (!email.includes('@')) return;
  await chrome.storage.sync.set({ userEmail: email });
  updateEmailUI(email);
  document.getElementById('email-edit').style.display = 'none';
  showSaved('saved-urls-msg');
});

// ── Profile URL slots (Subscription page) ─────────────────────────────────────
async function renderProfileSlots() {
  const { userPlan = 'free', registeredProfiles = [] } = await chrome.storage.sync.get(['userPlan', 'registeredProfiles']);
  const limit = PLAN_LIMITS[userPlan] || 1;
  const slots = document.getElementById('profile-slots');
  slots.innerHTML = '';

  for (let i = 0; i < limit; i++) {
    const existing = registeredProfiles[i];
    const hasUrl   = existing?.url;
    const synced   = !!(existing?.name || existing?.jss);
    const div = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="slot-input" type="url" placeholder="https://www.upwork.com/freelancers/~..." value="${existing?.url || ''}" data-slot="${i}">
      ${hasUrl ? `
        <div class="slot-status ${synced ? 'slot-synced' : 'slot-pending'}">
          ${synced ? '✓ Synced' : '⏳ Not synced'}
        </div>
        <button class="slot-sync-btn" data-slot="${i}">Open →</button>
      ` : ''}
    `;
    slots.appendChild(div);
  }

  slots.querySelectorAll('.slot-sync-btn').forEach(btn => {
    const i   = parseInt(btn.dataset.slot);
    const url = slots.querySelectorAll('.slot-input')[i]?.value;
    if (url) btn.addEventListener('click', () => chrome.tabs.create({ url }));
  });
}

document.getElementById('save-profile-urls').addEventListener('click', async () => {
  const { userPlan = 'free', registeredProfiles = [] } = await chrome.storage.sync.get(['userPlan', 'registeredProfiles']);
  const inputs  = document.querySelectorAll('.slot-input');
  const updated = [...registeredProfiles];

  inputs.forEach((inp, i) => {
    const url = inp.value.trim();
    if (!url) return;
    const existing = updated[i] || {};
    updated[i] = {
      ...existing,
      url,
      id:          existing.id || ('profile_' + (i + 1)),
      syncEnabled: existing.syncEnabled !== false,
    };
  });

  await chrome.storage.sync.set({ registeredProfiles: updated });
  showSaved('saved-urls-msg');
  await renderProfileSlots();
  await renderProfilesPage();
});

// ── Profiles page ──────────────────────────────────────────────────────────────
async function renderProfilesPage() {
  const { registeredProfiles = [], userPlan = 'free', activeProfileId } = await chrome.storage.sync.get(['registeredProfiles', 'userPlan', 'activeProfileId']);
  const limit     = PLAN_LIMITS[userPlan] || 1;
  const container = document.getElementById('profiles-container');
  const noMsg     = document.getElementById('no-profiles-msg');
  const addBtn    = document.getElementById('add-profile-btn');

  container.innerHTML = '';

  const registered = registeredProfiles.filter(p => p && p.url);

  if (!registered.length) {
    noMsg.style.display  = 'block';
    addBtn.style.display = 'none';
    return;
  }
  noMsg.style.display = 'none';

  if (registered.length === 1) {
    renderProfileCard(container, registered[0], 0, registered, false);
  } else {
    const slidesWrap = document.createElement('div');
    slidesWrap.className = 'profile-slider-wrap';
    const slidesEl = document.createElement('div');
    slidesEl.className = 'profile-slides';
    slidesWrap.appendChild(slidesEl);

    registered.forEach((p, i) => {
      const slide = document.createElement('div');
      slide.className = 'profile-slide' + (i === currentSlide ? ' active' : '');
      slide.id = 'slide-' + i;
      renderProfileCard(slide, p, i, registered, true);
      slidesEl.appendChild(slide);
    });

    const nav = document.createElement('div');
    nav.className = 'slider-nav';
    registered.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === currentSlide ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      nav.appendChild(dot);
    });
    const arrows = document.createElement('div');
    arrows.className = 'slider-arrows';
    arrows.innerHTML = '<button class="slider-arr" id="slide-prev">‹</button><button class="slider-arr" id="slide-next">›</button>';
    nav.appendChild(arrows);
    slidesWrap.appendChild(nav);
    container.appendChild(slidesWrap);

    document.getElementById('slide-prev')?.addEventListener('click', () => goToSlide(Math.max(0, currentSlide - 1)));
    document.getElementById('slide-next')?.addEventListener('click', () => goToSlide(Math.min(registered.length - 1, currentSlide + 1)));
  }

  addBtn.style.display = registered.length < limit ? 'block' : 'none';
}

function goToSlide(idx) {
  currentSlide = idx;
  document.querySelectorAll('.profile-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.slider-dot').forEach((d, i)  => d.classList.toggle('active', i === idx));
}

function renderProfileCard(container, profile, idx, allProfiles, showActive) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const isSynced      = !!(profile.name || profile.jss);
  const avatarLetter  = (profile.name || '?').charAt(0).toUpperCase();
  const syncChecked   = profile.syncEnabled !== false ? 'checked' : '';
  const readAt        = profile._readAt
    ? new Date(profile._readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // CRITICAL FIX: use safe skill getter — handles array and string
  const skillsArr  = getSkillsArray(profile);
  const skillsHtml = skillsArr.length
    ? skillsArr.slice(0, 14).map(s => `<span class="skill-chip">${s}</span>`).join('') +
      (skillsArr.length > 14 ? `<span class="skill-chip skill-chip-more">+${skillsArr.length - 14} more</span>` : '')
    : '<span class="sync-hint">Visit your profile page to sync skills automatically</span>';

  const portfolios    = profile.portfolios || [];
  const portfolioHtml = portfolios.length
    ? portfolios.map((p, pi) => buildPortfolioItem(p, pi)).join('')
    : '<div class="port-empty">No portfolio items yet. Add them manually or they appear automatically after syncing.</div>';

  if (!isSynced) {
    // Profile URL saved but not yet synced — show "waiting" state
    card.innerHTML = `
      <div class="profile-card-header">
        <div class="profile-card-avatar profile-card-avatar-pending">?</div>
        <div class="profile-card-info">
          <div class="profile-card-name" style="color:var(--white2)">Not synced yet</div>
          <div class="profile-card-sub">${profile.url}</div>
        </div>
        <div class="profile-card-actions">
          <button class="profile-delete-btn" title="Remove profile">×</button>
        </div>
      </div>
      <div class="profile-pending-body">
        <div class="pending-icon">🔄</div>
        <div class="pending-title">One more step to sync your profile</div>
        <div class="pending-desc">
          Click the button below to open your Upwork profile page.<br>
          Snag AI will read your data automatically when the page loads.
        </div>
        <button class="pending-open-btn" id="open-profile-${idx}">Open my Upwork profile →</button>
      </div>
    `;
    card.querySelector(`#open-profile-${idx}`)?.addEventListener('click', () => {
      chrome.tabs.create({ url: profile.url });
    });
    card.querySelector('.profile-delete-btn')?.addEventListener('click', () => {
      if (!confirm('Remove this profile?')) return;
      allProfiles.splice(idx, 1);
      saveProfiles(allProfiles);
      renderProfilesPage();
    });
    container.appendChild(card);
    return;
  }

  // ── Synced profile card ───────────────────────────────────────────────────────
  card.innerHTML = `
    <div class="profile-card-header">
      <div class="profile-card-avatar">${avatarLetter}</div>
      <div class="profile-card-info">
        <div class="profile-card-name">${profile.name || 'Unknown'}</div>
        <div class="profile-card-sub">
          ${[profile.tier, profile.jss ? profile.jss + ' JSS' : ''].filter(Boolean).join(' · ')}
          ${readAt ? ' · Synced ' + readAt : ''}
        </div>
      </div>
      <div class="profile-card-actions">
        <button class="profile-resync-btn" id="resync-${idx}" title="Re-sync by opening profile page">↻ Sync</button>
        <label class="sync-toggle">
          <span>Auto-sync</span>
          <label class="toggle-switch">
            <input type="checkbox" class="sync-check" ${syncChecked}>
            <span class="toggle-slider"></span>
          </label>
        </label>
        <button class="profile-delete-btn" title="Remove profile">×</button>
      </div>
    </div>

    <div class="profile-card-body">
      <!-- Stats row -->
      <div class="profile-stat-row">
        <div class="pstat"><div class="pstat-val">${profile.jss || '—'}</div><div class="pstat-lbl">JSS</div></div>
        <div class="pstat"><div class="pstat-val">${profile.rate || '—'}</div><div class="pstat-lbl">Rate</div></div>
        <div class="pstat"><div class="pstat-val">${profile.jobs || '—'}</div><div class="pstat-lbl">Jobs</div></div>
        <div class="pstat"><div class="pstat-val">${profile.earnings || '—'}</div><div class="pstat-lbl">Earned</div></div>
      </div>

      <!-- Tier badge -->
      ${profile.tier ? `<div class="tier-badge">${profile.tier}</div>` : ''}

      <!-- Editable fields -->
      <div class="edit-field">
        <span class="edit-field-label">Title</span>
        <textarea class="edit-field-val" data-field="title" rows="2">${profile.title || ''}</textarea>
      </div>
      <div class="edit-field">
        <span class="edit-field-label">Bio</span>
        <textarea class="edit-field-val" rows="3" data-field="bio">${profile.bio || ''}</textarea>
      </div>
      <div class="edit-field">
        <span class="edit-field-label">Country</span>
        <input class="edit-field-val" type="text" data-field="country" value="${profile.country || ''}">
      </div>
      <div class="edit-field">
        <span class="edit-field-label">Always add</span>
        <textarea class="edit-field-val" rows="2" data-field="extra">${profile.extra || ''}</textarea>
      </div>

      <!-- Skills -->
      <div class="section-block">
        <div class="section-block-header">
          <span class="section-block-title">Skills</span>
          <span class="section-block-count">${skillsArr.length} detected</span>
        </div>
        <div class="skills-chips">${skillsHtml}</div>
        <div class="section-block-hint">Skills are read automatically from your Upwork profile page.</div>
      </div>

      <!-- Portfolio -->
      <div class="section-block">
        <div class="section-block-header">
          <span class="section-block-title">Portfolio</span>
          <button class="port-add-manual" data-action="add-portfolio">+ Add manually</button>
        </div>
        <div class="portfolio-list">${portfolioHtml}</div>
        <div class="section-block-hint">Portfolio URLs must be added manually (App Store, GitHub, website, etc).</div>
      </div>
    </div>
  `;

  // Re-sync button — opens profile URL to trigger profile-reader.js
  card.querySelector(`#resync-${idx}`)?.addEventListener('click', () => {
    if (profile.url) chrome.tabs.create({ url: profile.url });
  });

  // Sync toggle
  card.querySelector('.sync-check')?.addEventListener('change', function() {
    allProfiles[idx].syncEnabled = this.checked;
    saveProfiles(allProfiles);
  });

  // Delete profile
  card.querySelector('.profile-delete-btn')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    allProfiles.splice(idx, 1);
    saveProfiles(allProfiles);
    renderProfilesPage();
  });

  // Add portfolio manually
  card.querySelector('[data-action="add-portfolio"]')?.addEventListener('click', () => {
    const list   = card.querySelector('.portfolio-list');
    const newItem = { title: '', urls: [], desc: '', skills: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi  = allProfiles[idx].portfolios.length - 1;

    // Remove empty state message if present
    const emptyMsg = list.querySelector('.port-empty');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.innerHTML = buildPortfolioItem(newItem, pi);
    list.appendChild(div.firstElementChild);
    const newEl = list.lastElementChild;
    attachPortfolioListeners(newEl, allProfiles, idx, pi);
    newEl.querySelector('.port-item-body')?.classList.add('open');
    newEl.querySelector('.port-edit-toggle').textContent = 'Done';
    newEl.querySelector('.port-title-inp')?.focus();
  });

  // Attach portfolio listeners to existing items
  card.querySelectorAll('.port-item').forEach((el, pi) => {
    attachPortfolioListeners(el, allProfiles, idx, pi);
  });

  container.appendChild(card);
}

function buildPortfolioItem(p, pi) {
  const hasUrls  = p.urls && p.urls.length > 0 && p.urls.some(u => u.trim());
  const badge    = hasUrls
    ? '<span class="port-complete">✓ Links added</span>'
    : '<span class="port-incomplete">⚠ No links yet</span>';
  const urlsHtml = (p.urls && p.urls.length ? p.urls : ['']).map(u => `
    <div class="port-url-row">
      <input type="url" class="port-url-inp" value="${u}" placeholder="https://apps.apple.com/...">
      <button class="port-url-del">×</button>
    </div>`).join('');

  return `
    <div class="port-item" data-pi="${pi}">
      <div class="port-item-head">
        <div class="port-item-title">${p.title || 'New project'}</div>
        ${badge}
      </div>
      <div class="port-btns">
        <button class="port-edit-toggle">Edit</button>
        <button class="port-del">Remove</button>
      </div>
      <div class="port-item-body">
        <div class="field" style="margin-top:10px;margin-bottom:8px">
          <label>Project name</label>
          <input type="text" class="port-title-inp" value="${p.title || ''}" placeholder="e.g. TollBugata iOS App">
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Links <span style="font-size:10px;font-weight:400;color:var(--white3)">(App Store, Play Store, GitHub, website…)</span></label>
          <div class="port-urls-list">${urlsHtml}</div>
          <button class="port-add-url" style="margin-top:6px">+ Add another link</button>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>Short description</label>
          <input type="text" class="port-desc-inp" value="${p.desc || ''}" placeholder="e.g. Live app, 10k+ downloads">
        </div>
      </div>
    </div>`;
}

function attachPortfolioListeners(el, allProfiles, profileIdx, pi) {
  const body    = el.querySelector('.port-item-body');
  const editBtn = el.querySelector('.port-edit-toggle');
  const delBtn  = el.querySelector('.port-del');
  const addUrl  = el.querySelector('.port-add-url');

  editBtn?.addEventListener('click', () => {
    body?.classList.toggle('open');
    if (editBtn) editBtn.textContent = body?.classList.contains('open') ? 'Done' : 'Edit';
  });

  delBtn?.addEventListener('click', () => {
    if (allProfiles[profileIdx]?.portfolios) allProfiles[profileIdx].portfolios.splice(pi, 1);
    el.remove();
  });

  addUrl?.addEventListener('click', () => {
    const list = el.querySelector('.port-urls-list');
    const row  = document.createElement('div');
    row.className = 'port-url-row';
    row.innerHTML = '<input type="url" class="port-url-inp" placeholder="https://..."><button class="port-url-del">×</button>';
    row.querySelector('.port-url-del').addEventListener('click', () => {
      if (list.querySelectorAll('.port-url-row').length > 1) row.remove();
    });
    list.appendChild(row);
    row.querySelector('input')?.focus();
  });

  el.querySelectorAll('.port-url-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = el.querySelector('.port-urls-list');
      if (list && list.querySelectorAll('.port-url-row').length > 1) btn.closest('.port-url-row')?.remove();
    });
  });
}

function saveProfiles(profiles) {
  chrome.storage.sync.set({ registeredProfiles: profiles });
}

document.getElementById('save-profiles').addEventListener('click', async () => {
  const { registeredProfiles = [] } = await chrome.storage.sync.get(['registeredProfiles']);
  const cards = document.querySelectorAll('.profile-card');

  cards.forEach(card => {
    const idx = parseInt(card.dataset.profileIdx);
    if (!registeredProfiles[idx]) return;

    registeredProfiles[idx].title   = card.querySelector('[data-field="title"]')?.value?.trim()   || registeredProfiles[idx].title;
    registeredProfiles[idx].bio     = card.querySelector('[data-field="bio"]')?.value?.trim()     || registeredProfiles[idx].bio;
    registeredProfiles[idx].country = card.querySelector('[data-field="country"]')?.value?.trim() || registeredProfiles[idx].country;
    registeredProfiles[idx].extra   = card.querySelector('[data-field="extra"]')?.value?.trim()   || registeredProfiles[idx].extra;

    const portItems = card.querySelectorAll('.port-item');
    registeredProfiles[idx].portfolios = [...portItems].map(el => ({
      title: el.querySelector('.port-title-inp')?.value?.trim()  || '',
      urls:  [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean),
      desc:  el.querySelector('.port-desc-inp')?.value?.trim()   || '',
    })).filter(p => p.title || p.urls.length);

    // Sync legacy profile key for backward compat (background.js)
    if (idx === 0) {
      const p = registeredProfiles[0];
      chrome.storage.sync.get(['profile'], (stored) => {
        const merged = {
          ...(stored.profile || {}), ...p,
          tier:      p.tierKey || stored.profile?.tier,
          skills:    typeof p.skills === 'string' ? p.skills : (Array.isArray(p.skills) ? p.skills.join(', ') : stored.profile?.skills || ''),
          skillsArr: Array.isArray(p.skillsArr) ? p.skillsArr : getSkillsArray(p),
          portfolio: p.portfolios || stored.profile?.portfolio || [],
          extra:     p.extra || stored.profile?.extra || '',
        };
        chrome.storage.sync.set({ profile: merged });
      });
    }
  });

  await chrome.storage.sync.set({ registeredProfiles });
  showSaved('saved-profiles-msg');
});

document.getElementById('add-profile-btn')?.addEventListener('click', () => switchSection('subscription'));
document.getElementById('goto-sub-btn')?.addEventListener('click', () => switchSection('subscription'));

// ── Settings ──────────────────────────────────────────────────────────────────
document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:          document.getElementById('tone').value,
    length:        document.getElementById('length').value,
    alwaysInclude: document.getElementById('always-include').value.trim(),
  }});
  showSaved('saved-settings-msg');
});

// ── Plan buttons ──────────────────────────────────────────────────────────────
document.querySelectorAll('.plan-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', e => { e.stopPropagation(); openCheckout(btn.dataset.plan); });
});

const sbUpgradeBtn = document.getElementById('sb-upgrade-btn');
if (sbUpgradeBtn) sbUpgradeBtn.addEventListener('click', () => switchSection('subscription'));

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadStatus();   // sets userPlan in storage first
  await loadEmail();
  await renderProfileSlots();
  await renderProfilesPage();

  const { settings = {} } = await chrome.storage.sync.get(['settings']);
  document.getElementById('tone').value           = settings.tone          || 'professional';
  document.getElementById('length').value         = settings.length        || 'medium';
  document.getElementById('always-include').value = settings.alwaysInclude || '';
}

init();
