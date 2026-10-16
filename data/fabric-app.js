/* Sonor Stretched Fabric — wizard UI (v0.1.0)
   FabricApp — clones the Cinema Aesthetic / Seating app pattern:
   Intro → Rooms → System → Fabric → Layout → Summary. Writes ONLY fabric_configs; publishes
   projects.metadata.stretched_fabric_spec through the merge RPC (this app = the only writer of
   that key). Reads project context live: takeoffs_floors (rooms + wall lengths from the polygon),
   cinema_designs (the cinema room dims), projects.metadata (height, brief, cinema_design_summary
   materials for the Cinema Takeoff cross-check). Client-build gate: window.__FABRIC_CLIENT__.
*/
(function (global) {
  'use strict';

  var CFG = global.__FABRIC_CONFIG__ || {};
  var STEPS = CFG.steps || ['Rooms', 'System', 'Fabric', 'Layout', 'Summary'];
  var CLIENT = !!global.__FABRIC_CLIENT__;
  var E = null, C = null, D = null;   // SonorFabric · SonorFabricCalc · SonorFabricDraw

  var cfg = {
    step: 1,
    rooms: [],
    defaults: { fabricId: null, colour: null, trackId: null, infillId: null, orientation: 'drop', wastePct: null, gripMm: null, panelMaxMm: null },
    client: { name: '', project: '' },
    projectId: null, _savedId: null, _savedLabel: null, _lastRef: null
  };
  var ctx = { rooms: null, cinema: null, cinemaMaterials: null, heightMm: null, brief: null, projectRef: null, spec: null, wqLinks: null, wqQuote: null, wqStatus: '' };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dbc() { try { return (global.__FABRIC_DB__ && global.__FABRIC_DB__.client) || (global.db && global.db.client) || null; } catch (e) { return null; } }
  function uid() { return 'r' + Math.random().toString(36).slice(2, 8); }
  function num(v, d) { if (v === null || v === undefined || v === '') return d; var n = Number(v); return isFinite(n) ? n : d; }
  function fmt(v, dp) { return Number(v || 0).toLocaleString('en-GB', { maximumFractionDigits: dp == null ? 2 : dp, minimumFractionDigits: dp == null ? 0 : dp }); }
  function toast(m) { try { if (global.SonorShell && global.SonorShell.toast) return global.SonorShell.toast(m); } catch (e) {} console.log('[fabric]', m); }

  // ── boot ─────────────────────────────────────────────────────────────────
  async function boot() {
    E = global.SonorFabric; C = global.SonorFabricCalc; D = global.SonorFabricDraw;
    await E.load();
    var note = $('sourceNote');
    if (note) { var s = E.source; note.textContent = (s === 'supabase' ? 'Live library' : s === 'cache' ? 'Cached library' : s === 'seed' ? 'Offline snapshot' : 'No data') + ' · v' + (CFG.version || '?'); note.className = 'src-note src-' + s; }
    seedDefaults();
    renderStep();
    if (!CLIENT) initProjectBar();
    bootDeepLink();
    try { global.SonorShell && global.SonorShell.selfTest && global.SonorShell.selfTest(); } catch (e) {}
  }
  function seedDefaults() {
    var d = cfg.defaults;
    if (!d.trackId) { var t = E.tracks().filter(function (x) { return x.role !== 'split'; }); var pick = t.find(function (x) { return x.acoustic && x.depth_mm === 25; }) || t[0]; if (pick) d.trackId = pick.id; }
    if (!d.fabricId) { var f = E.fabrics(); var fp = f.find(function (x) { return x.at && /kalder/i.test(x.name); }) || f.find(function (x) { return x.at; }) || f[0]; if (fp) d.fabricId = fp.id; }
    if (!d.infillId) { var inf = infillFor(E.item(d.trackId)); if (inf) d.infillId = inf.id; }
  }

  // ── resolvers (room → effective fabric / track / infill / opts) ──────────
  function roomFabric(rm) { return E.item((rm && rm.fabricId) || cfg.defaults.fabricId) || null; }
  function roomTrack(rm) { return E.item((rm && rm.trackId) || cfg.defaults.trackId) || null; }
  function infillFor(track) {
    if (!track || !track.acoustic) return null;
    var list = E.infills();
    return list.find(function (i) { return i.thickness_mm === track.infill_mm && i.wq; }) || list.find(function (i) { return i.thickness_mm === track.infill_mm; }) || list[0] || null;
  }
  function roomInfill(rm) {
    var tr = roomTrack(rm); if (!tr || !tr.acoustic) return null;
    var id = (rm && rm.infillId) || cfg.defaults.infillId;
    var it = id ? E.item(id) : null;
    return (it && it.category === (CFG.cats || {}).infill) ? it : infillFor(tr);
  }
  function roomColour(rm) { return (rm && rm.fabricId) ? (rm.colour || null) : (cfg.defaults.colour || null); }
  function roomOpts(rm) {
    var f = roomFabric(rm), tr = roomTrack(rm), inf = roomInfill(rm), d = cfg.defaults, cc = CFG.calc || {};
    return {
      rollWidthMm: f && f.width_m ? Math.round(f.width_m * 1000) : 1400,
      orientation: (rm && rm.orientation) || d.orientation || 'drop',
      gripMm: num(d.gripMm, cc.gripMm), panelMaxMm: num(d.panelMaxMm, cc.panelMaxMm), wastePct: num(d.wastePct, cc.wastePct),
      infill: inf ? { on: true, thickness_mm: inf.thickness_mm, board_mm: inf.board_mm } : { on: false }
    };
  }
  function calcAll() {
    return C.calcProject(cfg.rooms.map(function (rm) { return { id: rm.id, name: rm.name, surfaces: rm.surfaces, opts: roomOpts(rm) }; }));
  }
  function calcRoom(rm) { return C.calcRoom({ id: rm.id, name: rm.name, surfaces: rm.surfaces }, roomOpts(rm)); }

  // ── wizard nav ───────────────────────────────────────────────────────────
  function enter() { $('intro').style.display = 'none'; $('wizard').style.display = 'flex'; cfg.step = 1; renderStep(); }
  function backToIntro() { $('wizard').style.display = 'none'; $('intro').style.display = 'block'; }
  function goBack() { if (cfg.step > 1) { cfg.step--; renderStep(); } }
  function goNext() { if (cfg.step < STEPS.length) { cfg.step++; renderStep(); } }
  function jumpTo(n) { if (n < cfg.step) { cfg.step = n; renderStep(); } }
  function jumpRefresh() { renderStep(); }
  function renderStep() {
    var pills = $('stepPills');
    if (pills) pills.innerHTML = STEPS.map(function (s, i) {
      var n = i + 1, cls = n === cfg.step ? 'pill active' : n < cfg.step ? 'pill done' : 'pill';
      return '<span class="' + cls + '" onclick="FabricApp.jumpTo(' + n + ')"><span class="pn">' + n + '</span>' + s + '</span>' + (n < STEPS.length ? '<span class="parr">›</span>' : '');
    }).join('');
    var back = $('btnBack'); if (back) back.style.visibility = cfg.step > 1 ? 'visible' : 'hidden';
    var next = $('btnNext');
    if (next) {
      next.disabled = cfg.step === 1 && !cfg.rooms.length;
      next.textContent = cfg.step === STEPS.length ? 'Download proposal ↓' : 'Continue →';
      next.onclick = cfg.step === STEPS.length ? savePdf : goNext;
    }
    var body = $('stepBody'); if (!body) return;
    body.innerHTML = [renderRooms, renderSystem, renderFabric, renderLayout, renderSummary][cfg.step - 1]();
  }

  // ── step 1 · rooms ───────────────────────────────────────────────────────
  function roomHeight() { return ctx.heightMm || (CFG.calc || {}).defaultHeightMm || 2400; }
  function renderRooms() {
    var h = '<div class="lead"><h2>Which rooms.</h2><p>' + esc((CFG.sectionBlurbs || {}).rooms || '') + '</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    // take-off rooms
    h += '<div class="panel"><div class="ptt">From the take-off plan <span class="opt-tag">· wall lengths from the room polygon · height ' + roomHeight() + ' mm' + (ctx.heightMm ? '' : ' (provisional)') + '</span></div>';
    if (!cfg.projectId && !CLIENT) h += '<div class="hint">Select a project above to pull its rooms.</div>';
    else if (!ctx.rooms || !ctx.rooms.length) h += '<div class="hint">No rooms traced in Takeoffs for this project yet — add a room by size below.</div>';
    else {
      h += '<div class="rm-list">';
      ctx.rooms.forEach(function (r, i) {
        var added = cfg.rooms.some(function (x) { return x.source === 'takeoffs' && x.src_key === r.key; });
        h += '<div class="rm-row' + (added ? ' on' : '') + '"><div class="rm-b"><div class="rm-n">' + esc(r.floor_code) + ' · ' + esc(r.name) + '</div><div class="rm-d">' + (r.sqm ? fmt(r.sqm, 1) + ' m² · ' : '') + (r.walls.length ? r.walls.length + ' walls · ' + fmt(r.perimeter_m, 1) + ' m perimeter' : 'no polygon') + '</div></div>' +
          (added ? '<span class="ovw-badge">Added</span>' : '<button class="ghost sm" ' + (r.walls.length ? 'onclick="FabricApp.addTakeoffRoom(' + i + ')"' : 'disabled') + '>+ Add</button>') + '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    // cinema room
    if (ctx.cinema && (ctx.cinema.w || ctx.cinema.d)) {
      var cAdded = cfg.rooms.some(function (x) { return x.source === 'cinema'; });
      h += '<div class="panel"><div class="ptt">Cinema room <span class="opt-tag">· from Cinema Design · ' + ctx.cinema.w + ' × ' + ctx.cinema.d + ' × ' + (ctx.cinema.h || roomHeight()) + ' mm</span></div>' +
        '<div class="rm-row' + (cAdded ? ' on' : '') + '"><div class="rm-b"><div class="rm-n">Cinema — 4 walls + ceiling</div><div class="rm-d">' + (ctx.cinemaMaterials && ctx.cinemaMaterials.fabric_total_track_m ? 'Cinema Takeoff drew ' + fmt(ctx.cinemaMaterials.fabric_total_track_m, 1) + ' m of track · ' + fmt(ctx.cinemaMaterials.fabric_total_area_m2, 1) + ' m² fabric — shown beside this app\'s figures as a cross-check' : 'Geometry owned by the Cinema Takeoff; this app sets out the fabric from the room box') + '</div></div>' +
        (cAdded ? '<span class="ovw-badge">Added</span>' : '<button class="ghost sm" onclick="FabricApp.addCinemaRoom()">+ Add</button>') + '</div></div>';
    }
    // manual
    h += '<div class="panel"><div class="ptt">Add a room by size <span class="opt-tag">· rectangular · mm</span></div><div class="row4">' +
      '<label class="cfld"><span>Name</span><input id="mrName" placeholder="Media room"></label>' +
      '<label class="cfld"><span>Width</span><input id="mrW" type="number" value="4000"></label>' +
      '<label class="cfld"><span>Depth</span><input id="mrD" type="number" value="5000"></label>' +
      '<label class="cfld"><span>Height</span><input id="mrH" type="number" value="' + roomHeight() + '"></label>' +
      '<button class="btn ghost" style="padding:11px 18px;align-self:flex-end" onclick="FabricApp.addManualRoom()">+ Add room</button></div></div>';
    h += '</div>';
    // right: rooms in this design
    h += '<div class="panel sticky"><div class="ptt">Rooms in this design</div>';
    if (!cfg.rooms.length) h += '<div class="hint">Nothing yet — add a room from the plan, the cinema design, or by size.</div>';
    else {
      cfg.rooms.forEach(function (rm, i) {
        var rc = calcRoom(rm);
        h += '<div class="rm-card"><div class="rm-top"><div class="rm-n">' + esc(rm.name) + ' <span class="rm-src">' + esc(rm.floor_code || '') + ' · ' + esc(rm.source) + '</span></div><button class="x" title="Remove" onclick="FabricApp.removeRoom(' + i + ')">×</button></div>' +
          '<div class="rm-d">' + rc.totals.walls + ' walls' + (rc.totals.ceilings ? ' + ceiling' : '') + ' · ' + fmt(rc.totals.net_m2, 1) + ' m² · ' + fmt(rc.totals.track_m, 1) + ' m track</div>' +
          '<div class="sf-list">' + rm.surfaces.map(function (s, si) {
            return '<label class="sf"><input type="checkbox" ' + (s.on ? 'checked' : '') + ' onchange="FabricApp.toggleSurface(' + i + ',' + si + ',this.checked)"><span>' + esc(s.label) + '</span><em>' + s.len_mm + ' × ' + s.h_mm + '</em></label>';
          }).join('') + '</div>' +
          '<div class="rm-h"><span>Height</span><input type="number" value="' + rm.h_mm + '" onchange="FabricApp.setRoomHeight(' + i + ',this.value)"> mm' + (rm.h_provisional ? ' <b class="warn">provisional</b>' : '') + '</div></div>';
      });
    }
    h += '</div></div>';
    return h;
  }
  function mkRoom(name, src, w, d, hgt, provisional, extra) {
    var rm = Object.assign({ id: uid(), name: name, source: src, w_mm: w || null, d_mm: d || null, h_mm: hgt, h_provisional: !!provisional, floor_code: 'GF', floor_id: null, fabricId: null, colour: null, trackId: null, infillId: null, orientation: null, surfaces: [] }, extra || {});
    return rm;
  }
  function addTakeoffRoom(i) {
    var r = ctx.rooms[i]; if (!r) return;
    var hgt = roomHeight();
    var rm = mkRoom(r.name, 'takeoffs', null, null, hgt, !ctx.heightMm, { floor_code: r.floor_code, floor_id: r.floor_id, src_key: r.key, code: r.code || null });
    rm.surfaces = r.walls.map(function (w, k) { return { id: 'w' + (k + 1), label: w.label, kind: 'wall', len_mm: w.len_mm, h_mm: hgt, on: true, openings: [], cutouts: [] }; });
    if (r.sqm) rm.surfaces.push({ id: 'c1', label: 'Ceiling', kind: 'ceiling', len_mm: Math.round(Math.sqrt(r.sqm) * 1000), h_mm: Math.round(Math.sqrt(r.sqm) * 1000), on: false, openings: [], cutouts: [], note: 'equivalent square from the room area' });
    cfg.rooms.push(rm); renderStep();
  }
  function addCinemaRoom() {
    var c = ctx.cinema; if (!c) return;
    var hgt = c.h || roomHeight();
    var rm = mkRoom('Cinema', 'cinema', c.w, c.d, hgt, !c.h, { floor_code: (ctx.rooms || []).filter(function (r) { return /cinema/i.test(r.name); }).map(function (r) { return r.floor_code; })[0] || 'GF' });
    rm.surfaces = C.surfacesFromRect(c.w, c.d, hgt);
    rm.surfaces[0].label = 'Screen wall'; rm.surfaces[2].label = 'Rear wall'; rm.surfaces[1].label = 'Right wall'; rm.surfaces[3].label = 'Left wall';
    cfg.rooms.push(rm); renderStep();
  }
  function addManualRoom() {
    var name = ($('mrName') || {}).value || 'Room', w = num(($('mrW') || {}).value, 0), d = num(($('mrD') || {}).value, 0), hgt = num(($('mrH') || {}).value, roomHeight());
    if (!w || !d || !hgt) { toast('Width, depth and height are needed'); return; }
    var rm = mkRoom(name, 'manual', w, d, hgt, false);
    rm.surfaces = C.surfacesFromRect(w, d, hgt);
    cfg.rooms.push(rm); renderStep();
  }
  function removeRoom(i) { cfg.rooms.splice(i, 1); renderStep(); }
  function toggleSurface(i, si, on) { var s = cfg.rooms[i] && cfg.rooms[i].surfaces[si]; if (s) { s.on = !!on; renderStep(); } }
  function setRoomHeight(i, v) { var rm = cfg.rooms[i]; if (!rm) return; var hgt = Math.max(300, num(v, rm.h_mm)); rm.h_mm = hgt; rm.h_provisional = false; rm.surfaces.forEach(function (s) { if (s.kind === 'wall') s.h_mm = hgt; }); renderStep(); }

  // ── step 2 · system ──────────────────────────────────────────────────────
  function renderSystem() {
    var d = cfg.defaults, tr = E.item(d.trackId), cc = CFG.calc || {};
    var h = '<div class="lead"><h2>The system.</h2><p>' + esc((CFG.sectionBlurbs || {}).system || '') + '</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    h += '<div class="panel"><div class="ptt">Track <span class="opt-tag">· the perimeter profile the fabric is tensioned into</span></div><div class="mat-grid">';
    E.tracks().filter(function (t) { return t.role !== 'split'; }).forEach(function (t) {
      var on = d.trackId === t.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="FabricApp.setDefault(\'trackId\',\'' + t.id + '\')"><div class="mc-name">' + esc(t.name) + '</div><div class="mc-meta">' + (t.depth_mm ? t.depth_mm + ' mm' : '') + (t.acoustic ? ' · acoustic' : ' · fabric only') + (t.wq ? '' : ' · <span class="warn">no WeQuote product</span>') + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(t.note || '') + '</div></button>';
    });
    h += '</div>' + (E.tracks().some(function (t) { return t.role === 'split'; }) ? '<div class="hint">Seams between panels take a split track (double-sided) — counted automatically from the panel layout.</div>' : '') + '</div>';
    if (tr && tr.acoustic) {
      h += '<div class="panel"><div class="ptt">Acoustic infill <span class="opt-tag">· behind the fabric · ' + (tr.infill_mm || '') + ' mm track</span></div><div class="mat-grid">';
      E.infills().forEach(function (it) {
        var on = (d.infillId || (infillFor(tr) || {}).id) === it.id;
        h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="FabricApp.setDefault(\'infillId\',\'' + it.id + '\')"><div class="mc-name">' + esc(it.name) + '</div><div class="mc-meta">' + (it.thickness_mm || '') + ' mm · ' + (it.board_mm ? it.board_mm.join(' × ') + ' boards' : '') + (it.thickness_mm !== tr.infill_mm ? ' · <span class="warn">does not match the track depth</span>' : '') + (it.wq ? '' : ' · <span class="warn">no WeQuote product</span>') + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(it.note || '') + '</div></button>';
      });
      h += '</div></div>';
    }
    h += '<div class="panel"><div class="ptt">Fabric orientation <span class="opt-tag">· how the roll runs on the wall</span></div><div class="mat-grid">';
    (CFG.orientations || []).forEach(function (o) {
      var on = (d.orientation || 'drop') === o.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="FabricApp.setDefault(\'orientation\',\'' + o.id + '\')"><div class="mc-name">' + esc(o.label) + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(o.note) + '</div></button>';
    });
    h += '</div></div>';
    h += '<div class="panel"><div class="ptt">Allowances <span class="opt-tag">· project-wide · blank = Sonor standard</span></div><div class="row4">' +
      '<label class="cfld"><span>Grip allowance (mm each edge)</span><input type="number" placeholder="' + cc.gripMm + '" value="' + (d.gripMm == null ? '' : d.gripMm) + '" onchange="FabricApp.setDefault(\'gripMm\', this.value)"></label>' +
      '<label class="cfld"><span>Max panel (mm)</span><input type="number" placeholder="' + cc.panelMaxMm + '" value="' + (d.panelMaxMm == null ? '' : d.panelMaxMm) + '" onchange="FabricApp.setDefault(\'panelMaxMm\', this.value)"></label>' +
      '<label class="cfld"><span>Cutting waste (%)</span><input type="number" placeholder="' + cc.wastePct + '" value="' + (d.wastePct == null ? '' : d.wastePct) + '" onchange="FabricApp.setDefault(\'wastePct\', this.value)"></label></div></div>';
    h += '</div>';
    h += '<div class="panel sticky"><div class="ptt">Running totals</div>' + totalsHtml() + '</div></div>';
    return h;
  }
  function setDefault(k, v) {
    if (k === 'gripMm' || k === 'panelMaxMm' || k === 'wastePct') { cfg.defaults[k] = (v === '' || v == null) ? null : num(v, null); refreshTotals(); return; }
    cfg.defaults[k] = v;
    if (k === 'trackId') { var inf = infillFor(E.item(v)); cfg.defaults.infillId = inf ? inf.id : null; }
    if (k === 'fabricId') { var cw = E.colourways(E.item(v)); cfg.defaults.colour = cw.length ? cw[0].name : null; }
    renderStep();
  }
  function totalsHtml() {
    var p = calcAll(), t = p.totals;
    var rows = [['Rooms', cfg.rooms.length + ' · ' + t.walls + ' walls' + (t.ceilings ? ' · ' + t.ceilings + ' ceilings' : '')], ['Finished area', fmt(t.net_m2, 1) + ' m²'], ['Panels', t.panels + ' · ' + fmt(t.split_m, 1) + ' m split track'], ['Track', fmt(t.track_m, 1) + ' m'], ['Fabric to order', fmt(t.fabric_lm, 1) + ' lm · ' + fmt(t.fabric_m2_ordered, 1) + ' m²'], ['Infill', t.infill_m2 ? fmt(t.infill_m2, 1) + ' m² · ' + t.infill_boards + ' boards' : '—'], ['Cut-outs', t.cutouts || '—']];
    var h = '<div id="totalsBox">' + rows.map(function (r) { return '<div class="tot"><div class="tl">' + esc(r[0]) + '</div><div class="tv">' + esc(r[1]) + '</div></div>'; }).join('');
    if (t.flags.length) h += '<div class="hint warn" style="margin-top:8px">' + t.flags.map(esc).join('<br>') + '</div>';
    return h + '</div>';
  }
  function refreshTotals() { var el = $('totalsBox'); if (el) el.outerHTML = totalsHtml(); }

  // ── step 3 · fabric (Cineca range cards + colour swatches, Seating-style) ─
  var KIND_LABEL = { velvet: 'Velvets', suede: 'Suede-touch', 'at-weave': 'Acoustically transparent weaves', fabric: 'Other fabrics' };
  var KIND_ORDER = ['velvet', 'suede', 'at-weave', 'fabric'];
  var COLOUR_WORDS = [['anthracite', '#3a3c3e'], ['charcoal', '#37393b'], ['graphite', '#4a4c4e'], ['black', '#141416'], ['onyx', '#1c1c20'], ['white', '#e9e6df'], ['ivory', '#e8e2d2'], ['cream', '#e5dcc6'], ['linen', '#ddd3bc'], ['beige', '#cfc0a2'], ['sand', '#c9b791'], ['stone', '#b3aa98'], ['taupe', '#9a8d7b'], ['chocolate', '#4a352a'], ['espresso', '#3d2c22'], ['brown', '#5d4632'], ['walnut', '#5a4230'], ['cognac', '#8a512e'], ['tan', '#a97e50'], ['camel', '#b08a56'], ['caramel', '#a9713d'], ['tobacco', '#71512f'], ['mocha', '#6b5340'], ['bordeaux', '#5c1f2c'], ['burgundy', '#5e1e2b'], ['wine', '#63212f'], ['merlot', '#5a1f2e'], ['crimson', '#8e2230'], ['red', '#8e2230'], ['terracotta', '#a3573a'], ['rust', '#96502f'], ['copper', '#a05f34'], ['amber', '#b07a35'], ['mustard', '#a9862f'], ['gold', '#a98b3f'], ['ochre', '#a67e33'], ['olive', '#5f6136'], ['sage', '#7c8468'], ['forest', '#2c4a34'], ['emerald', '#1f5c44'], ['green', '#3d5c42'], ['moss', '#5a6140'], ['teal', '#1f5c62'], ['petrol', '#1e4c58'], ['navy', '#1d2a4a'], ['midnight', '#1a2138'], ['royal', '#25407f'], ['cobalt', '#2a4a9c'], ['denim', '#3a5578'], ['steel', '#5f7186'], ['blue', '#2e4a72'], ['aubergine', '#42283f'], ['plum', '#57324f'], ['violet', '#5a3d78'], ['purple', '#5c3a72'], ['mauve', '#8a6f85'], ['pink', '#b06a86'], ['rose', '#a55f6e'], ['pewter', '#77797c'], ['silver', '#a5a7aa'], ['dove', '#a8a7a2'], ['ash', '#8f9294'], ['smoke', '#6f7276'], ['slate', '#5a6672'], ['storm', '#4a5060'], ['grey', '#75777a'], ['gray', '#75777a'], ['mink', '#8d7f72'], ['mushroom', '#a0937f']];
  function guessHex(name) {
    var n = String(name || '').toLowerCase(), bestPos = 1e9, bestHex = null;
    for (var i = 0; i < COLOUR_WORDS.length; i++) { var p = n.indexOf(COLOUR_WORDS[i][0]); if (p >= 0 && p < bestPos) { bestPos = p; bestHex = COLOUR_WORDS[i][1]; } }
    if (bestHex) return bestHex;
    var hh = 0; for (var j = 0; j < n.length; j++) hh = (hh * 31 + n.charCodeAt(j)) % 360;
    return 'hsl(' + hh + ',22%,38%)';
  }
  function fabricCardHtml(f, on, onclick) {
    var cw = E.colourways(f);
    return '<button class="mcard' + (on ? ' on' : '') + '" onclick="' + onclick + '">' +
      '<div class="mc-top"><span class="mc-sw" style="--c:' + esc(f.hex || (cw[0] && (cw[0].hex || guessHex(cw[0].name))) || '#3a3835') + (f.swatch_img ? ';background-image:url(\'' + esc(f.swatch_img) + '\');background-size:cover' : '') + '"></span><div class="mc-name">' + esc(f.name) + '</div>' + (f.at ? '<span class="at-badge">AT</span>' : '') + '</div>' +
      '<div class="mc-meta">' + esc(f.manufacturer || '') + (f.tier ? ' · tier ' + f.tier : '') + (f.width_m ? ' · ' + f.width_m + ' m roll' : '') + '</div>' +
      '<div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc((f.note || '').replace(/\s·\s\d+\s*colourways.*$/, '')) + '</div>' +
      '<div class="mc-col">' + (cw.length ? cw.length + ' colour cards' : (f.colours_available ? f.colours_available + ' colourways in the range' : 'colourways on request')) + (f.wq ? '' : ' · <span class="warn">no WeQuote product</span>') + '</div></button>';
  }
  function colourPickerHtml(f, current, setter) {
    if (!f) return '';
    var cols = E.colourways(f);
    var h = '<div class="colsel"><div class="lbl">Colour — ' + esc(f.name) + (cols.length ? ' <span class="opt-tag">' + cols.length + ' colour cards' + (f.colours_available && f.colours_available > cols.length ? ' of ' + f.colours_available + ' in the range' : '') + '</span>' : '') + '</div>';
    if (cols.length) {
      h += '<div class="cols">' + cols.map(function (c) {
        var hx = c.hex || guessHex(c.name);
        var st = '--c:' + esc(hx) + (c.img ? ';background-image:url(\'' + esc(c.img) + '\');background-size:cover;background-position:center' : '');
        return '<button class="col' + (current === c.name ? ' on' : '') + '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" style="' + st + '" onclick="' + setter.replace('%V', JSON.stringify(c.name).replace(/"/g, '&quot;')) + '"></button>';
      }).join('') + '</div><div class="hint" id="colName">' + (current ? 'Selected: <b style="color:var(--cream)">' + esc(current) + '</b> · ' : '') + 'Hover a swatch for its name — physical samples before any order.</div>';
    } else {
      h += '<div class="hint">' + (f.colours_available ? f.colours_available + ' colourways in the ' + esc(f.manufacturer || '') + ' range — ' : '') + 'colour cards not filed in the Library yet; name the colourway and samples follow at quotation.</div>' +
        '<input class="col-free" placeholder="Colourway name / reference" value="' + esc(current || '') + '" onchange="' + setter.replace('%V', 'this.value') + '">';
    }
    return h + '</div>';
  }
  function renderFabric() {
    var d = cfg.defaults, cur = E.item(d.fabricId);
    var h = '<div class="lead"><h2>The fabric.</h2><p>' + esc((CFG.sectionBlurbs || {}).fabric || '') + '</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    var groups = {}; E.fabrics().forEach(function (f) { (groups[f.kind || 'fabric'] = groups[f.kind || 'fabric'] || []).push(f); });
    h += '<div class="panel"><div class="ptt">Fabric <span class="opt-tag">· project default — rooms can override on the Layout step</span></div>';
    KIND_ORDER.filter(function (k) { return groups[k]; }).forEach(function (k) {
      h += '<div class="mgrp"><div class="lbl">' + esc(KIND_LABEL[k] || k) + '</div><div class="mat-grid">' + groups[k].map(function (f) { return fabricCardHtml(f, d.fabricId === f.id, 'FabricApp.setDefault(\'fabricId\',\'' + f.id + '\')'); }).join('') + '</div></div>';
    });
    h += colourPickerHtml(cur, d.colour, 'FabricApp.setDefaultColour(%V)') + '</div>';
    // AT advice
    var tr = E.item(d.trackId);
    var anySpk = cfg.rooms.some(function (rm) { return rm.surfaces.some(function (s) { return (s.cutouts || []).some(function (c) { return c.kind === 'speaker'; }); }); });
    if (cur && !cur.at && (anySpk || (tr && tr.acoustic))) h += '<div class="panel"><div class="ptt">A note on this choice</div><div class="hint" style="margin:0">' + esc(cur.name) + ' is not acoustically transparent — right for feature walls and ceilings, but loudspeakers must not sit behind it. ' + (anySpk ? 'This design has speaker cut-outs: use an AT weave on those surfaces (override per room on the Layout step).' : 'The acoustic infill still works behind it.') + '</div></div>';
    h += '</div>';
    h += '<div class="panel sticky"><div class="ptt">Your selection</div>' + selectionHtml() + '</div></div>';
    return h;
  }
  function setDefaultColour(v) { cfg.defaults.colour = v || null; renderStep(); }
  function selectionHtml() {
    var f = E.item(cfg.defaults.fabricId), tr = E.item(cfg.defaults.trackId), inf = roomInfill(null);
    var rows = [['Fabric', f ? f.name + (f.at ? ' · AT' : '') + (f.width_m ? ' · ' + f.width_m + ' m' : '') : '—'], ['Colour', cfg.defaults.colour || (f && E.colourways(f).length ? '—' : 'at quotation')], ['Track', tr ? tr.name : '—'], ['Infill', inf ? inf.name : (tr && tr.acoustic ? '—' : 'none (fabric-only track)')], ['Orientation', ((CFG.orientations || []).find(function (o) { return o.id === (cfg.defaults.orientation || 'drop'); }) || {}).label || '—']];
    return rows.map(function (r) { return '<div class="tot"><div class="tl">' + esc(r[0]) + '</div><div class="tv">' + esc(r[1]) + '</div></div>'; }).join('') + '<div style="margin-top:12px">' + totalsHtml() + '</div>';
  }

  // ── step 4 · layout (surfaces · openings · cut-outs · elevations · per-room overrides) ─
  function renderLayout() {
    var h = '<div class="lead"><h2>Set out every surface.</h2><p>' + esc((CFG.sectionBlurbs || {}).layout || '') + '</p></div>';
    if (!cfg.rooms.length) return h + '<div class="empty">No rooms yet — go back to the Rooms step.</div>';
    cfg.rooms.forEach(function (rm, ri) {
      var rc = calcRoom(rm), f = roomFabric(rm), tr = roomTrack(rm), inf = roomInfill(rm), o = roomOpts(rm);
      h += '<div class="panel room-panel"><div class="ptt">' + esc(rm.name) + ' <span class="opt-tag">· ' + esc(rm.floor_code || '') + ' · ' + fmt(rc.totals.net_m2, 1) + ' m² · ' + rc.totals.panels + ' panels · ' + fmt(rc.totals.track_m, 1) + ' m track' + (rc.totals.infill_m2 ? ' · ' + fmt(rc.totals.infill_m2, 1) + ' m² infill' : '') + '</span></div>';
      // overrides
      h += '<div class="ovr"><label><span>Fabric</span><select onchange="FabricApp.setRoom(' + ri + ',\'fabricId\',this.value)"><option value="">Project default — ' + esc(f && !rm.fabricId ? f.name : '') + '</option>' + E.fabrics().map(function (x) { return '<option value="' + x.id + '"' + (rm.fabricId === x.id ? ' selected' : '') + '>' + esc(x.name) + (x.at ? ' (AT)' : '') + '</option>'; }).join('') + '</select></label>' +
        (rm.fabricId ? '<label><span>Colour</span>' + (E.colourways(f).length ? '<select onchange="FabricApp.setRoom(' + ri + ',\'colour\',this.value)"><option value="">—</option>' + E.colourways(f).map(function (c) { return '<option' + (rm.colour === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' : '<input value="' + esc(rm.colour || '') + '" placeholder="Colourway" onchange="FabricApp.setRoom(' + ri + ',\'colour\',this.value)">') + '</label>' : '') +
        '<label><span>Track</span><select onchange="FabricApp.setRoom(' + ri + ',\'trackId\',this.value)"><option value="">Project default — ' + esc(tr && !rm.trackId ? tr.name : '') + '</option>' + E.tracks().filter(function (t) { return t.role !== 'split'; }).map(function (x) { return '<option value="' + x.id + '"' + (rm.trackId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>' +
        '<label><span>Orientation</span><select onchange="FabricApp.setRoom(' + ri + ',\'orientation\',this.value)"><option value="">Project default</option>' + (CFG.orientations || []).map(function (x) { return '<option value="' + x.id + '"' + (rm.orientation === x.id ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>' +
        '<div class="hint" style="margin:0;align-self:center">' + (f ? esc(f.name) + (roomColour(rm) ? ' · ' + esc(roomColour(rm)) : '') + ' · ' + o.rollWidthMm + ' mm roll' : '') + (inf ? ' · ' + esc(inf.name) : '') + '</div></div>';
      // surfaces
      rm.surfaces.forEach(function (s, si) {
        var sc = rc.surfaces.find(function (x) { return x.id === s.id; });
        h += '<div class="sf-row' + (s.on ? '' : ' off') + '"><div class="sf-head"><label class="sf"><input type="checkbox" ' + (s.on ? 'checked' : '') + ' onchange="FabricApp.toggleSurface(' + ri + ',' + si + ',this.checked)"><b>' + esc(s.label) + '</b></label>' +
          '<span class="dim"><input type="number" value="' + s.len_mm + '" onchange="FabricApp.setSurface(' + ri + ',' + si + ',\'len_mm\',this.value)"> × <input type="number" value="' + s.h_mm + '" onchange="FabricApp.setSurface(' + ri + ',' + si + ',\'h_mm\',this.value)"> mm</span>' +
          (sc ? '<span class="sf-tot">' + fmt(sc.net_m2, 1) + ' m² · ' + sc.n_panels + ' × ' + sc.panel_w_mm + ' mm · ' + fmt(sc.track.total_m, 1) + ' m track' + (sc.flags.length ? ' · <span class="warn">' + esc(sc.flags.join('; ')) + '</span>' : '') + '</span>' : '') +
          '<span class="sf-act"><button class="ghost sm" onclick="FabricApp.addOpening(' + ri + ',' + si + ')">+ Opening</button><button class="ghost sm" onclick="FabricApp.addCutout(' + ri + ',' + si + ')">+ Cut-out</button></span></div>';
        if (s.on && sc) {
          var chips = '';
          (s.openings || []).forEach(function (op, oi) { chips += '<span class="chip"><select onchange="FabricApp.setOpening(' + ri + ',' + si + ',' + oi + ',\'label\',this.value)">' + (CFG.openingPresets || []).map(function (p) { return '<option' + (op.label === p.label ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('') + '</select><input type="number" value="' + op.w + '" onchange="FabricApp.setOpening(' + ri + ',' + si + ',' + oi + ',\'w\',this.value)">×<input type="number" value="' + op.h + '" onchange="FabricApp.setOpening(' + ri + ',' + si + ',' + oi + ',\'h\',this.value)"> ×<input type="number" class="q" value="' + op.qty + '" onchange="FabricApp.setOpening(' + ri + ',' + si + ',' + oi + ',\'qty\',this.value)"><button class="x" onclick="FabricApp.removeOpening(' + ri + ',' + si + ',' + oi + ')">×</button></span>'; });
          (s.cutouts || []).forEach(function (c, ci) { chips += '<span class="chip co"><select onchange="FabricApp.setCutout(' + ri + ',' + si + ',' + ci + ',\'kind\',this.value)">' + (CFG.cutoutKinds || []).map(function (k) { return '<option value="' + k.id + '"' + (c.kind === k.id ? ' selected' : '') + '>' + esc(k.label) + '</option>'; }).join('') + '</select>×<input type="number" class="q" value="' + c.qty + '" onchange="FabricApp.setCutout(' + ri + ',' + si + ',' + ci + ',\'qty\',this.value)"><button class="x" onclick="FabricApp.removeCutout(' + ri + ',' + si + ',' + ci + ')">×</button></span>'; });
          if (chips) h += '<div class="chips">' + chips + '</div>';
          h += '<div class="elev-wrap">' + D.svg(s, sc, { width: 640 }) + '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    });
    return h;
  }
  function setRoom(ri, k, v) { var rm = cfg.rooms[ri]; if (!rm) return; rm[k] = v || null; if (k === 'fabricId') { var cw = E.colourways(E.item(v)); rm.colour = cw.length ? cw[0].name : null; } if (k === 'trackId') rm.infillId = null; renderStep(); }
  function setSurface(ri, si, k, v) { var s = cfg.rooms[ri] && cfg.rooms[ri].surfaces[si]; if (!s) return; s[k] = Math.max(100, num(v, s[k])); renderStep(); }
  function addOpening(ri, si) { var s = cfg.rooms[ri].surfaces[si]; var p = (CFG.openingPresets || [])[0] || { label: 'Opening', w: 900, h: 2100 }; (s.openings = s.openings || []).push({ label: p.label, w: p.w, h: p.h, qty: 1 }); s.on = true; renderStep(); }
  function setOpening(ri, si, oi, k, v) { var op = cfg.rooms[ri].surfaces[si].openings[oi]; if (!op) return; if (k === 'label') { op.label = v; var p = (CFG.openingPresets || []).find(function (x) { return x.label === v; }); if (p) { op.w = p.w; op.h = p.h; } } else op[k] = Math.max(0, num(v, op[k])); renderStep(); }
  function removeOpening(ri, si, oi) { cfg.rooms[ri].surfaces[si].openings.splice(oi, 1); renderStep(); }
  function addCutout(ri, si) { var s = cfg.rooms[ri].surfaces[si]; (s.cutouts = s.cutouts || []).push({ kind: 'speaker', qty: 2 }); s.on = true; renderStep(); }
  function setCutout(ri, si, ci, k, v) { var c = cfg.rooms[ri].surfaces[si].cutouts[ci]; if (!c) return; c[k] = k === 'qty' ? Math.max(0, Math.round(num(v, c.qty))) : v; renderStep(); }
  function removeCutout(ri, si, ci) { cfg.rooms[ri].surfaces[si].cutouts.splice(ci, 1); renderStep(); }

  // ── step 5 · summary ─────────────────────────────────────────────────────
  function renderSummary() {
    var p = calcAll(), t = p.totals;
    var h = '<div class="summary">';
    h += '<div class="sm-head"><div><div class="sm-mfr">Stretched Fabric · ' + cfg.rooms.length + ' room' + (cfg.rooms.length === 1 ? '' : 's') + '</div><h2>' + esc(cfg.client.project || 'Stretched Fabric Design') + '</h2></div><div class="sm-date">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>';
    if (!CLIENT) {
      h += '<div class="client-row"><div class="cfld"><span>Prepared for</span><input value="' + esc(cfg.client.name) + '" onchange="FabricApp.setClient(\'name\',this.value)"></div><div class="cfld"><span>Project</span><input value="' + esc(cfg.client.project) + '" onchange="FabricApp.setClient(\'project\',this.value)"></div></div>';
      h += '<div class="panel saved-panel" style="margin-bottom:18px"><div class="ptt">Saved designs</div><div id="savedList"><div class="hint">Loading…</div></div></div>';
    }
    h += '<div class="strip"><div class="cellx"><div class="cl">Finished area</div><div class="cv">' + fmt(t.net_m2, 1) + ' m²</div><div class="cn">' + t.walls + ' walls' + (t.ceilings ? ' · ' + t.ceilings + ' ceilings' : '') + '</div></div>' +
      '<div class="cellx"><div class="cl">Track</div><div class="cv">' + fmt(t.track_m, 1) + ' m</div><div class="cn">' + t.panels + ' panels · ' + fmt(t.split_m, 1) + ' m splits</div></div>' +
      '<div class="cellx"><div class="cl">Fabric to order</div><div class="cv">' + fmt(t.fabric_lm, 1) + ' lm</div><div class="cn">' + fmt(t.fabric_m2_ordered, 1) + ' m² incl. waste</div></div>' +
      '<div class="cellx"><div class="cl">Infill</div><div class="cv">' + (t.infill_m2 ? fmt(t.infill_m2, 1) + ' m²' : '—') + '</div><div class="cn">' + (t.infill_boards ? t.infill_boards + ' boards' : 'fabric-only track') + '</div></div>' +
      '<div class="cellx"><div class="cl">Cut-outs</div><div class="cv">' + (t.cutouts || 0) + '</div><div class="cn">devices through the finish</div></div></div>';
    // schedule
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Schedule by room</div><div style="overflow-x:auto"><table class="pln"><thead><tr><th style="text-align:left">Room</th><th style="text-align:left">Fabric · colour</th><th style="text-align:left">Track</th><th>m²</th><th>Panels</th><th>Track m</th><th>Infill m²</th><th>Cut-outs</th></tr></thead><tbody>';
    p.rooms.forEach(function (r, i) {
      var rm = cfg.rooms[i], f = roomFabric(rm), tr = roomTrack(rm);
      h += '<tr><td style="text-align:left"><b>' + esc(r.name) + '</b><div class="cn">' + esc(rm.floor_code || '') + ' · ' + r.totals.walls + ' walls' + (r.totals.ceilings ? ' + ceiling' : '') + '</div></td><td style="text-align:left">' + (f ? esc(f.name) + (f.at ? ' <span class="at-badge">AT</span>' : '') : '—') + (roomColour(rm) ? '<div class="cn">' + esc(roomColour(rm)) + '</div>' : '') + '</td><td style="text-align:left">' + (tr ? esc(tr.name) : '—') + '</td><td>' + fmt(r.totals.net_m2, 1) + '</td><td>' + r.totals.panels + '</td><td>' + fmt(r.totals.track_m, 1) + '</td><td>' + (r.totals.infill_m2 ? fmt(r.totals.infill_m2, 1) : '—') + '</td><td>' + (r.totals.cutouts || '—') + '</td></tr>';
    });
    h += '</tbody></table></div>' + (t.flags.length ? '<div class="hint warn">' + t.flags.map(esc).join('<br>') + '</div>' : '') + '</div>';
    // cinema cross-check
    var cin = cfg.rooms.find(function (x) { return x.source === 'cinema'; });
    if (cin && ctx.cinemaMaterials && ctx.cinemaMaterials.fabric_total_track_m) {
      var rcin = p.rooms[cfg.rooms.indexOf(cin)];
      h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Cinema Takeoff cross-check <span class="opt-tag">· the drawn cinema model vs this set-out</span></div><div class="hint" style="margin:0">Cinema Takeoff: ' + fmt(ctx.cinemaMaterials.fabric_total_track_m, 1) + ' m track · ' + fmt(ctx.cinemaMaterials.fabric_total_area_m2, 1) + ' m² fabric (' + fmt(ctx.cinemaMaterials.fabric_total_area_waste_m2, 1) + ' m² with waste). This app: ' + fmt(rcin.totals.track_m, 1) + ' m · ' + fmt(rcin.totals.net_m2, 1) + ' m². The Takeoff is the drawn truth for the cinema room; a gap usually means pillasters, bulkheads or no-fabric zones this box model does not know about.</div></div>';
    }
    if (!CLIENT) h += '<div class="panel" style="margin-bottom:18px" id="wqPanel">' + wqPanelHtml() + '</div>';
    h += '<div class="actions">' + (!CLIENT ? '<button class="btn ghost" onclick="FabricApp.saveConfig()">Save design</button><button class="btn ghost" onclick="FabricApp.savePdf(true)">Cut list &amp; BOM (internal)</button>' : '') + '<button class="btn primary" onclick="FabricApp.savePdf()">Download Stretched Fabric Proposal</button></div>';
    h += '<div class="disc">' + (CFG.termsLines || []).map(esc).join(' ') + '</div></div>';
    if (!CLIENT) setTimeout(function () { loadSavedList(); wqRefresh(); }, 50);
    return h;
  }
  function setClient(k, v) { cfg.client[k] = v; }

  // ── WeQuote (Garden pattern) ─────────────────────────────────────────────
  function wqModel() {
    var p = calcAll();
    return { ref: ctx.projectRef || cfg.client.project || '', name: cfg.client.project || '', rooms: cfg.rooms.map(function (rm, i) { return { name: rm.name, code: rm.code || rm.name, floor_code: rm.floor_code || 'GF', fabric: roomFabric(rm), track: roomTrack(rm), infill: roomInfill(rm), colour: roomColour(rm), calc: p.rooms[i] }; }) };
  }
  function wqPanelHtml() {
    var W = global.SonorFabricWq; if (!W) return '<div class="ptt">WeQuote</div><div class="hint" style="margin:0">WeQuote module not loaded.</div>';
    var plan = W.buildPlan(wqModel(), ctx.wqQuote || null), t = plan.totals;
    var h = '<div class="ptt">WeQuote <span class="opt-tag">· one area per room · Stretched Fabric Walls lines</span></div>';
    h += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><span class="hint" style="margin:0">Paired quote:</span>' + (ctx.wqQuote ? '<span class="spec-chip">#' + esc(ctx.wqQuote.no || ctx.wqQuote.id) + (ctx.wqQuote.description ? ' — ' + esc(ctx.wqQuote.description) : '') + (ctx.wqQuote.stage ? ' · ' + esc(ctx.wqQuote.stage) : '') + '</span>' : '<span class="hint warn" style="margin:0">none</span>') +
      '<select id="wqPick" style="min-width:220px"><option value="">— pick a quote on this project —</option>' + (ctx.wqLinks || []).map(function (l) { return '<option value="' + esc(l.quote_id) + '">#' + esc(l.quote_no || l.quote_id) + (l.wq_description ? ' — ' + esc(l.wq_description) : '') + ' · ' + esc(l.slot) + (l.wq_stage ? ' · ' + esc(l.wq_stage) : '') + '</option>'; }).join('') + '</select>' +
      '<input id="wqId" placeholder="or WeQuote quote id" style="width:150px"><button class="ghost sm" onclick="FabricApp.wqPair()">Pair</button><button class="ghost sm" onclick="FabricApp.wqRefresh()">↻</button></div>';
    h += '<div style="overflow-x:auto"><table class="pln"><thead><tr><th style="text-align:left">Area</th><th style="text-align:left">Line</th><th>Qty</th><th style="text-align:left">WeQuote product</th></tr></thead><tbody>';
    plan.floors.forEach(function (fl) { fl.rooms.forEach(function (r) { r.lines.forEach(function (ln, i) { h += '<tr><td style="text-align:left">' + (i ? '' : '<b>' + esc(fl.code + ' · ' + r.name) + '</b>') + '</td><td style="text-align:left">' + esc(ln.basis || ln.name) + '</td><td>' + ln.qty + ' ' + (ln.unit === 'm2' ? 'm²' : ln.unit) + '</td><td style="text-align:left;color:var(--muted)">' + (ln.kind === 'estimate' ? '≈ ' : '') + esc(ln.name) + ' <span style="font-size:9px">#' + ln.product_id + '</span></td></tr>'; }); }); });
    (plan.unmapped || []).forEach(function (u) { h += '<tr><td></td><td style="text-align:left" class="warn">' + esc(u.label) + '</td><td class="warn">' + u.qty + '</td><td style="text-align:left" class="warn">no WeQuote product — link it in Library › WeQuote (or add a WQ-PRODUCTS-NEEDED row)</td></tr>'; });
    h += '</tbody></table></div><div class="hint" style="margin-top:8px">' + t.wqLines + ' lines · ' + t.mapped + ' mapped · ' + t.fallback + ' on the generic fabric line · ' + t.unmapped + ' unmapped. Delta push — re-pushing never duplicates; the API cannot delete, so corrections happen in WeQuote. Prices resolve in WeQuote.</div>';
    h += '<div class="actions" style="margin-top:12px"><button class="btn ghost" style="padding:10px 18px" onclick="FabricApp.wqPush(true)"' + (ctx.wqQuote ? '' : ' disabled') + '>Dry run</button><button class="btn primary" style="padding:10px 18px" onclick="FabricApp.wqPush(false)"' + (ctx.wqQuote ? '' : ' disabled') + '>🧾 Push to WeQuote</button><span class="hint" id="wqStatus" style="margin:0;align-self:center">' + esc(ctx.wqStatus || '') + '</span></div>';
    h += '<div class="wq-bar"><i id="wqBar"></i></div><pre id="wqLog" class="wq-log"></pre>';
    return h;
  }
  function refreshWqPanel() { var p = $('wqPanel'); if (p) p.innerHTML = wqPanelHtml(); }
  async function wqRefresh() {
    var db = dbc(), W = global.SonorFabricWq; if (!db || !W || CLIENT) return;
    try { await W.load(db); } catch (e) {}
    ctx.wqLinks = await W.links(db, ctx.projectRef || '');
    var mine = (ctx.wqLinks || []).find(function (l) { return l.slot === W.slot(); });
    if (mine && mine.quote_id) ctx.wqQuote = { id: mine.quote_id, no: mine.quote_no, description: mine.wq_description, stage: mine.wq_stage, locked: !!mine.locked_at };
    refreshWqPanel();
  }
  async function wqPair() {
    var db = dbc(), W = global.SonorFabricWq; if (!db || !W) return;
    var sel = ($('wqPick') || {}).value, typed = ($('wqId') || {}).value;
    var id = Number(typed) || Number(sel); if (!id) { toast('Pick a quote or enter its WeQuote id'); return; }
    var l = (ctx.wqLinks || []).find(function (x) { return Number(x.quote_id) === id; }) || {};
    var q = { id: id, no: l.quote_no || null, description: l.wq_description || null, stage: l.wq_stage || null };
    await W.pair(db, ctx.projectRef || cfg.client.project, q);
    ctx.wqQuote = q; toast('Paired quote #' + (q.no || q.id)); wqRefresh();
  }
  async function wqPush(dry) {
    var db = dbc(), W = global.SonorFabricWq; if (!db || !W || !ctx.wqQuote) return;
    var plan = W.buildPlan(wqModel(), ctx.wqQuote);
    var logEl = $('wqLog'), bar = $('wqBar'); if (logEl) { logEl.textContent = ''; logEl.classList.add('on'); }
    ctx.wqStatus = dry ? 'Dry run…' : 'Pushing…'; var st = $('wqStatus'); if (st) st.textContent = ctx.wqStatus;
    var out = await W.push(db, plan, { ref: ctx.projectRef || cfg.client.project, dry: !!dry, onLog: function (lines) { if (logEl) { lines.forEach(function (l) { logEl.textContent += l + '\n'; }); logEl.scrollTop = logEl.scrollHeight; } }, onProgress: function (pct) { if (bar) bar.style.width = pct + '%'; }, onStatus: function (m) { ctx.wqStatus = m; var s2 = $('wqStatus'); if (s2) s2.textContent = m; } });
    if (out && out.done && !dry) { toast('Pushed to WeQuote'); wqRefresh(); }
  }

  // ── project bar + live context ───────────────────────────────────────────
  function initProjectBar(attempt) {
    attempt = attempt || 0;
    var bar = global.SonorProjectBar, db = dbc();
    if ((!bar || !db) && attempt < 5) { setTimeout(function () { initProjectBar(attempt + 1); }, 1200); return; }
    if (!bar || !db) return;
    try { bar.init({ supa: db, appKey: 'stretched-fabric', host: $('projectBarHost'), onChange: onProject }); var pid = bar.getActiveId && bar.getActiveId(); if (pid) onProject({ currentId: pid, project: bar.getProject && bar.getProject(pid) }); } catch (e) {}
  }
  async function onProject(detail) {
    cfg.projectId = detail && detail.currentId || null;
    ctx.rooms = null; ctx.cinema = null; ctx.cinemaMaterials = null; ctx.heightMm = null; ctx.brief = null; ctx.spec = null; ctx.wqQuote = null; ctx.wqLinks = null;
    var p = detail && detail.project;
    ctx.projectRef = (p && p.ref) || null;
    if (p) { cfg.client.name = p.client_name || cfg.client.name; cfg.client.project = (p.address || p.name || '').split('\n')[0].split(',')[0] || cfg.client.project; }
    await pullContext();
    loadSavedList(); loadOverview(); renderStep();
  }
  async function pullContext() {
    var db = dbc(); if (!db || !cfg.projectId) return;
    try {   // rooms + wall lengths from the Takeoffs polygons (PROJECT-ROOM TAG v1 identity)
      var tf = await db.from('takeoffs_floors').select('floor_id,code,seq,content').eq('project_id', cfg.projectId).is('deleted_at', null).order('seq');
      var rooms = [];
      (tf.data || []).forEach(function (f) {
        (((f.content || {}).areas) || []).forEach(function (a) {
          if (!a || !a.name) return;
          rooms.push({ key: f.floor_id + '|' + a.name, floor_id: f.floor_id, floor_code: f.code, name: a.name, code: a.code || null, sqm: a.sqm || null, perimeter_m: a.perimeter_m || null, walls: C.wallsFromPolygon(a.points, a.sqm, a.areaPx) });
        });
      });
      var codes = rooms.map(function (r) { return r.floor_code; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var order = global.sonorSortFloors ? global.sonorSortFloors(codes) : codes;   // canonical GF → 1F → … → BA → EXT
      rooms.sort(function (a, b) { return order.indexOf(a.floor_code) - order.indexOf(b.floor_code) || a.name.localeCompare(b.name); });
      ctx.rooms = rooms.length ? rooms : null;
    } catch (e) {}
    try {   // cinema room box (CT owns the geometry; this app only sets out fabric from it)
      var r = await db.from('cinema_designs').select('room_width,room_depth,room_height').eq('project_id', cfg.projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (r.data && (r.data.room_width || r.data.room_depth)) ctx.cinema = { w: r.data.room_width, d: r.data.room_depth, h: r.data.room_height || null };
    } catch (e) {}
    try {
      var b = await db.from('projects').select('ref,client_name,metadata').eq('id', cfg.projectId).maybeSingle();
      var md = (b.data && b.data.metadata) || {};
      if (b.data && b.data.ref) ctx.projectRef = b.data.ref;
      if (b.data && b.data.client_name && !cfg.client.name) cfg.client.name = b.data.client_name;
      ctx.brief = md.brief || null; ctx.spec = md.stretched_fabric_spec || null;
      var ch = md.ceiling_height_mm || (md.occupancy && md.occupancy.ceiling_height_mm) || (md.brief && md.brief.ceiling_height_mm) || null;
      if (ch) ctx.heightMm = Number(ch) || null;
      ctx.cinemaMaterials = (md.cinema_design_summary && md.cinema_design_summary.materials) || null;
    } catch (e) {}
  }

  // ── landing overview (saved designs for the project) ─────────────────────
  function fmtDate(s) { try { return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  async function loadOverview() {
    var sec = $('ovw'); if (!sec) return;
    var db = dbc();
    if (CLIENT || !db || !cfg.projectId) { sec.style.display = 'none'; return; }
    var rows = [];
    try { var rb = await db.from('fabric_configs').select('id,label,app_version,updated_at,config').eq('project_id', cfg.projectId).eq('archived', false).order('updated_at', { ascending: false }).limit(20); rows = rb.data || []; } catch (e) {}
    sec.style.display = 'block';
    var tt = $('ovwTitle'); if (tt) tt.innerHTML = esc(cfg.client.project || 'This project') + ' — <span class="lt">saved designs</span>.';
    var sm = $('ovwSummary'); if (sm) sm.textContent = (ctx.rooms ? ctx.rooms.length + ' rooms on the take-off plan' : 'No take-off rooms yet') + (ctx.cinema ? ' · cinema room ' + ctx.cinema.w + ' × ' + ctx.cinema.d + ' mm' : '') + (ctx.spec && ctx.spec.updated_at ? ' · published spec ' + fmtDate(ctx.spec.updated_at) + ' · ' + fmt(ctx.spec.totals && ctx.spec.totals.net_m2, 1) + ' m²' : ' · no spec published yet');
    var bo = $('ovwBoards');
    if (bo) bo.innerHTML = rows.length ? rows.map(function (r) {
      var cur = ctx.spec && ctx.spec.config_id === r.id;
      return '<div class="ovw-row' + (cur ? ' cur' : '') + '"><div class="ovw-b"><div class="ovw-n">' + esc(r.label || 'Design') + (cur ? ' <span class="ovw-badge">✓ Published</span>' : '') + '</div><div class="ovw-d">' + ((r.config && r.config.rooms) || []).length + ' rooms · ' + fmtDate(r.updated_at) + ' · v' + esc(r.app_version || '') + '</div></div><button class="ovw-btn" onclick="FabricApp.openFromOverview(\'' + r.id + '\')">Open</button></div>';
    }).join('') : '<div class="ovw-hint">No designs yet for this project — start one below.</div>';
  }
  function openFromOverview(id) { enter(); openSaved(id); }

  // ── saved designs (fabric_configs — this app's ONLY table writes) ────────
  async function saveConfig() {
    var db = dbc(); if (!db || CLIENT) return;
    var label = cfg.client.project || 'Stretched fabric';
    var body = { project_name: cfg.client.project || null, project_id: cfg.projectId, label: label, config: cfg, app_version: CFG.version, updated_at: new Date().toISOString() };
    try {
      var res;
      if (cfg._savedId) res = await db.from('fabric_configs').update(body).eq('id', cfg._savedId).select('id').single();
      else res = await db.from('fabric_configs').insert(body).select('id').single();
      if (res.error) { console.warn('[fabric] save', res.error.message); toast('Save failed: ' + res.error.message); return; }
      if (res.data) { cfg._savedId = res.data.id; cfg._savedLabel = label; }
      toast('Design saved');
      loadSavedList(); publishSpec(); loadOverview();
    } catch (e) { console.warn('[fabric] save failed', e); }
  }
  // ONE SOURCE: projects.metadata.stretched_fabric_spec — written only here, via the merge RPC
  async function publishSpec() {
    var db = dbc(); if (!db || CLIENT || !cfg.projectId) return;
    try {
      var pid = cfg.projectId, p = calcAll();
      var spec = {
        source: 'stretched-fabric', app_version: CFG.version, config_id: cfg._savedId || null, updated_at: new Date().toISOString(),
        rooms: cfg.rooms.map(function (rm, i) {
          var f = roomFabric(rm), tr = roomTrack(rm), inf = roomInfill(rm), t = p.rooms[i].totals;
          return { name: rm.name, floor_code: rm.floor_code || null, floor_id: rm.floor_id || null, source: rm.source,
            fabric: f ? { id: f.id, name: f.name, manufacturer: f.manufacturer, at: !!f.at, width_m: f.width_m } : null, colour: roomColour(rm),
            track: tr ? { id: tr.id, name: tr.name, depth_mm: tr.depth_mm, acoustic: !!tr.acoustic } : null, infill: inf ? { id: inf.id, name: inf.name, thickness_mm: inf.thickness_mm } : null,
            surfaces: t.surfaces, walls: t.walls, ceilings: t.ceilings, net_m2: t.net_m2, panels: t.panels, track_m: t.track_m, infill_m2: t.infill_m2, cutouts: t.cutouts };
        }),
        totals: { rooms: cfg.rooms.length, net_m2: p.totals.net_m2, track_m: p.totals.track_m, panels: p.totals.panels, fabric_lm: p.totals.fabric_lm, fabric_m2_ordered: p.totals.fabric_m2_ordered, infill_m2: p.totals.infill_m2, cutouts: p.totals.cutouts }
      };
      var res = await db.rpc('sonor_merge_project_metadata', { p_project_id: pid, p_patch: { stretched_fabric_spec: spec } });
      if (res.error) console.warn('[fabric] spec publish failed', res.error);
    } catch (e) { console.warn('[fabric] spec publish error', e); }
  }
  async function loadSavedList() {
    var el = $('savedList'), db = dbc(); if (!el || !db) return;
    try {
      var q = db.from('fabric_configs').select('id,label,app_version,updated_at').eq('archived', false).order('updated_at', { ascending: false }).limit(20);
      if (cfg.projectId) q = q.eq('project_id', cfg.projectId);
      var res = await q, rows = res.data || [];
      el.innerHTML = rows.length ? rows.map(function (r) { return '<div class="saved-row' + (r.id === cfg._savedId ? ' cur' : '') + '"><div class="saved-b"><div class="saved-n">' + esc(r.label || 'Design') + '</div><div class="saved-d">' + new Date(r.updated_at).toLocaleDateString('en-GB') + ' · v' + esc(r.app_version || '') + '</div></div><button class="ghost sm" onclick="FabricApp.openSaved(\'' + r.id + '\')">Open</button></div>'; }).join('') : '<div class="hint">No saved designs yet for this project.</div>';
    } catch (e) { el.innerHTML = '<div class="hint">Saved designs unavailable.</div>'; }
  }
  async function openSaved(id) {
    var db = dbc(); if (!db) return;
    try {
      var res = await db.from('fabric_configs').select('id,label,config').eq('id', id).single();
      if (res.data && res.data.config) {
        var c = res.data.config;
        ['rooms', 'defaults', 'client'].forEach(function (k) { if (c[k] != null) cfg[k] = c[k]; });
        cfg._savedId = res.data.id; cfg._savedLabel = res.data.label || null;
        seedDefaults();
        cfg.step = STEPS.length; renderStep();
      }
    } catch (e) {}
  }
  function bootDeepLink() {
    try { var q = new URLSearchParams(location.search); if (q.get('config')) { enter(); openSaved(q.get('config')); } else if (q.get('project')) { cfg.client.project = q.get('project'); } } catch (e) {}
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  function makeRef() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = '';
    for (var i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return 'SNR-SF-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + r;
  }
  function pdfSafe(s) { var out = String(s); (CFG.pdfSafe || []).forEach(function (r) { out = out.replace(r[0], r[1]); }); return out.replace(/ff/g, 'f f').replace(/FF/g, 'F F').replace(/Ff/g, 'F f'); }
  var SAFE_SKIP = /url|img|image|filename|hex|swatch|id$/i;
  function deepSafe(o) { if (o == null) return o; if (typeof o === 'string') return pdfSafe(o); if (Array.isArray(o)) return o.map(deepSafe); if (typeof o === 'object') { Object.keys(o).forEach(function (k) { if (SAFE_SKIP.test(k)) return; o[k] = deepSafe(o[k]); }); } return o; }
  function pdfModel(internal) {
    var p = calcAll();
    var m = {
      internal: !!internal,
      title: cfg.client.project || 'Your Home', client: cfg.client.name, project: cfg.client.project, quoteRef: cfg._lastRef,
      introText: (CFG.sectionBlurbs || {}).intro, blurbs: CFG.sectionBlurbs || {},
      rooms: cfg.rooms.map(function (rm, i) {
        var f = roomFabric(rm), tr = roomTrack(rm), inf = roomInfill(rm), rc = p.rooms[i], cw = f ? E.colourways(f) : [], col = roomColour(rm), cc = cw.find(function (c) { return c.name === col; });
        return { name: rm.name, floor_code: rm.floor_code || '', source: rm.source, h_mm: rm.h_mm, h_provisional: !!rm.h_provisional,
          fabric: f ? { name: f.name, manufacturer: f.manufacturer, at: !!f.at, width_m: f.width_m, kind: KIND_LABEL[f.kind] || '', note: f.note, hex: f.hex, swatchImg: f.swatch_img, colours_available: f.colours_available } : null,
          colour: col ? { name: col, hex: (cc && cc.hex) || guessHex(col), img: (cc && cc.img) || null } : null,
          track: tr ? { name: tr.name, depth_mm: tr.depth_mm, acoustic: !!tr.acoustic, note: tr.note } : null, infill: inf ? { name: inf.name, thickness_mm: inf.thickness_mm } : null,
          orientation: ((CFG.orientations || []).find(function (o) { return o.id === roomOpts(rm).orientation; }) || {}).label || '',
          surfaces: rm.surfaces.filter(function (s) { return s.on; }).map(function (s) { var sc = rc.surfaces.find(function (x) { return x.id === s.id; }); return { surface: s, calc: sc }; }),
          totals: rc.totals };
      }),
      totals: p.totals, flags: p.totals.flags,
      cinemaMaterials: ctx.cinemaMaterials || null,
      wq: internal ? (global.SonorFabricWq ? global.SonorFabricWq.buildPlan(wqModel(), ctx.wqQuote || null) : null) : null,
      termsLines: CFG.termsLines || [],
      dateText: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    deepSafe(m);
    m.filename = (internal ? 'sonor-stretched-fabric-cutlist-' : 'sonor-stretched-fabric-proposal-') + (m.quoteRef || 'draft') + '.pdf';
    return m;
  }
  async function savePdf(internal) {
    if (!cfg.rooms.length) { toast('Add at least one room first'); return; }
    cfg._lastRef = makeRef();
    var m = pdfModel(internal === true);
    if (global.FabricPdf && global.FabricPdf.available()) { try { await global.FabricPdf.generate(m); return; } catch (e) { console.warn('[fabric] pdf failed', e); toast('PDF failed — see console'); return; } }
    window.print();
  }

  global.FabricApp = {
    boot: boot, enter: enter, backToIntro: backToIntro, goBack: goBack, jumpTo: jumpTo, jumpRefresh: jumpRefresh,
    addTakeoffRoom: addTakeoffRoom, addCinemaRoom: addCinemaRoom, addManualRoom: addManualRoom, removeRoom: removeRoom, toggleSurface: toggleSurface, setRoomHeight: setRoomHeight,
    setDefault: setDefault, setDefaultColour: setDefaultColour, setRoom: setRoom, setSurface: setSurface,
    addOpening: addOpening, setOpening: setOpening, removeOpening: removeOpening, addCutout: addCutout, setCutout: setCutout, removeCutout: removeCutout,
    setClient: setClient, saveConfig: saveConfig, openSaved: openSaved, openFromOverview: openFromOverview, savePdf: savePdf,
    wqRefresh: wqRefresh, wqPair: wqPair, wqPush: wqPush,
    _debug: function () { return { cfg: cfg, ctx: ctx, calc: calcAll() }; }
  };
})(window);
