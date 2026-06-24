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
  sl.style.background = `linear-gradient(to right,#6366f1 ${pct}%,rgba(255,255,255,.08) ${pct}%)`;
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
    const bg = `linear-gradient(to right,#6366f1 ${pct}%,rgba(255,255,255,.08) ${pct}%)`;
    return `<div class="jf-row2">
      <span class="jf-row2-name">${label}</span>
      <div class="jf-row2-right">
        <input type="range" class="jf-sl jf-sl-compact" id="js-${id}" min="${min}" max="${max}" step="${step}" value="${val}" title="${desc}" style="background:${bg}">
        <span class="jf-row2-val" id="jv-${id}">${jfFmt(id, val)}</span>
      </div>
    </div>`;
  }

  function tog(id, label, val, desc) {
    return `<div class="jf-row2">
      <span class="jf-row2-name">${label}</span>
      <div class="jf-row2-right">
        <div class="jf-tog-sm ${val ? 'on' : 'off'}" id="jv-tog-${id}" title="${desc}" onclick="this.classList.toggle('on');this.classList.toggle('off');var cb=document.getElementById('jt-${id}');if(cb)cb.checked=this.classList.contains('on')">
          <div class="jf-tok"></div>
        </div>
        <input type="checkbox" id="jt-${id}" ${val ? 'checked' : ''} style="display:none">
      </div>
    </div>`;
  }

  const ICK = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  body.innerHTML = `
    <div class="jf-seg">
      <div class="jf-seg-opt" data-preset="conservative">
        <div class="jf-seg-ck">${ICK}</div>
        <div class="jf-seg-txt"><div class="jf-seg-name">Conservative</div><div class="jf-seg-sub">Protect Connects</div></div>
      </div>
      <div class="jf-seg-opt jf-active" data-preset="balanced">
        <div class="jf-seg-ck">${ICK}</div>
        <div class="jf-seg-txt"><div class="jf-seg-name">Balanced</div><div class="jf-seg-sub">Recommended</div></div>
      </div>
      <div class="jf-seg-opt" data-preset="aggressive">
        <div class="jf-seg-ck">${ICK}</div>
        <div class="jf-seg-txt"><div class="jf-seg-name">Aggressive</div><div class="jf-seg-sub">Apply broadly</div></div>
      </div>
    </div>

    <div class="jf-groups">
      <div class="jf-group">
        <div class="jf-group-lbl">Competition</div>
        ${sl('maxProposals',    'Max proposals',    5,  55,  5, Math.min(F.maxProposals, 55), 'Warn if job has more bids than this')}
        ${sl('maxInterviewing', 'Max interviewing', 0,  10,  1, F.maxInterviewing,            'Warn if this many are shortlisted')}
        ${sl('maxInvitesSent',  'Max invites sent', 0,  15,  1, F.maxInvitesSent,             'Warn if client sent this many invites')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">Client quality</div>
        ${sl('minHireRate',     'Min hire rate',    0, 100,  5, F.minHireRate,                'Warn if client hires less than this %')}
        ${sl('minClientRating', 'Min rating',      10,  50,  5, Math.round(F.minClientRating * 10), 'Warn if rating below this')}
        ${tog('requirePaymentVerified', 'Payment verified', F.requirePaymentVerified, 'Warn if payment not verified')}
        ${tog('warnZeroSpent',          'Warn $0 clients',  F.warnZeroSpent,          'Warn if client never spent on Upwork')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">Match &amp; age</div>
        ${sl('minSkillMatch',   'Min skill match',  0,  80, 10, F.minSkillMatch,   'Warn if skill overlap below this %')}
        ${sl('maxRateMismatch', 'Rate mismatch',   10, 100, 10, F.maxRateMismatch, 'Warn if your rate is this % above avg')}
        ${sl('maxJobAgeDays',   'Max job age',      0,  14,  1, F.maxJobAgeDays,   'Warn if older than this — 0 = any age')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">Alert behaviour</div>
        ${sl('minAlertScore', 'Min alert score', 30, 80, 5, F.minAlertScore, 'Show alert when score is under this')}
        ${tog('autoSkipHired',      'Auto-skip hired',    F.autoSkipHired,      'Close panel if someone already hired')}
        ${tog('warnLocationFilter', 'Location filter',    F.warnLocationFilter, 'Warn if job has location restrictions')}
        ${tog('warnTierMismatch',   'Tier mismatch',      F.warnTierMismatch,   'Warn if job requires a tier you lack')}
      </div>
    </div>

    <div class="jf-filter-footer">
      <button class="btn-reset-plain" id="jf-reset">Reset to balanced</button>
      <button class="btn-apply-filters" id="jf-save">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Apply filters
      </button>
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
      minClientSpent:         F.minClientSpent,
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
    TG_IDS.forEach(id => {
      const cb  = body.querySelector('#jt-' + id);
      const tog = body.querySelector('#jv-tog-' + id);
      if (cb)  cb.checked = P[id];
      if (tog) { tog.classList.toggle('on', P[id]); tog.classList.toggle('off', !P[id]); }
    });
    body.querySelectorAll('.jf-seg-opt').forEach(b => b.classList.toggle('jf-active', b.dataset.preset === name));
    save();
  }

  // Events — sliders
  body.querySelectorAll('.jf-sl').forEach(el => {
    el.addEventListener('input', () => {
      jfTrack(el);
      const id = el.id.replace('js-', '');
      const v = body.querySelector('#jv-' + id);
      if (v) v.textContent = jfFmt(id, parseInt(el.value));
      body.querySelectorAll('.jf-seg-opt').forEach(b => b.classList.remove('jf-active'));
    });
    el.addEventListener('change', save);
  });

  // Events — checkboxes (from toggle onclick already handles UI; just save on change)
  body.querySelectorAll('[id^="jt-"]').forEach(el => {
    el.addEventListener('change', () => {
      body.querySelectorAll('.jf-seg-opt').forEach(b => b.classList.remove('jf-active'));
      save();
    });
  });

  // Segment preset buttons
  body.querySelectorAll('.jf-seg-opt').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

  // Reset + Save
  body.querySelector('#jf-reset')?.addEventListener('click', () => applyPreset('balanced'));
  body.querySelector('#jf-save')?.addEventListener('click', () => { save(); });

  // Highlight active preset on load
  ['conservative','balanced','aggressive'].forEach(name => {
    const P = JF_PRESETS[name];
    const match = Object.keys(JF_DEFAULTS).every(k => {
      const a = F[k] ?? JF_DEFAULTS[k]; const b = P[k] ?? JF_DEFAULTS[k];
      return typeof a === 'number' ? Math.abs(a - b) < 0.01 : a === b;
    });
    if (match) {
      body.querySelectorAll('.jf-seg-opt').forEach(btn => btn.classList.toggle('jf-active', btn.dataset.preset === name));
    }
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
    const hasLinks = p.urls && p.urls.some(u => u && u.trim());
    const firstUrl = hasLinks ? (p.urls || []).find(u => u.trim()) : null;
    const domain   = firstUrl ? firstUrl.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') : null;
    item.classList.toggle('port-has-link', hasLinks);
    item.classList.toggle('port-no-link', !hasLinks);
    item.innerHTML =
      '<div class="pi-dot ' + (hasLinks ? 'pi-dot-g' : 'pi-dot-a') + '"></div>' +
      '<div class="pi-name">' + _esc(p.title || 'Untitled') + '</div>' +
      (domain
        ? '<div class="pi-url-lbl">' + _esc(domain) + '</div>'
        : '<div class="pi-no-url">+ Add URL</div>') +
      '<button class="pi-menu-btn" aria-label="Options">···</button>';

    item.querySelector('.pi-menu-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.port-v2-drop').forEach(d => d.remove());

      const btn  = item.querySelector('.port-v2-menu');
      const rect = btn.getBoundingClientRect();

      const drop = document.createElement('div');
      drop.className = 'port-v2-drop';
      drop.style.cssText = 'position:fixed;top:' + (rect.bottom + 4) + 'px;right:' + (window.innerWidth - rect.right) + 'px;z-index:99999';
      drop.innerHTML =
        '<button class="port-v2-drop-item port-v2-drop-edit">Edit</button>' +
        '<button class="port-v2-drop-item port-v2-drop-del">Delete</button>';
      document.body.appendChild(drop);

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

// ── Profile card renderer ─────────────────────────────────────────────────────
export function renderProfileCard(container, profile, idx, allProfiles, primaryProfileId) {
  const card = document.createElement('div');
  card.className = 'pr-detail';
  card.dataset.profileIdx = idx;

  const synced        = !!(profile.name || profile.jss || profile._readAt);
  const validProfiles = allProfiles.filter(p => p && p.url);
  const isPrimary     = validProfiles.length <= 1
    ? true : (primaryProfileId ? profile.id === primaryProfileId : idx === 0);
  const portfolios    = profile.portfolios || [];
  const portsOk       = portfolios.filter(p => p.urls && p.urls.some(u => u && u.trim())).length;

  function ini(name) {
    return (name || '').trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';
  }

  // Pending (not synced) state
  if (!synced) {
    card.innerHTML = `
      <div class="pr-hdr">
        <div class="pr-av pr-av-pending"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="pr-info">
          <div class="pr-name-row">
            <span class="pr-name" style="color:rgba(240,238,234,.38);font-size:15px">Not synced yet</span>
          </div>
          <div class="pr-meta" style="font-style:italic">${profile.url || ''}</div>
          <div class="pr-acts">
            <button class="btn-indigo" id="open-pending-${idx}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open &amp; Sync
            </button>
            ${!isPrimary && validProfiles.length > 1 ? `<button class="btn-indigo-outline" id="btn-primary-${idx}">★ Make Primary</button>` : ''}
            <button class="btn-icon-del" title="Remove profile"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button>
          </div>
        </div>
      </div>
      <div style="padding:28px 22px;text-align:center;border-top:1px solid var(--border)">
        <div style="width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(240,238,234,.12)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="font-size:13px;font-weight:700;color:rgba(240,238,234,.25);margin-bottom:5px">No data yet</div>
        <div style="font-size:11.5px;color:rgba(240,238,234,.15);line-height:1.7;max-width:300px;margin:0 auto">Click <strong style="color:rgba(240,238,234,.28)">Open &amp; Sync</strong> above, then click the "Sync Profile" pill in the bottom-right corner of the page.</div>
      </div>`;
    card.querySelector(`#open-pending-${idx}`)?.addEventListener('click', () => chrome.tabs.create({ url: profile.url }));
    card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId: profile.id }, () => renderProfilesPage());
    });
    card.querySelector('.btn-icon-del')?.addEventListener('click', () => {
      if (!confirm('Remove this profile?')) return;
      const id = profile.id; allProfiles.splice(idx, 1);
      chrome.storage.local.set({ registeredProfiles: allProfiles });
      if (id) chrome.storage.local.remove('profileFull_' + id);
      renderProfilesPage();
    });
    container.appendChild(card); return;
  }

  // Tier text for meta line
  const tierLabels = { expert: 'Expert Vetted', top_rated_plus: 'Top Rated Plus', top_rated: 'Top Rated', rising: 'Rising Talent' };
  const tierTxt    = tierLabels[profile.tierKey] || '';

  // Meta line: title · rate · tier · country
  const meta = [profile.title, profile.rate, tierTxt, profile.country].filter(Boolean).join(' · ');

  // Last synced
  const readAt = profile._readAt
    ? new Date(profile._readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const SYNC_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
  const DEL_ICON  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>';

  // Profile card — header + stats + synced footer only
  card.innerHTML = `
    <div class="pr-hdr">
      <div class="pr-av">${ini(profile.name)}</div>
      <div class="pr-info">
        <div class="pr-name-row">
          <span class="pr-name">${profile.name || 'Unknown'}</span>
          ${isPrimary && validProfiles.length > 1 ? '<span class="badge-primary">Primary</span>' : ''}
        </div>
        <div class="pr-meta">${meta || '—'}</div>
        ${!isPrimary && validProfiles.length > 1 ? `<button class="btn-make-primary" id="btn-primary-${idx}">Make this profile primary</button>` : ''}
      </div>
      <div class="pr-hdr-right">
        <button class="btn-indigo" id="sync-profile-${idx}">${SYNC_ICON} Sync</button>
        <button class="btn-icon-del" title="Remove profile">${DEL_ICON}</button>
      </div>
    </div>
    <div class="pr-stats">
      <div class="pr-stat"><div class="pr-stat-n">${profile.jss || '—'}</div><div class="pr-stat-l">JSS</div></div>
      <div class="pr-stat"><div class="pr-stat-n">${profile.earnings || '—'}</div><div class="pr-stat-l">Earned</div></div>
      <div class="pr-stat"><div class="pr-stat-n">${profile.jobs || '—'}</div><div class="pr-stat-l">Jobs</div></div>
      <div class="pr-stat"><div class="pr-stat-n">${profile.hours || '—'}</div><div class="pr-stat-l">Hours</div></div>
    </div>
    ${readAt ? `<div class="pr-foot"><div class="pr-sync-dot"></div><div class="pr-sync-txt">Synced ${readAt} &nbsp;·&nbsp; ${profile.url || ''}</div></div>` : ''}
  `;

  card.querySelector(`#sync-profile-${idx}`)?.addEventListener('click', () => {
    if (!profile.url) return;
    chrome.tabs.create({ url: profile.url });
  });
  card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId: profile.id }, () => renderProfilesPage());
  });
  card.querySelector('.btn-icon-del')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    const id = profile.id; allProfiles.splice(idx, 1);
    chrome.storage.local.set({ registeredProfiles: allProfiles });
    if (id) chrome.storage.local.remove('profileFull_' + id);
    renderProfilesPage();
  });
  container.appendChild(card);

  // Portfolio — separate card block
  const portBlock = document.createElement('div');
  portBlock.className = 'pr-card-block';
  portBlock.innerHTML =
    `<div class="pr-card-block-lbl">Portfolio &nbsp;·&nbsp; ${portfolios.length} items${portsOk > 0 ? ', ' + portsOk + ' linked' : ''}</div>` +
    `<div class="pi-list" id="port-list-${idx}"></div>` +
    (!portfolios.length ? '<div style="font-size:11.5px;color:rgba(240,238,234,.2);padding:4px 0;font-style:italic">No portfolio items — sync to import from Upwork.</div>' : '') +
    (portfolios.length > 0 && portsOk === 0 ? `<div style="margin-top:10px;padding:9px 12px;background:rgba(250,204,21,.04);border:1px solid rgba(250,204,21,.15);border-radius:8px;font-size:11px;color:rgba(250,204,21,.6);line-height:1.55">Add live URLs — click <strong style="color:rgba(250,204,21,.8)">···</strong> → Edit on any item.</div>` : '');

  const portList = portBlock.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItemV2(portList, p, pi, allProfiles, idx));
  container.appendChild(portBlock);

  // Filters — separate card block
  const filtersBlock = document.createElement('div');
  filtersBlock.className = 'pr-card-block';
  filtersBlock.innerHTML = `<div class="pr-card-block-lbl">Job Filters</div><div id="jf-body-${idx}"></div>`;
  container.appendChild(filtersBlock);
  renderJobFilters(filtersBlock.querySelector(`#jf-body-${idx}`), profile);
}

