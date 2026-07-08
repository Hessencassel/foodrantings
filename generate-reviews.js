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
// Explicit buffer -> utf8 decode (rather than relying on readFileSync's string
// encoding shortcut) so there is no ambiguity about how non-ASCII source
// characters (en/em dashes, etc.) are interpreted going in.
const dataBuf = fs.readFileSync(path.join(ROOT, 'reviews-data.js'));
const dataSrc = dataBuf.toString('utf8');
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0D0D0D; --paper: #F5F0E8; --cream: #EDE8DC; --mustard: #E8A020;
      --red: #C1240E; --green: #1A6B3C; --smoke: #2A2A2A; --mid: #6B6560;
      --rule: #D4CEBE; --white: #FFFFFF;
    }
    body { font-family: 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); }
    .wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px 90px; }
    header { text-align: center; margin-bottom: 48px; }
    header a { text-decoration: none; }
    .word-food { display: block; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 900; letter-spacing: 0.5em; text-transform: uppercase; color: var(--ink); }
    .word-rantings { display: block; font-family: 'Playfair Display', serif; font-size: 2.8rem; font-weight: 900; font-style: italic; color: var(--red); line-height: 0.88; margin-top: -4px; letter-spacing: -0.02em; }
    .nav-tagline { font-family: 'DM Mono', monospace; font-weight: 500; font-size: 0.68rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--mid); margin-bottom: 10px; }
    .card { border: 2px solid var(--ink); background: var(--white); box-shadow: 7px 7px 0 var(--ink); padding: 36px; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    .restaurant { font-family: 'Playfair Display', serif; font-size: 2.1rem; font-weight: 900; line-height: 1.05; letter-spacing: -0.015em; }
    .score { font-family: 'Playfair Display', serif; font-size: 2.8rem; font-weight: 900; line-height: 0.9; flex-shrink: 0; }
    .score.score-bad { color: var(--red); }
    .score.score-meh { color: var(--mustard); }
    .score.score-good { color: var(--green); }
    .tag { display: inline-block; background: var(--ink); color: var(--paper); font-family: 'DM Mono', monospace; font-weight: 500; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 5px 12px; margin-bottom: 22px; }
    .tag.card-good  { background: var(--green); color: var(--paper); }
    .tag.card-meh   { background: var(--mustard); color: var(--ink); }
    .tag.card-bad   { background: var(--red); color: var(--paper); }
    .tag.card-crime { background: #8B0000; color: var(--paper); }
    .body-text { font-size: 1.05rem; line-height: 1.75; color: var(--smoke); margin-bottom: 26px; }
    .meta { display: flex; justify-content: space-between; padding-top: 18px; border-top: 2px solid var(--ink); font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--mid); letter-spacing: 0.06em; }
    .back { display: inline-block; margin-top: 36px; font-weight: 700; font-size: 0.85rem; color: var(--ink); text-decoration: none; border-bottom: 2px solid var(--ink); }
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

// ---- guide page: curated best-of, grouped by tier, read-only from staticReviews ----
const GUIDE_SECTIONS = [
  { tier: 'Legend', label: 'Legends' },
  { tier: 'Must Visit', label: 'Must Visits' },
];

function guidePageHtml(reviews) {
  const sections = GUIDE_SECTIONS
    .map(s => ({ ...s, entries: reviews.filter(r => r.tier === s.tier) }))
    .filter(s => s.entries.length > 0);

  const totalCount = sections.reduce((n, s) => n + s.entries.length, 0);
  const title = 'Where to Eat in Fort Wayne — The Food Rantings Guide';
  const description = `${totalCount} restaurants in Fort Wayne worth your time, hand-picked from our honest reviews. No sponsors. No comped meals. No mercy.`;
  const canonicalUrl = `${SITE_URL}/guide/`;

  let position = 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    itemListElement: sections.flatMap(s => s.entries.map(r => {
      position++;
      return {
        '@type': 'ListItem',
        position,
        item: {
          '@type': 'Restaurant',
          name: r.restaurant,
          url: `${SITE_URL}/review/${r.slug}/`,
        },
      };
    })),
  };

  const sectionsHtml = sections.map(s => `
      <section class="guide-section">
        <h2 class="guide-section-title">${escHtml(s.label)}</h2>
        <div class="guide-list">
          ${s.entries.map((r, i) => `
          <a class="guide-entry" href="/review/${escHtml(r.slug)}/">
            <div class="guide-entry-index">${String(i + 1).padStart(2, '0')}</div>
            <div class="guide-entry-body">
              <div class="guide-entry-header">
                <div class="guide-entry-name">${escHtml(r.restaurant)}</div>
                <div class="guide-entry-score ${scoreClass(r.score)}">${escHtml(r.score)}</div>
              </div>
              <span class="guide-entry-tag ${cardBorderClass(r.score)}">${escHtml(r.tier)}</span>
              <p class="guide-entry-excerpt">${escHtml(truncate(r.body, 200))}</p>
              <span class="guide-entry-link">Read the full rant →</span>
            </div>
          </a>`).join('')}
        </div>
      </section>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="website" />
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0D0D0D; --paper: #F5F0E8; --cream: #EDE8DC; --mustard: #E8A020;
      --red: #C1240E; --green: #1A6B3C; --smoke: #2A2A2A; --mid: #6B6560;
      --rule: #D4CEBE; --white: #FFFFFF;
    }
    body { font-family: 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); }
    .wrap { max-width: 860px; margin: 0 auto; padding: 48px 24px 100px; }

    header { text-align: center; margin-bottom: 24px; }
    header a { text-decoration: none; }
    .word-food { display: block; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 900; letter-spacing: 0.5em; text-transform: uppercase; color: var(--ink); }
    .word-rantings { display: block; font-family: 'Playfair Display', serif; font-size: 2.8rem; font-weight: 900; font-style: italic; color: var(--red); line-height: 0.88; margin-top: -4px; letter-spacing: -0.02em; }
    .nav-tagline { font-family: 'DM Mono', monospace; font-weight: 500; font-size: 0.68rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--mid); margin-bottom: 10px; }

    .guide-hero { text-align: center; padding: 44px 0 60px; border-bottom: 3px solid var(--ink); margin-bottom: 60px; }
    .guide-eyebrow { font-family: 'DM Mono', monospace; font-weight: 500; font-size: 0.74rem; letter-spacing: 0.32em; text-transform: uppercase; color: var(--red); margin-bottom: 18px; }
    .guide-headline { font-family: 'Playfair Display', serif; font-size: clamp(2.8rem, 7vw, 5rem); font-weight: 900; font-style: italic; line-height: 0.96; letter-spacing: -0.03em; margin-bottom: 22px; }
    .guide-sub { font-size: 1.08rem; line-height: 1.65; color: var(--smoke); max-width: 560px; margin: 0 auto; }

    .guide-section { margin-bottom: 68px; }
    .guide-section-title {
      font-family: 'DM Mono', monospace; font-size: 0.88rem; font-weight: 500;
      letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink);
      display: flex; align-items: center; gap: 18px; margin-bottom: 36px;
    }
    .guide-section-title::after { content: ''; flex: 1; height: 3px; background: var(--ink); }

    .guide-list { display: flex; flex-direction: column; }
    .guide-entry {
      display: flex; gap: 26px; padding: 30px 0; border-bottom: 2px solid var(--rule);
      text-decoration: none; color: inherit; transition: background 0.15s, padding-left 0.15s;
    }
    .guide-entry:hover { background: rgba(13,13,13,0.025); padding-left: 8px; }
    .guide-entry:last-child { border-bottom: none; }
    .guide-entry-index {
      font-family: 'Playfair Display', serif; font-weight: 900; font-size: 1.15rem; color: var(--rule);
      flex-shrink: 0; width: 40px; padding-top: 2px;
    }
    .guide-entry-body { flex: 1; min-width: 0; }
    .guide-entry-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
    .guide-entry-name { font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 900; line-height: 1.08; letter-spacing: -0.015em; }
    .guide-entry-score { font-family: 'Playfair Display', serif; font-size: 1.9rem; font-weight: 900; line-height: 0.9; flex-shrink: 0; }
    .guide-entry-score.score-good { color: var(--green); }
    .guide-entry-score.score-meh { color: var(--mustard); }
    .guide-entry-score.score-bad { color: var(--red); }
    .guide-entry-tag {
      display: inline-block; background: var(--ink); color: var(--paper); font-family: 'DM Mono', monospace; font-weight: 500;
      font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 4px 10px; margin-bottom: 16px;
    }
    .guide-entry-tag.card-good  { background: var(--green); color: var(--paper); }
    .guide-entry-tag.card-meh   { background: var(--mustard); color: var(--ink); }
    .guide-entry-tag.card-bad   { background: var(--red); color: var(--paper); }
    .guide-entry-tag.card-crime { background: #8B0000; color: var(--paper); }
    .guide-entry-excerpt { font-size: 0.96rem; line-height: 1.65; color: var(--smoke); margin-bottom: 14px; }
    .guide-entry-link { font-size: 0.8rem; font-weight: 700; color: var(--ink); border-bottom: 2px solid var(--ink); padding-bottom: 1px; }
    .guide-entry:hover .guide-entry-link { color: var(--red); border-color: var(--red); }

    .back { display: inline-block; margin-top: 8px; font-weight: 700; font-size: 0.85rem; color: var(--ink); text-decoration: none; border-bottom: 2px solid var(--ink); }
    .back:hover { color: var(--red); border-color: var(--red); }

    @media (max-width: 600px) {
      .guide-entry { gap: 16px; }
      .guide-entry-name { font-size: 1.35rem; }
      .guide-entry-score { font-size: 1.35rem; }
    }
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

    <div class="guide-hero">
      <div class="guide-eyebrow">The Food Rantings Guide</div>
      <h1 class="guide-headline">Where to Eat<br>in Fort Wayne.</h1>
      <p class="guide-sub">${totalCount} restaurants that earned it. We paid for every meal, named the bad ones too, and this is what's left standing.</p>
    </div>

    ${sectionsHtml}

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
  // Explicit utf8 buffer (not the string+'utf8' shorthand) so the byte
  // encoding of the output file is never left to an implicit default.
  fs.writeFileSync(path.join(dir, 'index.html'), Buffer.from(pageHtml(r), 'utf8'));
  count++;
}
console.log(`generate-reviews.js: wrote ${count} review permalink pages to /review/`);

// ---- generate the guide page ----
const guideDir = path.join(ROOT, 'guide');
fs.rmSync(guideDir, { recursive: true, force: true });
fs.mkdirSync(guideDir, { recursive: true });
fs.writeFileSync(path.join(guideDir, 'index.html'), Buffer.from(guidePageHtml(staticReviews), 'utf8'));
console.log('generate-reviews.js: wrote /guide/');
