const SERVER = 'https://prowise-4e5t.onrender.com';

function openPricing() {
  chrome.tabs.create({ url: 'https://prowiseai.netlify.app/#pricing' });
}

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
  const { plan = 'free', used = 0, limit = 2 } = data;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const pill = document.getElementById('plan-pill');
  const bar  = document.getElementById('usage-bar');
  const lbl  = document.getElementById('usage-label');
  const upgBtn = document.getElementById('upgrade-btn');

  pill.className = 'plan-pill plan-' + plan;
  pill.textContent = { free:'Free', starter:'Starter', pro:'Pro', agency:'Agency' }[plan] || plan;
  lbl.textContent = used + ' / ' + limit + ' used this month';
  bar.style.width = pct + '%';
  bar.className = 'usage-bar' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
  if (plan === 'free' || pct >= 80) upgBtn.style.display = 'block';
  else upgBtn.style.display = 'none';
}

document.getElementById('upgrade-btn').addEventListener('click', openPricing);

async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  const dot    = document.getElementById('email-dot');
  const label  = document.getElementById('email-label');
  const toggle = document.getElementById('email-toggle');
  if (userEmail) {
    dot.className = 'lic-dot active';
    label.textContent = userEmail;
    toggle.textContent = 'Change';
    document.getElementById('email-input').value = userEmail;
  } else {
    dot.className = 'lic-dot';
    label.textContent = 'Add email to sync your subscription';
    toggle.textContent = 'Add email';
  }
}

document.getElementById('email-toggle').addEventListener('click', () => {
  document.getElementById('email-row').classList.toggle('show');
});

document.getElementById('email-save').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    document.getElementById('email-input').style.borderColor = '#dc2626';
    setTimeout(() => { document.getElementById('email-input').style.borderColor = ''; }, 2000);
    return;
  }
  await chrome.storage.sync.set({ userEmail: email });
  document.getElementById('email-dot').className = 'lic-dot active';
  document.getElementById('email-label').textContent = email;
  document.getElementById('email-toggle').textContent = 'Change';
  document.getElementById('email-row').classList.remove('show');
  loadStatus();
});

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab,.tab-content').forEach(el => el.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
  });
});

(async () => {
  const { profile = {}, settings = {} } = await chrome.storage.sync.get(['profile', 'settings']);
  document.getElementById('name').value           = profile.name || '';
  document.getElementById('title').value          = profile.title || '';
  document.getElementById('skills').value         = profile.skills || '';
  document.getElementById('hourly-rate').value    = profile.hourlyRate || '';
  document.getElementById('pitch').value          = profile.pitch || '';
  document.getElementById('extra').value          = profile.extra || '';
  document.getElementById('tone').value           = settings.tone || 'professional';
  document.getElementById('length').value         = settings.length || 'medium';
  document.getElementById('always-include').value = settings.alwaysInclude || '';
  (profile.portfolioLinks || ['']).forEach(l => addPortLink(l));
  await loadEmail();
  await loadStatus();
})();

function addPortLink(val = '') {
  const list = document.getElementById('port-list');
  const row  = document.createElement('div');
  row.className = 'portfolio-item';
  row.innerHTML = '<input type="url" placeholder="https://..." value="' + val + '"><button class="rm-btn">×</button>';
  row.querySelector('.rm-btn').addEventListener('click', () => row.remove());
  list.appendChild(row);
}
document.getElementById('add-link').addEventListener('click', () => addPortLink());

document.getElementById('save-profile').addEventListener('click', async () => {
  const links = Array.from(document.querySelectorAll('#port-list input')).map(i => i.value.trim()).filter(Boolean);
  await chrome.storage.sync.set({ profile: {
    name: document.getElementById('name').value.trim(),
    title: document.getElementById('title').value.trim(),
    skills: document.getElementById('skills').value.trim(),
    hourlyRate: document.getElementById('hourly-rate').value.trim(),
    pitch: document.getElementById('pitch').value.trim(),
    extra: document.getElementById('extra').value.trim(),
    portfolioLinks: links,
  }});
  const m = document.getElementById('saved-msg');
  m.textContent = '✓ Saved!';
  setTimeout(() => m.textContent = '', 2000);
});

document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone: document.getElementById('tone').value,
    length: document.getElementById('length').value,
    alwaysInclude: document.getElementById('always-include').value.trim(),
  }});
  const m = document.getElementById('saved-settings-msg');
  m.textContent = '✓ Saved!';
  setTimeout(() => m.textContent = '', 2000);
});
