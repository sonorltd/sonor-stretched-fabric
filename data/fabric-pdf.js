/* Sonor Stretched Fabric — STRETCHED FABRIC PROPOSAL + internal CUT LIST (v0.4.0 — internal costing block)
   FabricPdf.generate(model) — built ENTIRELY on the shared SonorPdfLuxury chrome (data/sonor-pdf-luxury.js
   root master). Cover = the Service Contracts cover (sonor-platform §43: contract-hero.jpg, brandLarge, airy,
   CEDIA strip) — every client-facing Sonor document shares it. Client proposal = luxury (cream) theme — this is
   a client-proposal app like Seating / Lighting (PDF convention 2026-10-12). model.internal = true → the CUT
   LIST & BOM on the neutral theme (white paper): per-panel cuts, track, infill boards, fixings, labour,
   WeQuote mapping. No prices on either — WeQuote carries commercials. No hosted links anywhere (§35).
   Sections (data-driven, empty sections dropped):
   Cover · Introduction · Visualisations (lab renders from design_renders, v0.3.0) · Rooms & surfaces (one page
   per room: spec + elevations, then IN THE ROOM — the saved photo simulations, v0.3.0) · Fabric & colour ·
   The system · Schedule · The detail  (+ internal: Cut list · BOM & WeQuote)
   Cover photo = design_renders[].hero when this app's gallery has one (platform rule), else fabric-cover.jpg.
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

  // v0.4.1 — the two MAIN visualisations get a black matte frame (Bryn 2026-10-22: the rear render came back from the lab with a black border
  // baked in — "add it to the front as well but not on the subsequent pages"). A baked-in dark border is trimmed off first so both mains carry
  // the SAME matte drawn by the PDF, not one baked + one drawn.
  async function trimmedImage(doc, url) {
    try {
      var r = await fetch(url); var blob = await r.blob(); var u = URL.createObjectURL(blob);
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = u; });
      var cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; var g = cv.getContext('2d'); g.drawImage(img, 0, 0); URL.revokeObjectURL(u);
      var W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data;
      var dark = function (x, y) { var i = (y * W + x) * 4; return d[i] + d[i + 1] + d[i + 2] < 120; };
      var lineDark = function (fixed, vertical) { var n = 0, len = vertical ? H : W; for (var k = 0; k < len; k += 4) if (vertical ? dark(fixed, k) : dark(k, fixed)) n++; return n / (len / 4) > 0.92; };
      var l = 0, rt = 0, t = 0, b = 0, lim = Math.floor(Math.min(W, H) * 0.12);
      while (l < lim && lineDark(l, true)) l++; while (rt < lim && lineDark(W - 1 - rt, true)) rt++; while (t < lim && lineDark(t, false)) t++; while (b < lim && lineDark(H - 1 - b, false)) b++;
      if (l + rt + t + b < 8) return null;   // no border to trim
      var pad = 2, c2 = document.createElement('canvas'); c2.width = W - l - rt - pad * 2; c2.height = H - t - b - pad * 2; c2.getContext('2d').drawImage(cv, l + pad, t + pad, c2.width, c2.height, 0, 0, c2.width, c2.height);
      var b64 = c2.toDataURL('image/jpeg', 0.9).split(',')[1], bin = atob(b64), out = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
      return await doc.embedJpg(out);
    } catch (e) { console.warn('[fabric-pdf] trim failed', e && e.message); return null; }
  }

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
        pages.push({ key: 'rooms', label: r.name, draw: function (P, F, pageNo, TOTAL) {
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
            var box = global.SonorFabricDraw.pdf(P, F, lx, s.surface, sc, { x: M + 28, top: y + 12, w: A4.w - M * 2 - 56, h: each - 40 });   // (wide sheets: the same stack, wider — two-across is B-572)
            y = box.bottom + 14;
          });
          if (!surfaces.length) P.text('No surfaces switched on for this room.', M, y, 9.5, F.r, COL.MUT);
          lx.pageFoot(P, F);
        } });
      });
      // v0.3.0 — IN THE ROOM: the saved simulations, one per page (full-width picture in the house frame)
      (r.sims || []).forEach(function (sim, si) {
        pages.push({ key: 'sims', label: r.name, img: sim.src, draw: function (P, F, pageNo, TOTAL, imgs) {
          var M = lx.M, A4 = lx.A4, COL = lx.COL, img = imgs && imgs[sim.src];
          lx.pageHead(P, F, String(r.name).toUpperCase() + ' · IN THE ROOM', pageNo, TOTAL, DOC, { brand: 'large' });
          var y = lx.sectionHead(P, F, 'SIMULATION', r.name, m.blurbs.photos);
          y = Math.max(y, 170);
          var W = A4.w - M * 2, maxH = A4.h - 150 - y;
          if (img) { var dw = W, dh = img.height * (W / img.width); if (dh > maxH) { dh = maxH; dw = img.width * (maxH / img.height); } var ix = M + (W - dw) / 2; P.image(img, ix, y, dw, dh, 1); P.rectB(ix, y, dw, dh, COL.GOLD, 0.8); y += dh + 14; }
          else { P.rect(M, y, W, 200, [234, 229, 219], 1); P.center('SIMULATION UNAVAILABLE', M + W / 2, y + 100, 7, F.b, COL.MUT, 2); y += 214; }
          var cap = (sim.walls && sim.walls.length ? sim.walls.join(' · ') + (r.fabric ? ' in ' + r.fabric.name + (r.colour ? ' · ' + r.colour.name : '') : '') : '') + (sim.leds && sim.leds.length ? '  ·  LED: ' + sim.leds.join(', ') : '');
          if (cap) P.text(fit(F.r, cap, 8.5, W), M, y, 8.5, F.r, COL.MUT);
          P.text('A simulation on the client\'s own photograph — colour, seams and light are indicative; physical samples govern the finish.', M, y + 14, 7.5, F.r, COL.MUT);
          lx.pageFoot(P, F);
        } });
      });
    });
    return pages;
  }

  // ── VISUALISATIONS (v0.3.0) — lab renders from the ONE project gallery; hero first, two per page ──
  function renderPages(m) {
    var lx = L(), list = (m.renders || []).filter(function (r) { return r.url; }), pages = [];
    if (!list.length) return pages;
    // v0.4.1 (Bryn 2026-10-22): the two MAIN views (hero + the first picture of the opposite view) go full page; everything after is alt views
    // only, and the lights-off / daytime versions come last. Views are read from the captions (front / rear · off / daytime).
    var isOff = function (r) { return /lights? off|lighting .*off|daytime|day,|all off/i.test(r.caption || ''); };
    var viewOf = function (r) { return /rear|back/i.test(r.caption || '') ? 'rear' : (/front|feature/i.test(r.caption || '') ? 'front' : 'other'); };
    var hero = list.find(function (r) { return r.hero; }) || list[0], mate = list.find(function (r) { return r !== hero && !isOff(r) && viewOf(r) !== viewOf(hero) && viewOf(r) !== 'other'; });
    var mains = [hero].concat(mate ? [mate] : []), rest = list.filter(function (r) { return mains.indexOf(r) < 0; });
    list = mains.concat(rest.filter(function (r) { return !isOff(r); })).concat(rest.filter(isOff));
    // v0.4.0 (Bryn 2026-10-22: "give the 2 main images front and back full page, then the rest 2 per page") — the first two
    // renders (hero first — the gallery order) each take a full page; everything after runs two per page.
    // v0.4.1 (22:03) — "maybe just give every image a full page, lose the black stroke and use our usual thin gold one"
    var chunks = list.map(function (r) { return [r]; });
    chunks.forEach(function (chunk, idx) { var n = chunks.length;
      (function (chunk, idx, n) {
        pages.push({ key: 'renders', label: 'Visualisations', main: chunk.length === 1, imgs: chunk.map(function (r) { return r.url; }), draw: function (P, F, pageNo, TOTAL, imgs) {
          var M = lx.M, A4 = lx.A4, COL = lx.COL, W = A4.w - M * 2;
          lx.pageHead(P, F, 'VISUALISATIONS' + (n > 1 ? ' · ' + (idx + 1) + '/' + n : ''), pageNo, TOTAL, DOC, { brand: 'large' });
          var y = idx === 0 ? lx.sectionHead(P, F, 'THE FINISHED ROOM', 'Visualisations', m.blurbs.renders) : 96;
          y = Math.max(y, idx === 0 ? 176 : 96);
          var avail = A4.h - 80 - y, each = chunk.length === 1 ? avail : (avail - (chunk.length - 1) * 26) / chunk.length;
          if (A4.w > A4.h && chunk.length === 2) {   // v0.4.1 — wide sheet: the pair sits side by side
            var cw2 = (W - 24) / 2, y0 = y;
            chunk.forEach(function (r, ci) { var img = imgs && imgs[r.url], x0 = M + ci * (cw2 + 24); if (img) { var dw = cw2, dh = img.height * (cw2 / img.width), maxH = avail - 30; if (dh > maxH) { dh = maxH; dw = img.width * (maxH / img.height); } var ix = x0 + (cw2 - dw) / 2; P.image(img, ix, y0, dw, dh, 1); P.rectB(ix, y0, dw, dh, COL.GOLD, 0.8); if (r.caption) P.text(fit(F.r, r.caption, 8.5, cw2), x0, y0 + dh + 12, 8.5, F.r, COL.MUT); } });
            lx.pageFoot(P, F); return;
          }
          chunk.forEach(function (r) {
            var img = imgs && imgs[r.url];
            if (img) { var matte = 0; /* black matte retired 22:03 — the thin gold frame only */ var dw = W - matte * 2, dh = img.height * (dw / img.width), maxH = each - 22 - matte * 2; if (dh > maxH) { dh = maxH; dw = img.width * (maxH / img.height); } var ix = M + (W - dw) / 2; if (matte) { P.rect(ix - matte, y, dw + matte * 2, dh + matte * 2, [16, 16, 16], 1); P.image(img, ix, y + matte, dw, dh, 1); P.rectB(ix - matte, y, dw + matte * 2, dh + matte * 2, COL.GOLD, 0.8); dh += matte * 2; } else { P.image(img, ix, y, dw, dh, 1); P.rectB(ix, y, dw, dh, COL.GOLD, 0.8); } y += dh + 12; }
            else { P.rect(M, y, W, each - 22, [234, 229, 219], 1); y += each - 10; }
            if (r.caption) P.text(fit(F.r, r.caption, 8.5, W), M, y, 8.5, F.r, COL.MUT);
            y += 14;
          });
          lx.pageFoot(P, F);
        } });
      })(chunk, idx, n);
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
        P.dot(M + 3, y - 4, 2.2, COL.GOLD); lx.wrap(t, F.r, 10, (lx.TW ? lx.TW() : A4.w - M * 2) - 18).forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 13.5, 10, F.r, COL.INK2); if (li) y += 13.5; }); y += 20;
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
        pages.push({ key: 'cutlist', theme: 'neutral', label: 'Cut list', draw: function (P, F, pageNo, TOTAL) {
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
      // v0.4.0 — internal costing (Library trade prices × quantities + labour + extras) — the figures behind a single-line push
      if (m.costing && m.costing.totals && m.costing.totals.sell) {
        var K = global.SonorFabricCost, money = K ? K.money : function (v) { return '£' + fmt(v, 2); }, T = m.costing.totals;
        y += 10; y = rule(P, F, lx, 'INTERNAL COSTING · £' + fmt(T.sell, 0) + ' SELL · £' + fmt(T.cost, 0) + ' COST · MARGIN ' + (T.margin_pct == null ? '—' : fmt(T.margin_pct, 1) + '%'), y);
        var crows = [];
        m.costing.rooms.forEach(function (r) { r.lines.forEach(function (ln) { crows.push([ln.label + (ln.tbc ? ' (rate TBC)' : ''), fmt(ln.qty, 2) + ' ' + (ln.unit === 'm2' ? 'sqm' : ln.unit), ln.rate != null ? money(ln.rate) : '—', money(ln.cost), money(ln.sell)]); }); var tr = [r.name + ' — total' + (r.sell_per_m2 ? ' · ' + money(r.sell_per_m2) + '/sqm all-in' : ''), fmt(r.net_m2, 2) + ' sqm net', '', money(r.cost), money(r.sell)]; tr.__bold = true; crows.push(tr); });
        y = table(P, F, lx, [{ label: 'Line', w: W * 0.40 }, { label: 'Qty', w: W * 0.16, align: 'right' }, { label: 'Rate', w: W * 0.14, align: 'right' }, { label: 'Cost', w: W * 0.15, align: 'right' }, { label: 'Sell', w: W * 0.15, align: 'right' }], crows.slice(0, 14), y, { size: 8.5 });
        P.text('Labour ' + fmt(T.labour_h, 1) + ' h at ' + money(m.costing.rates.labourCostRate) + ' / ' + money(m.costing.rates.labourSellRate) + ' per hour · materials margin ' + fmt(m.costing.rates.marginPct, 0) + '% · ' + (T.tbc.length ? T.tbc.length + ' line(s) without a Library price' : 'all rates from the Library'), M, y + 2, 7.5, F.r, COL.MUT);
        y += 16;
      }
      if (m.wq) {
        y += 10; y = rule(P, F, lx, 'WEQUOTE PLAN' + (m.wq.quote ? ' · QUOTE #' + (m.wq.quote.no || m.wq.quote.id) : ' · NO QUOTE PAIRED'), y);
        var wrows = [];
        m.wq.floors.forEach(function (fl) { fl.rooms.forEach(function (r) { r.lines.forEach(function (ln) { wrows.push([fl.code + ' · ' + r.name, ln.name + (ln.single ? ' — single line £' + fmt(ln.sell, 2) + (ln.unit === 'm2' ? '/sqm' : '') + ' sell' : ''), fmt(ln.qty, 2) + ' ' + (ln.unit === 'm2' ? 'sqm' : ln.unit), '#' + ln.product_id + (ln.kind === 'estimate' ? ' (generic)' : '')]); }); }); });
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
      (m.termsLines || []).forEach(function (t) { P.dot(M + 3, y - 3, 2.2, COL.GOLD); var lines = lx.wrap(t, F.r, 10.5, (lx.TW ? lx.TW() : A4.w - M * 2) - 18); lines.forEach(function (ln, li) { P.text(ln, M + 14, y - 9 + li * 14.5, 10.5, F.r, COL.INK2); }); y += lines.length * 14.5 + 12; });
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
    var heroR = (m.renders || []).find(function (r) { return r.hero && r.url; });   // v0.3.0: design_renders[].hero is the project cover (platform rule)
    if (heroR) { try { hero = await lx.loadImage(doc, heroR.url); } catch (e) { hero = null; } }
    if (!hero) { try { hero = await lx.loadImage(doc, BASE + 'fabric-cover.jpg'); } catch (e) { try { hero = await lx.loadImage(doc, BASE + 'contract-hero.jpg'); } catch (e2) {} } } // B-567: own cover (Branding - CORE/PDF-COVERS/fabric.jpg via sync-pdf-covers), SC hero as fallback
    try { cedia = await lx.loadImage(doc, BASE + 'cedia-member-stacked.png'); } catch (e) {}
    try { var fd = lx.fadePngDataUrl(); if (fd) fadeImg = await doc.embedPng(await lx.fetchBytes(fd)); } catch (e) {}
    // swatch images (colour card photos when the Library files them)
    var imgs = {};
    for (var i = 0; i < m.rooms.length; i++) { var r = m.rooms[i]; if (!r.fabric) continue; var k = r.fabric.name + '|' + (r.colour ? r.colour.name : ''); var u = (r.colour && r.colour.img) || r.fabric.swatchImg; if (u && !imgs[k]) { try { imgs[k] = await lx.loadImage(doc, u); } catch (e) {} } }

    // v0.3.0 — picture pages (simulations + lab renders) declare the images they need; loaded once here
    var pics = {};
    var sections = [{ key: 'intro', label: 'Introduction', draw: secIntro(m) }].concat(renderPages(m)).concat(roomPages(m)).concat([
      { key: 'fabric', label: 'Fabric & colour', draw: secFabric(m, imgs) }, { key: 'system', label: 'The system', draw: secSystem(m) }, { key: 'schedule', label: 'Schedule', draw: secSchedule(m) }
    ]);
    if (m.internal || (m.sections && (m.sections.indexOf('cutlist') >= 0 || m.sections.indexOf('bom') >= 0))) sections = sections.concat(cutPages(m)).concat([{ key: 'bom', theme: 'neutral', label: 'BOM & WeQuote', draw: secBom(m) }]);
    sections.push({ key: 'detail', label: 'The detail', draw: secDetail(m) });
    sections = sections.filter(function (s) { return s.draw; });
    // v0.4.0 — the combined export (FabricApp.exportRun) picks sections by key; `sections` = the ticked keys, `part` = 'a' (before the
    // drawing sheets) | 'b' (after them: cut list · BOM · the detail); pageStart / pageTotal keep the numbering continuous across the parts
    if (Array.isArray(m.sections)) sections = sections.filter(function (s) { return m.sections.indexOf(s.key) >= 0; });
    if (m.part === 'a') sections = sections.filter(function (s) { return ['cutlist', 'bom', 'detail'].indexOf(s.key) < 0; });
    if (m.part === 'b') sections = sections.filter(function (s) { return ['cutlist', 'bom', 'detail'].indexOf(s.key) >= 0; });
    m.sectionList = sections.map(function (s) { return s.label; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    for (var si = 0; si < sections.length; si++) { var need = (sections[si].imgs || []).concat(sections[si].img ? [sections[si].img] : []); for (var ni = 0; ni < need.length; ni++) { if (!pics[need[ni]]) { try { pics[need[ni]] = await lx.loadImage(doc, need[ni]); } catch (e) { console.warn('[fabric-pdf] picture', e && e.message); } } } }

    for (var mi = 0; mi < sections.length; mi++) { if (sections[mi].key === 'renders' && sections[mi].imgs && m.trimBorders !== false) { /* any lab render with a baked-in dark border is trimmed (the rear R2 main had one) */ for (var mj = 0; mj < sections[mi].imgs.length; mj++) { var tu = sections[mi].imgs[mj]; var ti = await trimmedImage(doc, tu); if (ti) pics[tu] = ti; } } }
    var TOTAL = m.pageTotal || (sections.length + 1), START = m.pageStart || 1, withCover = m.part !== 'b' && !(Array.isArray(m.sections) && m.sections.indexOf('cover') < 0);
    m.pageCount = sections.length + (withCover ? 1 : 0);
    if (withCover) { var p1 = doc.addPage([lx.A4.w, lx.A4.h]);
    var cw3 = (lx.A4.w - lx.M * 2) / 3 - 18;
    lx.cover(lx.mk(p1, doc), F, {
      hero: hero, fadeImg: fadeImg, cediaImg: cedia, brandLarge: true, airy: true, footLogos: [],
      eyebrow: m.internal ? 'STRETCHED FABRIC · CUT LIST & BOM' : DOC_LABEL,
      title: m.title || 'Your home', subtitle: m.internal ? 'Internal working document' : 'Stretched fabric walls & ceilings',   // (room count dropped — Bryn 2026-10-22)
      info: [['PREPARED FOR', fit(F.b, m.client || '—', 12.5, cw3)], ['PROJECT', fit(F.b, m.project || '—', 12.5, cw3)], ['REFERENCE', m.quoteRef || '—']]
    }); }
    sections.forEach(function (s, idx) { lx.theme(s.theme || (m.internal ? 'neutral' : 'luxury')); DOC = s.theme === 'neutral' ? 'CUT LIST & BOM' : (m.internal ? 'CUT LIST & BOM' : DOC_LABEL); var pg = doc.addPage([lx.A4.w, lx.A4.h]); var P = lx.mk(pg, doc); P.rect(0, 0, lx.A4.w, lx.A4.h, lx.COL.CREAM); s.draw(P, F, START + idx + (withCover ? 1 : 0), TOTAL, pics); });
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
