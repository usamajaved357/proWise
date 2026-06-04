// ── Profiles section — cards, skills, portfolio, save ────────────────────────
import { PLAN_LIMITS, SKILLS_SHOW } from './config.js';
import { state } from './state.js';
import { showSaved, getSkillsArr, _esc } from './helpers.js';

// ── Skills expand/collapse ────────────────────────────────────────────────────
export function renderSkillsExpand(wrap, skillsArr, expanded) {
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
export function renderPortfolioItem(list, p, pi, allProfiles, profileIdx, autoOpen) {
  const hasLinks = p.urls && p.urls.some(u => u.trim());
  const skills = Array.isArray(p.skills)
    ? p.skills
    : (typeof p.skills === 'string' && p.skills.trim())
      ? p.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const item     = document.createElement('div');
  item.className = 'port-item ' + (hasLinks ? 'has-url' : 'no-url');
  item.dataset.pi         = pi;
  item.dataset.portSkills = JSON.stringify(skills);
  item.dataset.portRole   = p.role || '';

  const syncTs   = (allProfiles[profileIdx]?._portfolioSyncedAt) || 0;
  const syncAge  = syncTs ? Math.floor((Date.now() - syncTs) / 86400000) : null;
  const freshBdg = p._autoRead && syncAge !== null
    ? (syncAge > 30 ? '<span class="port-stale-badge">⚠ Re-sync</span>' : '<span class="port-fresh-badge">✓ Synced</span>')
    : '';

  const urlsHtml = (p.urls && p.urls.length ? p.urls : ['']).map(u =>
    '<div class="port-url-row"><input type="url" class="port-url-inp" value="' + _esc(u) + '" placeholder="https://apps.apple.com/..."><button class="btn-url-del">×</button></div>'
  ).join('');

  const firstUrl  = hasLinks ? (p.urls || []).find(u => u.trim()) : null;
  const urlDomain = firstUrl ? firstUrl.replace(/^https?:\/\//, '').split('/')[0] : '';

  const skillsChips = skills.length
    ? skills.slice(0, 3).map(s => '<span class="port-skill-tag">' + _esc(s) + '</span>').join('') + (skills.length > 3 ? '<span class="port-skill-more-badge">+' + (skills.length - 3) + ' more</span>' : '')
    : '<span class="port-no-skills">No skills</span>';

  const urlChips = hasLinks
    ? '<div class="port-url-chips">' + (p.urls || []).filter(u => u.trim()).map(u => '<a href="' + (u.startsWith('http') ? u : 'https://' + u) + '" target="_blank" class="port-url-chip">' + u.replace(/^https?:\/\//, '').slice(0, 30) + '</a>').join('') + '</div>'
    : '';

  const skillsReadonly = skills.length
    ? skills.map(s => '<span class="port-skill-tag-all">' + _esc(s) + '</span>').join('')
    : '<span style="font-size:11px;color:var(--white3)">Sync from Upwork profile.</span>';

  item.innerHTML =
    '<div class="port-compact">' +
      '<div class="port-compact-head">' +
        '<span class="port-compact-dot ' + (hasLinks ? 'ok' : 'warn') + '"></span>' +
        '<span class="port-compact-name">' + _esc(p.title || 'Untitled') + '</span>' +
        freshBdg +
        '<button class="btn-port-edit">Edit</button>' +
        '<button class="btn-port-del">×</button>' +
      '</div>' +
      '<div class="port-compact-meta">' +
        '<div class="port-skill-tags">' + skillsChips + '</div>' +
        (p.desc ? '<div class="port-compact-desc">' + _esc(p.desc) + '</div>' : '') +
        (urlDomain ? '<div class="port-compact-url">🔗 ' + _esc(urlDomain) + '</div>' : '<div class="port-compact-url muted">No link</div>') +
        urlChips +
      '</div>' +
    '</div>' +
    '<div class="port-edit-body" style="display:none">' +
      '<div class="field"><label>Project name</label>' +
        '<input type="text" class="port-title-inp" value="' + _esc(p.title || '') + '" placeholder="e.g. Shypie iOS App"></div>' +
      '<div class="field"><label>Links</label>' +
        '<div class="port-urls-list">' + urlsHtml + '</div>' +
        '<button class="btn-url-add">+ Add link</button></div>' +
      '<div class="field"><label>Description</label>' +
        '<input type="text" class="port-desc-inp" value="' + _esc(p.desc || '') + '" placeholder="e.g. Live, 10k+ downloads"></div>' +
      '<div class="field"><label>Skills <span style="font-size:10px;font-weight:400;opacity:.5">(auto-synced)</span></label>' +
        '<div class="port-skills-readonly">' + skillsReadonly + '</div></div>' +
      '<div class="port-edit-footer"><button class="btn-port-done">✓ Done</button></div>' +
    '</div>';

  const editBody = item.querySelector('.port-edit-body');
  const editBtn  = item.querySelector('.btn-port-edit');

  const openEdit = () => {
    list.querySelectorAll('.port-item.expanded').forEach(el => {
      if (el !== item) {
        el.classList.remove('expanded');
        el.querySelector('.port-edit-body').style.display = 'none';
        el.querySelector('.btn-port-edit').textContent = 'Edit';
      }
    });
    item.classList.add('expanded');
    editBody.style.display = 'block';
    editBtn.textContent = 'Close';
    item.querySelector('.port-title-inp')?.focus();
  };
  const closeEdit = () => {
    item.classList.remove('expanded');
    editBody.style.display = 'none';
    editBtn.textContent = 'Edit';
  };

  editBtn.addEventListener('click', () => editBody.style.display !== 'none' ? closeEdit() : openEdit());
  item.querySelector('.btn-port-done').addEventListener('click', closeEdit);

  item.querySelector('.btn-port-del').addEventListener('click', () => {
    allProfiles[profileIdx]?.portfolios?.splice(pi, 1);
    item.remove();
  });

  item.querySelector('.btn-url-add').addEventListener('click', () => {
    const ul  = item.querySelector('.port-urls-list');
    const row = document.createElement('div'); row.className = 'port-url-row';
    row.innerHTML = '<input type="url" class="port-url-inp" placeholder="https://..."><button class="btn-url-del">×</button>';
    row.querySelector('.btn-url-del').addEventListener('click', () => {
      if (ul.querySelectorAll('.port-url-row').length > 1) row.remove();
    });
    ul.appendChild(row); row.querySelector('input')?.focus();
  });
  item.querySelectorAll('.btn-url-del').forEach(btn => btn.addEventListener('click', () => {
    const ul = item.querySelector('.port-urls-list');
    if (ul.querySelectorAll('.port-url-row').length > 1) btn.closest('.port-url-row')?.remove();
  }));

  list.appendChild(item);
  if (autoOpen) openEdit();
}

// ── Save card ─────────────────────────────────────────────────────────────────
export function saveCard(card, idx, allProfiles) {
  const profile = allProfiles[idx];
  if (!profile?.id) return;

  const title   = card.querySelector('[data-field="title"]')?.value?.trim()   || '';
  const bio     = card.querySelector('[data-field="bio"]')?.value?.trim()     || '';
  const country = card.querySelector('[data-field="country"]')?.value?.trim() || '';
  const extra   = card.querySelector('[data-field="extra"]')?.value?.trim()   || '';

  const domPorts = [...card.querySelectorAll('.port-item')].map(el => ({
    _pi:   parseInt(el.dataset.pi) || 0,
    title: el.querySelector('.port-title-inp')?.value?.trim() || '',
    urls:  [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean),
    desc:  el.querySelector('.port-desc-inp')?.value?.trim()  || '',
  }));

  const localKey = 'profileFull_' + profile.id;

  chrome.storage.local.get([localKey], (localData) => {
    const existing    = localData[localKey] || profile;
    const storedPorts = existing.portfolios || [];

    const portfolios = domPorts
      .filter(d => d.title || d.urls.length)
      .map(d => {
        const stored = storedPorts[d._pi] || {};
        return {
          ...stored,
          title: d.title || stored.title || '',
          urls:  d.urls.length  ? d.urls  : (stored.urls  || []),
          desc:  d.desc  !== '' ? d.desc  : (stored.desc  || ''),
        };
      });

    const updated = { ...existing, title, bio, country, extra, portfolios };
    chrome.storage.local.set({ [localKey]: updated }, () => {
      if (allProfiles[idx]) allProfiles[idx].portfolios = portfolios;
      showSaved('saved-card-' + idx);
    });
  });
}

// ── Profile card renderer ─────────────────────────────────────────────────────
export function renderProfileCard(container, profile, idx, allProfiles, primaryProfileId) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const synced       = !!(profile.name || profile.jss || profile._readAt);
  const avatarLetter = (profile.name || '?').charAt(0).toUpperCase();
  const validProfiles = allProfiles.filter(p => p && p.url);
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

  const tierClasses = { expert:'tier-expert', top_rated_plus:'tier-top_rated_plus', top_rated:'tier-top_rated', rising:'tier-rising' };
  const tierClass   = tierClasses[profile.tierKey] || 'tier-new';
  const tierIcons   = { expert:'⚡', top_rated_plus:'⭐', top_rated:'✦', rising:'🚀' };
  const tierIcon    = tierIcons[profile.tierKey] || '';
  const tierHtml    = tierClass !== 'tier-new'
    ? `<div class="tier-badge ${tierClass}">${tierIcon} ${profile.tier || ''}</div>` : '';

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
        <div class="pending-desc">Click below to open your Upwork profile, then click <strong>Sync to Snag AI</strong> button that appears on the page.</div>
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

  // Profile Strength calculation
  (function() {
    let sc = 0, reasons = [], gaps = [];
    const bioL    = (profile.bio || '').trim().length;
    const jssN    = parseInt(String(profile.jss || '0').replace(/[^0-9]/g, '')) || 0;
    const portsOk = (portfolios || []).filter(p => p.urls && p.urls.some(u => u && u.trim())).length;
    if (bioL > 150)            { sc += 20; reasons.push('Detailed bio (' + bioL + ' chars)'); }
    else if (bioL > 50)        { sc += 10; gaps.push('Expand bio to 150+ chars'); }
    else                       {           gaps.push('Add a bio to your profile'); }
    if (skillsArr.length >= 8) { sc += 20; reasons.push(skillsArr.length + ' skills synced'); }
    else if (skillsArr.length > 0) { sc += 10; gaps.push('Sync more skills from Upwork'); }
    else                       {           gaps.push('Visit Upwork profile to sync skills'); }
    if (portsOk >= 3)          { sc += 30; reasons.push(portsOk + ' portfolio links'); }
    else if (portsOk > 0)      { sc += portsOk * 10; gaps.push('Add ' + (3 - portsOk) + ' more portfolio links'); }
    else                       {           gaps.push('Add portfolio links'); }
    if (jssN >= 90)            { sc += 15; reasons.push(jssN + '% JSS'); }
    else if (jssN > 0)         { sc += 8;  gaps.push('Improve JSS above 90%'); }
    if ((profile.title || '').trim().length > 5) { sc += 10; reasons.push('Title set'); }
    else                       {           gaps.push('Add your professional title'); }
    if (profile.hourlyRate)    { sc += 5; }
    sc = Math.min(100, sc);
    const col = sc >= 80 ? '#4ade80' : sc >= 55 ? '#e8a020' : '#f87171';
    const lbl = sc >= 80 ? 'Strong' : sc >= 55 ? 'Good' : 'Needs work';
    const reasonsHtml = reasons.length
      ? '<div class="ps-reasons">' + reasons.map(r => '<span class="ps-reason">✓ ' + r + '</span>').join('') + '</div>'
      : '';
    const gapsHtml = gaps.length
      ? '<div class="ps-gaps">' + gaps.slice(0, 2).map(g => '<span class="ps-gap">↗ ' + g + '</span>').join('') + '</div>'
      : '';
    card._psHtml = '<div class="ps-wrap">'
      + '<div class="ps-header"><span class="ps-title">Profile Strength</span>'
      + '<span class="ps-score" style="color:' + col + '">' + sc + '% · ' + lbl + '</span></div>'
      + '<div class="ps-track"><div class="ps-fill" style="width:' + sc + '%;background:' + col + '"></div></div>'
      + reasonsHtml + gapsHtml + '</div>';
  })();
  const psHtml = card._psHtml || '';

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
        </div>
      </div>
      <button class="btn-delete" title="Remove profile" style="margin-top:2px">×</button>
    </div>

    ${psHtml}
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

      <div class="profile-section">
        <div class="profile-section-hdr">
          <span class="profile-section-title">Skills</span>
          <span class="profile-section-count">${skillsArr.length} detected</span>
        </div>
        <div class="skills-wrap" id="skills-wrap-${idx}"></div>
        <div style="font-size:11px;color:var(--white3);margin-top:6px">Profile sync reads your own Upwork profile only when you click Sync. Snag AI never submits proposals on your behalf.</div>
      </div>

      <div class="profile-section">
        <div class="portfolio-section-hdr">
          <span class="profile-section-title">Portfolio <span style="font-weight:400;opacity:.6">(${portfolios.length})</span></span>
          <div style="display:flex;align-items:center;gap:8px">
            ${profile._portfolioSyncedAt
              ? `<span style="font-size:10px;color:var(--white3)">Synced ${new Date(profile._portfolioSyncedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>`
              : `<span style="font-size:10px;color:var(--yellow)">⚠ Not synced</span>`}
            <button class="btn-sync-portfolios" id="sync-port-${idx}">⟳ Open & Re-sync</button>
            <button class="btn-port-add" data-action="add-port">+ Add</button>
          </div>
        </div>
        <div class="port-grid" id="port-list-${idx}"></div>
        ${!portfolios.length ? `<div class="port-empty-msg">No portfolio items yet. Add them manually or visit your Upwork profile page.</div>` : ''}
      </div>
    </div>
  `;

  renderSkillsExpand(card.querySelector(`#skills-wrap-${idx}`), skillsArr);

  const portList = card.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItem(portList, p, pi, allProfiles, idx));

  card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
    const profileId = profile.id || ('profile_' + (idx + 1));
    chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId }, () => {
      renderProfilesPage();
    });
  });

  card.querySelector(`#sync-port-${idx}`)?.addEventListener('click', () => {
    if (!profile.url) return;
    const btn = card.querySelector(`#sync-port-${idx}`);
    if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }
    chrome.tabs.create({ url: profile.url });
    setTimeout(() => { if (btn) { btn.textContent = '⟳ Open & Re-sync'; btn.disabled = false; } }, 3000);
  });

  card.querySelector('.btn-delete')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    const removedId = profile.id;
    allProfiles.splice(idx, 1);
    chrome.storage.local.set({ registeredProfiles: allProfiles });
    if (removedId) chrome.storage.local.remove('profileFull_' + removedId);
    renderProfilesPage();
  });

  card.querySelector('[data-action="add-port"]')?.addEventListener('click', () => {
    const newItem = { title: '', urls: [], desc: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi = allProfiles[idx].portfolios.length - 1;
    portList.querySelector('.port-empty-msg')?.remove();
    renderPortfolioItem(portList, newItem, pi, allProfiles, idx, true);
  });

  card.querySelectorAll('.edit-val').forEach(el => el.addEventListener('blur', () => saveCard(card, idx, allProfiles)));

  container.appendChild(card);
}

