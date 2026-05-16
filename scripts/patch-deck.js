#!/usr/bin/env node
/**
 * patch-deck.js — idempotent post-export patcher for /membership/index.html
 *
 * Runs as Vercel buildCommand. Reads the deck HTML, applies:
 *   1. Title rename: "Sales Deck" → "Membership Deck"
 *   2. Favicons (matches main site)
 *   3. Open Graph + Twitter meta tags (for iMessage/Slack/Twitter previews)
 *   4. Mobile tap-fix script before </body> (demotes deck-stage tapzones below slide content so links work in portrait)
 *
 * Safe to re-run on already-patched files — every section is gated on a "is this missing?" check.
 * Drop a fresh deck export at membership/index.html and push; this script re-applies everything on build.
 */
const fs = require('fs');
const path = require('path');

const DECK_PATH = path.join(process.cwd(), 'membership', 'index.html');

if (!fs.existsSync(DECK_PATH)) {
  console.log(`[patch-deck] No file at ${DECK_PATH}; nothing to patch.`);
  process.exit(0);
}

let html = fs.readFileSync(DECK_PATH, 'utf8');
const originalLen = html.length;
let changes = 0;

const META_BLOCK = `  <title>Cannabiz Academy — Membership Deck</title>
  <meta name="description" content="Cannabiz Academy Membership Deck — how operators get licensed, build brands, and run their numbers with the CBA toolkit.">

  <!-- Favicons -->
  <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192x192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">

  <!-- Open Graph / iMessage / Slack link preview -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Cannabiz Academy">
  <meta property="og:title" content="Cannabiz Academy — Membership Deck">
  <meta property="og:description" content="How operators get licensed, build brands, and run their numbers with the CBA toolkit.">
  <meta property="og:url" content="https://www.cannabizacademy.ai/membership">
  <meta property="og:image" content="https://www.cannabizacademy.ai/assets/favicon-512x512.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Cannabiz Academy — Membership Deck">
  <meta name="twitter:description" content="How operators get licensed, build brands, and run their numbers with the CBA toolkit.">
  <meta name="twitter:image" content="https://www.cannabizacademy.ai/assets/favicon-512x512.png">`;

// 1+2+3. Title + favicons + OG/Twitter meta
const rawTitle = /  <title>Cannabiz Academy — Sales Deck<\/title>/;
const hasOg = /<meta property="og:title"/.test(html);

if (rawTitle.test(html)) {
  // Fresh re-export — replace raw "Sales Deck" title line with full block
  html = html.replace(rawTitle, META_BLOCK);
  changes++;
  console.log('[patch-deck] Applied title + favicons + OG/Twitter meta.');
} else if (!hasOg) {
  // Title was edited but no OG block — inject after existing title
  html = html.replace(
    /(<title>[^<]*<\/title>)/,
    (m) => m + '\n' + META_BLOCK.split('\n').slice(1).join('\n')
  );
  changes++;
  console.log('[patch-deck] Added missing OG/meta block.');
} else {
  console.log('[patch-deck] Title + meta already present.');
}

// 4. Mobile tap-fix script
const FIX_SCRIPT = `
  <!-- Mobile link fix: on slides that contain links, bump .stage above .tapzones so links stay
       tappable in portrait. Slides without links keep default tapzones so tap-to-advance works. -->
  <script>
    (function () {
      const ready = (stage) => {
        if (!stage || !stage.shadowRoot) return false;
        if (stage.shadowRoot.querySelector('style[data-link-fix]')) return true;
        const style = document.createElement('style');
        style.setAttribute('data-link-fix', '1');
        stage.shadowRoot.appendChild(style);
        const setRaised = (raised) => {
          style.textContent = raised
            ? '.stage{z-index:10 !important;} .tapzones{z-index:1 !important;}'
            : '';
        };
        const update = () => {
          const active = stage.querySelector('section[data-deck-active]');
          const hasLink = !!(active && active.querySelector('a[href]'));
          setRaised(hasLink);
        };
        const obs = new MutationObserver(update);
        stage.querySelectorAll('section').forEach((s) =>
          obs.observe(s, { attributes: true, attributeFilter: ['data-deck-active'] })
        );
        update();
        return true;
      };
      const tryFix = () => {
        const stage = document.querySelector('deck-stage');
        if (ready(stage)) return;
        requestAnimationFrame(tryFix);
      };
      if (window.customElements && customElements.whenDefined) {
        customElements.whenDefined('deck-stage').then(tryFix);
      } else {
        document.addEventListener('DOMContentLoaded', tryFix);
      }
    })();
  </script>
`;

if (!/data-link-fix/.test(html)) {
  html = html.replace('</body>', FIX_SCRIPT + '</body>');
  changes++;
  console.log('[patch-deck] Injected mobile tap-fix script.');
} else {
  console.log('[patch-deck] Mobile tap-fix already present.');
}

if (changes > 0) {
  fs.writeFileSync(DECK_PATH, html, 'utf8');
  console.log(`[patch-deck] Wrote ${DECK_PATH} (${originalLen} → ${html.length} bytes, ${changes} change${changes === 1 ? '' : 's'}).`);
} else {
  console.log('[patch-deck] No changes needed. Already current.');
}
