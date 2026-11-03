#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var htmlPath = path.join(__dirname, "..", "index.html");
var html = fs.readFileSync(htmlPath, "utf8");
var scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "inline script present in index.html");
var code = scriptMatch[1];

function FakeElement(tag) {
  this.tagName = (tag || "div").toUpperCase();
  this.children = [];
  this.parentNode = null;
  this.style = {};
  this.dataset = {};
  this._listeners = {};
  this._classes = [];
  this._html = "";
  this._text = "";
  this.value = "";
  this.checked = false;
}
Object.defineProperty(FakeElement.prototype, "innerHTML", {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); this.children.length = 0; }
});
Object.defineProperty(FakeElement.prototype, "textContent", {
  get: function () { return this._text; },
  set: function (v) { this._text = String(v); }
});
Object.defineProperty(FakeElement.prototype, "className", {
  get: function () { return this._classes.join(" "); },
  set: function (v) { this._classes = String(v).split(/\s+/).filter(Boolean); }
});
FakeElement.prototype.appendChild = function (child) {
  this.children.push(child);
  child.parentNode = this;
  return child;
};
FakeElement.prototype.removeChild = function (child) {
  var i = this.children.indexOf(child);
  if (i !== -1) { this.children.splice(i, 1); }
  return child;
};
FakeElement.prototype.addEventListener = function (type, fn) {
  (this._listeners[type] = this._listeners[type] || []).push(fn);
};
FakeElement.prototype.querySelector = function () { return new FakeElement("span"); };
FakeElement.prototype.fire = function (type) {
  var self = this;
  var list = (this._listeners[type] || []).slice();
  for (var i = 0; i < list.length; i++) {
    list[i]({ preventDefault: function () {}, target: self });
  }
};
FakeElement.prototype.click = function () { this.fire("click"); };
FakeElement.prototype.reset = function () {};
Object.defineProperty(FakeElement.prototype, "classList", {
  get: function () {
    var el = this;
    return {
      add: function (c) { if (el._classes.indexOf(c) === -1) { el._classes.push(c); } },
      remove: function (c) { el._classes = el._classes.filter(function (x) { return x !== c; }); },
      toggle: function (c) {
        if (el._classes.indexOf(c) === -1) { el._classes.push(c); return true; }
        el._classes = el._classes.filter(function (x) { return x !== c; });
        return false;
      }
    };
  }
});
FakeElement.prototype.walk = function (fn) {
  fn(this);
  for (var i = 0; i < this.children.length; i++) { this.children[i].walk(fn); }
};
FakeElement.prototype.find = function (pred) {
  var found = null;
  this.walk(function (el) {
    if (!found && pred(el)) { found = el; }
  });
  return found;
};

var byId = {};
function getById(id) {
  if (!byId[id]) {
    var el = new FakeElement(id === "addForm" ? "form" : "div");
    el.id = id;
    byId[id] = el;
  }
  return byId[id];
}

var checkedRadio = new FakeElement("input");
checkedRadio.value = "yes";

FakeElement.prototype.querySelector = function () { return checkedRadio; };

var radioHolder = new FakeElement("div");
radioHolder.appendChild(checkedRadio);

var doc = {
  readyState: "complete",
  getElementById: getById,
  createElement: function (tag) { return new FakeElement(tag); },
  addEventListener: function () {},
  querySelector: function () { return checkedRadio; },
  body: new FakeElement("body")
};
var win = { addEventListener: function () {} };
var storeData = {};
var storageStub = {
  getItem: function (k) { return storeData.hasOwnProperty(k) ? storeData[k] : null; },
  setItem: function (k, v) { storeData[k] = String(v); }
};

global.alert = function () {};
global.confirm = function () { return false; };

var passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ok  " + name);
  } catch (e) {
    failed++;
    console.log("FAIL  " + name);
    console.log("      " + e.stack.split("\n").slice(0, 3).join(" | "));
  }
}

console.log("Flip Ledger UI smoke test (fake DOM)\n");

var core = null;
function savedState() { return JSON.parse(storeData["flipledger.v1"]); }
function statByLabel(label) {
  var tiles = getById("totalsStrip").children;
  for (var i = 0; i < tiles.length; i++) {
    if (tiles[i]._html.indexOf('<span class="label">' + label) !== -1) { return tiles[i]; }
  }
  return null;
}

test("app boots, renders shell, exposes core", function () {
  new Function("document", "window", "localStorage", code)(doc, win, storageStub);
  core = win.FLIPCORE;
  assert.ok(core && typeof core.computeTotals === "function", "FLIPCORE exposed");
  assert.strictEqual(getById("totalsStrip").children.length, 6, "six stat tiles");
  assert.strictEqual(getById("grid2x2").children.length, 4, "four quadrant cells");
  assert.ok(getById("fCategory").children.length >= 15, "category presets populated");
  assert.strictEqual(getById("ledgerBody").children.length, 0);
});

