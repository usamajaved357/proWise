'use strict';

const https = require('https');
const { SYSTEM, buildUserMessage, processBold } = require('../prompt');

function parseDelimiterFormat(text) {
  console.log('Full response length:', text.length);
  console.log('Has LETTER tag:', text.includes('===LETTER==='));
  console.log('Has END tag:', text.includes('===END==='));

  const extract = (tag) => {
    const start = text.indexOf('===' + tag + '===');
    if (start === -1) return '';
    const contentStart = start + tag.length + 6;
    const end = text.indexOf('===END===', contentStart);
    const raw = end === -1 ? text.slice(contentStart) : text.slice(contentStart, end);
    return raw.replace(/^\r?\n/, '').replace(/\r?\n$/, '').trim();
  };

  const letter    = extract('LETTER');
  const portfolio = extract('PORTFOLIO');
  const questions = extract('QUESTIONS');
  const meta      = extract('META');

  const portfolioLinks = [];
  if (portfolio) {
    portfolio.split('\n').forEach(line => {
      const m = line.match(/^(.+?):\s*(https?:\/\/.+)$/);
      if (m) portfolioLinks.push({ name: m[1].trim(), url: m[2].trim() });
    });
  }

  const getMetaField = (key) => {
    const m = meta.match(new RegExp('^' + key + ':\\s*(.+)$', 'im'));
    return m ? m[1].trim() : '';
  };

  return {
    letter,
    portfolioLinks,
    questions,
    clientName: getMetaField('CLIENT'),
    hookType:   getMetaField('HOOK'),
    hookDesc:   getMetaField('DESC'),
    tips: [
      getMetaField('TIP1'),
      getMetaField('TIP2'),
      getMetaField('TIP3'),
    ].filter(Boolean),
  };
}

function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(new Error('ANTHROPIC_API_KEY not set'));
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: user }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(d);
          if (p.error) return reject(new Error(p.error.message));
          const rawText = p.content?.[0]?.text || '';
          console.log('Claude raw (first 200):', rawText.slice(0, 200));
          const parsed = parseDelimiterFormat(rawText);
          if (!parsed.letter) return reject(new Error('No letter in response'));
          return resolve(parsed);
        } catch(e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function extractClientName(reviewText, description) {
  if (!reviewText && !description) return Promise.resolve('');
  return new Promise((resolve) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return resolve('');

    const textToSearch = [
      reviewText ? 'CLIENT HISTORY/REVIEWS:\n' + reviewText.slice(0, 800) : '',
      description ? 'JOB DESCRIPTION:\n' + description.slice(0, 300) : ''
    ].filter(Boolean).join('\n\n');

    const prompt = `Find the CLIENT's first name from these Upwork reviews.

Freelancers write reviews about the client. Look for patterns like:
- "John is an exceptional client to work with"
- "Abduljalil is a great client"
- "Working with Sarah was amazing"
- "Thanks to Michael for the clear requirements"

Text to search:
${textToSearch}

Rules:
- Return ONLY the client's first name (one word)
- Do NOT return freelancer names (names after "To freelancer:" are freelancers, not the client)
- If no client name found, reply: none`;

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: 'You extract first names only. Reply with a single word (the first name) or the word "none". Never explain. Never use punctuation.',
      messages: [{ role: 'user', content: prompt }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(d);
          const name = (p.content?.[0]?.text || '').trim();
          console.log('Name extraction result:', name);
          if (name && name.toLowerCase() !== 'none' && /^[A-Z][a-z]{1,20}$/.test(name)) {
            resolve(name);
          } else {
            resolve('');
          }
        } catch(e) { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.write(body); req.end();
  });
}

module.exports = { callClaude, extractClientName, parseDelimiterFormat, SYSTEM, buildUserMessage, processBold };
