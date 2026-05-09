// ── Snag AI Options v15 ───────────────────────────────────────────────────────

const PLAN_LIMITS  = { free: 1, starter: 1, pro: 3, agency: 5 };
const PLAN_LABELS  = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 900 };
const SKILLS_SHOW  = 8; // visible before "x more"

let currentSlide = 0;

// ── Section navigation ────────────────────────────────────────────────────────
function switchSection(name) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const item = document.querySelector(`.sb-item[data-section="${name}"]`);
  const sec  = document.getElementById('section-' + name);
  if (item) item.classList.add('active');
  if (sec)  sec.classList.add('active');
}
document.querySelectorAll('.sb-item[data-section]').forEach(el =>
  el.addEventListener('click', () => switchSection(el.dataset.section))
);
// URL param routing: options.html?tab=subscription
const _tab = new URLSearchParams(window.location.search).get('tab');
if (_tab) switchSection(_tab);

// ── Storage change listener — live refresh when profile syncs ─────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const hasProfile = Object.keys(changes).some(k => k.startsWith('profileFull_') || k === 'primaryProfileId' || k === 'registeredProfiles' || k === 'activeProfileId');
    if (hasProfile) { renderProfilesPage(); return; }
  }
  if (area !== 'sync') return;
  if (changes.registeredProfiles || changes.profile) {
    renderProfilesPage();
    renderProfileSlots();
  }
  if (changes.userPlan || changes.usageCount) {
    const plan  = changes.userPlan?.newValue;
    const used  = changes.usageCount?.newValue;
    if (plan !== undefined || used !== undefined) {
      chrome.storage.sync.get(['userPlan','usageCount','usageLimit'], s => {
        updatePlanUI(s.userPlan || 'free', s.usageCount || 0, s.usageLimit || PLAN_QUOTAS[s.userPlan] || 2);
      });
    }
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
function getSkillsArr(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.skillsArr) && profile.skillsArr.length) return profile.skillsArr;
  if (typeof profile.skills === 'string' && profile.skills.trim())
    return profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  if (Array.isArray(profile.skills) && profile.skills.length) return profile.skills;
  return [];
}

// ── Status / plan UI ──────────────────────────────────────────────────────────
function updatePlanUI(plan, used, quota) {
  const rem = Math.max(0, quota - used);
  const pct = Math.min(100, (used / quota) * 100);
  const label = PLAN_LABELS[plan] || 'Free';

  // Sidebar widget
  const badge = document.getElementById('sb-plan-badge');
  badge.textContent = label;
  badge.className   = 'sb-plan-badge badge-' + plan;
  document.getElementById('sb-remaining').textContent = rem + ' left';
  document.getElementById('sb-count').textContent     = used + ' / ' + quota + ' used';
  document.getElementById('sb-bar').style.width       = pct + '%';

  // Subscription page usage section
  document.getElementById('ud-plan').textContent  = label + ' plan';
  document.getElementById('ud-used').textContent  = used;
  document.getElementById('ud-limit').textContent = quota + ' total';
  document.getElementById('ud-bar').style.width   = pct + '%';

  // Highlight active plan card
  // Reset all plan cards and buttons
  document.querySelectorAll('.plan-card').forEach(c => {
    c.classList.remove('current');
    const btn = c.querySelector('.plan-btn[data-plan]');
    if (btn) {
      const p = btn.dataset.plan;
      const labels = { starter: 'Get Starter →', pro: 'Get Pro →', agency: 'Get Agency →' };
      btn.textContent = labels[p] || 'Upgrade →';
      btn.disabled    = false;
      btn.className   = 'plan-btn ' + (p === 'pro' ? 'plan-btn-gold' : 'plan-btn-outline');
    }
  });
  // Highlight and lock the active plan card
  const activeCard = document.getElementById('plan-' + plan);
  if (activeCard && plan !== 'free') {
    activeCard.classList.add('current');
    const btn = activeCard.querySelector('.plan-btn[data-plan]');
    if (btn) {
      btn.textContent = '✓ Current plan';
      btn.disabled    = true;
      btn.className   = 'plan-btn plan-btn-current';
    }
  } else if (activeCard) {
    activeCard.classList.add('current');
  }
}

