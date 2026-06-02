// ── Shared helper utilities ───────────────────────────────────────────────────

export function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function getSkillsArr(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.skillsArr) && profile.skillsArr.length) return profile.skillsArr;
  if (typeof profile.skills === 'string' && profile.skills.trim())
    return profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  if (Array.isArray(profile.skills) && profile.skills.length) return profile.skills;
  return [];
}

export function _esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