var form;
test("adding a find puts a row in the ledger and persists it", function () {
  form = getById("addForm");
  getById("fName").value = "test find vase";
  getById("fCost").value = "5";
  getById("fStatus").value = "listed";
  getById("fComps").value = "2 solds, $20ish";
  form.fire("submit");
  var saved = savedState();
  assert.strictEqual(saved.items.length, 1);
  assert.strictEqual(saved.items[0].name, "test find vase");
  assert.strictEqual(saved.items[0].status, "listed");
  assert.strictEqual(saved.items[0].fun, true, "fun radio captured");
  assert.strictEqual(saved.items[0].fast, true, "fast radio captured");
  assert.strictEqual(getById("ledgerBody").children.length, 1);
});

test("marking sold updates profit in storage and totals", function () {
  var body = getById("ledgerBody");
  var soldBtn = body.find(function (el) { return el.tagName === "BUTTON" && el._text === "Sold"; });
  assert.ok(soldBtn, "Sold button rendered");
  soldBtn.fire("click");
  var saleInput = body.find(function (el) { return el.tagName === "INPUT" && el.placeholder === "$ sale"; });
  assert.ok(saleInput, "sale price input rendered");
  saleInput.value = "25";
  var okBtn = body.find(function (el) { return el.tagName === "BUTTON" && el._text === "OK"; });
  assert.ok(okBtn, "OK button rendered");
  okBtn.fire("click");
  var saved2 = savedState();
  assert.strictEqual(saved2.items[0].status, "sold");
  assert.strictEqual(saved2.items[0].sale, 25, "sale price captured");
  assert.ok(statByLabel("Spent")._html.indexOf("$5.00") !== -1, "spent rendered");
  var profitTile = statByLabel("Realized profit");
  assert.ok(profitTile._html.indexOf("$20.00") !== -1, "rendered profit shows $20.00, got: " + profitTile._html);
  assert.ok(statByLabel("ROI on sold")._html.indexOf("+400%") !== -1, "ROI rendered");
});

test("totals tile count swings when items exist", function () {
  var tiles = getById("totalsStrip").children;
  var bestTile = null;
  for (var i = 0; i < tiles.length; i++) {
    if (tiles[i]._html.indexOf("Best flip so far") !== -1) { bestTile = tiles[i]; }
  }
  assert.ok(bestTile && bestTile._html.indexOf("test find vase") !== -1, "best flip tile names the sold find");
});

test("ledger row shows quadrant and comps note", function () {
  var html = getById("ledgerBody").children[0]._html;
  var row = getById("ledgerBody").children[0];
  var allText = "";
  row.walk(function (el) { allText += el._text + " " + el._html + " "; });
  assert.ok(allText.indexOf("Sweet Spot") !== -1, "quadrant badge present");
  assert.ok(allText.indexOf("2 solds, $20ish") !== -1, "comps note shown");
});

test("already-sold row renders sale and profit cells", function () {
  var row = getById("ledgerBody").children[0];
  var allText = "";
  row.walk(function (el) { allText += el._text + " " + el._html + " "; });
  assert.ok(allText.indexOf("$25.00") !== -1, "sale amount shown");
  assert.ok(allText.indexOf("$20.00") !== -1, "profit shown");
  assert.ok(allText.indexOf("Sold") !== -1, "status badge shown");
});

test("weekly save stores takeaway under current ISO week key", function () {
  var ta = getById("weeklyText");
  ta._text = "";
  ta.value = "Learned that boring carts pay for the fun stuff.";
  getById("saveWeekly").fire("click");
  var saved = savedState();
  var keys = Object.keys(saved.learnings);
  assert.strictEqual(keys.length, 1);
  assert.ok(/^(19|20)\d\d-W\d\d$/.test(keys[0]), "week key looks like YYYY-Wnn");
  assert.ok(getById("weeklyList").children.length >= 1, "past takeaway rendered");
});

test("weekly save rejects empty takeaway", function () {
  var ta = getById("weeklyText");
  ta._text = "";
  ta.value = "";
  var before = JSON.parse(storeData["flipledger.v1"]).learnings;
  getById("saveWeekly").fire("click");
  var after = JSON.parse(storeData["flipledger.v1"]).learnings;
  assert.strictEqual(Object.keys(after).length, Object.keys(before).length);
});

test("quadrant click filters the ledger", function () {
  var cells = getById("grid2x2").children;
  var sweetCell = null;
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].className.indexOf("q-sweet") !== -1) { sweetCell = cells[i]; }
  }
  assert.ok(sweetCell, "sweet spot cell exists");
  sweetCell.fire("click");
  var filterLabel = getById("filterLabel");
  assert.ok(filterLabel._text.indexOf("Sweet Spot") !== -1, "filter label set, got: " + filterLabel._text);
  sweetCell.fire("click");
  assert.strictEqual(getById("filterBar").style.display, "none", "filter cleared");
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
