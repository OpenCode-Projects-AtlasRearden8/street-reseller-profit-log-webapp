#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var htmlPath = path.join(__dirname, "..", "index.html");
var html = fs.readFileSync(htmlPath, "utf8");

var startMarker = "/* ==== CORE-START";
var endMarker = "/* ==== CORE-END";
var startIdx = html.indexOf(startMarker);
var endIdx = html.indexOf(endMarker);
assert.ok(startIdx !== -1 && endIdx !== -1 && endIdx > startIdx, "core block markers present in index.html");
var block = html.slice(startIdx, endIdx);

var core = new Function(
  block +
  ";return { FLIP_CATEGORIES: FLIP_CATEGORIES, WEEKLY_PROMPTS: WEEKLY_PROMPTS, QUADRANTS: QUADRANTS," +
  " quadrantKey: quadrantKey, quadrantForItem: quadrantForItem, currency: currency," +
  " computeTotals: computeTotals, gridCounts: gridCounts, weekKey: weekKey," +
  " weeklyPrompt: weeklyPrompt, validateItem: validateItem };"
)();

var passed = 0;
var failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ok  " + name);
  } catch (e) {
    failed++;
    console.log("FAIL  " + name);
    console.log("      " + e.message);
  }
}

console.log("Flip Ledger core tests (extracted from index.html)\n");

test("quadrantKey maps all four toggle combos", function () {
  assert.strictEqual(core.quadrantKey(true, true), "funfast");
  assert.strictEqual(core.quadrantKey(true, false), "funslow");
  assert.strictEqual(core.quadrantKey(false, true), "boringfast");
  assert.strictEqual(core.quadrantKey(false, false), "boringslow");
});

test("quadrantKey treats missing flags as false", function () {
  assert.strictEqual(core.quadrantKey(undefined, 1), "boringfast");
  assert.strictEqual(core.quadrantKey(1, ""), "funslow");
});

test("quadrantForItem derives quadrant from item fields", function () {
  var item = { name: "x", fun: true, fast: false };
  assert.strictEqual(core.quadrantForItem(item), "funslow");
  assert.strictEqual(core.quadrantForItem({ fun: 0, fast: 1 }), "boringfast");
});

test("QUADRANTS exposes all four keys with labels", function () {
  var keys = core.QUADRANTS.map(function (q) { return q.key; });
  assert.deepStrictEqual(keys.sort(), ["boringfast", "boringslow", "funfast", "funslow"]);
  assert.ok(core.QUADRANTS.every(function (q) { return typeof q.label === "string" && q.label.length > 0; }));
});

test("computeTotals on empty ledger", function () {
  var t = core.computeTotals([]);
  assert.strictEqual(t.spent, 0);
  assert.strictEqual(t.soldRevenue, 0);
  assert.strictEqual(t.realizedProfit, 0);
  assert.strictEqual(t.roi, 0);
  assert.strictEqual(t.avgProfit, 0);
  assert.strictEqual(t.soldCount, 0);
  assert.strictEqual(t.openCost, 0);
  assert.strictEqual(t.best, null);
  assert.strictEqual(t.worst, null);
});

test("computeTotals sums cost, revenue, and realized profit", function () {
  var items = [
    { name: "a", cost: 10, sale: 25, status: "sold" },
    { name: "b", cost: 5, sale: 7.5, status: "sold" },
    { name: "c", cost: 12, status: "listed" },
    { name: "d", cost: 3, status: "stashed" }
  ];
  var t = core.computeTotals(items);
  assert.strictEqual(t.spent, 30);
  assert.strictEqual(t.soldRevenue, 32.5);
  assert.strictEqual(t.soldCount, 2);
  assert.strictEqual(t.listedCount, 1);
  assert.strictEqual(t.stashedCount, 1);
  assert.strictEqual(t.realizedProfit, 17.5);
  assert.strictEqual(t.openCost, 15);
});

test("computeTotals computes ROI on sold cost only", function () {
  var items = [
    { name: "a", cost: 10, sale: 25, status: "sold" },
    { name: "b", cost: 10, sale: 5, status: "sold" },
    { name: "c", cost: 50, status: "listed" }
  ];
  var t = core.computeTotals(items);
  assert.strictEqual(t.realizedProfit, 10);
  assert.strictEqual(t.roi, 50);
  assert.strictEqual(t.avgProfit, 5);
});

test("computeTotals tracks best and worst flip", function () {
  var items = [
    { name: "mid", cost: 5, sale: 10, status: "sold" },
    { name: "star", cost: 2, sale: 22, status: "sold" },
    { name: "stinker", cost: 9, sale: 4, status: "sold" }
  ];
  var t = core.computeTotals(items);
  assert.strictEqual(t.best.name, "star");
  assert.strictEqual(t.best.profit, 20);
  assert.strictEqual(t.worst.name, "stinker");
  assert.strictEqual(t.worst.profit, -5);
});

