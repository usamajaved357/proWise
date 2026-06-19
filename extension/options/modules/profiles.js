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

// ── Job Filters — defaults, presets, renderer ─────────────────────────────────
const JF_DEFAULTS = {
  maxProposals: 50, maxInterviewing: 3, maxInvitesSent: 5,
  minClientRating: 4.0, minHireRate: 30, minClientSpent: 0,
  requirePaymentVerified: false, warnZeroSpent: true,
  maxRateMismatch: 50, maxJobAgeDays: 7,
  minSkillMatch: 30, warnLocationFilter: true, warnTierMismatch: true,
  minAlertScore: 60, autoSkipHired: true,
};
const JF_PRESETS = {
  conservative: { maxProposals: 20, maxInterviewing: 1, maxInvitesSent: 3, minClientRating: 4.5, minHireRate: 50, minClientSpent: 1000, requirePaymentVerified: true, warnZeroSpent: true, maxRateMismatch: 30, maxJobAgeDays: 3, minSkillMatch: 50, warnLocationFilter: true, warnTierMismatch: true, minAlertScore: 70, autoSkipHired: true },
  balanced:     { ...JF_DEFAULTS },
  aggressive:   { maxProposals: 50, maxInterviewing: 5, maxInvitesSent: 10, minClientRating: 3.0, minHireRate: 15, minClientSpent: 0, requirePaymentVerified: false, warnZeroSpent: false, maxRateMismatch: 80, maxJobAgeDays: 0, minSkillMatch: 10, warnLocationFilter: false, warnTierMismatch: false, minAlertScore: 40, autoSkipHired: false },
};

function jfFmt(id, raw) {
  raw = parseInt(raw);
  switch (id) {
    case 'maxProposals':    return raw >= 50 ? '50+' : String(raw);
    case 'maxInterviewing': return raw === 0 ? 'Off' : raw + '+';
    case 'maxInvitesSent':  return raw === 0 ? 'Off' : raw + '+';
    case 'minClientRating': return (raw / 10).toFixed(1) + '★';
    case 'minHireRate':     return raw + '%';
    case 'maxRateMismatch': return raw + '%↑';
    case 'maxJobAgeDays':   return raw === 0 ? 'Any' : raw === 1 ? '24h' : raw + 'd';
    case 'minSkillMatch':   return raw + '%';
    case 'minAlertScore':   return '< ' + raw;
    default:                return String(raw);
  }
}

function jfTrack(sl) {
  const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
  sl.style.background = `linear-gradient(to right,var(--gold) ${pct}%,rgba(255,255,255,.08) ${pct}%)`;
}

function jfBadgeInfo(filters) {
  const custom = Object.keys(JF_DEFAULTS).filter(k => {
    const a = filters[k]; const b = JF_DEFAULTS[k];
    return a !== undefined && JSON.stringify(a) !== JSON.stringify(b);
  });
  return { text: custom.length ? custom.length + ' custom' : 'Default', def: !custom.length };
}