async function loadStatus() {
  // 1. Show cached data immediately — no blank screen
  const cached = await chrome.storage.sync.get(['userPlan','usageCount','usageLimit']);
  const cPlan  = cached.userPlan  || 'free';
  const cUsed  = cached.usageCount || 0;
  const cQuota = cached.usageLimit || PLAN_QUOTAS[cPlan] || 2;
  updatePlanUI(cPlan, cUsed, cQuota);

  // 2. Fetch fresh from server in background
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (status && !status.error) {
      const plan  = status.plan  || 'free';
      const used  = status.used  || 0;
      const quota = status.limit || PLAN_QUOTAS[plan] || 2;
      await chrome.storage.sync.set({ userPlan: plan, usageCount: used, usageLimit: quota });
      updatePlanUI(plan, used, quota);
    }
  } catch(e) { /* use cached */ }
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail);
}
function updateEmailUI(email) {
  document.getElementById('email-dot').style.background = email ? '#34d399' : '#374151';
  document.getElementById('email-val').textContent      = email || 'Not set';
  document.getElementById('email-toggle').textContent   = email ? 'Change' : 'Add';
}
document.getElementById('email-toggle').addEventListener('click', () => {
  const w = document.getElementById('email-edit');
  w.style.display = w.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('email-save').addEventListener('click', async () => {
  const email = document.getElementById('email-inp').value.trim();
  if (!email.includes('@')) return;
  await chrome.storage.sync.set({ userEmail: email });
  updateEmailUI(email);
  document.getElementById('email-edit').style.display = 'none';
  showSaved('saved-urls-msg');
});

// ── Profile URL slots ─────────────────────────────────────────────────────────
async function renderProfileSlots() {
  const [_sp, _lp] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles'])
  ]);
  const userPlan           = _sp.userPlan || 'free';
  const registeredProfiles = _lp.registeredProfiles || [];
  const limit = PLAN_LIMITS[userPlan] || 1;

  // Also load full data keys to check sync status accurately
  const fullKeys  = registeredProfiles.filter(p => p?.id).map(p => 'profileFull_' + p.id);
  const fullData  = fullKeys.length ? await new Promise(r => chrome.storage.local.get(fullKeys, r)) : {};

  const slots = document.getElementById('profile-slots');
  slots.innerHTML = '';

  for (let i = 0; i < limit; i++) {
    const p      = registeredProfiles[i];
    const hasUrl = p?.url;
    const full   = p?.id ? fullData['profileFull_' + p.id] : null;
    // Synced if metadata has data OR if the full profile exists with _readAt
    const synced = !!(p?.name || p?.jss || p?._readAt || full?._readAt);
    const div = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="slot-input" type="url" placeholder="https://www.upwork.com/freelancers/~..." value="${p?.url || ''}" data-slot="${i}">
      ${hasUrl ? `<span class="slot-status-badge ${synced ? 'slot-synced' : 'slot-pending'}">${synced ? '✓ Synced' : '⏳ Pending'}</span>` : ''}
      ${hasUrl ? `<button class="btn-slot-open" data-slot="${i}">Open →</button>` : ''}
    `;
    slots.appendChild(div);
  }
  slots.querySelectorAll('.btn-slot-open').forEach(btn => {
    const i = parseInt(btn.dataset.slot);
    const url = slots.querySelectorAll('.slot-input')[i]?.value;
    if (url) btn.addEventListener('click', () => chrome.tabs.create({ url }));
  });
}

document.getElementById('save-profile-urls').addEventListener('click', async () => {
  const { userPlan = 'free' } = await chrome.storage.sync.get(['userPlan']);
  const { registeredProfiles = [] } = await chrome.storage.local.get(['registeredProfiles']);
  const inputs  = document.querySelectorAll('.slot-input');
  const updated = [...registeredProfiles];
  inputs.forEach((inp, i) => {
    const url = inp.value.trim();
    if (!url) return;
    const existing = updated[i] || {};
    updated[i] = { ...existing, url, id: existing.id || ('profile_' + (i + 1)), syncEnabled: existing.syncEnabled !== false };
  });
  await chrome.storage.local.set({ registeredProfiles: updated });
  showSaved('saved-urls-msg');
  await renderProfileSlots();
  await renderProfilesPage();
});

// ── Profiles page ──────────────────────────────────────────────────────────────
async function renderProfilesPage() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'])
  ]);
  const userPlan = syncStored.userPlan || 'free';
  const registeredProfiles = localStored.registeredProfiles || [];
  const primaryProfileId = localStored.primaryProfileId || null;

  // Load full profile data from local storage for each registered profile
  const registered = registeredProfiles.filter(p => p && p.url);
  const localKeys  = registered.map(p => p.id ? 'profileFull_' + p.id : null).filter(Boolean);
  const localFull  = localKeys.length
    ? await new Promise(resolve => chrome.storage.local.get(localKeys, resolve))
    : {};

  // Merge: local full data overrides sync metadata (sync just has id/url/name/jss for slot display)
  const mergedProfiles = registered.map(p => {
    const full = p.id ? localFull['profileFull_' + p.id] : null;
    return full ? { ...p, ...full } : p; // local takes priority
  });
  const limit     = PLAN_LIMITS[userPlan] || 1;
  const container = document.getElementById('profiles-container');
  const noMsg     = document.getElementById('no-profiles-msg');
  const addBtn    = document.getElementById('add-profile-btn');
  container.innerHTML = '';

  if (!mergedProfiles.length) {
    noMsg.style.display = 'block';
    addBtn.style.display = 'none';
    return;
  }
  noMsg.style.display  = 'none';
  addBtn.style.display = mergedProfiles.length < limit ? 'flex' : 'none';

  if (mergedProfiles.length === 1) {
    renderProfileCard(container, mergedProfiles[0], 0, mergedProfiles, primaryProfileId);
  } else {
    const wrap   = document.createElement('div');
    wrap.className = 'profile-slider-wrap';
    const slides = document.createElement('div');
    slides.className = 'profile-slides';
    mergedProfiles.forEach((p, i) => {
      const slide = document.createElement('div');
      slide.className = 'profile-slide' + (i === currentSlide ? ' active' : '');
      slide.id = 'slide-' + i;
      renderProfileCard(slide, p, i, mergedProfiles, primaryProfileId);
      slides.appendChild(slide);
    });
    wrap.appendChild(slides);

    // Centered slider controls: ‹  ● ● ○  ›
    const ctrl = document.createElement('div');
    ctrl.className = 'slider-controls';
    ctrl.innerHTML = `<button class="slider-arr" id="sl-prev">‹</button>`;
    mergedProfiles.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === currentSlide ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      ctrl.appendChild(dot);
    });
    ctrl.innerHTML += `<button class="slider-arr" id="sl-next">›</button>`;
    wrap.appendChild(ctrl);
    container.appendChild(wrap);

    document.getElementById('sl-prev')?.addEventListener('click', () => goToSlide(Math.max(0, currentSlide - 1)));
    document.getElementById('sl-next')?.addEventListener('click', () => goToSlide(Math.min(registered.length - 1, currentSlide + 1)));
  }
}

function goToSlide(idx) {
  currentSlide = idx;
  document.querySelectorAll('.profile-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.slider-dot').forEach((d, i)  => d.classList.toggle('active', i === idx));
}

function renderProfileCard(container, profile, idx, allProfiles, primaryProfileId) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const synced       = !!(profile.name || profile.jss || profile._readAt);
  const avatarLetter = (profile.name || '?').charAt(0).toUpperCase();
  const syncChecked  = profile.syncEnabled !== false;
  const validProfiles = allProfiles.filter(p => p && p.url);
  // A profile is primary if: explicitly set, or it's the only one, or it's first and nothing set
  const isPrimary    = validProfiles.length <= 1
    ? true
    : (primaryProfileId
        ? profile.id === primaryProfileId
        : idx === 0);
  const readAt       = profile._readAt
    ? new Date(profile._readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const skillsArr    = getSkillsArr(profile);
  const portfolios   = profile.portfolios || [];

  // ── Tier badge ────────────────────────────────────────────────────────────
  const tierClasses = { expert:'tier-expert', top_rated_plus:'tier-top_rated_plus', top_rated:'tier-top_rated', rising:'tier-rising' };
  const tierClass   = tierClasses[profile.tierKey] || 'tier-new';
  const tierIcons   = { expert:'⚡', top_rated_plus:'⭐', top_rated:'✦', rising:'🚀' };
  const tierIcon    = tierIcons[profile.tierKey] || '';
  const tierHtml    = tierClass !== 'tier-new'
    ? `<div class="tier-badge ${tierClass}">${tierIcon} ${profile.tier || ''}</div>` : '';

  // ── Pending (not synced yet) ───────────────────────────────────────────────
  if (!synced) {
    card.innerHTML = `
      <div class="profile-card-hdr">
        <div class="profile-avatar profile-avatar-pending">?</div>
        <div class="profile-info">
          <div class="profile-name" style="color:var(--white3)">Not synced yet</div>
          <div class="profile-meta" style="font-size:10px;word-break:break-all">${profile.url}</div>
        </div>
        <div class="profile-actions">
          <button class="btn-delete" title="Remove">×</button>
        </div>
      </div>
      <div class="pending-body">
        <div class="pending-icon">🔄</div>
        <div class="pending-title">One more step</div>
        <div class="pending-desc">Click below to open your Upwork profile. Snag AI will automatically read your data when the page loads.</div>
        <button class="btn-primary" id="open-pending-${idx}" style="margin-top:4px">Open my Upwork profile →</button>
      </div>
    `;
    card.querySelector(`#open-pending-${idx}`)?.addEventListener('click', () => chrome.tabs.create({ url: profile.url }));
    card.querySelector('.btn-delete')?.addEventListener('click', () => {
      if (!confirm('Remove this profile?')) return;
      const removedId = profile.id;
      allProfiles.splice(idx, 1);
      chrome.storage.local.set({ registeredProfiles: allProfiles });
      if (removedId) chrome.storage.local.remove('profileFull_' + removedId);
      renderProfilesPage();
    });
    container.appendChild(card);
    return;
  }

  // ── Synced profile card ────────────────────────────────────────────────────
  card.innerHTML = `
    <div class="profile-card-hdr">
      <div class="profile-avatar">${avatarLetter}</div>
      <div class="profile-info">
        <div class="profile-name-row">
          <span class="profile-name">${profile.name || 'Unknown'}</span>
          ${isPrimary && validProfiles.length > 1 ? '<span class="badge-primary">★ Primary</span>' : ''}
        </div>
        <div class="profile-meta">
          ${[profile.tier || '', profile.jss ? profile.jss + ' JSS' : ''].filter(Boolean).join(' · ')}
          ${readAt ? `<span style="opacity:.5"> · Synced ${readAt}</span>` : ''}
        </div>
        <div class="profile-actions">
          ${!isPrimary && validProfiles.length > 1 ? `<button class="btn-set-primary" id="btn-primary-${idx}">Set primary</button>` : ''}
          <button class="btn-resync" id="btn-resync-${idx}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
            Sync
          </button>
          <label class="sync-toggle-wrap">
            <span style="font-size:11px;color:var(--white3)">Auto-sync</span>
            <label class="toggle-switch">
              <input type="checkbox" class="sync-check" ${syncChecked ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>
      <button class="btn-delete" title="Remove profile" style="margin-top:2px">×</button>
    </div>

    <div class="profile-body">
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">${profile.jss || '—'}</div><div class="stat-lbl">JSS</div></div>
        <div class="stat-box"><div class="stat-val">${profile.rate || '—'}</div><div class="stat-lbl">Rate</div></div>
        <div class="stat-box"><div class="stat-val">${profile.jobs || '—'}</div><div class="stat-lbl">Jobs</div></div>
        <div class="stat-box"><div class="stat-val">${profile.earnings || '—'}</div><div class="stat-lbl">Earned</div></div>
      </div>
      ${tierHtml}

      <div class="edit-row"><span class="edit-lbl">Title</span><textarea class="edit-val" data-field="title" rows="2">${profile.title || ''}</textarea></div>
      <div class="edit-row"><span class="edit-lbl">Bio</span><textarea class="edit-val" rows="3" data-field="bio">${profile.bio || ''}</textarea></div>
      <div class="edit-row"><span class="edit-lbl">Country</span><input class="edit-val" type="text" data-field="country" value="${profile.country || ''}"></div>
      <div class="edit-row"><span class="edit-lbl">Availability</span><textarea class="edit-val" rows="2" data-field="extra" placeholder="e.g. Available 30+ hrs/week · Pakistan">${profile.extra || ''}</textarea></div>

      <!-- Skills -->
      <div class="profile-section">
        <div class="profile-section-hdr">
          <span class="profile-section-title">Skills</span>
          <span class="profile-section-count">${skillsArr.length} detected</span>
        </div>
        <div class="skills-wrap" id="skills-wrap-${idx}"></div>
        <div style="font-size:11px;color:var(--white3);margin-top:6px">Read automatically from your Upwork profile.</div>
      </div>

      <!-- Portfolio -->
      <div class="profile-section">
        <div class="portfolio-section-hdr">
          <span class="profile-section-title">Portfolio <span style="font-weight:400;opacity:.6">(${portfolios.length})</span></span>
          <button class="btn-port-add" data-action="add-port">+ Add item</button>
        </div>
        <div class="port-list" id="port-list-${idx}"></div>
        ${!portfolios.length ? `<div class="port-empty-msg">No portfolio items yet. Add them manually or visit your Upwork profile page.</div>` : ''}
      </div>
    </div>

    <div class="profile-save-bar">
      <span class="saved-msg" id="saved-card-${idx}">✓ Saved</span>
      <button class="btn-primary" style="font-size:12px;padding:8px 18px" data-action="save-card">Save changes</button>
    </div>
  `;

  // Attach skills expand/collapse
  renderSkillsExpand(card.querySelector(`#skills-wrap-${idx}`), skillsArr);

  // Render portfolio items
  const portList = card.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItem(portList, p, pi, allProfiles, idx));

  // Set primary button — stores choice in chrome.storage.local (device-local)
  card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
    const profileId = profile.id || ('profile_' + (idx + 1));
    chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId }, () => {
      renderProfilesPage(); // re-render to show updated primary badge
    });
  });

  // Resync button
  card.querySelector(`#btn-resync-${idx}`)?.addEventListener('click', () => {
    if (profile.url) chrome.tabs.create({ url: profile.url });
  });

  // Sync toggle
  card.querySelector('.sync-check')?.addEventListener('change', function() {
    allProfiles[idx].syncEnabled = this.checked;
    chrome.storage.local.set({ registeredProfiles: allProfiles });
  });

  // Delete profile — also wipe local full data
  card.querySelector('.btn-delete')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    const removedId = profile.id;
    allProfiles.splice(idx, 1);
    chrome.storage.local.set({ registeredProfiles: allProfiles });
    if (removedId) chrome.storage.local.remove('profileFull_' + removedId);
    renderProfilesPage();
  });

  // Add portfolio
  card.querySelector('[data-action="add-port"]')?.addEventListener('click', () => {
    const newItem = { title: '', urls: [], desc: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi = allProfiles[idx].portfolios.length - 1;
    // Remove empty state msg if present
    portList.querySelector('.port-empty-msg')?.remove();
    renderPortfolioItem(portList, newItem, pi, allProfiles, idx, true);
  });

  // Save card
  card.querySelector('[data-action="save-card"]')?.addEventListener('click', () => saveCard(card, idx, allProfiles));

  container.appendChild(card);
}

