/* Sonor Stretched Fabric — INTERNAL COSTING (v0.4.0, 2026-10-22)
   SonorFabricCost.build(model, cost) — prices the fabric + build side OUTSIDE WeQuote from the Library trade
   prices (Cineca pricelist filed 2026-10-22) and the calc quantities, so a job can land on the quote as ONE
   line per room ("price all the fabric and build side outside of WQ and just put them in as a single line
   based on this proposal" — Bryn 2026-10-22). Pure: no DOM, no Supabase.

   model = the app's wqModel(): { rooms:[{ name, fabric:item, track:item, split:item|null, infill:item|null, calc:{ totals } }] }
   cost  = cfg.cost: { labourCostRate, labourSellRate, marginPct, overrides:{ <itemId>: £/unit }, extras:[{ room?, label, cost, sell }] }

   Supplier rules (Cineca trade sheet): fabric invoiced per m² of ROLL (lm × roll width), min 5 lm; gripper in 2 m
   lengths, min 10 m per profile; melamine per m² of sheet (2.50 × 1.25 m). Labour = calc hours × rates (defaults from
   WeQuote #2805: cost ≈ £31/h, sell ≈ £62/h). Materials sell = cost ÷ (1 − margin) — margin as WeQuote shows it.
   A Library item with no trade price (Lines FR is not on the sheet) is flagged TBC and carried at the override or £0.
*/
(function (global) {
  'use strict';
  var CFG = global.__FABRIC_CONFIG__ || {};
  var DEF = Object.assign({ labourCostRate: 31, labourSellRate: 62, marginPct: 43, fabricMinLm: 5, trackLengthMm: 2000, trackMinM: 10 }, (CFG.cost || {}));
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

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

  function build(model, cost) {
    var given = {}; Object.keys(cost || {}).forEach(function (k) { if (cost[k] != null && cost[k] !== '') given[k] = cost[k]; });   // null / blank = use the default
    cost = Object.assign({}, DEF, given);
    var margin = Math.min(0.95, Math.max(0, num(cost.marginPct, DEF.marginPct) / 100));
    var sellOf = function (c) { return r2(c / (1 - margin)); };
    var out = { rooms: [], totals: { materials_cost: 0, materials_sell: 0, labour_h: 0, labour_cost: 0, labour_sell: 0, extras_cost: 0, extras_sell: 0, cost: 0, sell: 0, margin_pct: null, tbc: [] }, rates: { labourCostRate: num(cost.labourCostRate, DEF.labourCostRate), labourSellRate: num(cost.labourSellRate, DEF.labourSellRate), marginPct: r2(margin * 100) } };
    (model.rooms || []).forEach(function (rm) {
      var t = (rm.calc && rm.calc.totals) || {}, lines = [], R = { name: rm.name, lines: lines, cost: 0, sell: 0, tbc: [] };
      function add(kind, item, label, qty, unit, rateInfo, note) {
        qty = r2(qty); if (!(qty > 0)) return;
        var c = rateInfo.rate != null ? r2(qty * rateInfo.rate) : 0, s = sellOf(c);
        var ln = { kind: kind, item_id: item ? item.id : null, label: label, qty: qty, unit: unit, rate: rateInfo.rate, rate_from: rateInfo.from, cost: c, sell: s, tbc: !!rateInfo.tbc, note: note || '' };
        if (ln.tbc) { R.tbc.push(label); out.totals.tbc.push(rm.name + ' · ' + label); }
        lines.push(ln); R.cost += c; R.sell += s;
        out.totals.materials_cost += c; out.totals.materials_sell += s;
      }
      // fabric — supplier invoices roll m² (lm × width); min order 5 lm
      var f = rm.fabric, rollW = f && f.width_m ? f.width_m : (t.fabric_m2_ordered && t.fabric_lm ? t.fabric_m2_ordered / t.fabric_lm : 1.4);
      var lm = Math.max(num(t.fabric_lm, 0), t.fabric_lm > 0 ? DEF.fabricMinLm : 0);
      add('fabric', f, (f ? f.name : 'Fabric TBC') + (rm.colour ? ' · ' + rm.colour : ''), lm * rollW, 'm2', rateOf(f, cost.overrides), r2(lm) + ' lm × ' + rollW + ' m roll · ' + r2(t.net_m2) + ' m² finished');
      // track — perimeter + openings on the room's track; splits on the split profile (or the same track)
      var tr = rm.track, perim = Math.max(0, num(t.track_m, 0) - num(t.split_m, 0));
      var po = trackOrder(perim, tr);
      add('track', tr, (tr ? tr.name : 'Track TBC') + ' — perimeter + openings', po.m, 'm', rateOf(tr, cost.overrides), r2(perim) + ' m set out → ' + po.lengths + ' × 2 m lengths' + (po.m > perim + 2 ? ' (10 m minimum)' : ''));
      if (t.split_m > 0) { var sp = rm.split || tr, so = trackOrder(t.split_m, sp); add('track', sp, (sp ? sp.name : 'Split track TBC') + ' — splits', so.m, 'm', rateOf(sp, cost.overrides), r2(t.split_m) + ' m set out → ' + so.lengths + ' × 2 m lengths'); }
      // infill — per m² of sheet, whole sheets
      if (t.infill_m2 > 0) {
        var inf = rm.infill, bm = (inf && inf.board_mm) || [1200, 600], sheetM2 = bm[0] * bm[1] / 1e6, sheets = num(t.infill_boards, Math.ceil(t.infill_m2 / sheetM2));
        add('infill', inf, (inf ? inf.name : 'Infill TBC'), sheets * sheetM2, 'm2', rateOf(inf, cost.overrides), sheets + ' sheets of ' + bm[0] + ' × ' + bm[1] + ' · ' + r2(t.infill_m2) + ' m² needed');
      }
      // labour — calc hours × rates (sell by rate, not margin — WeQuote convention)
      var h = num(t.labour_h, 0), lc = r2(h * out.rates.labourCostRate), ls = r2(h * out.rates.labourSellRate);
      if (h > 0) { lines.push({ kind: 'labour', item_id: null, label: 'Installation labour', qty: h, unit: 'h', rate: out.rates.labourCostRate, rate_sell: out.rates.labourSellRate, cost: lc, sell: ls, tbc: false, note: 'walls / panels / cut-outs / openings / track' }); R.cost += lc; R.sell += ls; out.totals.labour_h += h; out.totals.labour_cost += lc; out.totals.labour_sell += ls; }
      // extras — frames, LED, trims: typed in, cost + sell (sell blank → margin)
      (cost.extras || []).filter(function (x) { return !x.room || x.room === rm.name; }).forEach(function (x) {
        var c = r2(num(x.cost, 0)), s = x.sell != null && x.sell !== '' ? r2(num(x.sell, 0)) : sellOf(c);
        if (!(c || s)) return;
        lines.push({ kind: 'extra', item_id: null, label: x.label || 'Extra', qty: 1, unit: 'each', rate: c, cost: c, sell: s, tbc: false, note: x.note || '' }); R.cost += c; R.sell += s; out.totals.extras_cost += c; out.totals.extras_sell += s;
      });
      R.cost = r2(R.cost); R.sell = r2(R.sell); R.net_m2 = r2(t.net_m2 || 0);
      R.sell_per_m2 = R.net_m2 ? r2(R.sell / R.net_m2) : null; R.cost_per_m2 = R.net_m2 ? r2(R.cost / R.net_m2) : null;
      out.rooms.push(R);
    });
    var T = out.totals; ['materials_cost', 'materials_sell', 'labour_cost', 'labour_sell', 'extras_cost', 'extras_sell'].forEach(function (k) { T[k] = r2(T[k]); });
    T.labour_h = r2(T.labour_h); T.cost = r2(T.materials_cost + T.labour_cost + T.extras_cost); T.sell = r2(T.materials_sell + T.labour_sell + T.extras_sell);
    T.margin_pct = T.sell ? r2((T.sell - T.cost) / T.sell * 100) : null;
    return out;
  }

  function money(v) { return '£' + Number(v || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  global.SonorFabricCost = { build: build, defaults: DEF, money: money, VERSION: '0.4.0' };
})(typeof window !== 'undefined' ? window : globalThis);