function renderJobFilters(body, profile) {
  if (!profile?.id || !body) return;
  const F = { ...JF_DEFAULTS, ...(profile.jobFilters || {}) };

  function sl(id, label, min, max, step, val, desc) {
    const pct = ((val - min) / (max - min)) * 100;
    const trackBg = `linear-gradient(to right,var(--gold) ${pct}%,rgba(255,255,255,.08) ${pct}%)`;
    return `
      <div class="jf-sl-row">
        <div class="jf-sl-hdr">
          <span class="jf-sl-name">${label}</span>
          <span class="jf-sl-val" id="jv-${id}">${jfFmt(id, val)}</span>
        </div>
        <input type="range" class="jf-sl" id="js-${id}" min="${min}" max="${max}" step="${step}" value="${val}" style="background:${trackBg}">
        <div class="jf-sl-hint">${desc}</div>
      </div>`;
  }

  function tog(id, label, val, desc) {
    return `
      <label class="jf-tog-item">
        <div class="jf-tog-text">
          <span class="jf-tog-name">${label}</span>
          <span class="jf-tog-hint">${desc}</span>
        </div>
        <div class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" id="jt-${id}" ${val ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </div>
      </label>`;
  }

  body.innerHTML = `
    <div class="jf-presets-row">
      <span class="jf-presets-lbl">Preset</span>
      <button class="jf-preset-btn" data-preset="conservative">Conservative</button>
      <button class="jf-preset-btn" data-preset="balanced">Balanced</button>
      <button class="jf-preset-btn" data-preset="aggressive">Aggressive</button>
      <button class="jf-reset-btn" id="jf-reset">Reset</button>
    </div>

    <div class="jf-section-lbl">Competition</div>
    ${sl('maxProposals',    'Max proposals',    5,  55,  5, Math.min(F.maxProposals, 55), 'Warn if job has more bids than this')}
    ${sl('maxInterviewing', 'Max interviewing', 0,  10,  1, F.maxInterviewing,            'Warn if this many freelancers are already shortlisted (0 = off)')}
    ${sl('maxInvitesSent',  'Max invites sent', 0,  15,  1, F.maxInvitesSent,             'Warn if client sent this many direct invites (0 = off)')}

    <div class="jf-section-lbl">Client Quality</div>
    ${sl('minClientRating', 'Min client rating', 10, 50, 5, Math.round(F.minClientRating * 10), 'Warn if client rating is below this (1.0 – 5.0★)')}
    ${sl('minHireRate',     'Min hire rate',     0, 100, 5, F.minHireRate, 'Warn if client hires less than this % from proposals')}
    <div class="jf-sl-row">
      <div class="jf-sl-hdr"><span class="jf-sl-name">Min client spent</span></div>
      <select class="jf-select" id="js-minClientSpent">
        <option value="0"      ${F.minClientSpent===0      ?'selected':''}>Any amount</option>
        <option value="100"    ${F.minClientSpent===100    ?'selected':''}>$100+ spent</option>
        <option value="1000"   ${F.minClientSpent===1000   ?'selected':''}>$1K+ spent</option>
        <option value="10000"  ${F.minClientSpent===10000  ?'selected':''}>$10K+ spent</option>
        <option value="100000" ${F.minClientSpent===100000 ?'selected':''}>$100K+ spent</option>
      </select>
      <div class="jf-sl-hint">Warn if client has spent less than this on Upwork total</div>
    </div>
    <div class="jf-togs-grid">
      ${tog('warnZeroSpent',          'Warn on $0 clients',     F.warnZeroSpent,          'Never hired anyone on Upwork')}
      ${tog('requirePaymentVerified', 'Payment verified',       F.requirePaymentVerified, 'Warn if payment not verified')}
    </div>

    <div class="jf-section-lbl">Rate, Age & Match</div>
    ${sl('maxRateMismatch', 'Max rate mismatch',  10, 100, 10, F.maxRateMismatch, "Warn if your rate is this % above client's avg paid rate")}
    ${sl('maxJobAgeDays',   'Max job age (days)',  0,  14,  1, F.maxJobAgeDays,   'Warn if older than this — 0 = any age')}
    ${sl('minSkillMatch',   'Min skill match',     0,  80, 10, F.minSkillMatch,   'Warn if skill overlap with job is below this %')}

    <div class="jf-section-lbl">Job Requirements</div>
    <div class="jf-togs-grid">
      ${tog('warnLocationFilter', 'Location filter',   F.warnLocationFilter, 'Warn if job restricts to a region you may not be in')}
      ${tog('warnTierMismatch',   'Tier requirement',  F.warnTierMismatch,   'Warn if job requires Top Rated/Expert tier you don\'t have')}
    </div>

    <div class="jf-section-lbl">Alert Behaviour</div>
    ${sl('minAlertScore', 'Show alert if score below', 30, 80, 5, F.minAlertScore, 'Show the warning screen when combined win score is under this')}
    <div class="jf-togs-grid">
      ${tog('autoSkipHired', 'Auto-skip if hired', F.autoSkipHired, 'Close panel instantly if someone already hired')}
    </div>
  `;

  function readFilters() {
    const s = id => parseInt(body.querySelector('#js-' + id)?.value ?? 0);
    const t = id => body.querySelector('#jt-' + id)?.checked ?? false;
    return {
      maxProposals:           s('maxProposals'),
      maxInterviewing:        s('maxInterviewing'),
      maxInvitesSent:         s('maxInvitesSent'),
      minClientRating:        s('minClientRating') / 10,
      minHireRate:            s('minHireRate'),
      minClientSpent:         parseInt(body.querySelector('#js-minClientSpent')?.value ?? 0),
      requirePaymentVerified: t('requirePaymentVerified'),
      warnZeroSpent:          t('warnZeroSpent'),
      maxRateMismatch:        s('maxRateMismatch'),
      maxJobAgeDays:          s('maxJobAgeDays'),
      minSkillMatch:          s('minSkillMatch'),
      warnLocationFilter:     t('warnLocationFilter'),
      warnTierMismatch:       t('warnTierMismatch'),
      minAlertScore:          s('minAlertScore'),
      autoSkipHired:          t('autoSkipHired'),
    };
  }

  function save() {
    const f = readFilters();
    chrome.storage.local.get(['profileFull_' + profile.id], d => {
      chrome.storage.local.set({ ['profileFull_' + profile.id]: { ...(d['profileFull_' + profile.id] || {}), jobFilters: f } });
    });
  }

  const SL_IDS = ['maxProposals','maxInterviewing','maxInvitesSent','minClientRating','minHireRate','maxRateMismatch','maxJobAgeDays','minSkillMatch','minAlertScore'];
  const TG_IDS = ['warnZeroSpent','requirePaymentVerified','warnLocationFilter','warnTierMismatch','autoSkipHired'];

  function applyPreset(name) {
    const P = JF_PRESETS[name]; if (!P) return;
    SL_IDS.forEach(id => {
      let val = id === 'minClientRating' ? Math.round(P[id] * 10) : id === 'maxProposals' ? Math.min(P[id], 55) : P[id];
      const el = body.querySelector('#js-' + id);
      if (el) { el.value = val; jfTrack(el); const v = body.querySelector('#jv-' + id); if (v) v.textContent = jfFmt(id, val); }
    });
    TG_IDS.forEach(id => { const el = body.querySelector('#jt-' + id); if (el) el.checked = P[id]; });
    const sp = body.querySelector('#js-minClientSpent'); if (sp) sp.value = P.minClientSpent;
    body.querySelectorAll('.jf-preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === name));
    save();
  }

  // Events
  body.querySelectorAll('.jf-sl').forEach(el => {
    el.addEventListener('input', () => {
      jfTrack(el);
      const id = el.id.replace('js-', '');
      const v = body.querySelector('#jv-' + id);
      if (v) v.textContent = jfFmt(id, parseInt(el.value));
      body.querySelectorAll('.jf-preset-btn').forEach(b => b.classList.remove('active'));
    });
    el.addEventListener('change', save);
  });
  body.querySelectorAll('[id^="jt-"], #js-minClientSpent').forEach(el => {
    el.addEventListener('change', () => { body.querySelectorAll('.jf-preset-btn').forEach(b => b.classList.remove('active')); save(); });
  });
  body.querySelectorAll('.jf-preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));
  body.querySelector('#jf-reset')?.addEventListener('click', () => applyPreset('balanced'));

  // Highlight active preset on load
  ['conservative','balanced','aggressive'].forEach(name => {
    const P = JF_PRESETS[name];
    const match = Object.keys(JF_DEFAULTS).every(k => {
      const a = F[k] ?? JF_DEFAULTS[k]; const b = P[k] ?? JF_DEFAULTS[k];
      return typeof a === 'number' ? Math.abs(a - b) < 0.01 : a === b;
    });
    if (match) body.querySelector(`[data-preset="${name}"]`)?.classList.add('active');
  });
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

// ── Portfolio item v2 — compact card + ··· menu + inline edit ────────────────
function renderPortfolioItemV2(list, p, pi, allProfiles, profileIdx, autoOpen) {
  const item = document.createElement('div');
  item.className = 'port-v2-card';
  item.dataset.pi = pi;

  const skills = Array.isArray(p.skills) ? p.skills
    : (typeof p.skills === 'string' && p.skills.trim()) ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  function savePortfolios() {
    const localKey = 'profileFull_' + (allProfiles[profileIdx]?.id);
    if (!localKey || localKey === 'profileFull_undefined') return;
    chrome.storage.local.get([localKey], d => {
      chrome.storage.local.set({ [localKey]: { ...(d[localKey] || {}), portfolios: allProfiles[profileIdx]?.portfolios || [] } });
    });
  }

  function renderNormal() {
    item.classList.remove('editing');
    const hasLinks   = p.urls && p.urls.some(u => u && u.trim());
    const firstUrl   = hasLinks ? (p.urls || []).find(u => u.trim()) : null;
    const domain     = firstUrl ? firstUrl.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') : null;
    const skillCount = skills.length;
    item.innerHTML =
      '<div class="port-v2-top ' + (hasLinks ? 'port-v2-top-gold' : 'port-v2-top-blue') + '"></div>' +
      '<div class="port-v2-body">' +
        '<div class="port-v2-title">' + _esc(p.title || 'Untitled') + '</div>' +
        '<div class="port-v2-meta-row">' +
          '<span class="port-v2-link-lbl">' + (domain ? '🔗 ' + domain : '<span style="font-style:italic;opacity:.5">No link</span>') + '</span>' +
          (skillCount > 0 ? '<span class="port-v2-skill-count">' + skillCount + ' skills</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="port-v2-menu" aria-label="Options">' +
        '<div class="port-v2-mdot"></div><div class="port-v2-mdot"></div><div class="port-v2-mdot"></div>' +
      '</button>';

    item.querySelector('.port-v2-menu').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.port-v2-drop').forEach(d => d.remove());
      const drop = document.createElement('div');
      drop.className = 'port-v2-drop';
      drop.innerHTML =
        '<button class="port-v2-drop-item port-v2-drop-edit"><i class="ti ti-edit" style="font-size:13px" aria-hidden="true"></i> Edit</button>' +
        '<button class="port-v2-drop-item port-v2-drop-del"><i class="ti ti-trash" style="font-size:13px" aria-hidden="true"></i> Delete</button>';
      item.appendChild(drop);
      drop.querySelector('.port-v2-drop-edit').addEventListener('click', e2 => { e2.stopPropagation(); drop.remove(); renderEdit(); });
      drop.querySelector('.port-v2-drop-del').addEventListener('click', e2 => {
        e2.stopPropagation(); drop.remove();
        allProfiles[profileIdx]?.portfolios?.splice(pi, 1);
        item.remove();
        savePortfolios();
      });
      const close = () => { drop.remove(); document.removeEventListener('click', close); };
      setTimeout(() => document.addEventListener('click', close), 0);
    });
  }

  function renderEdit() {
    item.classList.add('editing');
    const urlsHtml = (p.urls && p.urls.length ? p.urls : ['']).map(u =>
      '<div class="port-v2-url-row"><input type="url" class="port-v2-url-inp" value="' + _esc(u) + '" placeholder="https://..."><button class="port-v2-url-del" type="button">×</button></div>'
    ).join('');
    const skillsHtml = skills.length
      ? skills.map(s => '<span class="port-v2-skill-tag">' + _esc(s) + '</span>').join('')
      : '<span style="font-size:10.5px;color:rgba(240,238,234,.25)">Sync from Upwork profile to populate.</span>';

    item.innerHTML =
      '<div class="port-v2-top port-v2-top-edit"></div>' +
      '<div class="port-v2-edit-hdr">' +
        '<input type="text" class="port-v2-title-inp" value="' + _esc(p.title || '') + '" placeholder="Project name">' +
        '<button class="port-v2-done" type="button">✓ Done</button>' +
      '</div>' +
      '<div class="port-v2-edit-body">' +
        '<span class="port-v2-edit-lbl">Links</span>' +
        '<div class="port-v2-urls-list">' + urlsHtml + '</div>' +
        '<button class="port-v2-add-url" type="button">+ Add link</button>' +
        '<span class="port-v2-edit-lbl">Description</span>' +
        '<textarea class="port-v2-desc-inp" rows="2" placeholder="Brief description…">' + _esc(p.desc || '') + '</textarea>' +
        '<span class="port-v2-edit-lbl">Skills <span style="font-size:9px;opacity:.45;font-weight:400">(auto-synced)</span></span>' +
        '<div class="port-v2-skills-ro">' + skillsHtml + '</div>' +
      '</div>';

    item.querySelectorAll('.port-v2-url-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const ul = item.querySelector('.port-v2-urls-list');
        if (ul.querySelectorAll('.port-v2-url-row').length > 1) btn.closest('.port-v2-url-row').remove();
      });
    });
    item.querySelector('.port-v2-add-url').addEventListener('click', () => {
      const ul = item.querySelector('.port-v2-urls-list');
      const row = document.createElement('div'); row.className = 'port-v2-url-row';
      row.innerHTML = '<input type="url" class="port-v2-url-inp" placeholder="https://..."><button class="port-v2-url-del" type="button">×</button>';
      row.querySelector('.port-v2-url-del').addEventListener('click', () => { if (ul.querySelectorAll('.port-v2-url-row').length > 1) row.remove(); });
      ul.appendChild(row); row.querySelector('input').focus();
    });
    item.querySelector('.port-v2-done').addEventListener('click', () => {
      p.title = item.querySelector('.port-v2-title-inp').value.trim();
      p.desc  = item.querySelector('.port-v2-desc-inp').value.trim();
      p.urls  = [...item.querySelectorAll('.port-v2-url-inp')].map(i => i.value.trim()).filter(Boolean);
      if (allProfiles[profileIdx]) {
        allProfiles[profileIdx].portfolios = allProfiles[profileIdx].portfolios || [];
        allProfiles[profileIdx].portfolios[pi] = p;
      }
      savePortfolios();
      renderNormal();
    });
  }

  if (autoOpen) renderEdit(); else renderNormal();
  list.appendChild(item);
}