// ── Profiles page (main entry point) ─────────────────────────────────────────
export async function renderProfilesPage() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'])
  ]);
  const userPlan           = syncStored.userPlan || 'free';
  const registeredProfiles = localStored.registeredProfiles || [];
  const primaryProfileId   = localStored.primaryProfileId || null;

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
  addBtn.style.display = 'none';

  const validProfiles = mergedProfiles.filter(p => p && p.url);

  // ── Profile selector grid ──────────────────────────────────────────────────
  const selGrid = document.createElement('div');
  selGrid.className = 'pr-sel-grid';

  const detailContainer = document.createElement('div');

  function initials(name) {
    return (name || '').trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';
  }

  function switchTo(idx) {
    state.currentSlide = idx;
    selGrid.querySelectorAll('.pr-sel-card').forEach((c, j) => c.classList.toggle('active', j === idx));
    detailContainer.innerHTML = '';
    renderProfileCard(detailContainer, mergedProfiles[idx], idx, mergedProfiles, primaryProfileId);
  }

  mergedProfiles.forEach((p, i) => {
    const synced    = !!(p.name || p.jss || p._readAt);
    const isPrimary = validProfiles.length <= 1 ? true : (primaryProfileId ? p.id === primaryProfileId : i === 0);
    const ini       = initials(p.name);

    const card = document.createElement('div');
    card.className = 'pr-sel-card' + (i === (state.currentSlide || 0) ? ' active' : '');
    card.innerHTML =
      (isPrimary && validProfiles.length > 1 ? '<div class="pr-sel-tag">Primary</div>' : '') +
      '<div class="pr-sel-av">' + ini + '</div>' +
      '<div class="pr-sel-name">' + (p.name || 'Profile ' + (i + 1)) + '</div>' +
      '<div class="pr-sel-meta">' + (synced ? (p.jss ? p.jss + ' JSS' : 'Synced') : 'Not synced yet') + '</div>';

    card.addEventListener('click', () => switchTo(i));
    selGrid.appendChild(card);
  });

  if (mergedProfiles.length < limit) {
    const addCard = document.createElement('div');
    addCard.className = 'pr-sel-card pr-add';
    addCard.innerHTML = '<span class="pr-add-icon" style="font-size:22px;font-weight:300;line-height:1">+</span><span class="pr-add-lbl">Add profile</span>';
    addCard.addEventListener('click', () => document.getElementById('add-profile-btn')?.click());
    selGrid.appendChild(addCard);
  }

  container.appendChild(selGrid);
  container.appendChild(detailContainer);

  const initialIdx = Math.min(state.currentSlide || 0, mergedProfiles.length - 1);
  state.currentSlide = initialIdx;
  renderProfileCard(detailContainer, mergedProfiles[initialIdx], initialIdx, mergedProfiles, primaryProfileId);
}
