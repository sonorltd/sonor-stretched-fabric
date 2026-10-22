/* Sonor Stretched Fabric — WeQuote seam (v0.4.0 — single-line mode)
   SonorFabricWq — builds the push plan in the SAME shape Takeoffs / Garden push (plan v2:
   floors → rooms → lines, wq-push edge fn), pairs a quote (wq_quote_links slot 'fabric-push')
   and pushes through the shared root transport (data/sonor-wq-push.js).

   Quote shape = Sonor's existing "Stretched Fabric Walls" lines (WeQuote category 47243), one
   area per ROOM under its floor group, exactly as the hand-built cinema quotes read:
     Stretched Fabric - <fabric> (AT | non AT)   m²   ← net finished area per room
     Fabric Gripper - 12mm | 25mm                 m    ← total track (perimeter + splits + openings)
     RW3 Rockwool - Per sq/m                      m²   ← acoustic infill (acoustic tracks only)
     Stretch Fabric Device Cutout                 each ← every speaker / light / keypad / grille
     Stretch Fabric Additional Detailing Factor   each ← one per room with openings or a ceiling
   Mapping: Library item → WQ product via wq_product_skus (library_type 'aesthetic'); a fabric
   with no product falls back to the generic "Cineca Stretch Fabric" line and is reported; track
   / infill with no product → unmapped (WQ-PRODUCTS-NEEDED row — WQ has no product-create API).
   Reads: wq_products (names + categories), wq_quote_links. Writes: wq_quote_links (pairing row
   only) — every WeQuote write goes through wq-push server-side. Itemised mode never writes prices.
   v0.4.0 SINGLE-LINE mode (Bryn 2026-10-22: "price all the fabric and build side outside of WQ and just put them in as a
   single line based on this proposal"): buildPlan(model, quote, { mode:'single', costing }) writes ONE line per room —
   the room's fabric product (or W.products.singleLine when configured) with qty = finished m² and cost_price / sell_price
   = the SonorFabricCost all-in rate per m² (fabric + track + infill + labour + extras ÷ net m²), so WeQuote shows the
   proposal total as a single priced line. wq-push honours per-line sell / cost (v1.4.0, Service Contracts).
*/
(function (global) {
  'use strict';
  var CFG = global.__FABRIC_CONFIG__ || {};
  var W = CFG.wq || {};
  var products = {};   // wq product id → { name, category_id, category }

  async function load(db) {
    products = {};
    if (!db) return;
    var E = global.SonorFabric;
    var ids = [];
    (E ? E.all() : []).forEach(function (it) { if (it.wq && it.wq.product_id) ids.push(it.wq.product_id); });
    Object.keys(W.products || {}).forEach(function (k) { ids.push(W.products[k]); });
    ids = ids.filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    if (!ids.length) return;
    try {
      var p = await db.from('wq_products').select('id, model, short_description, metadata').in('id', ids);
      (p.data || []).forEach(function (x) { products[x.id] = { name: x.short_description || x.model || ('#' + x.id), category_id: x.metadata && x.metadata.category_id != null ? Number(x.metadata.category_id) : null, category: (x.metadata && x.metadata.category) || null }; });
    } catch (e) {}
  }
  function pinfo(id) { return products[id] || null; }

  // model = { ref, name, rooms:[{ name, code, floor_code, fabric:item|null, track:item|null, infill:item|null, colour,
  //           calc:{ totals:{net_m2, track_m, infill_m2, cutouts, openings, ceilings} } }] }
  function buildPlan(model, quote, opts) {
    opts = opts || {};
    var E = global.SonorFabric;
    var SINGLE = opts.mode === 'single' && opts.costing;
    var totals = { lines: 0, wqLines: 0, qty: 0, mapped: 0, unmapped: 0, fallback: 0, cost: 0, sell: 0, mode: SINGLE ? 'single' : 'itemised' };
    var unmapped = {};
    var UNM = unmapped;
    function line(kind, item, label, qty, unit, fbPid, catId) {
      qty = Math.max(0, unit === 'each' ? Math.round(Number(qty) || 0) : Math.ceil((Number(qty) || 0) * 100) / 100);
      if (!qty) return null;
      totals.lines++; totals.qty += qty;
      var wq = item ? ((item.wq) || (E && E.wqOf(item.id))) : null;
      var pid = wq && wq.product_id ? wq.product_id : (fbPid || null);
      if (!pid) { var uk = kind + ':' + label; unmapped[uk] = unmapped[uk] || { kind: kind, label: label, qty: 0, item_id: item ? item.id : null, unit: unit }; unmapped[uk].qty += qty; totals.unmapped += qty; return null; }
      if (wq && wq.product_id) totals.mapped += qty; else totals.fallback += qty;
      var p = pinfo(pid) || {};
      totals.wqLines++;
      return { kind: wq && wq.product_id ? 'device' : 'estimate', product_id: Number(pid), name: p.name || ('#' + pid),
        category_id: p.category_id != null ? p.category_id : (catId != null ? catId : null), category: p.category || null,
        qty: qty, unit: unit, basis: label + (wq && wq.product_id ? '' : ' → generic line') };
    }
    var byFloor = {};
    (model.rooms || []).forEach(function (rm) {
      var t = (rm.calc && rm.calc.totals) || {};
      var lines = [];
      if (!SINGLE) {
      var fabLabel = 'Stretched fabric · ' + (rm.fabric ? rm.fabric.name + (rm.fabric.at ? ' (AT)' : ' (non AT)') : 'fabric TBC') + (rm.colour ? ' · ' + rm.colour : '') + ' · ' + (t.net_m2 || 0) + ' m² net';
      var lf = line('fabric', rm.fabric || null, fabLabel, t.net_m2, 'm2', (W.products || {}).fabricGeneric, W.categoryId); if (lf) lines.push(lf);
      var lt = line('track', rm.track || null, 'Track · ' + (rm.track ? rm.track.name : 'TBC') + ' · ' + (t.track_m || 0) + ' m', t.track_m, 'm', null, W.categoryId); if (lt) lines.push(lt);
      if (t.infill_m2 > 0) { var li = line('infill', rm.infill || null, 'Acoustic infill · ' + (rm.infill ? rm.infill.name : 'TBC') + ' · ' + t.infill_m2 + ' m²', t.infill_m2, 'm2', null, W.infillCategoryId); if (li) lines.push(li); }
      if (t.cutouts > 0) { var lc = line('cutout', null, 'Device cut-outs', t.cutouts, 'each', (W.products || {}).cutout, W.categoryId); if (lc) lines.push(lc); }
      if ((t.openings > 0 || t.ceilings > 0) && (W.products || {}).detailing) { var ld = line('detailing', null, 'Additional detailing (openings / ceiling)', 1, 'each', W.products.detailing, W.categoryId); if (ld) lines.push(ld); }
      }
      if (SINGLE) {
        // one priced line per room — the costing's all-in £/m² on the room's fabric product (qty = finished m²)
        var cr = (opts.costing.rooms || []).find(function (x) { return x.name === rm.name; });
        if (cr && cr.net_m2 > 0 && cr.sell > 0) {
          var sl = (W.products || {}).singleLine, one = sl ? true : false;
          var qty = one ? 1 : Math.ceil(cr.net_m2 * 100) / 100, unit = one ? 'each' : 'm2';
          var sell = one ? cr.sell : Math.round(cr.sell / qty * 100) / 100, cst = one ? cr.cost : Math.round(cr.cost / qty * 100) / 100;
          var ln1 = line('fabric', one ? null : (rm.fabric || null), 'Stretched fabric — supply & install per proposal · ' + (rm.fabric ? rm.fabric.name : 'fabric TBC') + (rm.colour ? ' · ' + rm.colour : '') + ' · ' + cr.net_m2 + ' m² @ ' + (one ? '' : '£' + sell + '/m² ') + 'all-in' + (cr.tbc.length ? ' · TBC: ' + cr.tbc.join(', ') : ''), qty, unit, one ? sl : (W.products || {}).fabricGeneric, W.categoryId);
          if (ln1) { ln1.sell = sell; ln1.cost = cst; ln1.single = true; ln1.total_sell = cr.sell; ln1.total_cost = cr.cost; totals.sell += cr.sell; totals.cost += cr.cost; lines.push(ln1); }
        }
      }
      var fc = rm.floor_code || W.floorGroup || 'GF';
      (byFloor[fc] = byFloor[fc] || []).push({ name: rm.name, code: rm.code || rm.name, archRef: rm.colour || '', items: [], lines: lines });
    });
    var order = ['GF', '1F', '2F', '3F', 'BA', 'EXT'];
    var floors = Object.keys(byFloor).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); })
      .map(function (fc) { return { name: fc, code: fc, rooms: byFloor[fc], unassigned: [], unassignedLines: [] }; });
    return {
      version: 'fabric-1', mode: 'smart-home', modeAuto: false, generated: new Date().toISOString(),
      project: { ref: model.ref || '', name: model.name || '' },
      quote: quote ? { id: quote.id, no: quote.no || null, locked: !!quote.locked } : null,
      floors: floors, scaffold: [], lines: [], derived: null,
      unmapped: Object.keys(unmapped).map(function (k) { return unmapped[k]; }), unmappedShades: [],
      totals: totals,
      source: { app: 'stretched-fabric', version: CFG.version || null }
    };
  }

  async function links(db, ref) {
    if (!db || !ref) return [];
    var no = String(ref).match(/^(\d{3,5})\b/); no = no ? no[1] : null;
    try {
      var q = db.from('wq_quote_links').select('id, project_ref, slot, quote_id, quote_no, wq_revision, wq_stage, wq_description, status, pushed_at, locked_at, updated_at, metadata');
      q = no ? q.or('project_ref.eq.' + no + ',project_ref.ilike.' + no + ' - %,project_ref.ilike.' + no + '-%') : q.eq('project_ref', ref);
      var r = await q.order('updated_at', { ascending: false }); return r.data || [];
    } catch (e) { return []; }
  }
  async function pair(db, ref, quote) {
    if (!db || !ref || !quote || !quote.id) return null;
    var slot = W.slot || 'fabric-push';
    try {
      var ex = await db.from('wq_quote_links').select('id, metadata').eq('project_ref', ref).eq('slot', slot).maybeSingle();
      var rec = { project_ref: ref, slot: slot, quote_id: Number(quote.id), quote_no: Number(quote.no) || null, wq_description: quote.description || null, wq_stage: quote.stage || null, status: 'planned', updated_at: new Date().toISOString(), metadata: Object.assign({}, (ex.data && ex.data.metadata) || {}, { paired_by: 'stretched-fabric', paired_at: new Date().toISOString() }) };
      var r = ex.data && ex.data.id ? await db.from('wq_quote_links').update(rec).eq('id', ex.data.id).select('id').single() : await db.from('wq_quote_links').insert(rec).select('id').single();
      return r.data || null;
    } catch (e) { console.warn('[fabric-wq] pair failed', e); return null; }
  }
  async function push(db, plan, opts) {
    var T = global.SonorWqPush; if (!T) throw new Error('sonor-wq-push.js not loaded');
    return T.push(plan, Object.assign({ supa: db, slot: W.slot || 'fabric-push' }, opts || {}));
  }

  global.SonorFabricWq = { load: load, buildPlan: buildPlan, links: links, pair: pair, push: push, pinfo: pinfo, slot: function () { return W.slot || 'fabric-push'; } };
})(window);
