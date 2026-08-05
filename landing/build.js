// Build step for the landing site — copies landing/ into landing/publish/,
// substituting the __PADDLE_*__ placeholders in index.html with real values
// read from environment variables. Netlify runs this at deploy time with its
// own env vars (live values); locally it's run with sandbox values from a
// local .env file so the two never depend on each other.
'use strict';

const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;
const DIST = path.join(__dirname, 'publish');

const REQUIRED_VARS = [
  'PADDLE_ENVIRONMENT',
  'PADDLE_CLIENT_TOKEN',
  'PADDLE_PRICE_STARTER',
  'PADDLE_PRICE_PRO',
  'PADDLE_PRICE_AGENCY',
];

const missing = REQUIRED_VARS.filter(name => !process.env[name]);
if (missing.length) {
  console.error('Build failed — missing required env vars: ' + missing.join(', '));
  process.exit(1);
}

const REPLACEMENTS = {
  __PADDLE_ENVIRONMENT__:   process.env.PADDLE_ENVIRONMENT,
  __PADDLE_CLIENT_TOKEN__:  process.env.PADDLE_CLIENT_TOKEN,
  __PADDLE_PRICE_STARTER__: process.env.PADDLE_PRICE_STARTER,
  __PADDLE_PRICE_PRO__:     process.env.PADDLE_PRICE_PRO,
  __PADDLE_PRICE_AGENCY__:  process.env.PADDLE_PRICE_AGENCY,
};

// Anything in this list is never copied into the build output.
const SKIP = new Set(['publish', 'build.js', 'node_modules', '.env', '.env.example', '.git']);

function copyRecursive(srcDir, distDir) {
  fs.mkdirSync(distDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (srcDir === SRC && SKIP.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const srcPath  = path.join(srcDir, entry.name);
    const distPath = path.join(distDir, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, distPath);
    } else if (entry.name === 'index.html') {
      let html = fs.readFileSync(srcPath, 'utf8');
      for (const [placeholder, value] of Object.entries(REPLACEMENTS)) {
        html = html.split(placeholder).join(value);
      }
      fs.writeFileSync(distPath, html);
    } else {
      fs.copyFileSync(srcPath, distPath);
    }
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
copyRecursive(SRC, DIST);
console.log(`Built landing site into ${DIST} (PADDLE_ENVIRONMENT=${process.env.PADDLE_ENVIRONMENT})`);