// ── Slider navigation ─────────────────────────────────────────────────────────
export function goToSlide(idx) {
  state.currentSlide = idx;
  document.querySelectorAll('.profile-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.slider-dot').forEach((d, i)  => d.classList.toggle('active', i === idx));
}

// ── Profiles page (main entry point) ─────────────────────────────────────────
export async function renderProfilesPage() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'])
  ]);
  const userPlan          = syncStored.userPlan || 'free';
  const registeredProfiles = localStored.registeredProfiles || [];
  const primaryProfileId  = localStored.primaryProfileId || null;

  const registered = registeredProfiles.filter(p => p && p.url);
  const localKeys  = registered.map(p => p.id ? 'profileFull_' + p.id : null).filter(Boolean);
  const localFull  = localKeys.length
    ? await new Promise(resolve => chrome.storage.local.get(localKeys, resolve))
    : {};

  const mergedProfiles = registered.map(p => {
    const full = p.id ? localFull['profileFull_' + p.id] : null;
    return full ? { ...p, ...full } : p;
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
      slide.className = 'profile-slide' + (i === state.currentSlide ? ' active' : '');
      slide.id = 'slide-' + i;
      renderProfileCard(slide, p, i, mergedProfiles, primaryProfileId);
      slides.appendChild(slide);
    });
    wrap.appendChild(slides);

    const ctrl = document.createElement('div');
    ctrl.className = 'slider-controls';
    ctrl.innerHTML = `<button class="slider-arr" id="sl-prev">‹</button>`;
    mergedProfiles.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === state.currentSlide ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      ctrl.appendChild(dot);
    });
    ctrl.innerHTML += `<button class="slider-arr" id="sl-next">›</button>`;
    wrap.appendChild(ctrl);
    container.appendChild(wrap);

    document.getElementById('sl-prev')?.addEventListener('click', () => goToSlide(Math.max(0, state.currentSlide - 1)));
    document.getElementById('sl-next')?.addEventListener('click', () => goToSlide(Math.min(registered.length - 1, state.currentSlide + 1)));
  }
}
