/* Sonor Stretched Fabric — STRETCHED FABRIC PROPOSAL + internal CUT LIST (v0.1.0)
   FabricPdf.generate(model) — built ENTIRELY on the shared SonorPdfLuxury chrome (data/sonor-pdf-luxury.js
   root master). Cover = the Service Contracts cover (sonor-platform §43: contract-hero.jpg, brandLarge, airy,
   CEDIA strip) — every client-facing Sonor document shares it. Client proposal = luxury (cream) theme — this is
   a client-proposal app like Seating / Lighting (PDF convention 2026-10-12). model.internal = true → the CUT
   LIST & BOM on the neutral theme (white paper): per-panel cuts, track, infill boards, fixings, labour,
   WeQuote mapping. No prices on either — WeQuote carries commercials. No hosted links anywhere (§35).
   Sections (data-driven, empty sections dropped):
   Cover · Introduction · Rooms & surfaces (one page per room: spec + elevations) · Fabric & colour ·
   The system · Schedule · The detail  (+ internal: Cut list · BOM & WeQuote)
*/
(function (global) {
  'use strict';
  function L() { return global.SonorPdfLuxury; }
  var DOC_LABEL = 'STRETCHED FABRIC PROPOSAL';
  var DOC = DOC_LABEL;   // swapped to 'CUT LIST & BOM' for the internal document
  function selfDir() {
    try { var s = document.currentScript; if (s && s.src) return s.src.replace(/[^/]*$/, ''); } catch (e) {}
    try { var arr = document.getElementsByTagName('script'); for (var i = arr.length - 1; i >= 0; i--) { if (/fabric-pdf\.js/.test(arr[i].src)) return arr[i].src.replace(/[^/]*$/, ''); } } catch (e) {}
    return '../data/';
  }
  var BASE = selfDir();
  function fmt(v, dp) { return Number(v || 0).toLocaleString('en-GB', { maximumFractionDigits: dp == null ? 2 : dp, minimumFractionDigits: dp == null ? 0 : dp }); }
  function fit(F, s, size, w) { s = String(s == null ? '' : s); while (s.length > 3 && F.widthOfTextAtSize(s, size) > w) s = s.slice(0, -2).replace(/\s+$/, '') ; return s; }

  // ── shared bits ──────────────────────────────────────────────────────────
  function rule(P, F, lx, label, y) { P.tracked(label, lx.M, y, 6.5, F.r, lx.COL.MUT, 1.5); P.hline(lx.M, lx.A4.w - lx.M, y + 11, lx.COL.GOLD, 0.8, 0.75); return y + 26; }
  function table(P, F, lx, cols, rows, y, opts) {
    // cols: [{label, w, align}] · rows: [[cell…]] — truncating cells, hairline rows, returns bottom y
    opts = opts || {}; var M = lx.M, COL = lx.COL, x = M;
    cols.forEach(function (c) { if (c.align === 'right') P.trackedRight(String(c.label).toUpperCase(), x + c.w, y, 6.2, F.r, COL.MUT, 1.2); else P.tracked(String(c.label).toUpperCase(), x, y, 6.2, F.r, COL.MUT, 1.2); x += c.w; });
    P.hline(M, lx.A4.w - M, y + 10, COL.GOLD, 0.8, 0.75);
    y += 24;
    rows.forEach(function (r, ri) {
      var x2 = M, bold = r.__bold;
      cols.forEach(function (c, ci) {
        var v = r[ci] == null ? '' : String(r[ci]);
        var fnt = (bold || ci === 0) ? F.b : F.r, sz = opts.size || 9;
        v = fit(fnt, v, sz, c.w - (ci && c.align !== 'right' ? 18 : 6));
        if (c.align === 'right') P.right(v, x2 + c.w, y - 7, sz, fnt, COL.INK); else P.text(v, x2 + (ci ? 12 : 0), y - 7, sz, fnt, ci === 0 ? COL.INK : COL.INK2);
        x2 += c.w;
      });
      if (r.__sub) { P.text(fit(F.r, r.__sub, 7.5, lx.A4.w - M * 2), M + 10, y + 5, 7.5, F.r, COL.MUT); y += 10; }
      if (ri < rows.length - 1) P.hline(M, lx.A4.w - M, y + 8, COL.LINE, 0.5, 0.6);
      y += 20;
    });
    return y;
  }

  // ── INTRODUCTION ────────────────────────────────────────────────────────
  function secIntro(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      lx.pageHead(P, F, 'INTRODUCTION', pageNo, TOTAL, DOC, { brand: 'large' });
      var y = lx.sectionHead(P, F, 'STRETCHED FABRIC', m.title || 'Your home', m.introText);
      y = Math.max(y, 178);
      var colW = 236, t = m.totals;
      var fabrics = []; m.rooms.forEach(function (r) { if (r.fabric) { var k = r.fabric.name + (r.colour ? ' · ' + r.colour.name : ''); if (fabrics.indexOf(k) < 0) fabrics.push(k); } });
      var tracks = []; m.rooms.forEach(function (r) { if (r.track && tracks.indexOf(r.track.name) < 0) tracks.push(r.track.name); });
      var rows1 = [['Rooms', m.rooms.map(function (r) { return r.name; }).join(', ')], ['Finished area', fmt(t.net_m2, 1) + ' sqm across ' + t.walls + ' walls' + (t.ceilings ? ' and ' + t.ceilings + ' ceiling' + (t.ceilings > 1 ? 's' : '') : '')], ['Panels', t.panels + ' fabric panels · ' + fmt(t.track_m, 1) + ' m of track']];
      var rows2 = [['Fabric', fabrics.join(' · ') || null], ['System', tracks.join(' · ') || null], ['Acoustic infill', t.infill_m2 ? fmt(t.infill_m2, 1) + ' sqm' : null], ['Device cut-outs', t.cutouts ? String(t.cutouts) : null]];
      var b1 = lx.specRows(P, F, rows1, lx.M, y, colW), b2 = lx.specRows(P, F, rows2, lx.M + colW + 28, y, colW);
      var dy = Math.max(b1, b2) + 26;
      dy = rule(P, F, lx, 'IN THIS PROPOSAL', dy);
      (m.sectionList || []).forEach(function (s) { P.dot(lx.M + 3, dy - 4, 2.2, lx.COL.GOLD); P.text(s, lx.M + 14, dy - 9, 10.5, F.r, lx.COL.INK); dy += 19; });
      lx.pageFoot(P, F);
    };
  }

  // ── ROOM PAGE(S) — spec rows + elevations, chunked so nothing clips (§ PDF law 2026-10-13) ──
  function roomPages(m) {
    var lx = L(), pages = [];
    m.rooms.forEach(function (r) {
      var surfaces = r.surfaces.filter(function (s) { return s.calc; });
      var per = 3;   // elevations per page
      var chunks = []; for (var i = 0; i < Math.max(1, surfaces.length); i += per) chunks.push(surfaces.slice(i, i + per));
      chunks.forEach(function (chunk, ci) {
        pages.push({ label: r.name, draw: function (P, F, pageNo, TOTAL) {
          var M = lx.M, A4 = lx.A4, COL = lx.COL;
          lx.pageHead(P, F, String(r.name).toUpperCase() + (chunks.length > 1 ? ' · ' + (ci + 1) + '/' + chunks.length : ''), pageNo, TOTAL, DOC, { brand: 'large' });
          var y;
          if (ci === 0) {
            y = lx.sectionHead(P, F, (r.floor_code ? r.floor_code + ' · ' : '') + 'ROOM', r.name, m.blurbs.rooms);
            y = Math.max(y, 176);
            var rows = [['Fabric', r.fabric ? r.fabric.name + (r.fabric.at ? ' · acoustically transparent' : '') + (r.colour ? ' · ' + r.colour.name : '') : 'To be selected'], ['System', r.track ? r.track.name + (r.infill ? ' with ' + r.infill.name : '') : null], ['Set-out', r.orientation + ' · ' + r.totals.panels + ' panels · height ' + r.h_mm + ' mm' + (r.h_provisional ? ' (provisional)' : '')], ['Finished area', fmt(r.totals.net_m2, 1) + ' sqm · ' + fmt(r.totals.track_m, 1) + ' m track' + (r.totals.infill_m2 ? ' · ' + fmt(r.totals.infill_m2, 1) + ' sqm infill' : '') + (r.totals.cutouts ? ' · ' + r.totals.cutouts + ' cut-outs' : '')]];
            y = lx.specRows(P, F, rows, M, y, A4.w - M * 2 - 40) + 10;
          } else y = 96;
          y = rule(P, F, lx, 'ELEVATIONS · SEAMS = SPLIT TRACK · OPENINGS SET OUT FROM THE LEFT', y);
          var avail = A4.h - 70 - y, each = Math.min(190, (avail - (chunk.length - 1) * 14) / Math.max(1, chunk.length));
          chunk.forEach(function (s) {
            var sc = s.calc;
            P.text(s.surface.label + '  ·  ' + sc.n_panels + ' × ' + sc.panel_w_mm + ' mm' + (sc.n_openings ? '  ·  ' + sc.n_openings + ' opening' + (sc.n_openings > 1 ? 's' : '') : '') + (sc.n_cutouts ? '  ·  ' + sc.n_cutouts + ' cut-outs' : ''), M, y - 2, 8.5, F.b, COL.INK2);
            var box = global.SonorFabricDraw.pdf(P, F, lx, s.surface, sc, { x: M + 28, top: y + 12, w: A4.w - M * 2 - 56, h: each - 40 });
            y = box.bottom + 14;
          });
          if (!surfaces.length) P.text('No surfaces switched on for this room.', M, y, 9.5, F.r, COL.MUT);
          lx.pageFoot(P, F);
        } });
      });
    });
    return pages;
  }

  // ── FABRIC & COLOUR — swatch tiles per distinct fabric/colour (materials-page anatomy) ──
  function secFabric(m, imgs) {
    var picks = [];
    m.rooms.forEach(function (r) { if (!r.fabric) return; var k = r.fabric.name + '|' + (r.colour ? r.colour.name : ''); var ex = picks.find(function (p) { return p.key === k; }); if (ex) ex.rooms.push(r.name); else picks.push({ key: k, fabric: r.fabric, colour: r.colour, rooms: [r.name] }); });
    if (!picks.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'FABRIC & COLOUR', pageNo, TOTAL, DOC, { brand: 'large' });
      var y = lx.sectionHead(P, F, 'THE FINISH', 'Fabric & colour', m.blurbs.fabric);
      y = Math.max(y, 186);
      var cols = 3, gap = 14, tw = (A4.w - M * 2 - gap * (cols - 1)) / cols, th = 104;
      picks.slice(0, 6).forEach(function (p, i) {
        var cx = M + (i % cols) * (tw + gap), cy = y + Math.floor(i / cols) * (th + 64);
        var img = imgs[p.key];
        if (img) { var dw = tw, dh = img.height * (tw / img.width); if (dh > th) { dh = th; dw = img.width * (th / img.height); } P.image(img, cx + (tw - dw) / 2, cy + (th - dh) / 2, dw, dh, 1); }
        else if (p.colour && p.colour.hex && /^#/.test(p.colour.hex)) { P.rect(cx, cy, tw, th, lx.hexRgb(p.colour.hex), 1); P.center(String(p.colour.name).toUpperCase(), cx + tw / 2, cy + th / 2 - 4, 7, F.b, [246, 242, 234], 1.6); }
        else { P.rect(cx, cy, tw, th, [234, 229, 219], 1); P.center(String(p.fabric.manufacturer || 'SAMPLE').toUpperCase(), cx + tw / 2, cy + th / 2 - 8, 8, F.b, COL.MUT, 2); P.center('COLOURWAY ON SAMPLE APPROVAL', cx + tw / 2, cy + th / 2 + 6, 5.5, F.r, COL.MUT, 1.2); }
        P.rectB(cx, cy, tw, th, COL.LINE, 0.8);
        P.tracked(p.rooms.join(' · ').toUpperCase(), cx, cy + th + 8, 6.5, F.r, COL.MUT, 1.5);
        P.text(fit(F.b, p.fabric.name + (p.fabric.at ? ' · AT' : ''), 10.5, tw), cx, cy + th + 18, 10.5, F.b, COL.INK);
        P.text(fit(F.r, (p.colour ? p.colour.name + ' · ' : '') + (p.fabric.manufacturer || '') + (p.fabric.width_m ? ' · ' + p.fabric.width_m + ' m roll' : ''), 8, tw), cx, cy + th + 31, 8, F.r, COL.MUT);
        if (p.fabric.note) P.text(fit(F.r, p.fabric.note, 7.5, tw), cx, cy + th + 43, 7.5, F.r, COL.MUT);
      });
      var rowsN = Math.ceil(Math.min(picks.length, 6) / cols);
      var by = y + rowsN * (th + 64) + 6;
      P.text('Physical samples of every fabric and colourway are approved before any order is placed.', M, by, 8.5, F.r, COL.MUT);
      lx.pageFoot(P, F);
    };
  }

  // ── THE SYSTEM ──────────────────────────────────────────────────────────
  function secSystem(m) {
    var tracks = {}; m.rooms.forEach(function (r) { if (r.track) tracks[r.track.name] = r; });
    var keys = Object.keys(tracks); if (!keys.length) return null;
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'THE SYSTEM', pageNo, TOTAL, DOC, { brand: 'large' });
      var y = lx.sectionHead(P, F, 'TRACK & INFILL', 'The system', m.blurbs.system);
      y = Math.max(y, 186);
      keys.forEach(function (k) {
        var r = tracks[k];
        var rows = [['Track', r.track.name + (r.track.depth_mm ? ' · ' + r.track.depth_mm + ' mm' : '') + (r.track.note ? ' — ' + r.track.note : '')], ['Acoustic infill', r.infill ? r.infill.name + ' · ' + r.infill.thickness_mm + ' mm behind the fabric' : 'None — fabric-only track'], ['Seams', 'Split track at every panel joint; fabric tensioned into the perimeter track with the edge concealed'], ['Used in', m.rooms.filter(function (x) { return x.track && x.track.name === k; }).map(function (x) { return x.name; }).join(', ')]];
        y = lx.specRows(P, F, rows, M, y, A4.w - M * 2 - 40) + 18;
      });
      y = rule(P, F, lx, 'HOW IT GOES TOGETHER', y);
      ['Perimeter track is fixed to the substrate around every surface and around every opening.', 'Acoustic infill (where specified) is fitted inside the track depth, flush with the track face.', 'Fabric is cut with a tensioning allowance on every edge, stretched and tucked into the track — no visible fixings, no seams except at split tracks.', 'Device cut-outs are formed on site at the installed positions of speakers, lights, keypads and grilles.'].forEach(function (t) {
        P.dot(M + 3, y - 4, 2.2, COL.GOLD); lx.wrap(t, F.r, 10, A4.w - M * 2 - 18).forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 13.5, 10, F.r, COL.INK2); if (li) y += 13.5; }); y += 20;
      });
      lx.pageFoot(P, F);
    };
  }

  // ── SCHEDULE (client — quantities, no prices) ───────────────────────────
  function secSchedule(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'SCHEDULE', pageNo, TOTAL, DOC, { brand: 'large' });
      var y = lx.sectionHead(P, F, 'QUANTITIES', 'Schedule', m.blurbs.schedule);
      y = Math.max(y, 180);
      var W = A4.w - M * 2;
      var cols = [{ label: 'Room', w: W * 0.22 }, { label: 'Fabric', w: W * 0.28 }, { label: 'sqm', w: W * 0.10, align: 'right' }, { label: 'Panels', w: W * 0.10, align: 'right' }, { label: 'Track m', w: W * 0.10, align: 'right' }, { label: 'Infill sqm', w: W * 0.10, align: 'right' }, { label: 'Cut-outs', w: W * 0.10, align: 'right' }];
      var rows = m.rooms.map(function (r) { return [r.name, r.fabric ? r.fabric.name + (r.colour ? ' · ' + r.colour.name : '') : '—', fmt(r.totals.net_m2, 1), r.totals.panels, fmt(r.totals.track_m, 1), r.totals.infill_m2 ? fmt(r.totals.infill_m2, 1) : '—', r.totals.cutouts || '—']; });
      var tot = ['Total', '', fmt(m.totals.net_m2, 1), m.totals.panels, fmt(m.totals.track_m, 1), m.totals.infill_m2 ? fmt(m.totals.infill_m2, 1) : '—', m.totals.cutouts || '—']; tot.__bold = true;
      rows.push(tot);
      y = table(P, F, lx, cols, rows, y);
      if (m.cinemaMaterials && m.cinemaMaterials.fabric_total_track_m) { y += 8; P.text('Cinema room: the Cinema Takeoff model carries ' + fmt(m.cinemaMaterials.fabric_total_track_m, 1) + ' m of track and ' + fmt(m.cinemaMaterials.fabric_total_area_m2, 1) + ' sqm of fabric from the drawn walls — the drawn model governs for that room.', M, y, 8.5, F.r, COL.MUT, { maxWidth: W }); y += 24; }
      if (m.flags && m.flags.length) { y += 6; y = rule(P, F, lx, 'TO CONFIRM ON SURVEY', y); m.flags.slice(0, 8).forEach(function (f) { P.dot(M + 3, y - 4, 2.2, COL.GOLD); P.text(fit(F.r, f, 9.5, W - 18), M + 14, y - 9, 9.5, F.r, COL.INK2); y += 17; }); }
      lx.pageFoot(P, F);
    };
  }

  // ── INTERNAL — CUT LIST (per panel) + BOM & WeQuote mapping ──────────────
  function cutPages(m) {
    var lx = L(), pages = [], rows = [];
    m.rooms.forEach(function (r) { r.surfaces.forEach(function (s) { (s.calc.panels || []).forEach(function (p) { rows.push([r.name, s.surface.label, 'P' + p.i, p.w_mm + ' × ' + p.h_mm, p.cut_w_mm + ' × ' + Math.round(p.cut_lm * 1000), fmt(p.cut_lm, 2), s.calc.orientation]); }); }); });
    var per = 26;
    for (var i = 0; i < Math.max(1, rows.length); i += per) {
      (function (chunk, idx, n) {
        pages.push({ label: 'Cut list', draw: function (P, F, pageNo, TOTAL) {
          var M = lx.M, A4 = lx.A4, W = A4.w - M * 2;
          lx.pageHead(P, F, 'CUT LIST' + (n > 1 ? ' · ' + (idx + 1) + '/' + n : ''), pageNo, TOTAL, 'CUT LIST & BOM', { brand: 'large' });
          var y = idx === 0 ? lx.sectionHead(P, F, 'INTERNAL · NOT FOR THE CLIENT', 'Cut list', 'One line per panel: finished size, the cut size with the tensioning allowance on every edge, and the roll length each panel consumes. Waste is added on the order quantity, not per panel.') : 96;
          y = Math.max(y, idx === 0 ? 176 : 96);
          y = table(P, F, lx, [{ label: 'Room', w: W * 0.2 }, { label: 'Surface', w: W * 0.2 }, { label: 'Panel', w: W * 0.08 }, { label: 'Finished mm', w: W * 0.16, align: 'right' }, { label: 'Cut mm', w: W * 0.16, align: 'right' }, { label: 'Roll lm', w: W * 0.1, align: 'right' }, { label: 'Run', w: W * 0.1 }], chunk, y, { size: 8.5 });
          lx.pageFoot(P, F, { email: 'projects@sonor.co.uk' });
        } });
      })(rows.slice(i, i + per), i / per, Math.ceil(rows.length / per));
    }
    return pages;
  }
  function secBom(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL, W = A4.w - M * 2, t = m.totals;
      lx.pageHead(P, F, 'BOM & WEQUOTE', pageNo, TOTAL, 'CUT LIST & BOM', { brand: 'large' });
      var y = lx.sectionHead(P, F, 'INTERNAL · NOT FOR THE CLIENT', 'Bill of materials', 'Order quantities with waste, fixings and the internal labour estimate. The WeQuote plan below is exactly what the push writes — prices resolve in WeQuote.');
      y = Math.max(y, 176);
      var rows = [['Fabric to order', fmt(t.fabric_lm, 1) + ' lm', fmt(t.fabric_m2_ordered, 1) + ' sqm · ' + fmt(t.net_m2, 1) + ' sqm finished'], ['Perimeter + opening track', fmt(t.track_m - t.split_m, 1) + ' m', ''], ['Split track', fmt(t.split_m, 1) + ' m', t.panels + ' panels'], ['Acoustic infill', t.infill_m2 ? fmt(t.infill_m2, 1) + ' sqm' : '—', t.infill_boards ? t.infill_boards + ' boards' : ''], ['Track fixings', t.screws + ' screws', '150 mm pitch'], ['Device cut-outs', String(t.cutouts || 0), ''], ['Labour estimate', fmt(t.labour_h, 1) + ' h', 'walls / ceilings / panels / cut-outs / track — internal only']];
      y = table(P, F, lx, [{ label: 'Item', w: W * 0.34 }, { label: 'Qty', w: W * 0.22, align: 'right' }, { label: 'Note', w: W * 0.44 }], rows, y);
      if (m.wq) {
        y += 10; y = rule(P, F, lx, 'WEQUOTE PLAN' + (m.wq.quote ? ' · QUOTE #' + (m.wq.quote.no || m.wq.quote.id) : ' · NO QUOTE PAIRED'), y);
        var wrows = [];
        m.wq.floors.forEach(function (fl) { fl.rooms.forEach(function (r) { r.lines.forEach(function (ln) { wrows.push([fl.code + ' · ' + r.name, ln.name, fmt(ln.qty, 2) + ' ' + (ln.unit === 'm2' ? 'sqm' : ln.unit), '#' + ln.product_id + (ln.kind === 'estimate' ? ' (generic)' : '')]); }); }); });
        (m.wq.unmapped || []).forEach(function (u) { wrows.push(['—', u.label, fmt(u.qty, 2) + ' ' + (u.unit === 'm2' ? 'sqm' : u.unit), 'NO PRODUCT']); });
        if (wrows.length) y = table(P, F, lx, [{ label: 'Area', w: W * 0.24 }, { label: 'WeQuote product', w: W * 0.40 }, { label: 'Qty', w: W * 0.16, align: 'right' }, { label: 'Product id', w: W * 0.20, align: 'right' }], wrows.slice(0, 18), y, { size: 8.5 });
      }
      lx.pageFoot(P, F, { email: 'projects@sonor.co.uk' });
    };
  }

  // ── THE DETAIL ──────────────────────────────────────────────────────────
  function secDetail(m) {
    var lx = L();
    return function (P, F, pageNo, TOTAL) {
      var M = lx.M, A4 = lx.A4, COL = lx.COL;
      lx.pageHead(P, F, 'THE DETAIL', pageNo, TOTAL, DOC, { brand: 'large' });
      P.tracked('THE DETAIL', M, 92, 8.5, F.r, COL.GOLD, 2.6);
      var y = 118;
      (m.termsLines || []).forEach(function (t) { P.dot(M + 3, y - 3, 2.2, COL.GOLD); var lines = lx.wrap(t, F.r, 10.5, A4.w - M * 2 - 18); lines.forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 14.5, 10.5, F.r, COL.INK2); }); y += lines.length * 14.5 + 12; });
      if (m.quoteRef) { P.hline(M, A4.w - M, A4.h - 130, COL.LINE, 0.8); P.tracked('PROPOSAL REFERENCE', M, A4.h - 116, 6.5, F.r, COL.MUT, 1.5); P.text(m.quoteRef, M, A4.h - 106, 14, F.b, COL.INK); P.text('Please quote this reference in any correspondence about this proposal.', M, A4.h - 86, 8.5, F.r, COL.MUT); if (m.dateText) P.right(m.dateText, A4.w - M, A4.h - 112, 9.5, F.r, COL.MUT); }
      lx.pageFoot(P, F);
    };
  }

  async function generate(m) {
    var lx = L(); if (!lx) throw new Error('SonorPdfLuxury master not loaded');
    var PL = global.PDFLib, doc = await PL.PDFDocument.create();
    doc.setTitle((m.internal ? 'Stretched fabric cut list — ' : 'Stretched fabric proposal — ') + (m.title || '')); doc.setAuthor('Sonor Ltd');
    lx.theme(m.internal ? 'neutral' : 'luxury');
    DOC = m.internal ? 'CUT LIST & BOM' : DOC_LABEL;   // PDF convention 2026-10-12: cream for the client proposal, neutral for working documents
    var F = await lx.makeFonts(doc, BASE);
    var hero = null, cedia = null, fadeImg = null;
    try { hero = await lx.loadImage(doc, BASE + 'contract-hero.jpg'); } catch (e) {}
    try { cedia = await lx.loadImage(doc, BASE + 'cedia-member-stacked.png'); } catch (e) {}
    try { var fd = lx.fadePngDataUrl(); if (fd) fadeImg = await doc.embedPng(await lx.fetchBytes(fd)); } catch (e) {}
    // swatch images (colour card photos when the Library files them)
    var imgs = {};
    for (var i = 0; i < m.rooms.length; i++) { var r = m.rooms[i]; if (!r.fabric) continue; var k = r.fabric.name + '|' + (r.colour ? r.colour.name : ''); var u = (r.colour && r.colour.img) || r.fabric.swatchImg; if (u && !imgs[k]) { try { imgs[k] = await lx.loadImage(doc, u); } catch (e) {} } }

    var sections = [{ label: 'Introduction', draw: secIntro(m) }].concat(roomPages(m)).concat([
      { label: 'Fabric & colour', draw: secFabric(m, imgs) }, { label: 'The system', draw: secSystem(m) }, { label: 'Schedule', draw: secSchedule(m) }
    ]);
    if (m.internal) sections = sections.concat(cutPages(m)).concat([{ label: 'BOM & WeQuote', draw: secBom(m) }]);
    sections.push({ label: 'The detail', draw: secDetail(m) });
    sections = sections.filter(function (s) { return s.draw; });
    m.sectionList = sections.map(function (s) { return s.label; }).filter(function (v, i, a) { return a.indexOf(v) === i; });

    var TOTAL = sections.length + 1;
    var p1 = doc.addPage([lx.A4.w, lx.A4.h]);
    var cw3 = (lx.A4.w - lx.M * 2) / 3 - 18;
    lx.cover(lx.mk(p1, doc), F, {
      hero: hero, fadeImg: fadeImg, cediaImg: cedia, brandLarge: true, airy: true, footLogos: [],
      eyebrow: m.internal ? 'STRETCHED FABRIC · CUT LIST & BOM' : DOC_LABEL,
      title: m.title || 'Your home', subtitle: (m.internal ? 'Internal working document' : 'Stretched fabric walls & ceilings') + ' · ' + m.rooms.length + ' room' + (m.rooms.length === 1 ? '' : 's'),
      info: [['PREPARED FOR', fit(F.b, m.client || '—', 12.5, cw3)], ['PROJECT', fit(F.b, m.project || '—', 12.5, cw3)], ['REFERENCE', m.quoteRef || '—']]
    });
    sections.forEach(function (s, idx) { var pg = doc.addPage([lx.A4.w, lx.A4.h]); var P = lx.mk(pg, doc); P.rect(0, 0, lx.A4.w, lx.A4.h, lx.COL.CREAM); s.draw(P, F, idx + 2, TOTAL); });
    var bytes = await doc.save();
    lx.theme('luxury');
    if (m.returnBytes) return bytes;
    var blob = new Blob([bytes], { type: 'application/pdf' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = m.filename || 'sonor-stretched-fabric.pdf';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return true;
  }
  global.FabricPdf = { generate: generate, available: function () { return !!(global.PDFLib && global.PDFLib.PDFDocument && global.SonorPdfLuxury && global.SonorFabricDraw); } };
})(window);
