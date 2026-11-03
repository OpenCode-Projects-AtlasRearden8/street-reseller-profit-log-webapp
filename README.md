# Flip Ledger

An offline, single-file webapp for tracking street-flipper daily profits. Log every find in one row — what you paid, what it fetched, and what the sold comps told you — then let the **flip-ability grid** show you which lanes are worth your sourcing time.

Built with plain HTML/JS/CSS. No build step, no network, no accounts. Every byte stays in your browser's localStorage.

## What it does

- **One row per find** — name, preset category, cost paid, sale price, and a free-form *comps-search note* ("3 solds $25–$38, fastest 2 days; chips on lids kill deals").
- **Flip-ability grid (2×2)** — every find sits where *fun to list* crosses *fast to move*:
  - **Sweet Spot** — fun to list, fast to move
  - **Hobby Hang** — fun to list, sits a while
  - **Bread & Butter** — a drag to list, but sells quick
  - **Pass Next Time** — a drag to list and slow to sell
- **Season totals** — money spent, sold revenue, realized profit, ROI on sold finds, how many are still out, and your best flip so far.
- **Vintage-market preset categories** — Pyrex & Corningware, Vinyl Records, Vintage Tees & Denim, Tools & Hardware, and 15+ more lanes.
- **Weekly "what I learned" prompt** — every Monday a fresh nudge ("What would you pass on next time, and why?"). Write a few plain words; past takeaways are kept week by week.
- **Your data, your machine** — export a JSON backup, import it back, or clear everything. Nothing is sent anywhere.

## How to run it

1. Download `index.html`.
2. Double-click it (or open `file://`-style in any modern browser: Chrome, Firefox, Safari, Edge).
3. Start logging finds. Optional: "Load sample finds" shows how the grid works.

That's the whole install.

## How it's tested

Two plain Node test scripts, no dependencies:

```bash
node tests/run-tests.js   # grid placement + totals math (pure logic)
node tests/smoke.js       # full UI flow on a fake DOM: boot, add find, mark sold, weekly save, filter
```

The test harness reads `index.html` itself and extracts the marked pure-logic block, so the tests always check the code you actually ship.

## A note on the numbers

- **Realized profit** = revenue on sold finds minus the cost of just those finds. Unsold finds show as "money still out."
- **ROI** is measured against the cost of sold items only, so stash sitting around doesn't drag your percentage.

## Project notes

- Distinct app: complements (but does not duplicate) our daily-reseller output and lot-builder tools — this one is about the *find-level* ledger and the fun×fast lane map.
- Local-first and private by design: one file, `file://` friendly, localStorage only.
- **Flip Ledger** is an open-source tool by **Asdale Dynamics, LLC** — practical, beginner-friendly tools from the folks behind [The Massive AI Manual](https://dylanasdale.github.io).

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC
