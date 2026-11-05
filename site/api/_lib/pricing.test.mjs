import test from "node:test";
import assert from "node:assert/strict";
import { check } from "../pricing.js";
import { DEFAULT_PRICES, setPrices, quote } from "../../studio/js/pricing.js";

test("the starter prices pass their own check", () => {
  assert.equal(check(DEFAULT_PRICES, DEFAULT_PRICES, "prices"), null);
});

test("price settings reject text, negatives, unknown keys and wrong shapes", () => {
  assert.match(check({ blank: { tee: "abc" } }, DEFAULT_PRICES, "prices"), /blank\.tee must be a number/);
  assert.match(check({ vat: -1 }, DEFAULT_PRICES, "prices"), /vat must be a number/);
  assert.match(check({ hack: 1 }, DEFAULT_PRICES, "prices"), /hack is not a price setting/);
  assert.match(check({ volume: "lots" }, DEFAULT_PRICES, "prices"), /volume must be a list/);
  assert.equal(check({ paper: { cards: { 5000: 3000 } } }, DEFAULT_PRICES, "prices"), null, "a new quantity tier is allowed");
});

test("saved prices drive the quote; gaps fall back to the starter prices", () => {
  const product = { name: "T-shirt", sizeBreakdown: true };
  setPrices({ blank: { tee: 100 } });
  const q = quote({ productId: "tee", product, process: "dtf", breakdown: { M: 1 },
    positions: [{ surfaceId: "front", label: "Front", areaMm2: 200 * 280, maxSideMm: 280, colours: 1 }] });
  assert.deepEqual(q.lines.map((l) => l.unit), [100, DEFAULT_PRICES.bands[2].dtf]);
  setPrices(null);
});
