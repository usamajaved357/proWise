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
  document.getElementById('name').value          = profile.name || '';
  document.getElementById('title').value         = profile.title || '';
  document.getElementById('skills').value        = profile.skills || '';
  document.getElementById('hourly-rate').value   = profile.hourlyRate || '';
  document.getElementById('pitch').value         = profile.pitch || '';
  document.getElementById('extra').value         = profile.extra || '';
  document.getElementById('jss').value           = profile.jss || '';
  document.getElementById('tier').value          = profile.tier || '';
  document.getElementById('jobs-completed').value = profile.jobsCompleted || '';
  document.getElementById('upwork-rating').value = profile.upworkRating || '';
  document.getElementById('tone').value          = settings.tone || 'professional';
  document.getElementById('length').value        = settings.length || 'medium';
  document.getElementById('always-include').value = settings.alwaysInclude || '';
  const portfolioItems = profile.portfolio || (profile.portfolioLinks||[]).filter(Boolean).map(url=>({url}));
  if (portfolioItems.length) portfolioItems.forEach(p => addPortLink(typeof p === 'string' ? {url:p} : p));
  else addPortLink({});
}

function fieldStyle() {
  return 'width:100%;padding:8px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#f0eeea;font-size:12px;font-family:inherit;outline:none;margin-bottom:6px';
}

function addPortLink(item = {}) {
  const list = document.getElementById('port-list');
  const wrap = document.createElement('div');
  wrap.className = 'port-item';
  wrap.style.cssText = 'display:flex;flex-direction:column;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;margin-bottom:10px;position:relative';

  const rmBtn = document.createElement('button');
  rmBtn.className = 'port-remove';
  rmBtn.textContent = '×';
  rmBtn.style.cssText = 'position:absolute;top:10px;right:10px;width:26px;height:26px;font-size:14px;padding:0';
  rmBtn.onclick = () => wrap.remove();

  const nameInp = document.createElement('input');
  nameInp.type = 'text'; nameInp.placeholder = 'Project name (e.g. TollBugata iOS App)';
  nameInp.value = item.name || ''; nameInp.style.cssText = fieldStyle();
  nameInp.dataset.field = 'name';

  const urlInp = document.createElement('input');
  urlInp.type = 'url'; urlInp.placeholder = 'URL (e.g. https://apps.apple.com/...)';
  urlInp.value = item.url || ''; urlInp.style.cssText = fieldStyle();
  urlInp.dataset.field = 'url';

  const descInp = document.createElement('input');
  descInp.type = 'text'; descInp.placeholder = 'One-line description (e.g. Live toll payment app, 10k+ downloads)';
  descInp.value = item.desc || ''; descInp.style.cssText = fieldStyle();
  descInp.dataset.field = 'desc';

  const skillsInp = document.createElement('input');
  skillsInp.type = 'text'; skillsInp.placeholder = 'Skills used (e.g. Flutter, Firebase, Stripe)';
  skillsInp.value = item.skills || ''; skillsInp.style.cssText = fieldStyle().replace('margin-bottom:6px','margin-bottom:0');
  skillsInp.dataset.field = 'skills';

  [nameInp, urlInp, descInp, skillsInp].forEach(inp => {
    inp.onfocus = () => inp.style.borderColor = '#c9a84c';
    inp.onblur  = () => inp.style.borderColor = 'rgba(255,255,255,.12)';
  });

  wrap.appendChild(rmBtn);
  wrap.appendChild(nameInp);
  wrap.appendChild(urlInp);
  wrap.appendChild(descInp);
  wrap.appendChild(skillsInp);
  list.appendChild(wrap);
}
document.getElementById('add-port').addEventListener('click', () => addPortLink());

function showSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

document.getElementById('save-profile').addEventListener('click', async () => {
  const portfolio = Array.from(document.querySelectorAll('#port-list .port-item')).map(wrap => ({
    name:   wrap.querySelector('[data-field="name"]')?.value.trim()   || '',
    url:    wrap.querySelector('[data-field="url"]')?.value.trim()    || '',
    desc:   wrap.querySelector('[data-field="desc"]')?.value.trim()   || '',
    skills: wrap.querySelector('[data-field="skills"]')?.value.trim() || '',
  })).filter(p => p.name || p.url);
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
