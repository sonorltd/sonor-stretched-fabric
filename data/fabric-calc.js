/* Sonor Stretched Fabric — calc engine (v0.1.0)
   SonorFabricCalc — PURE functions (no DOM, no Supabase): surfaces → panels → track / fabric /
   infill / fixings / cut-outs / labour. Every constant comes from __FABRIC_CONFIG__.calc and can
   be overridden per project (opts). Tested by tests/fabric-calc.test.mjs (node --test).

   Model (mm in, m / m² out):
     surface = { kind:'wall'|'ceiling', len_mm, h_mm, openings:[{label,w,h,qty}], cutouts:[{kind,qty}] }
     opts    = { rollWidthMm, orientation:'drop'|'railroad', gripMm, selvedgeMm, panelMaxMm,
                 wastePct, infill:{ on, thickness_mm, board_mm:[w,h] }, infillWastePct, screwPitchMm, labour }

   Panelisation rule (what the fitters do):
     • 'drop'     — roll width runs across the surface; usable panel width = roll − 2·selvedge − 2·grip
                    (the grip allowance is tucked into the track, so the finished panel is narrower than the
                    roll). Panels = ceil(len / min(usable, panelMax)); seams vertical.
     • 'railroad' — roll runs along the surface, seamless to panelMax; only valid when the usable roll
                    width covers the height. Falls back to 'drop' (flagged) when it cannot.
     Track: full perimeter of the surface + a split track at every seam + the perimeter of every opening.
     Fabric: per panel one cut of (panel + 2·grip) along the roll → linear metres × (1 + waste); m² ordered
             = lm × roll width (what the supplier invoices); m² net = finished area (what the quote carries).
     Infill: net area × (1 + infill waste) → boards.
*/
(function (global) {
  'use strict';
  var CFG = (global.__FABRIC_CONFIG__ || {}).calc || {};

  function n(v, d) { if (v === null || v === undefined || v === '') return d; var x = Number(v); return isFinite(x) ? x : d; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r1(v) { return Math.round(v * 10) / 10; }

  function defaults(opts) {
    opts = opts || {};
    return {
      rollWidthMm: n(opts.rollWidthMm, 1400),
      orientation: opts.orientation === 'railroad' ? 'railroad' : 'drop',
      gripMm: n(opts.gripMm, n(CFG.gripMm, 100)),
      selvedgeMm: n(opts.selvedgeMm, n(CFG.selvedgeMm, 20)),
      panelMaxMm: n(opts.panelMaxMm, n(CFG.panelMaxMm, 5000)),
      wastePct: n(opts.wastePct, n(CFG.wastePct, 10)),
      infill: opts.infill || { on: false },
      infillWastePct: n(opts.infillWastePct, n(CFG.infillWastePct, 5)),
      screwPitchMm: n(opts.screwPitchMm, n(CFG.screwPitchMm, 150)),
      labour: Object.assign({ wallM2: 0.9, ceilingM2: 1.3, perPanel: 0.4, perCutout: 0.25, perOpening: 0.5, trackM: 0.08 }, CFG.labour || {}, opts.labour || {})
    };
  }

  // ── one surface ──────────────────────────────────────────────────────────
  function calcSurface(s, opts) {
    var o = defaults(opts);
    var len = Math.max(0, n(s.len_mm, 0)), h = Math.max(0, n(s.h_mm, 0));
    var flags = [];
    if (!len || !h) return empty(s, o, ['no size']);

    // openings (doors / windows / screens) — subtract area, add track around each
    var openings = (s.openings || []).map(function (op) {
      var q = Math.max(0, Math.round(n(op.qty, 1))), w = Math.max(0, n(op.w, 0)), hh = Math.max(0, n(op.h, 0));
      return { label: op.label || 'Opening', w: w, h: hh, qty: q, area_m2: r2(w * hh * q / 1e6), track_m: r2(2 * (w + hh) * q / 1000) };
    }).filter(function (op) { return op.qty > 0 && op.w > 0 && op.h > 0; });
    var openingsM2 = openings.reduce(function (a, op) { return a + op.area_m2; }, 0);
    var openingsTrackM = openings.reduce(function (a, op) { return a + op.track_m; }, 0);
    var openingsN = openings.reduce(function (a, op) { return a + op.qty; }, 0);

    var grossM2 = len * h / 1e6;
    var netM2 = Math.max(0, grossM2 - openingsM2);
    if (openingsM2 > grossM2) flags.push('openings exceed the surface');

    // panelisation
    var usable = o.rollWidthMm - 2 * o.selvedgeMm - 2 * o.gripMm;   // finished width one drop can cover
    var orientation = o.orientation;
    if (orientation === 'railroad' && usable < h) { orientation = 'drop'; flags.push('roll too narrow to railroad (' + o.rollWidthMm + ' mm roll vs ' + h + ' mm height) — vertical drops used'); }
    var nPanels, panelW, cutLmEach, cutWidthEach;
    if (orientation === 'drop') {
      var maxW = Math.max(300, Math.min(usable, o.panelMaxMm));
      nPanels = Math.max(1, Math.ceil(len / maxW));
      panelW = len / nPanels;
      cutLmEach = (h + 2 * o.gripMm) / 1000;          // along the roll
      cutWidthEach = panelW + 2 * o.gripMm;           // across the roll (fits by construction)
    } else {
      nPanels = Math.max(1, Math.ceil(len / o.panelMaxMm));
      panelW = len / nPanels;
      cutLmEach = (panelW + 2 * o.gripMm) / 1000;     // along the roll
      cutWidthEach = h + 2 * o.gripMm;                // across the roll
    }
    if (usable <= 300) flags.push('roll width too small for this grip allowance');
    var panels = [];
    for (var i = 0; i < nPanels; i++) panels.push({ i: i + 1, x_mm: Math.round(i * panelW), w_mm: Math.round(panelW), h_mm: h, cut_lm: r2(cutLmEach), cut_w_mm: Math.round(cutWidthEach) });

    // track
    var perimeterM = 2 * (len + h) / 1000;
    var splitM = (nPanels - 1) * (orientation === 'drop' ? h : len) / 1000 * (orientation === 'drop' ? 1 : 1);
    if (orientation === 'railroad') splitM = (nPanels - 1) * h / 1000;   // railroad seams are still vertical joints
    var trackTotalM = perimeterM + splitM + openingsTrackM;

    // fabric
    var cutLm = cutLmEach * nPanels;
    var orderLm = cutLm * (1 + o.wastePct / 100);
    var rollW = o.rollWidthMm / 1000;
    var fabric = {
      roll_width_m: r2(rollW), orientation: orientation,
      cut_lm: r2(cutLm), order_lm: r2(orderLm),
      m2_net: r2(netM2), m2_gross: r2(grossM2), m2_ordered: r2(orderLm * rollW),
      waste_pct: o.wastePct
    };

    // infill (acoustic tracks only)
    var infill = null;
    if (o.infill && o.infill.on) {
      var bw = (o.infill.board_mm && o.infill.board_mm[0]) || n(CFG.infillBoardMm && CFG.infillBoardMm[0], 1200);
      var bh = (o.infill.board_mm && o.infill.board_mm[1]) || n(CFG.infillBoardMm && CFG.infillBoardMm[1], 600);
      var m2 = netM2 * (1 + o.infillWastePct / 100);
      infill = { thickness_mm: n(o.infill.thickness_mm, 25), m2: r2(m2), boards: Math.ceil(m2 / (bw * bh / 1e6)), board_mm: [bw, bh] };
    }

    // cut-outs
    var cutouts = (s.cutouts || []).map(function (c) { return { kind: c.kind || 'other', qty: Math.max(0, Math.round(n(c.qty, 0))) }; }).filter(function (c) { return c.qty > 0; });
    var cutoutsN = cutouts.reduce(function (a, c) { return a + c.qty; }, 0);

    // fixings + labour (internal)
    var screws = Math.ceil(trackTotalM * 1000 / o.screwPitchMm);
    var L = o.labour;
    var labourH = netM2 * (s.kind === 'ceiling' ? L.ceilingM2 : L.wallM2) + nPanels * L.perPanel + cutoutsN * L.perCutout + openingsN * L.perOpening + trackTotalM * L.trackM;

    return {
      id: s.id || null, label: s.label || null, kind: s.kind === 'ceiling' ? 'ceiling' : 'wall',
      len_mm: len, h_mm: h, flags: flags,
      gross_m2: r2(grossM2), openings_m2: r2(openingsM2), net_m2: r2(netM2),
      openings: openings, n_openings: openingsN,
      panels: panels, n_panels: nPanels, panel_w_mm: Math.round(panelW), orientation: orientation,
      track: { perimeter_m: r2(perimeterM), split_m: r2(splitM), openings_m: r2(openingsTrackM), total_m: r2(trackTotalM) },
      fabric: fabric, infill: infill,
      cutouts: cutouts, n_cutouts: cutoutsN,
      fixings: { screws: screws, pitch_mm: o.screwPitchMm },
      labour_h: r1(labourH)
    };
  }
  function empty(s, o, flags) {
    return { id: s.id || null, label: s.label || null, kind: s.kind === 'ceiling' ? 'ceiling' : 'wall', len_mm: n(s.len_mm, 0), h_mm: n(s.h_mm, 0), flags: flags || [],
      gross_m2: 0, openings_m2: 0, net_m2: 0, openings: [], n_openings: 0, panels: [], n_panels: 0, panel_w_mm: 0, orientation: o.orientation,
      track: { perimeter_m: 0, split_m: 0, openings_m: 0, total_m: 0 }, fabric: { roll_width_m: r2(o.rollWidthMm / 1000), orientation: o.orientation, cut_lm: 0, order_lm: 0, m2_net: 0, m2_gross: 0, m2_ordered: 0, waste_pct: o.wastePct },
      infill: null, cutouts: [], n_cutouts: 0, fixings: { screws: 0, pitch_mm: o.screwPitchMm }, labour_h: 0 };
  }

  // ── a room: surfaces that share one fabric / system; totals per room ─────
  // room = { id, name, surfaces:[surface…] } · opts as above (room-level)
  function calcRoom(room, opts) {
    var out = { id: room.id || null, name: room.name || '', surfaces: [], totals: zeroTotals() };
    (room.surfaces || []).forEach(function (s) {
      if (s.on === false) return;
      var r = calcSurface(s, opts);
      out.surfaces.push(r);
      addTotals(out.totals, r);
    });
    out.totals = roundTotals(out.totals);
    return out;
  }
  function zeroTotals() { return { surfaces: 0, walls: 0, ceilings: 0, net_m2: 0, gross_m2: 0, openings_m2: 0, panels: 0, track_m: 0, split_m: 0, fabric_lm: 0, fabric_m2_ordered: 0, infill_m2: 0, infill_boards: 0, cutouts: 0, openings: 0, screws: 0, labour_h: 0, flags: [] }; }
  function addTotals(t, r) {
    t.surfaces++; if (r.kind === 'ceiling') t.ceilings++; else t.walls++;
    t.net_m2 += r.net_m2; t.gross_m2 += r.gross_m2; t.openings_m2 += r.openings_m2;
    t.panels += r.n_panels; t.track_m += r.track.total_m; t.split_m += r.track.split_m;
    t.fabric_lm += r.fabric.order_lm; t.fabric_m2_ordered += r.fabric.m2_ordered;
    if (r.infill) { t.infill_m2 += r.infill.m2; t.infill_boards += r.infill.boards; }
    t.cutouts += r.n_cutouts; t.openings += r.n_openings; t.screws += r.fixings.screws; t.labour_h += r.labour_h;
    (r.flags || []).forEach(function (f) { t.flags.push((r.label || 'surface') + ': ' + f); });
  }
  function roundTotals(t) { ['net_m2', 'gross_m2', 'openings_m2', 'track_m', 'split_m', 'fabric_lm', 'fabric_m2_ordered', 'infill_m2'].forEach(function (k) { t[k] = r2(t[k]); }); t.labour_h = r1(t.labour_h); return t; }

  // ── whole project: rooms[] each with its own opts; grand totals + per-item roll-up ─
  function calcProject(rooms) {
    var out = { rooms: [], totals: zeroTotals() };
    (rooms || []).forEach(function (rm) {
      var r = calcRoom(rm, rm.opts || {});
      r.fabricId = rm.fabricId || null; r.trackId = rm.trackId || null; r.infillId = rm.infillId || null; r.colour = rm.colour || null;
      out.rooms.push(r);
      ['surfaces', 'walls', 'ceilings', 'net_m2', 'gross_m2', 'openings_m2', 'panels', 'track_m', 'split_m', 'fabric_lm', 'fabric_m2_ordered', 'infill_m2', 'infill_boards', 'cutouts', 'openings', 'screws', 'labour_h'].forEach(function (k) { out.totals[k] += r.totals[k]; });
      r.totals.flags.forEach(function (f) { out.totals.flags.push(r.name + ' · ' + f); });
    });
    out.totals = roundTotals(out.totals);
    return out;
  }

  // ── helpers the app uses to build surfaces from geometry ────────────────
  // Takeoffs area polygon (world px) + known sqm → wall lengths in mm (scale from area)
  function wallsFromPolygon(points, sqm, areaPx) {
    if (!points || points.length < 3) return [];
    var px = areaPx;
    if (!px) { px = 0; for (var i = 0; i < points.length; i++) { var a = points[i], b = points[(i + 1) % points.length]; px += a.x * b.y - b.x * a.y; } px = Math.abs(px) / 2; }
    if (!px || !sqm) return [];
    var mPerPx = Math.sqrt(sqm / px);
    var walls = [];
    for (var j = 0; j < points.length; j++) {
      var p = points[j], q = points[(j + 1) % points.length];
      var d = Math.sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y)) * mPerPx * 1000;
      if (d >= 150) walls.push({ label: 'Wall ' + (walls.length + 1), len_mm: Math.round(d) });
    }
    return walls;
  }
  // rectangular room → 4 walls + ceiling candidates
  function surfacesFromRect(w_mm, d_mm, h_mm) {
    return [
      { id: 'w1', label: 'Wall 1 (front)', kind: 'wall', len_mm: w_mm, h_mm: h_mm, on: true, openings: [], cutouts: [] },
      { id: 'w2', label: 'Wall 2 (right)', kind: 'wall', len_mm: d_mm, h_mm: h_mm, on: true, openings: [], cutouts: [] },
      { id: 'w3', label: 'Wall 3 (rear)',  kind: 'wall', len_mm: w_mm, h_mm: h_mm, on: true, openings: [], cutouts: [] },
      { id: 'w4', label: 'Wall 4 (left)',  kind: 'wall', len_mm: d_mm, h_mm: h_mm, on: true, openings: [], cutouts: [] },
      { id: 'c1', label: 'Ceiling',        kind: 'ceiling', len_mm: w_mm, h_mm: d_mm, on: false, openings: [], cutouts: [] }
    ];
  }

  var API = { calcSurface: calcSurface, calcRoom: calcRoom, calcProject: calcProject, wallsFromPolygon: wallsFromPolygon, surfacesFromRect: surfacesFromRect, defaults: defaults, __version: '0.1.0' };
  global.SonorFabricCalc = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
