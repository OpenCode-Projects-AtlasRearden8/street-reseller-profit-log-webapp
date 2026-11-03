# STATUS.md — Flip Ledger

## What was built

`index.html` — a single-file, offline webapp for street-flipper daily profits:

- **Ledger**: one row per find — name, preset category, cost, sale, status
  (stashed / listed / sold), and a comps-search note.
- **Flip-ability grid**: a 2×2 of *fun-to-list* × *fast-to-move* — Sweet Spot,
  Hobby Hang, Bread & Butter, Pass Next Time — with live counts; clicking a
  quadrant filters the ledger.
- **Totals strip**: money spent, sold revenue, realized profit, ROI (cost of
  sold finds only), open-find counts, money still out, best flip so far.
- **Vintage-market preset categories**: 20 lanes (Pyrex, vinyl, denim, tools,
  film gear, console carts, Fiesta-adjacent glassware, etc.).
- **Weekly "what I learned" prompt**: ISO-week keyed, one of ten rotating
  nudges; past takeaways saved week by week (view/delete).
- **Data safety**: export/import JSON backups; localStorage only;
  cross-tab sync via the storage event.

Distinct from the street-reseller-dailies output and the lot builder: it is a
find-level profit ledger with the fun×fast lane map, not a day roll-up or a
multi-item lot packer.

## How to run it

Open `index.html` directly in any modern browser (double-click it or
`file:///…/index.html`). No server, no build, no network needed.

## Verification results

All commands run in the project root; all green:

```
node tests/run-tests.js   → 19 passed, 0 failed
                            (grid placement, totals math, ISO week keys,
                             currency, validation, preset list)
node tests/smoke.js       → 9 passed, 0 failed
                            (fake-DOM boot, add find, mark sold, profit tile,
                             comps note render, weekly save + empty-save guard,
                             quadrant click filtering)
google-chrome --headless --dump-dom file://…/index.html
                          → JS app booted from file://: quadrants, week key
                            (2026-W45), category options and stat tiles all
                            rendered; only sandbox GPU/EGL noise in stderr,
                            no JS errors
HTML parse check (python html.parser) → clean
```

Fixes made during verification:
- Test harness bug (not app): fake-DOM `innerHTML` setter now clears child
  nodes like a real browser, and totals assertions became label-based.
- No app-level bugs found.

## Known gaps

- No in-place editing of a find (fix = delete and re-log); sold flow covers
  price only, comps notes can't be appended after the fact.
- Photos can't be attached (by design; note text only).
- No multi-currency handling — everything is plain `$` numbers.
- The fake-DOM smoke harness doesn't cover `exportBackup`/`importBackup`
  (Blob/FileReader aren't stubbable in Node); export/import verified only by
  code review + browser boot.
- Sample finds use generic vintage categories, not your actual market data.
- No data migration layer if the storage shape changes (key is `flipledger.v1`).
