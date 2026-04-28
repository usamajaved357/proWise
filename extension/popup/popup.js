const SERVER = 'https://prowise-4e5t.onrender.com';

function openPricing() {
  chrome.tabs.create({ url: 'https://prowiseai.netlify.app/#pricing' });
}

async function loadStatus() {
  try {
    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    const res = await fetch(SERVER + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(licenseKey ? { 'x-license-key': licenseKey } : {}) },
      body: JSON.stringify({})
    });
    const data = await res.json();
    updateStatusUI(data);
  } catch(e) { console.log('Status error:', e); }
}

function updateStatusUI(data) {
  const { plan='free', used=0, limit=2, remaining=2 } = data;
  const pct = Math.min(100, Math.round((used/limit)*100));
  const pill = document.getElementById('plan-pill');
  const bar  = document.getElementById('usage-bar');
  const lbl  = document.getElementById('usage-label');
  const upgBtn = document.getElementById('upgrade-btn');

  pill.className = `plan-pill plan-${plan}`;
  pill.textContent = { free:'Free', starter:'Starter', pro:'Pro', agency:'Agency' }[plan] || plan;
  lbl.textContent = `${used} / ${limit} used this month`;
  bar.style.width = pct + '%';
  bar.className = 'usage-bar' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');

  if (plan === 'free' || pct >= 80) upgBtn.style.display = 'block';
  else upgBtn.style.display = 'none';
}

// Upgrade button
document.getElementById('upgrade-btn').addEventListener('click', openPricing);

// License UI
document.getElementById('lic-toggle').addEventListener('click', () => {
  document.getElementById('lic-row').classList.toggle('show');
});

document.getElementById('lic-save').addEventListener('click', async () => {
  const key = document.getElementById('lic-key').value.trim().toUpperCase();
  if (!key) return;
  const btn = document.getElementById('lic-save');
  btn.textContent = 'Checking…'; btn.disabled = true;
  try {
    const res = await fetch(SERVER + '/validate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ licenseKey: key })
    });
    const data = await res.json();
    btn.textContent = 'Activate'; btn.disabled = false;
    if (data.valid) {
      await chrome.storage.sync.set({ licenseKey: key });
      document.getElementById('lic-dot').className = 'lic-dot active';
      document.getElementById('lic-label').textContent = 'Activated · ' + key.slice(0,7) + '…';
      document.getElementById('lic-toggle').textContent = 'Change';
      document.getElementById('lic-row').classList.remove('show');
      updateStatusUI(data);
    } else {
      document.getElementById('lic-key').style.borderColor = '#dc2626';
      setTimeout(() => { document.getElementById('lic-key').style.borderColor = ''; }, 2000);
    }
  } catch(e) { btn.textContent = 'Activate'; btn.disabled = false; }
});

// Tabs
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab,.tab-content').forEach(el => el.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
  });
});

// Load profile
(async () => {
  const { profile={}, settings={}, licenseKey='' } = await chrome.storage.sync.get(['profile','settings','licenseKey']);

  document.getElementById('name').value         = profile.name||'';
  document.getElementById('title').value        = profile.title||'';
  document.getElementById('skills').value       = profile.skills||'';
  document.getElementById('hourly-rate').value  = profile.hourlyRate||'';
  document.getElementById('pitch').value        = profile.pitch||'';
  document.getElementById('extra').value        = profile.extra||'';
  document.getElementById('tone').value         = settings.tone||'professional';
  document.getElementById('length').value       = settings.length||'medium';
  document.getElementById('always-include').value = settings.alwaysInclude||'';

  const links = profile.portfolioLinks||[''];
  const list  = document.getElementById('port-list');
  links.forEach(l => addPortLink(l));

  if (licenseKey) {
    document.getElementById('lic-dot').className = 'lic-dot active';
    document.getElementById('lic-label').textContent = 'Activated · ' + licenseKey.slice(0,7) + '…';
    document.getElementById('lic-toggle').textContent = 'Change';
  }

  loadStatus();
})();

function addPortLink(val='') {
  const list = document.getElementById('port-list');
  const row = document.createElement('div');
  row.className = 'portfolio-item';
  row.innerHTML = `<input type="url" placeholder="https://apps.apple.com/..." value="${val}"><button class="rm-btn">×</button>`;
  row.querySelector('.rm-btn').addEventListener('click', () => row.remove());
  list.appendChild(row);
}
document.getElementById('add-link').addEventListener('click', () => addPortLink());

document.getElementById('save-profile').addEventListener('click', async () => {
  const links = Array.from(document.querySelectorAll('#port-list input')).map(i => i.value.trim()).filter(Boolean);
  await chrome.storage.sync.set({ profile: {
    name:           document.getElementById('name').value.trim(),
    title:          document.getElementById('title').value.trim(),
    skills:         document.getElementById('skills').value.trim(),
    hourlyRate:     document.getElementById('hourly-rate').value.trim(),
    pitch:          document.getElementById('pitch').value.trim(),
    extra:          document.getElementById('extra').value.trim(),
    portfolioLinks: links,
  }});
  const m = document.getElementById('saved-msg');
  m.textContent = '✓ Saved!';
  setTimeout(() => m.textContent = '', 2000);
});

document.getElementById('save-settings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:          document.getElementById('tone').value,
    length:        document.getElementById('length').value,
    alwaysInclude: document.getElementById('always-include').value.trim(),
  }});
  const m = document.getElementById('saved-settings-msg');
  m.textContent = '✓ Saved!';
  setTimeout(() => m.textContent = '', 2000);
});
