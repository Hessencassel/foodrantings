// Build step: generates a static, indexable, shareable permalink page per
// review — /review/<slug>/index.html — from reviews-data.js. Run by Netlify
// as the build command (see netlify.toml). Output is not committed to git;
// it's regenerated fresh on every deploy from the single source of truth.
//
// No npm dependencies. Run: node generate-reviews.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_URL = 'https://foodrantings.com';
const OG_IMAGE = SITE_URL + '/og-default.png';

// ---- load staticReviews from reviews-data.js (plain script, not a module) ----
const dataSrc = fs.readFileSync(path.join(ROOT, 'reviews-data.js'), 'utf8');
const staticReviews = new Function(dataSrc + '\nreturn staticReviews;')();

// ---- score helpers (mirrors index.html's scoreClass/cardBorderClass/tagColorClass) ----
function scoreClass(score) {
  const r = score || '';
  if (r.startsWith('1') || r.startsWith('2') || r.startsWith('3')) return 'score-bad';
  if (r.startsWith('5') || r.startsWith('6')) return 'score-meh';
  return 'score-good';
}
function cardBorderClass(score) {
  const r = score || '';
  if (r.startsWith('1') || r.startsWith('2')) return 'card-crime';
  if (r.startsWith('3') || r.startsWith('4')) return 'card-bad';
  if (r.startsWith('5') || r.startsWith('6')) return 'card-meh';
  return 'card-good';
}

// ---- derived-field helpers (documented in the Phase 3 plan) ----
const MONTHS = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
function toIsoDate(dateStr) {
  const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec((dateStr || '').trim());
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[2]}-${MONTHS[m[1]]}-01`;
}
function midpointRating(score) {
  const nums = (score || '').match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const vals = nums.map(Number);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}
function truncate(text, max) {
  if (!text || text.length <= max) return text || '';
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

// ---- escaping ----
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageHtml(r) {
  const cardCls = cardBorderClass(r.score);
  const scoreCls = scoreClass(r.score);
  const title = `${r.restaurant}: ${r.tier} — Food Rantings`;
  const description = truncate(r.body, 155);
  const canonicalUrl = `${SITE_URL}/review/${r.slug}/`;
  const isoDate = toIsoDate(r.date);
  const rating = midpointRating(r.score);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@type': 'Restaurant', name: r.restaurant },
    author: { '@type': 'Person', name: r.author },
    reviewBody: r.body,
    publisher: { '@type': 'Organization', name: 'Food Rantings' },
  };
  if (rating != null) {
    jsonLd.reviewRating = { '@type': 'Rating', ratingValue: rating, bestRating: 10, worstRating: 1 };
  }
  if (isoDate) jsonLd.datePublished = isoDate;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Food Rantings" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0D0D0D; --paper: #F5F0E8; --cream: #EDE8DC; --mustard: #E8A020;
      --red: #C1240E; --green: #1A6B3C; --smoke: #2A2A2A; --mid: #6B6560;
      --rule: #D4CEBE; --white: #FFFFFF;
    }
    body { font-family: 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); }
    .wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px 80px; }
    header { text-align: center; margin-bottom: 40px; }
    header a { text-decoration: none; }
    .word-food { display: block; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; letter-spacing: 0.45em; text-transform: uppercase; color: var(--ink); }
    .word-rantings { display: block; font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 900; font-style: italic; color: var(--red); line-height: 0.92; margin-top: -2px; }
    .nav-tagline { font-family: 'DM Mono', monospace; font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--mid); margin-bottom: 10px; }
    .card { border: 1px solid var(--rule); background: var(--white); padding: 32px; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .restaurant { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; line-height: 1.2; }
    .score { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 900; line-height: 1; flex-shrink: 0; }
    .score.score-bad { color: var(--red); }
    .score.score-meh { color: var(--mustard); }
    .score.score-good { color: var(--green); }
    .tag { display: inline-block; border: 1px solid currentColor; font-family: 'DM Mono', monospace; font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 10px; margin-bottom: 20px; }
    .tag.card-good  { color: var(--green); }
    .tag.card-meh   { color: var(--mustard); }
    .tag.card-bad   { color: var(--red); }
    .tag.card-crime { color: #8B0000; }
    .body-text { font-size: 1.02rem; line-height: 1.75; color: var(--smoke); margin-bottom: 24px; }
    .meta { display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--rule); font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--mid); letter-spacing: 0.06em; }
    .back { display: inline-block; margin-top: 32px; font-weight: 600; font-size: 0.85rem; color: var(--ink); text-decoration: none; border-bottom: 2px solid var(--ink); }
    .back:hover { color: var(--red); border-color: var(--red); }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <a href="/">
        <div class="nav-tagline">Fort Wayne's Most Honest Food Publication</div>
        <div class="word-food">Food</div>
        <div class="word-rantings">Rantings</div>
      </a>
    </header>

    <article class="card">
      <div class="card-header">
        <div class="restaurant">${escHtml(r.restaurant)}</div>
        <div class="score ${scoreCls}">${escHtml(r.score)}</div>
      </div>
      <span class="tag ${cardCls}">${escHtml(r.tier)}</span>
      <p class="body-text">${escHtml(r.body)}</p>
      <div class="meta">
        <span>${escHtml(r.author)}</span>
        <span>${escHtml(r.date)}</span>
      </div>
    </article>

    <a class="back" href="/#community-rants-header">← All Reader Rants</a>
  </div>
</body>
</html>
`;
}

// ---- generate ----
const outDir = path.join(ROOT, 'review');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const r of staticReviews) {
  const dir = path.join(outDir, r.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(r), 'utf8');
  count++;
}
console.log(`generate-reviews.js: wrote ${count} review permalink pages to /review/`);
