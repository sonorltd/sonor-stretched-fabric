/* Sonor Stretched Fabric — INTERNAL COSTING (v0.4.1, 2026-10-22)
   SonorFabricCost.build(model, cost) — prices the fabric + build side OUTSIDE WeQuote from the Library trade
   prices (Cineca pricelist filed 2026-10-22) and the calc quantities, so a job can land on the quote as ONE
   line per group ("price all the fabric and build side outside of WQ and just put them in as a single line
   based on this proposal" — Bryn 2026-10-22). Pure: no DOM, no Supabase.

   model = the app's wqModel(): { rooms:[{ name, fabric:item, track:item, split:item|null, infill:item|null, colour,
           calc:{ totals, surfaces:[calcSurface…] }, surfaces:[cfg surfaces] }] }
   cost  = cfg.cost: { labourCostRate, labourSellRate, marginPct, overrides:{ <itemId>: £/unit },
           splitSides (v0.4.1 — the side walls priced as an OPTIONAL group: Bryn "sides are optional, so we need to split the
           costs out like this"), trim:{ on, label, w_mm, t_mm, rate, finishRate, wastePct, lengthM } (v0.4.1 — black-stained
           oak trim for the frames: front-wall perimeter, TV + recess frames, rear panels), extras:[{ label, cost, sell, group }] }

   GROUPS: 'core' = front + rear walls, piers, ceiling (and the TV / recess frames) · 'sides' = left + right walls. With
   splitSides off everything is one group per room. Every output room carries { group, optional }.
   Supplier rules (Cineca trade sheet): fabric invoiced per m² of ROLL (lm × roll width), min 5 lm per order (applied to the
   room, not each group); gripper in 2 m lengths, min 10 m per profile; melamine per m² of sheet. Labour = calc hours × rates
   (defaults from WeQuote #2805: cost ≈ £31/h, sell ≈ £62/h). Materials / trim / extras sell = cost ÷ (1 − margin).
   An item with no trade price (Lines FR is not on the sheet) is flagged TBC and carried at the override or £0.
*/
(function (global) {
  'use strict';
  var CFG = global.__FABRIC_CONFIG__ || {};
  var DEF = Object.assign({ labourCostRate: 31, labourSellRate: 62, marginPct: 43, fabricMinLm: 5, trackLengthMm: 2000, trackMinM: 10 }, (CFG.cost || {}));
  var TRIM_DEF = { on: false, label: 'Black-stained oak trim', w_mm: 100, t_mm: 20, rate: null, finishRate: 0, wastePct: 10, lengthM: 2.4 };
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  var SIDES = ['front', 'right', 'rear', 'left'];
  function sideOf(s) { if (!s) return 'front'; if (s.side) return s.side; if (s.kind === 'ceiling') return 'ceiling'; var m = /^w([1-4])$/.exec(s.id || ''); if (m) return SIDES[Number(m[1]) - 1]; if (/^p\d/.test(s.id || '') || /pillar|pier|rear/i.test(s.label || '')) return 'rear'; return 'front'; }
  function groupOf(s) { var sd = sideOf(s); return sd === 'left' || sd === 'right' ? 'sides' : 'core'; }

  function rateOf(item, overrides) {
    if (!item) return { rate: null, tbc: true, from: 'none' };
    var ov = overrides && overrides[item.id];
    if (ov != null && ov !== '' && isFinite(Number(ov))) return { rate: Number(ov), tbc: false, from: 'override' };
    if (item.price && item.price.trade != null) return { rate: Number(item.price.trade), tbc: false, from: 'library' };
    return { rate: null, tbc: true, from: 'none' };
  }
  function trackOrder(m, item) {
    var len = ((item && item.price && item.price.length_mm) || DEF.trackLengthMm) / 1000;
    var lengths = Math.ceil(Math.max(0, m) / len);
    var ordered = Math.max(lengths * len, m > 0 ? DEF.trackMinM : 0);
    return { lengths: lengths, m: r2(ordered) };
  }
  // frame metres per surface (surface frame + framed openings) — the trim run
  function frameM(s, sc) {
    var m = 0; if (!sc) return 0;
    if (sc.frame_mm > 0) m += 2 * (sc.len_mm + sc.h_mm) / 1000;
    (sc.openings || []).forEach(function (o) { if (o.frame_mm > 0) m += 2 * (o.w + o.h) / 1000 * (o.qty || 1); });
    return m;
  }
  // sum the calc of a set of surfaces into a totals-like object
  function sumSurfaces(list) {
    var t = { net_m2: 0, gross_m2: 0, openings_m2: 0, panels: 0, track_m: 0, split_m: 0, fabric_lm: 0, fabric_m2_ordered: 0, infill_m2: 0, infill_boards: 0, cutouts: 0, openings: 0, screws: 0, labour_h: 0, surfaces: 0, frame_m: 0 };
    list.forEach(function (x) { var sc = x.calc; if (!sc) return; t.surfaces++; t.net_m2 += sc.net_m2; t.gross_m2 += sc.gross_m2; t.openings_m2 += sc.openings_m2; t.panels += sc.n_panels; t.track_m += sc.track.total_m; t.split_m += sc.track.split_m; t.fabric_lm += sc.fabric.order_lm; t.fabric_m2_ordered += sc.fabric.m2_ordered; if (sc.infill) { t.infill_m2 += sc.infill.m2; t.infill_boards += sc.infill.boards; } t.cutouts += sc.n_cutouts; t.openings += sc.n_openings; t.screws += sc.fixings.screws; t.labour_h += sc.labour_h; t.frame_m += frameM(x.surface, sc); });
    Object.keys(t).forEach(function (k) { t[k] = r2(t[k]); });
    return t;
  }

  function build(model, cost) {
    var given = {}; Object.keys(cost || {}).forEach(function (k) { if (cost[k] != null && cost[k] !== '') given[k] = cost[k]; });   // null / blank = use the default
    cost = Object.assign({}, DEF, given);
    var trim = Object.assign({}, TRIM_DEF, cost.trim || {});
    var margin = Math.min(0.95, Math.max(0, num(cost.marginPct, DEF.marginPct) / 100));
    var sellOf = function (c) { return r2(c / (1 - margin)); };
    var out = { rooms: [], groups: { core: { cost: 0, sell: 0 }, sides: { cost: 0, sell: 0 } }, split: !!cost.splitSides, trim: trim,
      totals: { materials_cost: 0, materials_sell: 0, labour_h: 0, labour_cost: 0, labour_sell: 0, trim_m: 0, trim_cost: 0, trim_sell: 0, extras_cost: 0, extras_sell: 0, cost: 0, sell: 0, margin_pct: null, tbc: [] },
      rates: { labourCostRate: num(cost.labourCostRate, DEF.labourCostRate), labourSellRate: num(cost.labourSellRate, DEF.labourSellRate), marginPct: r2(margin * 100) } };
    (model.rooms || []).forEach(function (rm) {
      var surfs = (rm.calc && rm.calc.surfaces) || [], cfgS = rm.surfaces || [];
      var pairs = surfs.map(function (sc) { return { surface: cfgS.find(function (s) { return s.id === sc.id; }) || { id: sc.id, label: sc.label, kind: sc.kind, side: sc.side }, calc: sc }; });
      var groups = cost.splitSides ? [['core', pairs.filter(function (p) { return groupOf(p.surface) === 'core'; }), false], ['sides', pairs.filter(function (p) { return groupOf(p.surface) === 'sides'; }), true]] : [['all', pairs, false]];
      var roomLm = num((rm.calc && rm.calc.totals && rm.calc.totals.fabric_lm) || 0, 0), minTop = roomLm > 0 && roomLm < DEF.fabricMinLm;   // the 5 lm minimum is a room-level top-up, applied once (to the core group)
      groups.forEach(function (g) {
        var gname = g[0], list = g[1], optional = g[2]; if (!list.length) return;
        var t = pairs.length === list.length && rm.calc && rm.calc.totals ? Object.assign({ frame_m: sumSurfaces(list).frame_m }, rm.calc.totals) : sumSurfaces(list);
        var lines = [], R = { name: rm.name + (gname === 'sides' ? ' — side walls (optional)' : (gname === 'core' ? ' — front & rear' : '')), room: rm.name, group: gname === 'all' ? 'core' : gname, optional: optional, surfaces: list.map(function (p) { return p.surface.id; }), lines: lines, cost: 0, sell: 0, tbc: [] };
        var gk = R.group;
        function add(kind, item, label, qty, unit, rateInfo, note, bucket) {
          qty = r2(qty); if (!(qty > 0)) return;
          var c = rateInfo.rate != null ? r2(qty * rateInfo.rate) : 0, s = sellOf(c);
          var ln = { kind: kind, item_id: item ? item.id : null, label: label, qty: qty, unit: unit, rate: rateInfo.rate, rate_from: rateInfo.from, cost: c, sell: s, tbc: !!rateInfo.tbc, note: note || '', group: gk };
          if (ln.tbc) { R.tbc.push(label); out.totals.tbc.push(R.name + ' · ' + label); }
          lines.push(ln); R.cost += c; R.sell += s;
          bucket = bucket || 'materials'; out.totals[bucket + '_cost'] += c; out.totals[bucket + '_sell'] += s;
        }
        // fabric — supplier invoices roll m² (lm × width)
        var f = rm.fabric, rollW = f && f.width_m ? f.width_m : (t.fabric_m2_ordered && t.fabric_lm ? t.fabric_m2_ordered / t.fabric_lm : 1.4);
        var lm = num(t.fabric_lm, 0); if (minTop && gname !== 'sides') lm = Math.max(lm, DEF.fabricMinLm);
        add('fabric', f, (f ? f.name : 'Fabric TBC') + (rm.colour ? ' · ' + rm.colour : ''), lm * rollW, 'm2', rateOf(f, cost.overrides), r2(lm) + ' lm × ' + rollW + ' m roll · ' + r2(t.net_m2) + ' m² finished');
        // track — perimeter + openings on the room's track; splits on the split profile
        var tr = rm.track, perim = Math.max(0, num(t.track_m, 0) - num(t.split_m, 0));
        var po = trackOrder(perim, tr);
        add('track', tr, (tr ? tr.name : 'Track TBC') + ' — perimeter + openings', po.m, 'm', rateOf(tr, cost.overrides), r2(perim) + ' m set out → ' + po.lengths + ' × 2 m lengths' + (po.m > perim + 2 ? ' (10 m minimum)' : ''));
        if (t.split_m > 0) { var sp = rm.split || tr, so = trackOrder(t.split_m, sp); add('track', sp, (sp ? sp.name : 'Split track TBC') + ' — splits', so.m, 'm', rateOf(sp, cost.overrides), r2(t.split_m) + ' m set out → ' + so.lengths + ' × 2 m lengths'); }
        // infill — per m² of sheet, whole sheets
        if (t.infill_m2 > 0) {
          var inf = rm.infill, bm = (inf && inf.board_mm) || [1200, 600], sheetM2 = bm[0] * bm[1] / 1e6, sheets = num(t.infill_boards, Math.ceil(t.infill_m2 / sheetM2));
          add('infill', inf, (inf ? inf.name : 'Infill TBC'), sheets * sheetM2, 'm2', rateOf(inf, cost.overrides), sheets + ' sheets of ' + bm[0] + ' × ' + bm[1] + ' · ' + r2(t.infill_m2) + ' m² needed');
        }
        // trim — black-stained oak for the frames (frame metres from the surfaces + framed openings), in merchant lengths + waste
        if (trim.on && t.frame_m > 0) {
          var run = t.frame_m * (1 + num(trim.wastePct, 10) / 100), lengths = trim.lengthM > 0 ? Math.ceil(run / trim.lengthM) : null, ordered = lengths ? r2(lengths * trim.lengthM) : r2(run);
          var rate = trim.rate != null && trim.rate !== '' ? num(trim.rate, null) : null, ri = { rate: rate != null ? rate + num(trim.finishRate, 0) : null, tbc: rate == null, from: rate != null ? 'typed' : 'none' };
          add('trim', null, (trim.label || 'Trim') + ' ' + trim.w_mm + ' × ' + trim.t_mm + ' mm', ordered, 'm', ri, r2(t.frame_m) + ' m of frame + ' + num(trim.wastePct, 10) + '% waste' + (lengths ? ' → ' + lengths + ' × ' + trim.lengthM + ' m lengths' : '') + (num(trim.finishRate, 0) ? ' · incl. £' + trim.finishRate + '/m finish' : ''), 'trim');
          out.totals.trim_m += ordered;
        }
        // labour — calc hours × rates (sell by rate, not margin — WeQuote convention)
        var h = num(t.labour_h, 0), lc = r2(h * out.rates.labourCostRate), ls = r2(h * out.rates.labourSellRate);
        if (h > 0) { lines.push({ kind: 'labour', item_id: null, label: 'Installation labour', qty: h, unit: 'h', rate: out.rates.labourCostRate, rate_sell: out.rates.labourSellRate, cost: lc, sell: ls, tbc: false, note: 'walls / panels / cut-outs / openings / track', group: gk }); R.cost += lc; R.sell += ls; out.totals.labour_h += h; out.totals.labour_cost += lc; out.totals.labour_sell += ls; }
        // extras — builder fit, LED, anything typed: cost + sell (sell blank → margin), grouped core / sides
        (cost.extras || []).filter(function (x) { return (!x.room || x.room === rm.name) && ((x.group || 'core') === gk || gname === 'all'); }).forEach(function (x) {
          var c = r2(num(x.cost, 0)), s = x.sell != null && x.sell !== '' ? r2(num(x.sell, 0)) : sellOf(c);
          if (!(c || s)) return;
          lines.push({ kind: 'extra', item_id: null, label: x.label || 'Extra', qty: 1, unit: 'each', rate: c, cost: c, sell: s, tbc: false, note: x.note || '', group: gk }); R.cost += c; R.sell += s; out.totals.extras_cost += c; out.totals.extras_sell += s;
        });
        R.cost = r2(R.cost); R.sell = r2(R.sell); R.net_m2 = r2(t.net_m2 || 0); R.track_m = r2(t.track_m || 0); R.frame_m = r2(t.frame_m || 0); R.labour_h = r2(t.labour_h || 0);
        R.sell_per_m2 = R.net_m2 ? r2(R.sell / R.net_m2) : null; R.cost_per_m2 = R.net_m2 ? r2(R.cost / R.net_m2) : null;
        out.groups[gk].cost = r2(out.groups[gk].cost + R.cost); out.groups[gk].sell = r2(out.groups[gk].sell + R.sell);
        out.rooms.push(R);
      });
    });
    var T = out.totals; ['materials_cost', 'materials_sell', 'labour_cost', 'labour_sell', 'trim_cost', 'trim_sell', 'extras_cost', 'extras_sell', 'trim_m'].forEach(function (k) { T[k] = r2(T[k]); });
    T.labour_h = r2(T.labour_h); T.cost = r2(T.materials_cost + T.labour_cost + T.trim_cost + T.extras_cost); T.sell = r2(T.materials_sell + T.labour_sell + T.trim_sell + T.extras_sell);
    T.margin_pct = T.sell ? r2((T.sell - T.cost) / T.sell * 100) : null;
    // the quote figures: core (what the client is being asked to commit to) and the optional sides on top
    T.core_cost = out.groups.core.cost; T.core_sell = out.groups.core.sell; T.sides_cost = out.groups.sides.cost; T.sides_sell = out.groups.sides.sell;
    return out;
  }

  function money(v) { return '£' + Number(v || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  global.SonorFabricCost = { build: build, defaults: DEF, trimDefaults: TRIM_DEF, money: money, groupOf: groupOf, sideOf: sideOf, frameM: frameM, VERSION: '0.4.1' };
})(typeof window !== 'undefined' ? window : globalThis);
