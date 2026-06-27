'use strict';

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function supabase(method, table, body = null, filters = '') {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return reject(new Error('Supabase not configured'));
    }
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}${filters}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': filters.includes('on_conflict')
          ? 'return=representation,resolution=merge-duplicates'
          : 'return=representation'
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d || '[]')); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getUser(email) {
  const rows = await supabase('GET', 'users', null, `?email=eq.${encodeURIComponent(email)}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertUser(email, data) {
  return supabase('POST', 'users', { email, ...data }, '?on_conflict=email');
}

async function updateUser(email, data) {
  return supabase('PATCH', 'users', data, `?email=eq.${encodeURIComponent(email)}`);
}

async function getAnon(anonId) {
  const rows = await supabase('GET', 'anon_users', null, `?anon_id=eq.${encodeURIComponent(anonId)}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertAnon(anonId, data) {
  return supabase('POST', 'anon_users', { anon_id: anonId, ...data }, '?on_conflict=anon_id');
}

async function getAnonByDevice(deviceId) {
  if (!deviceId) return null;
  const rows = await supabase('GET', 'anon_users', null, `?device_id=eq.${encodeURIComponent(deviceId)}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

module.exports = { supabase, getUser, upsertUser, updateUser, getAnon, upsertAnon, getAnonByDevice };
