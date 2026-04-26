// PropWise v2 Backend Server
const express = require('express');
const https   = require('https');
const crypto  = require('crypto');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.LICENSE_SECRET || 'change-this';

app.use(express.json({ limit: '30kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-license-key, x-admin-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function generateKey(email) {
  const h = crypto.createHmac('sha256', SECRET).update(email.toLowerCase().trim()).digest('hex').toUpperCase().slice(0,12);
  return `PW-${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}`;
}
function isValidKey(k) { return k && /^PW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(k); }

const rl = new Map();
function rateOk(k) {
  const now = Date.now(), e = rl.get(k) || { n:0, reset: now+3600000 };
  if (now > e.reset) { e.n=0; e.reset=now+3600000; }
  e.n++; rl.set(k,e); return e.n <= 40;
}

function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(new Error('Server not configured'));
    const body = JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:1200, system, messages:[{role:'user',content:user}] });
    const req = https.request({
      hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}
    }, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {
          const p=JSON.parse(d);
          if(p.error) return reject(new Error(p.error.message));
          const m=(p.content?.[0]?.text||'').match(/\{[\s\S]*\}/);
          if(!m) return reject(new Error('Bad response'));
          resolve(JSON.parse(m[0]));
        } catch(e){reject(new Error('Parse error'));}
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

const SYSTEM = `You are an elite Upwork proposal writer who helps freelancers win jobs.
Your proposals:
1. NEVER sound like AI. Write like a real, confident human professional.
2. NEVER use generic phrases like "I am writing to express my interest", "I am a passionate developer", "I have extensive experience", "I would be a great fit", "look no further", "I am excited about this opportunity"
3. Use SHORT sentences. Vary rhythm. Sound like a real person texting a colleague, not a cover letter robot.
4. ONLY mention skills that are DIRECTLY relevant to THIS specific job. Never dump a list of all skills.
5. Pick the BEST hook from these 7 based on the job:
   - PROOF: Lead with a specific past result ("I shipped X for client Y, it hit Z")
   - RELATABILITY: "I've solved this exact problem before — here's how"
   - GUARANTEE: Bold commitment that removes client risk
   - EXTRA VALUE: Offer something beyond what they asked
   - CALL: Push for a quick call today, no strings
   - NUMBERS: Hard stats — years, projects, ratings, success rate
   - CLIENT-CENTERED: Show you deeply understood THEIR specific problem

Return ONLY valid JSON:
{
  "letter": "The complete proposal as one flowing piece of text. Opening hook + body + closing. No section headers. Natural paragraphs. 150-220 words total.",
  "hookType": "Which hook you used",
  "hookDesc": "One line explaining why you chose this hook for this job",
  "tips": ["tip 1 specific to this job", "tip 2", "tip 3"]
}

CRITICAL — AI detection bypass rules:
- Vary sentence length dramatically (short. Then a longer one that flows naturally into the point.)
- Use contractions (I'll, you'll, I've, don't, it's)
- Start some sentences with And, But, So
- Include one small specific detail that shows you actually read the job
- Avoid all adverbs ending in -ly (quickly, efficiently, effectively, etc.)
- Never use the word "leverage", "synergy", "seamlessly", "robust", "scalable"
- Write how a smart human talks, not how an AI performs writing`;

app.get('/', (req,res) => res.json({status:'ok',service:'PropWise API v2'}));

app.post('/validate', (req,res) => {
  res.json({ valid: isValidKey(req.body.licenseKey) });
});

app.post('/generate-key', (req,res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({error:'Unauthorized'});
  if (!req.body.email) return res.status(400).json({error:'Email required'});
  res.json({ licenseKey: generateKey(req.body.email), email: req.body.email });
});

app.post('/proposal', async (req,res) => {
  const licenseKey = req.headers['x-license-key'];
  if (!isValidKey(licenseKey)) return res.status(401).json({error:'Invalid license key.'});
  if (!rateOk(licenseKey)) return res.status(429).json({error:'Rate limit — try again shortly.'});

  const { job, profile, settings } = req.body;
  if (!job?.title && !job?.description) return res.status(400).json({error:'Could not read job from page.'});

  // Smart skill matching
  const jobText = ((job.title||'')+' '+(job.description||'')+' '+(job.skills||'')).toLowerCase();
  const allSkills = (profile.skills||'').split(',').map(s=>s.trim()).filter(Boolean);
  const matched = allSkills.filter(s => jobText.includes(s.toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0,4) : allSkills.slice(0,2);

  const links = (profile.portfolioLinks||[]).filter(Boolean);
  const tone = settings?.tone || 'professional';
  const length = settings?.length || 'medium';

  const userMsg = `
JOB TITLE: ${job.title}
JOB DESCRIPTION: ${(job.description||'').slice(0,1800)}
REQUIRED SKILLS: ${job.skills||'not listed'}
BUDGET: ${job.budget||'not listed'}
CLIENT LOCATION: ${job.location||'unknown'}
CLIENT TOTAL SPENT ON UPWORK: ${job.spent||'unknown'}

FREELANCER:
Name: ${profile.name}
Role: ${profile.title}
RELEVANT skills for THIS job only: ${relevantSkills.join(', ')}
Value pitch: ${profile.pitch||''}
${links.length ? 'Portfolio: ' + links[0] : ''}
${profile.extra ? 'Extra context: '+profile.extra : ''}
${settings?.alwaysInclude ? 'Always include: '+settings.alwaysInclude : ''}

TONE: ${tone}
LENGTH: ${length} (short=100-140 words, medium=150-200, long=200-250)

Write a proposal that wins this job. Pick the best hook. Sound human. No AI clichés. Only mention the RELEVANT skills listed above, not all skills.`.trim();

  try {
    const result = await callClaude(SYSTEM, userMsg);
    res.json({ success:true, ...result });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`PropWise v2 server on port ${PORT}`));
