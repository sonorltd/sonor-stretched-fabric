/* Sonor Stretched Fabric — catalogue engine (v0.1.0)
   SonorFabric — SSOT load + item resolution. Mirrors the Cinema Aesthetic / Seating engine
   pattern (seating-library-ssot skill §3): 4-tier load — Supabase view v_aesthetic_catalogue
   (wall_fabric · stretch_track · stretch_infill) → localStorage cache → bundled seed → empty.
   READ-ONLY consumer: the Library owns aesthetic_items; this app writes ONLY fabric_configs.

   Colourways (Bryn 2026-10-16: "swatches and fabric types from the cineca range … swatch
   selector similar to seating app") — resolved in this order, all READ-ONLY:
     1. aesthetic_items.metadata.colourways[] {name, hex, img}   ← the Library files these (ask §6)
     2. seating_material_colours via metadata.seating_material_id ← the Cineca seating pricelist
        ingestion (Alcantara 16 · Diamond / Avalon 15) — same colour cards as the Seating app
     3. none → "N colourways in the range — samples at quotation" + a free-text colour.
   WeQuote: wq_product_skus (library_type 'aesthetic') rides along as item.wq {product_id, unit}.
*/
(function (global) {
  'use strict';

  var CFG = global.__FABRIC_CONFIG__ || {};
  var CACHE = CFG.cacheKey || 'sonor_fabric_ssot_v1';
  var CATS = CFG.cats || { fabric: 'wall_fabric', track: 'stretch_track', infill: 'stretch_infill' };
  var WANT = [CATS.fabric, CATS.track, CATS.infill];

  var ITEMS = [];
  var source = 'inline';
  var idx = { byId: {}, byCat: {} };
  var COLOURS = {};          // seating_material_id → [{name, hex, img}]
  var WQ = {};               // item_id → { product_id, unit, description }

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  function _index() {
    idx = { byId: {}, byCat: {} };
    ITEMS.forEach(function (it) {
      idx.byId[it.id] = it;
      (idx.byCat[it.category] = idx.byCat[it.category] || []).push(it);
    });
    Object.keys(idx.byCat).forEach(function (c) {
      idx.byCat[c].sort(function (a, b) { return (a.sort_order || 100) - (b.sort_order || 100) || String(a.name).localeCompare(b.name); });
    });
  }

  // view row → engine item. Adapter exists so the view can evolve without breaking cached /
  // seeded data — bump cacheKey whenever this shape changes.
  function adapt(rows) {
    return (rows || []).filter(function (r) { return r && r.enabled !== false && WANT.indexOf(r.category) >= 0; }).map(function (r) {
      var md = r.metadata || {};
      var it = {
        id: r.id, category: r.category, name: r.name,
        manufacturer: r.manufacturer || null,
        hex: r.hex || null, swatch_img: r.swatch_img || null, img: r.img || null,
        tier: r.tier == null ? null : r.tier, note: r.note || null,
        metadata: md, sort_order: r.sort_order == null ? 100 : r.sort_order,
        needs_review: !!md.needs_review
      };
      if (r.category === CATS.fabric) {
        it.width_m = num(md.width_m, null);
        it.at = !!md.acoustically_transparent;
        it.kind = md.kind || (it.at ? 'at-weave' : 'fabric');
        it.colours_available = num(md.colours_available, null);
        it.seating_material_id = md.seating_material_id || null;
        it.colourways = Array.isArray(md.colourways) ? md.colourways : null;   // Library-filed (preferred)
      } else if (r.category === CATS.track) {
        it.depth_mm = num(md.depth_mm, null);
        it.acoustic = !!md.acoustic;
        it.infill_mm = num(md.infill_mm, null);
        it.role = md.role || 'perimeter';            // perimeter | split
        it.use = Array.isArray(md.use) ? md.use : ['wall', 'ceiling'];
      } else if (r.category === CATS.infill) {
        it.thickness_mm = num(md.thickness_mm, null);
        it.board_mm = Array.isArray(md.board_mm) ? md.board_mm : (CFG.calc && CFG.calc.infillBoardMm) || [1200, 600];
      }
      if (md.wq && md.wq.product_id) it.wq = { product_id: Number(md.wq.product_id), unit: md.wq.unit || null, description: md.wq.description || null };
      return it;
    });
  }

  function _dbClient() {
    try {
      if (global.__FABRIC_DB__ && global.__FABRIC_DB__.client) return global.__FABRIC_DB__;
      if (global.SonorDB) { var d = new global.SonorDB(); global.__FABRIC_DB__ = d; return d; }
      if (global.db && global.db.client) return global.db;
    } catch (e) {}
    return null;
  }

  async function _loadColours(db) {
    // Cineca seating colour cards for the fabrics that share a material (READ-ONLY, seating SSOT)
    var ids = []; ITEMS.forEach(function (it) { if (it.seating_material_id && ids.indexOf(it.seating_material_id) < 0) ids.push(it.seating_material_id); });
    if (!ids.length) return;
    try {
      var r = await db.client.from('seating_material_colours').select('material_id,name,hex,sort_order,metadata').in('material_id', ids).order('sort_order');
      (r.data || []).forEach(function (c) {
        (COLOURS[c.material_id] = COLOURS[c.material_id] || []).push({ name: c.name, hex: c.hex || null, img: (c.metadata && (c.metadata.img || c.metadata.swatch_img)) || null });
      });
    } catch (e) {}
  }
  async function _loadWq(db) {
    try {
      var r = await db.client.from('wq_product_skus').select('item_id,wq_product_id,wq_description,metadata,enabled').eq('library_type', (CFG.wq || {}).libraryType || 'aesthetic').eq('enabled', true);
      (r.data || []).forEach(function (s) { if (s.wq_product_id) WQ[s.item_id] = { product_id: Number(s.wq_product_id), unit: (s.metadata && s.metadata.unit) || null, description: s.wq_description || null }; });
    } catch (e) {}
    ITEMS.forEach(function (it) { if (WQ[it.id]) it.wq = WQ[it.id]; });
  }

  async function load() {
    // Tier 1 — Supabase view
    try {
      var db = _dbClient();
      if (db && db.client) {
        // 6 s ceiling on the live read — an offline / slow boot falls to the cache / seed instead of a blank wizard
        var res = await Promise.race([
          db.client.from('v_aesthetic_catalogue').select('*').in('category', WANT),
          new Promise(function (resolve) { setTimeout(function () { resolve({ error: { message: 'timeout' }, data: null }); }, 6000); })
        ]);
        if (!res.error && res.data && res.data.length) {
          ITEMS = adapt(res.data); source = 'supabase';
          await _loadColours(db); await _loadWq(db);
          _index();
          try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), items: ITEMS, colours: COLOURS })); } catch (e) {}
          return true;
        }
        if (res.error) console.warn('[fabric] v_aesthetic_catalogue', res.error.message);
      }
    } catch (e) { /* fall through */ }
    // Tier 2 — cache (already-adapted shape)
    try {
      var raw = localStorage.getItem(CACHE);
      if (raw) { var c = JSON.parse(raw); if (c && c.items && c.items.length) { ITEMS = c.items; COLOURS = c.colours || {}; source = 'cache'; _index(); return true; } }
    } catch (e) {}
    // Tier 3 — bundled seed
    try {
      var seed = global.__FABRIC_SEED__;
      if (seed && seed.items && seed.items.length) { ITEMS = adapt(seed.items); COLOURS = seed.colours || {}; source = 'seed'; _index(); return true; }
    } catch (e) {}
    ITEMS = []; source = 'inline'; _index(); return false;
  }

  // colourways for a fabric item — Library-filed first, then the seating colour card
  function colourways(item) {
    if (!item) return [];
    if (item.colourways && item.colourways.length) return item.colourways;
    if (item.seating_material_id && COLOURS[item.seating_material_id]) return COLOURS[item.seating_material_id];
    return [];
  }

  global.SonorFabric = {
    load: load,
    get source() { return source; },
    all: function () { return ITEMS.slice(); },
    item: function (id) { return idx.byId[id] || null; },
    byCategory: function (cat) { return (idx.byCat[cat] || []).slice(); },
    fabrics: function () { return (idx.byCat[CATS.fabric] || []).slice(); },
    tracks: function () { return (idx.byCat[CATS.track] || []).slice(); },
    infills: function () { return (idx.byCat[CATS.infill] || []).slice(); },
    colourways: colourways,
    wqOf: function (id) { var it = idx.byId[id]; return (it && it.wq) || WQ[id] || null; },
    _debug: function () { return { items: ITEMS, colours: COLOURS, wq: WQ }; }
  };
})(window);
