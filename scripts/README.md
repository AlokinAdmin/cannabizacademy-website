# scripts/

## patch-deck.js

Runs as Vercel `buildCommand` (configured in `/vercel.json`). It re-applies our customizations to `/membership/index.html` on every build:

1. Title: `Cannabiz Academy — Sales Deck` → `Cannabiz Academy — Membership Deck`
2. Favicons (matches main site)
3. Open Graph + Twitter meta (iMessage/Slack/Twitter link previews)
4. Mobile tap-fix script before `</body>` (demotes deck-stage tapzones below slide content so links on slides stay tappable in portrait on iOS)

**Idempotent** — re-running on an already-patched file is a no-op. Drop a fresh deck export into `membership/index.html` and push; the build re-applies everything automatically.
