'use strict';

// ── Shared Claude API client — used by both profile-audit and agency-audit ──
// Extracted unchanged from server/routes/profile-audit.js so agency audit
// gets the same verified behavior (1h prompt caching, usage logging shape)
// without duplicating it.

const https = require('https');

function callClaudeRaw(system, userMsg) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY not set'));

    // system is byte-identical on every request for a given feature (well
    // above Sonnet 4.6's 2048-token cache minimum) — caching it cuts ~90% off
    // that portion's cost on every audit after the first for the same server
    // process. 1h TTL over the 5m default: observed audit traffic clusters
    // loosely by the hour, not the minute, so 5m almost never got reused
    // (write premium paid, read discount never claimed). 1h costs more per
    // write (2x vs 1.25x) but survives long enough to actually get read back
    // within a real cluster of requests — check cache_read_input_tokens in
    // the usage log to confirm it's paying off for your actual traffic.
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4200,
      system: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } },
      ],
      messages: [{ role: 'user', content: userMsg }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, rsp => {
      let raw = '';
      rsp.on('data', d => raw += d);
      rsp.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Claude error'));
          resolve({ text: parsed.content?.[0]?.text || '', usage: parsed.usage || null });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { callClaudeRaw };
