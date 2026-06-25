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
        <div class="jf-tog-sm ${val ? 'on' : 'off'}" id="jv-tog-${id}" title="${desc}">
          <div class="jf-tok"></div>
        </div>
        <input type="checkbox" id="jt-${id}" ${val ? 'checked' : ''} style="display:none">
      </div>
    </div>`;
  }

  const ICK = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const I_COMP  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const I_QUAL  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const I_MATCH = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
  const I_ALERT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

  const spentVal = v => [0,100,1000,10000,100000].map(n => `<option value="${n}"${F.minClientSpent===n?' selected':''}>${n===0?'Any':n>=1000?'$'+(n/1000)+'K+':'$'+n+'+'}</option>`).join('');

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
        <div class="jf-group-lbl">${I_COMP}Competition</div>
        ${sl('maxProposals',    'Max proposals',    5,  55,  5, Math.min(F.maxProposals, 55), 'Warn if job has more bids than this')}
        ${sl('maxInterviewing', 'Max interviewing', 0,  10,  1, F.maxInterviewing,            'Warn if this many are shortlisted')}
        ${sl('maxInvitesSent',  'Max invites sent', 0,  15,  1, F.maxInvitesSent,             'Warn if client sent this many invites')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">${I_QUAL}Client quality</div>
        ${sl('minHireRate',     'Min hire rate',    0, 100,  5, F.minHireRate,                'Warn if client hires less than this %')}
        ${sl('minClientRating', 'Min rating',      10,  50,  5, Math.round(F.minClientRating * 10), 'Warn if rating below this')}
        <div class="jf-row2"><span class="jf-row2-name">Min client spent</span><div class="jf-row2-right"><select class="jf-select" id="js-minClientSpent">${spentVal()}</select></div></div>
        ${tog('requirePaymentVerified', 'Payment verified', F.requirePaymentVerified, 'Warn if payment not verified')}
        ${tog('warnZeroSpent',          'Warn $0 clients',  F.warnZeroSpent,          'Warn if client never spent on Upwork')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">${I_MATCH}Match &amp; age</div>
        ${sl('minSkillMatch',   'Min skill match',  0,  80, 10, F.minSkillMatch,   'Warn if skill overlap below this %')}
        ${sl('maxRateMismatch', 'Rate mismatch',   10, 100, 10, F.maxRateMismatch, 'Warn if your rate is this % above avg')}
        ${sl('maxJobAgeDays',   'Max job age',      0,  14,  1, F.maxJobAgeDays,   'Warn if older than this — 0 = any age')}
      </div>
      <div class="jf-group">
        <div class="jf-group-lbl">${I_ALERT}Alert behaviour</div>
        ${sl('minAlertScore', 'Min alert score', 30, 80, 5, F.minAlertScore, 'Show alert when score is under this')}
        ${tog('autoSkipHired',      'Auto-skip hired',    F.autoSkipHired,      'Close panel if someone already hired')}
        ${tog('warnLocationFilter', 'Location filter',    F.warnLocationFilter, 'Warn if job has location restrictions')}
        ${tog('warnTierMismatch',   'Tier mismatch',      F.warnTierMismatch,   'Warn if job requires a tier you lack')}
      </div>
    </div>

    <div class="jf-filter-footer">
      <button class="btn-reset-plain" id="jf-reset">Reset Filters</button>
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

  function save(showToast) {
    if (!profile?.id) { console.warn('[SnagAI] save(): profile.id missing, cannot save filters'); return; }
    const f = readFilters();
    profile.jobFilters = f; // update in-memory so switchTo() re-renders with correct values
    const key = 'profileFull_' + profile.id;
    chrome.storage.local.get([key], d => {
      const updated = { ...(d[key] || {}), jobFilters: f };
      chrome.storage.local.set({ [key]: updated }, () => {
        if (chrome.runtime.lastError) {
          console.error('[SnagAI] Filter save error:', chrome.runtime.lastError.message);
        } else if (showToast) {
          let t = document.getElementById('snagai-filter-toast');
          if (!t) {
            t = document.createElement('div');
            t.id = 'snagai-filter-toast';
            t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e1d32;border:1px solid rgba(99,102,241,.4);color:rgba(240,238,255,.85);font-size:12.5px;font-weight:600;padding:10px 20px;border-radius:999px;z-index:99999;pointer-events:none;opacity:0;transition:opacity .2s;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;gap:7px';
            t.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Filters saved';
            document.body.appendChild(t);
          }
          t.style.opacity = '1';
          clearTimeout(t._timer);
          t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2000);
        }
      });
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
    const sp = body.querySelector('#js-minClientSpent');
    if (sp) sp.value = P.minClientSpent;
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

  // Events — visual toggles → update checkbox + save
  body.querySelectorAll('.jf-tog-sm').forEach(togEl => {
    togEl.addEventListener('click', () => {
      togEl.classList.toggle('on');
      togEl.classList.toggle('off');
      const id = togEl.id.replace('jv-tog-', '');
      const cb = body.querySelector('#jt-' + id);
      if (cb) {
        cb.checked = togEl.classList.contains('on');
        body.querySelectorAll('.jf-seg-opt').forEach(b => b.classList.remove('jf-active'));
        save();
      }
    });
  });

  // Min client spent select
  body.querySelector('#js-minClientSpent')?.addEventListener('change', () => {
    body.querySelectorAll('.jf-seg-opt').forEach(b => b.classList.remove('jf-active'));
    save();
  });

  // Segment preset buttons
  body.querySelectorAll('.jf-seg-opt').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

  // Reset
  body.querySelector('#jf-reset')?.addEventListener('click', () => applyPreset('balanced'));

  body.querySelector('#jf-save')?.addEventListener('click', () => save(true));

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
    item.classList.toggle('port-has-link', hasLinks);
    item.classList.toggle('port-no-link', !hasLinks);

    const CHECK_ICON =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
        '<circle cx="12" cy="12" r="9" stroke="rgba(52,211,153,.5)" stroke-width="1.5"/>' +
        '<polyline points="8 12 11 15 16 9" stroke="#34d399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    const WARN_ICON =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
        '<circle cx="12" cy="12" r="9" stroke="rgba(250,204,21,.4)" stroke-width="1.5"/>' +
        '<line x1="12" y1="8" x2="12" y2="13" stroke="rgba(250,204,21,.75)" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="12" cy="16" r="0.8" fill="rgba(250,204,21,.75)"/>' +
      '</svg>';

    item.innerHTML =
      '<div class="pi-name">' + _esc(p.title || 'Untitled') + '</div>' +
      (hasLinks
        ? '<div class="pi-check-ok" title="URL linked">' + CHECK_ICON + '</div>'
        : '<div class="pi-missing-btn">' + WARN_ICON + '</div>');

    if (!hasLinks) {
      const missingBtn = item.querySelector('.pi-missing-btn');
      let tip = null;

      missingBtn.addEventListener('mouseenter', () => {
        if (tip) return;
        const rect = missingBtn.getBoundingClientRect();
        tip = document.createElement('div');
        tip.style.cssText =
          'position:fixed;z-index:99999;pointer-events:none;' +
          'background:#1a1830;border:1px solid rgba(250,204,21,.28);' +
          'color:rgba(240,238,255,.78);font-size:11px;font-weight:500;line-height:1.5;' +
          'padding:8px 12px;border-radius:8px;max-width:240px;' +
          'font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
          'box-shadow:0 6px 20px rgba(0,0,0,.45);';
        tip.textContent = 'Missing URL — add this project\'s link to your Upwork portfolio, then re-sync.';

        // Arrow pointing down toward the icon
        const arrow = document.createElement('div');
        arrow.style.cssText =
          'position:absolute;bottom:-5px;left:50%;' +
          'transform:translateX(-50%) rotate(45deg);' +
          'width:8px;height:8px;' +
          'background:#1a1830;' +
          'border-right:1px solid rgba(250,204,21,.28);' +
          'border-bottom:1px solid rgba(250,204,21,.28);';
        tip.appendChild(arrow);
        document.body.appendChild(tip);

        // Position above the icon, horizontally centred on it
        const tipW = tip.offsetWidth;
        const tipH = tip.offsetHeight;
        const left  = Math.max(8, rect.left + rect.width / 2 - tipW / 2);
        const top   = rect.top - tipH - 10;
        tip.style.left = left + 'px';
        tip.style.top  = top  + 'px';
      });

      missingBtn.addEventListener('mouseleave', () => {
        if (tip) { tip.remove(); tip = null; }
      });
    }
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

  // Tier text
  const tierLabels = { expert: 'Expert Vetted', top_rated_plus: 'Top Rated Plus', top_rated: 'Top Rated', rising: 'Rising Talent' };
  const tierTxt    = tierLabels[profile.tierKey] || '';

  // Two-line meta: title on line 1, rate · tier · country on line 2
  const metaTitle = profile.title || '';
  const metaSub   = [profile.rate, tierTxt, profile.country].filter(Boolean).join(' · ');

  // Last synced
  const readAt = profile._readAt
    ? new Date(profile._readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const SYNC_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
  const DEL_ICON  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>';

  // Profile card — header + stats + synced footer only
  const detailAv = profile.profilePicUrl
    ? `<img src="${profile.profilePicUrl}" alt="${profile.name || ''}">`
    : ini(profile.name);
  const detailAvBg = profile.profilePicUrl ? 'background:transparent' : '';

  card.innerHTML = `
    <div class="pr-hdr">
      <div class="pr-av" style="${detailAvBg}">${detailAv}</div>
      <div class="pr-info">
        <div class="pr-name-row">
          <span class="pr-name">${profile.name || 'Unknown'}</span>
          ${isPrimary ? '<span class="badge-primary">Primary</span>' : ''}
        </div>
        ${metaTitle ? `<div class="pr-meta" style="color:rgba(240,238,234,.5);font-size:12.5px;margin-bottom:3px">${metaTitle}</div>` : ''}
        ${metaSub ? `<div class="pr-meta" style="font-size:11px;color:rgba(240,238,255,.32);letter-spacing:.01em">${metaSub}</div>` : ''}
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

  // Portfolio — label + subtitle outside the card frame
  const portLbl = document.createElement('div');
  portLbl.className = 'pr-card-block-lbl';
  portLbl.style.cssText = 'margin-bottom:4px;margin-top:20px';
  portLbl.textContent = 'Portfolio · ' + portfolios.length + ' items' + (portsOk > 0 ? ', ' + portsOk + ' linked' : '');
  const portSub = document.createElement('div');
  portSub.style.cssText = 'font-size:11px;color:rgba(240,238,255,.22);margin-bottom:10px;line-height:1.55;font-weight:400';
  portSub.textContent = 'Snag AI matches your portfolio projects to each job by skills and description, then references the most relevant linked ones in your cover letter.';

  // Filters label — outside the card frame (comes first now)
  const filtersLbl = document.createElement('div');
  filtersLbl.className = 'pr-card-block-lbl';
  filtersLbl.style.cssText = 'margin-bottom:8px;margin-top:20px';
  filtersLbl.textContent = 'Job Filters';
  container.appendChild(filtersLbl);

  // Filters card
  const filtersBlock = document.createElement('div');
  filtersBlock.className = 'pr-card-block';
  filtersBlock.innerHTML = `<div id="jf-body-${idx}"></div>`;
  container.appendChild(filtersBlock);
  renderJobFilters(filtersBlock.querySelector(`#jf-body-${idx}`), profile);

  // Portfolio label + card (below filters)
  container.appendChild(portLbl);
  container.appendChild(portSub);

  const portBlock = document.createElement('div');
  portBlock.className = 'pr-card-block';
  portBlock.style.cssText = 'padding:4px 22px;margin-bottom:20px';
  portBlock.innerHTML =
    `<div class="pi-list" id="port-list-${idx}"></div>` +
    (!portfolios.length ? '<div style="font-size:11.5px;color:rgba(240,238,234,.2);padding:12px 0;font-style:italic">No portfolio items — sync to import from Upwork.</div>' : '') +
    (portfolios.length > 0 && portsOk === 0 ? `<div style="margin:4px 0 10px;padding:9px 12px;background:rgba(250,204,21,.04);border:1px solid rgba(250,204,21,.15);border-radius:8px;font-size:11px;color:rgba(250,204,21,.55);line-height:1.55">No URLs added — go to your Upwork profile, add portfolio links there, then re-sync.</div>` : '');

  const portList = portBlock.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItemV2(portList, p, pi, allProfiles, idx));
  container.appendChild(portBlock);
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
    const avContent = p.profilePicUrl
      ? '<img src="' + p.profilePicUrl + '" alt="' + (p.name || '') + '">'
      : ini;
    card.innerHTML =
      (isPrimary ? '<div class="pr-sel-tag">Primary</div>' : '') +
      '<div class="pr-sel-av">' + avContent + '</div>' +
      '<div class="pr-sel-name">' + (p.name || 'Profile ' + (i + 1)) + '</div>' +
      '<div class="pr-sel-meta">' + (synced
      ? [p.jss ? p.jss + ' JSS' : '', p.tier || '', p.country || ''].filter(Boolean).join(' · ') || 'Synced'
      : 'Not synced yet') + '</div>';

    card.addEventListener('click', () => switchTo(i));
    selGrid.appendChild(card);
  });

  // Add profile card + inline input panel
  const addPanel = document.createElement('div');
  addPanel.style.cssText = 'display:none;margin-bottom:14px';

  if (mergedProfiles.length < limit) {
    const addCard = document.createElement('div');
    addCard.className = 'pr-sel-card pr-add';
    addCard.innerHTML = '<span class="pr-add-icon" style="font-size:22px;font-weight:300;line-height:1">+</span><span class="pr-add-lbl">Add profile</span>';

    addPanel.innerHTML = `
      <div style="background:var(--bg2);border:1px solid rgba(99,102,241,.25);border-radius:16px;padding:22px 24px">
        <div style="font-size:13px;font-weight:700;color:rgba(240,238,255,.75);margin-bottom:4px">Add Upwork profile</div>
        <div style="font-size:12px;color:rgba(240,238,255,.3);margin-bottom:16px">Paste your Upwork profile URL. After saving, open the profile and click the <strong style="color:rgba(240,238,255,.45)">"Sync Profile"</strong> pill to read your data.</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="pr-new-url-inp" type="url" placeholder="https://www.upwork.com/freelancers/~..."
            style="flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:9px 18px;color:#f0eeff;font-size:12.5px;font-family:inherit;outline:none;min-width:0;transition:border-color .15s">
          <button id="pr-new-url-save" style="padding:9px 22px;border-radius:999px;background:#6366f1;color:#fff;font-size:12.5px;font-weight:700;border:none;cursor:pointer;font-family:inherit;flex-shrink:0">Save</button>
          <button id="pr-new-url-cancel" style="padding:8px 16px;border-radius:999px;background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(240,238,255,.4);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">Cancel</button>
        </div>
      </div>`;

    addCard.addEventListener('click', () => {
      addPanel.style.display = 'block';
      detailContainer.style.display = 'none';
      selGrid.querySelectorAll('.pr-sel-card').forEach(c => c.classList.remove('active'));
      setTimeout(() => addPanel.querySelector('#pr-new-url-inp')?.focus(), 50);
    });

    addPanel.querySelector('#pr-new-url-cancel')?.addEventListener('click', () => {
      addPanel.style.display = 'none';
      detailContainer.style.display = '';
      if (mergedProfiles.length > 0) switchTo(state.currentSlide || 0);
    });

    async function saveNewProfile() {
      const inp = addPanel.querySelector('#pr-new-url-inp');
      const url = (inp?.value || '').trim();
      if (!url || !url.includes('upwork.com/freelancers/')) {
        if (inp) { inp.style.borderColor = 'rgba(248,113,113,.5)'; setTimeout(() => inp.style.borderColor = '', 2000); }
        return;
      }
      const stored = await new Promise(r => chrome.storage.local.get(['registeredProfiles'], r));
      const profiles = stored.registeredProfiles || [];
      const id = 'profile_' + (profiles.length + 1) + '_' + Date.now();
      profiles.push({ url, id, syncEnabled: true });
      await new Promise(r => chrome.storage.local.set({ registeredProfiles: profiles }, r));
      renderProfilesPage();
    }

    addPanel.querySelector('#pr-new-url-save')?.addEventListener('click', saveNewProfile);
    addPanel.querySelector('#pr-new-url-inp')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveNewProfile(); });

    selGrid.appendChild(addCard);
  }

  container.appendChild(selGrid);
  container.appendChild(addPanel);
  container.appendChild(detailContainer);

  const initialIdx = Math.min(state.currentSlide || 0, mergedProfiles.length - 1);
  state.currentSlide = initialIdx;
  if (mergedProfiles.length > 0) renderProfileCard(detailContainer, mergedProfiles[initialIdx], initialIdx, mergedProfiles, primaryProfileId);
}
