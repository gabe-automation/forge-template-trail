# Roadmap — WebCraft (imported from forge-deploy)

Import complete: code moved into /dev-server, Lovable Cloud enabled (email + Google auth), migrations applied, E2E baseline verified.

## Round 1 — done (2026-10-25)
1. [x] Preview/publish images: sandboxed preview now injects a `<base>` tag (srcdoc frames can't resolve root-relative URLs), published HTML/pages are absolutized, and the Code-tab ZIP export now packages every photo/video into `assets/` like the hosting deploys.
2. [x] Block code peek: hover any block on the canvas → tiny `</>` button top-right → click → small HTML/CSS/Script viewer with the block's exact exported code + copy button (`blockSnippet` in model.ts).
3. [x] script.js in the Code tab is the JavaScript for the entire website (runtime + every block's logic, in page order) — header comment and hint make that explicit.
4. [x] Templates are multi-page real websites: each template now ships Home + 2 inner pages; applying one creates the extra pages as real project pages (`blocksToViews`, `templatePageCount`, `pages` on SiteTemplate).
5. [x] New-project dialog redesigned: template cards with live thumbnails, page-count chips, selected checkmark, "Your choice" summary rail, sticky name/create bar.

Tests: `src/test/templates.test.ts` (multi-page templates + blockSnippet/export consistency) — passing. Verified in preview: signup → new project from template (3 pages) → code peek → preview popup images → publish → published home + inner page render with images.

## Builder refinements
- [x] Reorganize header and panels for desktop, tablet, and phone editing.
- [x] Make compound block content independently editable and support grouping/ungrouping.
- [x] Move selective locks to code peek and retain automatic collaboration locks.
- [x] Add portable chart/store code integration points and unit-test exported behavior.
- [ ] Verify signed-in editor flows at desktop/tablet/phone sizes — blocked: no matching account session; user must sign in to preview.