// ── Profile card renderer (Option B design) ───────────────────────────────────
export function renderProfileCard(container, profile, idx, allProfiles, primaryProfileId) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const synced        = !!(profile.name || profile.jss || profile._readAt);
  const validProfiles = allProfiles.filter(p => p && p.url);
  const isPrimary     = validProfiles.length <= 1
    ? true : (primaryProfileId ? profile.id === primaryProfileId : idx === 0);
  const skillsArr     = getSkillsArr(profile);
  const portfolios    = profile.portfolios || [];

  // Pending state
  if (!synced) {
    card.innerHTML = `
      <div class="pcv2-pending">
        <div class="pcv2-pending-icon">🔄</div>
        <div class="pcv2-pending-title">Not synced yet</div>
        <div class="pcv2-pending-desc">Open your Upwork profile and click the <strong>Sync to Snag AI</strong> button that appears on the page.</div>
        <div style="font-size:11px;color:var(--white3);word-break:break-all">${profile.url}</div>
        <div style="display:flex;gap:8px">
          <button class="btn-primary" id="open-pending-${idx}">Open profile →</button>
          <button class="btn-delete" style="font-size:13px;padding:8px 14px">Remove</button>
        </div>
      </div>`;
    card.querySelector(`#open-pending-${idx}`)?.addEventListener('click', () => chrome.tabs.create({ url: profile.url }));
    card.querySelector('.btn-delete')?.addEventListener('click', () => {
      if (!confirm('Remove this profile?')) return;
      const id = profile.id; allProfiles.splice(idx, 1);
      chrome.storage.local.set({ registeredProfiles: allProfiles });
      if (id) chrome.storage.local.remove('profileFull_' + id);
      renderProfilesPage();
    });
    container.appendChild(card); return;
  }

  // Profile strength
  const jssN    = parseInt(String(profile.jss || '0').replace(/[^0-9]/g, '')) || 0;
  const portsOk = portfolios.filter(p => p.urls && p.urls.some(u => u && u.trim())).length;
  const bioL    = (profile.bio || '').trim().length;
  let sc = 0;
  if (bioL > 150) sc += 20; else if (bioL > 50) sc += 10;
  if (skillsArr.length >= 8) sc += 20; else if (skillsArr.length > 0) sc += 10;
  if (portsOk >= 3) sc += 30; else sc += portsOk * 10;
  if (jssN >= 90) sc += 15; else if (jssN > 0) sc += 8;
  if ((profile.title || '').trim().length > 5) sc += 10;
  if (profile.hourlyRate) sc += 5;
  sc = Math.min(100, sc);
  const strCol = sc >= 80 ? '#4ade80' : sc >= 55 ? '#e8a020' : '#f87171';
  const strLbl = sc >= 80 ? 'Strong' : sc >= 55 ? 'Good' : 'Needs work';

  // JSS ring
  const circ      = 175.9;
  const dashOff   = jssN > 0 ? circ * (1 - jssN / 100) : circ;
  const ringColor = jssN >= 80 ? '#c9a84c' : jssN >= 60 ? '#facc15' : jssN > 0 ? '#f87171' : 'rgba(255,255,255,.12)';

  // Tier badge
  const tierMap  = { expert: ['pcv2-tier-purple','⚡ Expert Vetted'], top_rated_plus: ['pcv2-tier-gold','⭐ Top Rated Plus'], top_rated: ['pcv2-tier-green','✦ Top Rated'], rising: ['pcv2-tier-blue','🚀 Rising Talent'] };
  const [tierCls, tierTxt] = tierMap[profile.tierKey] || [];
  const tierHtml = tierCls ? `<span class="pcv2-tier ${tierCls}">${tierTxt}</span>` : '';

  // Meta line
  const meta = [profile.country, profile.rate, profile.jobs ? profile.jobs + ' jobs' : '', profile.earnings].filter(Boolean).join(' · ');

  // Strip values
  const readAt = profile._readAt ? new Date(profile._readAt).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—';
  const avail  = (profile.extra || '').split('·')[0].trim() || profile.hours ? profile.hours + ' hrs' : '—';

  card.innerHTML = `
    <div class="pcv2-hdr">
      <div class="pcv2-ring">
        <svg viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>
          <circle cx="34" cy="34" r="28" fill="none" stroke="${ringColor}" stroke-width="6"
            stroke-dasharray="${circ}" stroke-dashoffset="${dashOff.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 34 34)"/>
        </svg>
        <div class="pcv2-ring-num" style="color:${ringColor}">${jssN > 0 ? jssN + '%' : '—'}</div>
      </div>
      <div class="pcv2-info">
        <div class="pcv2-name-row">
          <span class="pcv2-name">${profile.name || 'Unknown'}</span>
          ${tierHtml}
          ${isPrimary && validProfiles.length > 1 ? '<span class="badge-primary">★ Primary</span>' : ''}
        </div>
        <div class="pcv2-meta">${meta || '—'}</div>
        <div class="pcv2-str-row">
          <div class="pcv2-str-bar"><div class="pcv2-str-fill" style="width:${sc}%;background:${strCol}"></div></div>
          <span class="pcv2-str-pct" style="color:${strCol}">${sc}% ${strLbl}</span>
          <span class="pcv2-str-lbl">strength</span>
        </div>
      </div>
      <div class="pcv2-actions">
        ${!isPrimary && validProfiles.length > 1 ? `<button class="btn-set-primary" id="btn-primary-${idx}">Set primary</button>` : ''}
        <button class="btn-resync" id="sync-profile-${idx}" title="Open & Sync">⟳ Sync</button>
        <button class="btn-delete" title="Remove profile">×</button>
      </div>
    </div>

    <div class="pcv2-strip">
      <div class="pcv2-strip-item">
        <div class="pcv2-strip-lbl">Availability</div>
        <div class="pcv2-strip-val">${(profile.extra || '').split('·')[0].trim() || '—'}</div>
      </div>
      <div class="pcv2-strip-div"></div>
      <div class="pcv2-strip-item">
        <div class="pcv2-strip-lbl">Total hours</div>
        <div class="pcv2-strip-val">${profile.hours || '—'}</div>
      </div>
      <div class="pcv2-strip-div"></div>
      <div class="pcv2-strip-item">
        <div class="pcv2-strip-lbl">Jobs done</div>
        <div class="pcv2-strip-val">${profile.jobs || '—'}</div>
      </div>
      <div class="pcv2-strip-div"></div>
      <div class="pcv2-strip-item">
        <div class="pcv2-strip-lbl">Last synced</div>
        <div class="pcv2-strip-val">${readAt}</div>
      </div>
    </div>

    <div class="pcv2-section">
      <div class="pcv2-sec-hdr">
        <span class="pcv2-sec-title">Skills · ${skillsArr.length} detected</span>
      </div>
      <div class="skills-wrap" id="skills-wrap-${idx}"></div>
    </div>

    <div class="pcv2-section">
      <button class="jf-open-btn" id="jf-btn-${idx}">
        <div class="jf-open-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </div>
        <div class="jf-open-text">
          <span class="jf-open-title">Job Filters</span>
          <span class="jf-open-sub">Competition · Client Quality · Rate · Alert behaviour</span>
        </div>
        <svg class="jf-open-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div id="jf-body-${idx}" style="display:none;margin-top:16px"></div>
    </div>

    <div class="pcv2-section">
      <div class="pcv2-sec-hdr">
        <span class="pcv2-sec-title">Portfolio · ${portfolios.length}</span>
        <button class="btn-port-add" data-action="add-port">+ Add</button>
      </div>
      <div class="pcv2-port-grid" id="port-list-${idx}"></div>
      ${!portfolios.length ? '<div class="port-empty-msg" style="grid-column:1/-1;margin-top:4px">No portfolio items yet — click + Add or visit your Upwork profile.</div>' : ''}
    </div>
  `;

  // Skills
  renderSkillsExpand(card.querySelector(`#skills-wrap-${idx}`), skillsArr);

  // Portfolio
  const portList = card.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItemV2(portList, p, pi, allProfiles, idx));

  // Add portfolio
  card.querySelector('[data-action="add-port"]')?.addEventListener('click', () => {
    const newItem = { title: '', urls: [], desc: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi = allProfiles[idx].portfolios.length - 1;
    portList.querySelector('.port-empty-msg')?.remove();
    renderPortfolioItemV2(portList, newItem, pi, allProfiles, idx, true);
  });

  // Sync
  card.querySelector(`#sync-profile-${idx}`)?.addEventListener('click', () => {
    if (!profile.url) return;
    chrome.tabs.create({ url: profile.url });
  });

  // Set primary
  card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId: profile.id }, () => renderProfilesPage());
  });

  // Delete
  card.querySelector('.btn-delete')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    const id = profile.id; allProfiles.splice(idx, 1);
    chrome.storage.local.set({ registeredProfiles: allProfiles });
    if (id) chrome.storage.local.remove('profileFull_' + id);
    renderProfilesPage();
  });

  container.appendChild(card);

  // Job filters
  const jfBody = card.querySelector(`#jf-body-${idx}`);
  renderJobFilters(jfBody, profile);
  card.querySelector(`#jf-btn-${idx}`)?.addEventListener('click', () => {
    const isOpen = jfBody.style.display !== 'none';
    jfBody.style.display = isOpen ? 'none' : 'block';
    card.querySelector(`#jf-btn-${idx}`)?.classList.toggle('jf-open-btn--active', !isOpen);
    card.querySelector('.jf-open-chevron')?.style.setProperty('transform', isOpen ? '' : 'rotate(180deg)');
  });
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
