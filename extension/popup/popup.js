const SERVER = 'https://prowise-4e5t.onrender.com';

// Open settings page
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Upgrade button
document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://prowiseai.netlify.app/#pricing' });
});

// Email toggle
document.getElementById('email-toggle').addEventListener('click', () => {
  document.getElementById('email-input-wrap').classList.toggle('show');
  const inp = document.getElementById('email-inp');
  if (document.getElementById('email-input-wrap').classList.contains('show')) inp.focus();
});

document.getElementById('email-save').addEventListener('click', async () => {
  const email = document.getElementById('email-inp').value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    document.getElementById('email-inp').style.borderColor = '#ef4444';
    setTimeout(() => document.getElementById('email-inp').style.borderColor = '', 2000);
    return;
  }
  await chrome.storage.sync.set({ userEmail: email });
  document.getElementById('email-input-wrap').classList.remove('show');
  updateEmailUI(email);
  loadStatus();
});

function updateEmailUI(email) {
  const dot   = document.getElementById('email-dot');
  const val   = document.getElementById('email-val');
  const toggle = document.getElementById('email-toggle');
  const label = document.getElementById('email-label-top');
  if (email) {
    dot.className = 'email-dot on';
    val.textContent = email;
    toggle.textContent = 'Change';
    label.textContent = 'Subscription email';
    document.getElementById('email-inp').value = email;
  } else {
    dot.className = 'email-dot';
    val.textContent = 'Not set — required for subscription';
    toggle.textContent = 'Add';
    label.textContent = 'Your email';
  }
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
  } catch(e) {
    console.log('Status error:', e);
  }
}

function updateStatusUI(data) {
  const { plan = 'free', used = 0, limit = 2, remaining = 2 } = data;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  // Plan badge
  const badge = document.getElementById('plan-badge');
  const labels = { free:'Free', starter:'Starter', pro:'Pro', agency:'Agency' };
  badge.textContent = labels[plan] || plan;
  badge.className = 'plan-badge badge-' + plan;

  // Counts
  document.getElementById('used-count').textContent = used;
  document.getElementById('limit-count').textContent = limit;

  // Bar
  const bar = document.getElementById('usage-bar');
  bar.style.width = pct + '%';
  bar.className = 'bar-fill ' + (pct >= 90 ? 'bar-danger' : pct >= 70 ? 'bar-warn' : 'bar-ok');

  // Status text
  const statusEl = document.getElementById('usage-status');
  const alertEl  = document.getElementById('alert-banner');
  const upgBtn   = document.getElementById('upgrade-btn');

  if (remaining === 0) {
    statusEl.textContent = 'No proposals remaining';
    statusEl.className = 'usage-status danger';
    alertEl.style.display = 'block';
    alertEl.className = 'alert-banner alert-danger';
    alertEl.textContent = plan === 'free'
      ? '🚫 Free limit reached. Subscribe to keep winning jobs.'
      : '🚫 Monthly limit reached. Resets on the 1st.';
    upgBtn.style.display = 'block';
  } else if (remaining <= 10) {
    statusEl.textContent = `⚠️ Only ${remaining} proposals left this month`;
    statusEl.className = 'usage-status danger';
    alertEl.style.display = 'block';
    alertEl.className = 'alert-banner alert-warn';
    alertEl.textContent = `Running low — ${remaining} proposals left. Upgrade to avoid running out.`;
    if (plan === 'free') upgBtn.style.display = 'block';
  } else if (remaining <= 30) {
    statusEl.textContent = `${remaining} proposals remaining — use wisely`;
    statusEl.className = 'usage-status warn';
    alertEl.style.display = 'none';
    upgBtn.style.display = plan === 'free' ? 'block' : 'none';
  } else {
    statusEl.textContent = `${remaining} proposals remaining this month`;
    statusEl.className = 'usage-status';
    alertEl.style.display = 'none';
    upgBtn.style.display = plan === 'free' ? 'block' : 'none';
  }
}

// Init
(async () => {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail || '');
  await loadStatus();
})();
