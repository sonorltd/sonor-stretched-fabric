import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.__FABRIC_CONFIG__ = { calc: { gripMm: 100, selvedgeMm: 20, panelMaxMm: 5000, wastePct: 10, infillWastePct: 5, screwPitchMm: 150, infillBoardMm: [1200, 600] } };
const C = require('../data/fabric-calc.js');

test('4 m × 2.4 m wall, 1.40 m roll, vertical drops', () => {
  const r = C.calcSurface({ kind: 'wall', len_mm: 4000, h_mm: 2400 }, { rollWidthMm: 1400, orientation: 'drop' });
  // usable = 1400 - 40 - 200 = 1160 → ceil(4000/1160) = 4 panels of 1000
  assert.equal(r.n_panels, 4); assert.equal(r.panel_w_mm, 1000);
  assert.equal(r.gross_m2, 9.6); assert.equal(r.net_m2, 9.6);
  assert.equal(r.track.perimeter_m, 12.8); assert.equal(r.track.split_m, 7.2); assert.equal(r.track.total_m, 20);
  assert.equal(r.fabric.cut_lm, 10.4);           // 4 × (2.4 + 0.2)
  assert.equal(r.fabric.order_lm, 11.44);        // +10 %
  assert.equal(r.fabric.m2_ordered, 16.02);
  assert.equal(r.fixings.screws, Math.ceil(20000 / 150));
});
test('railroad with a 3.0 m roll on a 2.4 m wall → seamless up to panelMax', () => {
  const r = C.calcSurface({ kind: 'wall', len_mm: 4000, h_mm: 2400 }, { rollWidthMm: 3000, orientation: 'railroad' });
  assert.equal(r.orientation, 'railroad'); assert.equal(r.n_panels, 1);
  assert.equal(r.track.split_m, 0); assert.equal(r.fabric.cut_lm, 4.2);
});
test('railroad falls back to drop when the roll is too narrow', () => {
  const r = C.calcSurface({ kind: 'wall', len_mm: 4000, h_mm: 2400 }, { rollWidthMm: 1400, orientation: 'railroad' });
  assert.equal(r.orientation, 'drop'); assert.ok(r.flags[0].includes('railroad'));
});
test('openings subtract area and add track; infill boards; cut-outs', () => {
  const r = C.calcSurface({ kind: 'wall', len_mm: 5000, h_mm: 2400, openings: [{ label: 'Door', w: 900, h: 2100, qty: 1 }], cutouts: [{ kind: 'speaker', qty: 2 }] }, { rollWidthMm: 3000, orientation: 'railroad', infill: { on: true, thickness_mm: 25, board_mm: [1200, 600] } });
  assert.equal(r.openings_m2, 1.89); assert.equal(r.net_m2, 10.11);
  assert.equal(r.track.openings_m, 6); assert.equal(r.n_cutouts, 2);
  assert.equal(r.infill.m2, 10.62); assert.equal(r.infill.boards, Math.ceil(10.62 / 0.72));
});
test('project roll-up', () => {
  const p = C.calcProject([{ id: 'a', name: 'Cinema', opts: { rollWidthMm: 1400 }, surfaces: C.surfacesFromRect(4000, 5000, 2400) }]);
  assert.equal(p.totals.walls, 4); assert.equal(p.totals.ceilings, 0);   // ceiling off by default
  assert.equal(p.totals.net_m2, 43.2);
});
test('polygon → walls', () => {
  const w = C.wallsFromPolygon([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }], 12.5);  // 5 m × 2.5 m
  assert.deepEqual(w.map(x => x.len_mm), [5000, 2500, 5000, 2500]);
});
