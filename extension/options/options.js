// ── Snag AI Options v13 ───────────────────────────────────────────────────────

const PLAN_LIMITS  = { free: 1, starter: 1, pro: 3, agency: 5 };
const PLAN_LABELS  = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 900 };

let currentSlide = 0;

// ── Sidebar navigation ────────────────────────────────────────────────────────
document.querySelectorAll('.sb-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('section-' + item.dataset.section)?.classList.add('active');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

function openCheckout(plan) {
  chrome.tabs.create({ url: `https://snagai.netlify.app/checkout.html?plan=${plan}` });
}

// ── Status bar ────────────────────────────────────────────────────────────────
async function loadStatus() {
  // Fetch live status from server (same as job page)
  let plan = 'free', used = 0, quota = 2;
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (status && !status.error) {
      plan  = status.plan || 'free';
      used  = status.used || 0;
      quota = status.limit || PLAN_QUOTAS[plan] || 2;
      // Cache locally for profile-limit checks
      await chrome.storage.sync.set({ userPlan: plan });
    }
  } catch(e) {
    // Fallback to cached
    const cached = await chrome.storage.sync.get(['userPlan', 'usageCount']);
    plan  = cached.userPlan || 'free';
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

  // Highlight current plan card
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

// ── Profile URL slots (Subscription page) ────────────────────────────────────
async function renderProfileSlots() {
  const { userPlan = 'free', registeredProfiles = [] } = await chrome.storage.sync.get(['userPlan', 'registeredProfiles']);
  const limit   = PLAN_LIMITS[userPlan] || 1;
  const slots   = document.getElementById('profile-slots');
  slots.innerHTML = '';

  for (let i = 0; i < limit; i++) {
    const existing = registeredProfiles[i];
    const div = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="slot-input" type="url" placeholder="https://www.upwork.com/freelancers/~..." value="${existing?.url || ''}" data-slot="${i}">
      ${existing?.url ? `<button class="slot-sync-btn" data-slot="${i}">Open & Sync →</button>` : ''}
    `;
    slots.appendChild(div);
  }

  // Sync buttons
  slots.querySelectorAll('.slot-sync-btn').forEach(btn => {
    const i  = parseInt(btn.dataset.slot);
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
    updated[i] = { ...existing, url, id: existing.id || ('profile_' + (i + 1)), syncEnabled: existing.syncEnabled !== false };
  });

  await chrome.storage.sync.set({ registeredProfiles: updated });
  showSaved('saved-urls-msg');
  renderProfileSlots();
  renderProfilesPage();
});

// ── Profiles page ─────────────────────────────────────────────────────────────
async function renderProfilesPage() {
  const { registeredProfiles = [], userPlan = 'free', activeProfileId } = await chrome.storage.sync.get(['registeredProfiles', 'userPlan', 'activeProfileId']);
  const limit     = PLAN_LIMITS[userPlan] || 1;
  const container = document.getElementById('profiles-container');
  const noMsg     = document.getElementById('no-profiles-msg');
  const addBtn    = document.getElementById('add-profile-btn');

  container.innerHTML = '';

  const registered = registeredProfiles.filter(p => p && p.url);
  const hasData    = registered.some(p => p.name || p.jss);

  if (!registered.length && !hasData) {
    noMsg.style.display  = 'block';
    addBtn.style.display = 'none';
    return;
  }
  noMsg.style.display = 'none';

  if (registered.length <= 1) {
    // Single profile — no slider needed
    if (registered[0]) renderProfileCard(container, registered[0], 0, registered, false);
  } else {
    // Multiple profiles — slider with dots
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

    // Dots + arrows
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

  // Show add button if under limit
  addBtn.style.display = registered.length < limit ? 'block' : 'none';
}

function goToSlide(idx) {
  currentSlide = idx;
  document.querySelectorAll('.profile-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function renderProfileCard(container, profile, idx, allProfiles, showActive) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const isActive = allProfiles.length > 1 && (profile.id === allProfiles[0]?.id);
  const avatarLetter = (profile.name || 'U').charAt(0).toUpperCase();
  const syncChecked  = profile.syncEnabled !== false ? 'checked' : '';
  const readAt       = profile._readAt ? new Date(profile._readAt).toLocaleDateString() : 'Not synced';

  // Build skills chips HTML
  const skillsArr  = profile.skillsArr || (profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : []);
  const skillsHtml = skillsArr.slice(0, 12).map(s => `<span class="skill-chip">${s}</span>`).join('') + (skillsArr.length > 12 ? `<span class="skill-chip" style="opacity:.5">+${skillsArr.length - 12} more</span>` : '');

  // Build portfolio HTML
  const portfolios    = profile.portfolios || [];
  const portfolioHtml = portfolios.map((p, pi) => buildPortfolioItem(p, pi)).join('') || '<div style="font-size:12px;color:var(--white3);padding:8px 0">No portfolio items yet. Add them manually or visit your profile page.</div>';

  card.innerHTML = `
    <div class="profile-card-header">
      <div class="profile-card-avatar">${avatarLetter}</div>
      <div class="profile-card-info">
        <div class="profile-card-name">${profile.name || 'Unknown'}</div>
        <div class="profile-card-sub">${profile.tier || ''} ${profile.jss ? '· ' + profile.jss + ' JSS' : ''} · Last synced: ${readAt}</div>
      </div>
      <div class="profile-card-actions">
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
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--white3);margin-bottom:6px">Skills (${skillsArr.length})</div>
        <div class="skills-chips">${skillsHtml || '<span style="font-size:12px;color:var(--white3)">Not read yet</span>'}</div>
        <div style="font-size:11px;color:var(--white3);margin-top:6px">Skills are read automatically from your Upwork profile.</div>
      </div>

      <!-- Portfolio -->
      <div style="margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--white3)">Portfolio (${portfolios.length})</div>
          <button class="port-add-url" style="width:auto;border-radius:6px;padding:3px 12px" data-action="add-portfolio">+ Add manually</button>
        </div>
        <div class="portfolio-list">${portfolioHtml}</div>
      </div>
    </div>
  `;

  // Sync toggle
  card.querySelector('.sync-check').addEventListener('change', function() {
    allProfiles[idx].syncEnabled = this.checked;
    saveProfiles(allProfiles);
  });

  // Delete profile
  card.querySelector('.profile-delete-btn').addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    allProfiles.splice(idx, 1);
    saveProfiles(allProfiles);
    renderProfilesPage();
  });

  // Add portfolio manually
  card.querySelector('[data-action="add-portfolio"]').addEventListener('click', () => {
    const list = card.querySelector('.portfolio-list');
    const newItem = { title: '', urls: [], desc: '', skills: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi = allProfiles[idx].portfolios.length - 1;
    const div = document.createElement('div');
    div.innerHTML = buildPortfolioItem(newItem, pi);
    list.appendChild(div.firstElementChild);
    attachPortfolioListeners(list.lastElementChild, allProfiles, idx, pi);
    // Auto-open
    list.lastElementChild.querySelector('.port-item-body')?.classList.add('open');
  });

  // Attach portfolio listeners to existing items
  card.querySelectorAll('.port-item').forEach((el, pi) => {
    attachPortfolioListeners(el, allProfiles, idx, pi);
  });

  container.appendChild(card);
}

function buildPortfolioItem(p, pi) {
  const hasUrls   = p.urls && p.urls.length > 0;
  const badge     = hasUrls
    ? '<span class="port-complete">✓ Links added</span>'
    : '<span class="port-incomplete">⚠ No links yet</span>';
  const urlsHtml  = (p.urls || []).map(u => `
    <div class="port-url-row">
      <input type="url" class="port-url-inp" value="${u}" placeholder="https://...">
      <button class="port-url-del">×</button>
    </div>`).join('') || `<div class="port-url-row"><input type="url" class="port-url-inp" placeholder="https://apps.apple.com/..."><button class="port-url-del">×</button></div>`;

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
          <label>Title</label>
          <input type="text" class="port-title-inp" value="${p.title || ''}" placeholder="e.g. TollBugata iOS App">
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Links <span style="font-size:10px;font-weight:400;color:var(--white3)">(App Store, Play Store, website, etc)</span></label>
          <div class="port-urls-list">${urlsHtml}</div>
          <button class="port-add-url" style="margin-top:6px">+ Add another link</button>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>Short description</label>
          <input type="text" class="port-desc-inp" value="${p.desc || ''}" placeholder="e.g. Live toll payment app, 10k+ downloads">
        </div>
      </div>
    </div>`;
}

function attachPortfolioListeners(el, allProfiles, profileIdx, pi) {
  const body     = el.querySelector('.port-item-body');
  const editBtn  = el.querySelector('.port-edit-toggle');
  const delBtn   = el.querySelector('.port-del');
  const addUrl   = el.querySelector('.port-add-url');

  editBtn?.addEventListener('click', () => {
    body?.classList.toggle('open');
    if (editBtn) editBtn.textContent = body?.classList.contains('open') ? 'Done' : 'Edit';
  });

  delBtn?.addEventListener('click', () => {
    if (allProfiles[profileIdx]?.portfolios) {
      allProfiles[profileIdx].portfolios.splice(pi, 1);
    }
    el.remove();
  });

  addUrl?.addEventListener('click', () => {
    const list = el.querySelector('.port-urls-list');
    const row  = document.createElement('div');
    row.className = 'port-url-row';
    row.innerHTML = '<input type="url" class="port-url-inp" placeholder="https://..."><button class="port-url-del">×</button>';
    row.querySelector('.port-url-del').addEventListener('click', () => { if (list.querySelectorAll('.port-url-row').length > 1) row.remove(); });
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

function collectProfilesData() {
  const cards = document.querySelectorAll('.profile-card');
  const profiles = [];
  cards.forEach((card, idx) => {
    // Get existing profile
    const profileIdx = parseInt(card.dataset.profileIdx);

    chrome.storage.sync.get(['registeredProfiles'], (stored) => {
      const existing = (stored.registeredProfiles || [])[profileIdx] || {};

      // Editable fields
      existing.title   = card.querySelector('[data-field="title"]')?.value?.trim()   || existing.title   || '';
      existing.bio     = card.querySelector('[data-field="bio"]')?.value?.trim()     || existing.bio     || '';
      existing.country = card.querySelector('[data-field="country"]')?.value?.trim() || existing.country || '';
      existing.extra   = card.querySelector('[data-field="extra"]')?.value?.trim()   || existing.extra   || '';

      // Portfolio
      const portItems = card.querySelectorAll('.port-item');
      existing.portfolios = [...portItems].map(el => {
        const urls = [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean);
        return {
          title:  el.querySelector('.port-title-inp')?.value?.trim() || '',
          urls,
          url:    urls[0] || '',
          desc:   el.querySelector('.port-desc-inp')?.value?.trim()  || '',
        };
      }).filter(p => p.title || p.urls.length);

      profiles[profileIdx] = existing;
    });
  });
  return profiles;
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
      title: el.querySelector('.port-title-inp')?.value?.trim() || '',
      urls:  [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean),
      desc:  el.querySelector('.port-desc-inp')?.value?.trim()  || '',
    })).filter(p => p.title || p.urls.length);

    // Sync legacy profile for backward compatibility
    if (idx === 0) {
      const p = registeredProfiles[0];
      chrome.storage.sync.get(['profile'], (stored) => {
        const merged = { ...(stored.profile || {}), ...p,
          tier: p.tierKey || stored.profile?.tier,
          skills: p.skillsArr ? p.skillsArr.join(', ') : stored.profile?.skills,
          portfolio: p.portfolios || stored.profile?.portfolio || [],
          extra: p.extra || stored.profile?.extra || '',
        };
        chrome.storage.sync.set({ profile: merged });
      });
    }
  });

  await chrome.storage.sync.set({ registeredProfiles });
  showSaved('saved-profiles-msg');
});

document.getElementById('add-profile-btn')?.addEventListener('click', () => {
  document.querySelector('[data-section="subscription"]')?.click();
});

document.getElementById('goto-sub-btn')?.addEventListener('click', () => {
  document.querySelector('[data-section="subscription"]')?.click();
});

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
if (sbUpgradeBtn) sbUpgradeBtn.addEventListener('click', () => document.querySelector('[data-section="subscription"]')?.click());

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadStatus();
  await loadEmail();
  await renderProfilesPage();
  await renderProfileSlots();

  const { settings = {} } = await chrome.storage.sync.get(['settings']);
  document.getElementById('tone').value           = settings.tone          || 'professional';
  document.getElementById('length').value         = settings.length        || 'medium';
  document.getElementById('always-include').value = settings.alwaysInclude || '';
}

init();