test("computeTotals ignores sale price for unsold items", function () {
  var items = [{ name: "a", cost: 10, sale: 999, status: "listed" }];
  var t = core.computeTotals(items);
  assert.strictEqual(t.soldRevenue, 0);
  assert.strictEqual(t.realizedProfit, 0);
  assert.strictEqual(t.openCost, 10);
});

test("computeTotals handles missing or stringy numbers", function () {
  var t = core.computeTotals([{ name: "a", cost: "4.5", sale: "9", status: "sold" }, { name: "b", cost: null }]);
  assert.strictEqual(t.spent, 4.5);
  assert.strictEqual(t.soldRevenue, 9);
  assert.strictEqual(t.realizedProfit, 4.5);
});

test("gridCounts tallies items per quadrant", function () {
  var items = [
    { name: "pyrex", fun: true, fast: true },
    { name: "cart", fun: false, fast: true },
    { name: "discman", fun: true, fast: false },
    { name: "craft lot", fun: false, fast: false },
    { name: "vase", fun: true, fast: true }
  ];
  var g = core.gridCounts(items);
  assert.strictEqual(g.counts.funfast, 2);
  assert.strictEqual(g.counts.funslow, 1);
  assert.strictEqual(g.counts.boringfast, 1);
  assert.strictEqual(g.counts.boringslow, 1);
});

test("gridCounts keeps up to three sample names per quadrant", function () {
  var items = [];
  for (var i = 0; i < 5; i++) { items.push({ name: "sweet" + i, fun: true, fast: true }); }
  items.push({ name: "soggy", fun: false, fast: false });
  var g = core.gridCounts(items);
  assert.strictEqual(g.counts.funfast, 5);
  assert.strictEqual(g.names.funfast.length, 3);
  assert.deepStrictEqual(g.names.funfast, ["sweet0", "sweet1", "sweet2"]);
  assert.deepStrictEqual(g.names.boringslow, ["soggy"]);
});

test("gridCounts on empty ledger zeros everything", function () {
  var g = core.gridCounts([]);
  assert.strictEqual(Object.keys(g.counts).length, 4);
  for (var k in g.counts) { assert.strictEqual(g.counts[k], 0); }
});

test("weekKey produces stable ISO-style keys", function () {
  assert.strictEqual(core.weekKey(new Date(2026, 0, 1)), "2026-W01");
  assert.strictEqual(core.weekKey(new Date(2026, 10, 3)), "2026-W45");
  var d1 = new Date(2026, 10, 2);
  var d2 = new Date(2026, 10, 3);
  assert.strictEqual(core.weekKey(d1), core.weekKey(d2));
});

test("weeklyPrompt is stable within a week and differs across weeks", function () {
  var p1 = core.weeklyPrompt(new Date(2026, 10, 3));
  var p2 = core.weeklyPrompt(new Date(2026, 10, 5));
  var p3 = core.weeklyPrompt(new Date(2026, 10, 12));
  assert.strictEqual(p1, p2);
  assert.notStrictEqual(p1, p3);
  assert.ok(core.WEEKLY_PROMPTS.indexOf(p1) !== -1);
});

test("currency formats dollars, cents, and negatives", function () {
  assert.strictEqual(core.currency(0), "$0.00");
  assert.strictEqual(core.currency(3.5), "$3.50");
  assert.strictEqual(core.currency(32.5), "$32.50");
  assert.strictEqual(core.currency(-4), "-$4.00");
  var t = core.computeTotals([{ name: "s", cost: 9, sale: 4, status: "sold" }]);
  assert.strictEqual(core.currency(t.worst.profit), "-$5.00");
});

test("currency rounds float drift", function () {
  assert.strictEqual(core.currency(19.999), "$20.00");
  assert.strictEqual(core.currency(0.005), "$0.01");
});

test("validateItem rejects unnamed finds and bad sold rows", function () {
  assert.strictEqual(core.validateItem(null), "Give the find a name.");
  assert.strictEqual(core.validateItem({ name: "   ", cost: 3, status: "listed" }), "Give the find a name.");
  assert.strictEqual(core.validateItem({ name: "vase", cost: -1, status: "listed" }), "Cost must be zero or more.");
  assert.strictEqual(core.validateItem({ name: "vase", cost: 2, status: "sold" }), "A sold find needs a sale price.");
  assert.strictEqual(core.validateItem({ name: "vase", cost: 2, sale: 9, status: "sold" }), null);
  assert.strictEqual(core.validateItem({ name: "vase", cost: 0, status: "stashed" }), null);
});

test("preset categories ship as the vintage-market list", function () {
  assert.ok(core.FLIP_CATEGORIES.length >= 15);
  ["Vinyl Records", "Pyrex & Corningware", "Tools & Hardware", "Board Games & Puzzles"].forEach(function (c) {
    assert.ok(core.FLIP_CATEGORIES.indexOf(c) !== -1, "missing preset: " + c);
  });
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