// ── Skills expand/collapse ────────────────────────────────────────────────────
function renderSkillsExpand(wrap, skillsArr, expanded) {
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!skillsArr.length) {
    wrap.innerHTML = '<span class="skills-hint">No skills found — visit your Upwork profile to sync.</span>';
    return;
  }
  const visible = expanded ? skillsArr : skillsArr.slice(0, SKILLS_SHOW);
  visible.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.textContent = s;
    wrap.appendChild(chip);
  });
  if (skillsArr.length > SKILLS_SHOW) {
    const btn = document.createElement('button');
    btn.className = 'skills-toggle';
    if (!expanded) {
      btn.textContent = `+${skillsArr.length - SKILLS_SHOW} more`;
      btn.addEventListener('click', () => renderSkillsExpand(wrap, skillsArr, true));
    } else {
      btn.textContent = 'Show less';
      btn.addEventListener('click', () => renderSkillsExpand(wrap, skillsArr, false));
    }
    wrap.appendChild(btn);
  }
}

// ── Portfolio item renderer ───────────────────────────────────────────────────
function renderPortfolioItem(list, p, pi, allProfiles, profileIdx, autoOpen) {
  const hasLinks = p.urls && p.urls.some(u => u.trim());
  const item = document.createElement('div');
  item.className = 'port-item';
  item.dataset.pi = pi;

  const urlsHtml = (p.urls && p.urls.length ? p.urls : ['']).map(u => `
    <div class="port-url-row">
      <input type="url" class="port-url-inp" value="${u}" placeholder="https://apps.apple.com/...">
      <button class="btn-url-del">×</button>
    </div>`).join('');

  item.innerHTML = `
    <div class="port-item-row">
      <span class="port-item-icon">${hasLinks ? '📁' : '📂'}</span>
      <span class="port-item-name">${p.title || 'New project'}</span>
      ${hasLinks ? '' : '<span class="port-badge-warn">⚠ No link</span>'}
      <div class="port-item-actions">
        <button class="btn-port-edit">Edit</button>
        <button class="btn-port-del">Remove</button>
      </div>
    </div>
    <div class="port-edit-body" style="display:none">
      <div class="field">
        <label>Project name</label>
        <input type="text" class="port-title-inp" value="${p.title || ''}" placeholder="e.g. TollBugata iOS App">
      </div>
      <div class="field">
        <label>Links <span style="font-size:10px;font-weight:400;color:var(--white3)">(App Store, Play Store, GitHub, website…)</span></label>
        <div class="port-urls-list">${urlsHtml}</div>
        <button class="btn-url-add">+ Add another link</button>
      </div>
      <div class="field">
        <label>Short description</label>
        <input type="text" class="port-desc-inp" value="${p.desc || ''}" placeholder="e.g. Live app, 10k+ downloads">
      </div>
    </div>
  `;

  const editBody = item.querySelector('.port-edit-body');
  const editBtn  = item.querySelector('.btn-port-edit');

  editBtn.addEventListener('click', () => {
    const open = editBody.style.display !== 'none' && editBody.style.display !== '';
    editBody.style.display = open ? 'none' : 'block';
    editBtn.textContent    = open ? 'Edit' : 'Done';
  });

  item.querySelector('.btn-port-del').addEventListener('click', () => {
    allProfiles[profileIdx]?.portfolios?.splice(pi, 1);
    item.remove();
  });

  item.querySelector('.btn-url-add').addEventListener('click', () => {
    const urlList = item.querySelector('.port-urls-list');
    const row = document.createElement('div');
    row.className = 'port-url-row';
    row.innerHTML = '<input type="url" class="port-url-inp" placeholder="https://..."><button class="btn-url-del">×</button>';
    row.querySelector('.btn-url-del').addEventListener('click', () => {
      if (urlList.querySelectorAll('.port-url-row').length > 1) row.remove();
    });
    urlList.appendChild(row);
    row.querySelector('input')?.focus();
  });

  item.querySelectorAll('.btn-url-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const urlList = item.querySelector('.port-urls-list');
      if (urlList.querySelectorAll('.port-url-row').length > 1) btn.closest('.port-url-row')?.remove();
    });
  });

  list.appendChild(item);

  if (autoOpen) {
    editBody.style.display = 'block';
    editBtn.textContent    = 'Done';
    item.querySelector('.port-title-inp')?.focus();
  }
}

// ── Save card ─────────────────────────────────────────────────────────────────
function saveCard(card, idx, allProfiles) {
  const profile = allProfiles[idx];
  if (!profile?.id) return;

  const title      = card.querySelector('[data-field="title"]')?.value?.trim()   || '';
  const bio        = card.querySelector('[data-field="bio"]')?.value?.trim()     || '';
  const country    = card.querySelector('[data-field="country"]')?.value?.trim() || '';
  const extra      = card.querySelector('[data-field="extra"]')?.value?.trim()   || '';
  const portfolios = [...card.querySelectorAll('.port-item')].map(el => ({
    title: el.querySelector('.port-title-inp')?.value?.trim()  || '',
    urls:  [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean),
    desc:  el.querySelector('.port-desc-inp')?.value?.trim()   || '',
  })).filter(p => p.title || p.urls.length);

  const localKey = 'profileFull_' + profile.id;

  // Load existing full data, merge edits, save back to local
  chrome.storage.local.get([localKey], (localData) => {
    const existing = localData[localKey] || profile;
    const updated  = { ...existing, title, bio, country, extra, portfolios };

    chrome.storage.local.set({ [localKey]: updated }, () => {
      // Also update sync profile for legacy compat (background.js fallback)
      // profile data lives in local storage — no sync write needed
      showSaved('saved-card-' + idx);
    });
  });
}

// ── Navigation shortcuts ──────────────────────────────────────────────────────
document.getElementById('add-profile-btn')?.addEventListener('click', () => switchSection('subscription'));
document.getElementById('goto-sub-btn')?.addEventListener('click',    () => switchSection('subscription'));

// ── Plan buttons ──────────────────────────────────────────────────────────────
document.querySelectorAll('.plan-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', e => { e.stopPropagation(); openCheckout(btn.dataset.plan); });
});

// ── Settings (now in Subscription section) ────────────────────────────────────
document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:   document.getElementById('tone').value,
    length: document.getElementById('length').value,
  }});
  showSaved('saved-settings-msg');
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Load cached data first (instant render), then server in parallel
  loadStatus();     // async — shows cached immediately, fetches fresh in background
  loadEmail();      // instant from storage
  renderProfileSlots();
  renderProfilesPage();

  const { settings = {} } = await chrome.storage.sync.get(['settings']);
  document.getElementById('tone').value   = settings.tone   || 'professional';
  document.getElementById('length').value = settings.length || 'medium';
}

init();
