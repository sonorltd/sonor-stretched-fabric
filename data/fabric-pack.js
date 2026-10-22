/* Sonor Stretched Fabric — DESIGN & DIMENSION PACK (v0.4.0, 2026-10-22)
   SonorFabricPack.generate(model) → A3 LANDSCAPE PDF bytes. The app's answer to GPT's "1410 Option 2 Design and
   Dimension Pack R1" (Bryn: "do better like this"): a coordinated design-development set, drawn from the SAME
   fabric_config the proposal and cut list come from — nothing is re-typed.
     01 Cover · 02 The selected scheme (renders) · GA-01 room plan & fabric extents · GA-0n elevations (one page per
     wall side, the side walls paired) · GA-05 reflected ceiling & lighting plan · LT-01 lighting schedule ·
     DT-01 material & edge details · QS-01 quantities (show the working) · DR-01 dimension register & survey
     priorities · closing page (remaining renders, source record).
   Every dimension carries a PROVENANCE TAG — S supplied · P proposal · A assumed / photo-informed · D derived —
   and the register lists where each value came from and what to check on site. Design development, NOT for
   construction: the footer says so on every sheet. Neutral theme (white paper) — this is a working document.
   STYLING = Sonor's own (Bryn 2026-10-22: "needs to be in our own styling not deviating too far from the other ones like
   seating etc"): the luxury chrome's furniture re-drawn for a sheet — gold mark + SONOR wordmark, tracked gold eyebrows,
   Gilroy titles, gold hairline rules, gold-framed images, the Service-Contracts cover (hero, fade, inset gold frame, info
   row), minimal footer (project · Page N) and the charcoal rear contact page — on the NEUTRAL (white) theme because this is
   a working document, not a luxury proposal. LED routes and A-tags in amber (never yellow).
   PAPER OPTIONS (m.paper 'A3'|'A4', m.orient 'landscape'|'portrait'): every sheet is laid out on a logical A3 canvas in the
   chosen orientation (landscape = drawing left, notes right; portrait = drawing above, notes below); A4 is the same canvas
   scaled 1/√2 at page level, so an A4 print of the A3 set and the A4 set are identical.
   Painter: pdf-lib direct (the shared SonorPdfLuxury chrome is A4-portrait-bound); Gilroy via lx.makeFonts, images via
   lx.loadImage, the house mark via lx.HOUSE. Coordinates are TOP-DOWN points on the logical canvas.
   model = FabricApp.packModel(): { projectNo, title, client, option, rev, dateText, scheme:{title, blurb, fabric,
     borders, light}, rooms:[{ name, w_mm, d_mm, h_mm, src, pack:{coffer, notes…}, surfaces:[cfg surfaces], calc, fabric,
     colour, track, infill, opts }], renders:[{url, caption, hero}], totals, compare:{label, net_m2, track_m, …}|null,
     swatchUrl, termsLines }
*/
(function (global) {
  'use strict';
  var A3 = { w: 1190.55, h: 841.89 }, PW = A3.w, PH = A3.h, M = 40, LAND = true;
  var INK = [24, 24, 24], INK2 = [62, 62, 62], MUT = [118, 118, 118], LINE = [222, 222, 222], PALE = [243, 241, 237], PAPER = [251, 250, 247], LABEL = [138, 138, 138], GOLDL = [200, 180, 142], INFO = [172, 172, 172], CREAM = [246, 242, 234];
  var GOLD = [173, 153, 120], ORANGE = [201, 132, 48], BLACK = [22, 22, 22], GLASS = [205, 222, 228], OAK = [176, 138, 74], FAB = [228, 222, 210], DARK = [28, 26, 24], RED = [176, 64, 40];
  var TAGS = { S: 'supplied brief', P: 'source proposal', A: 'assumed / photo-informed', D: 'derived' };
  function lx() { return global.SonorPdfLuxury; }
  function col(a) { return global.PDFLib.rgb(a[0] / 255, a[1] / 255, a[2] / 255); }
  function fmt(v, dp) { return Number(v || 0).toLocaleString('en-GB', { maximumFractionDigits: dp == null ? 2 : dp, minimumFractionDigits: dp == null ? 0 : dp }); }
  function mm(v) { return Math.round(Number(v) || 0).toLocaleString('en-GB'); }
  var CFG = global.__FABRIC_CONFIG__ || {};
  function safe(s) { s = String(s == null ? '' : s); (CFG.pdfSafe || []).forEach(function (r) { s = s.replace(r[0], function (mt) { return mt === mt.toUpperCase() && /[A-Z]/.test(mt) ? String(r[1]).toUpperCase() : r[1]; }); }); s = s.replace(/ff/g, 'f f').replace(/FF/g, 'F F').replace(/Ff/g, 'F f'); return s.replace(/[^\x20-\x7E£°×²–—·…’‘“”]/g, function (c) { return ({ '²': '2', '×': 'x', '–': '-', '—': '-', '·': '-', '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"' })[c] || ''; }).replace(/sqm/g, 'm2'); }

  // ── painter (top-down) ───────────────────────────────────────────────────
  function mk(page, F) {
    var P = {
      text: function (s, x, top, size, font, c) { page.drawText(safe(s), { x: x, y: PH - top - size, size: size, font: font || F.r, color: col(c || INK) }); },
      right: function (s, rx, top, size, font, c) { s = safe(s); var w = (font || F.r).widthOfTextAtSize(s, size); page.drawText(s, { x: rx - w, y: PH - top - size, size: size, font: font || F.r, color: col(c || INK) }); },
      center: function (s, cx, top, size, font, c) { s = safe(s); var w = (font || F.r).widthOfTextAtSize(s, size); page.drawText(s, { x: cx - w / 2, y: PH - top - size, size: size, font: font || F.r, color: col(c || INK) }); },
      tracked: function (s, x, top, size, font, c, track) { s = safe(s); var cx = x; for (var i = 0; i < s.length; i++) { page.drawText(s[i], { x: cx, y: PH - top - size, size: size, font: font || F.r, color: col(c || INK) }); cx += (font || F.r).widthOfTextAtSize(s[i], size) + (track || 1.5); } return cx; },
      trackedRight: function (s, rx, top, size, font, c, track) { s = safe(s); var w = 0; for (var i = 0; i < s.length; i++) w += (font || F.r).widthOfTextAtSize(s[i], size) + (track || 1.5); P.tracked(s, rx - w, top, size, font, c, track); },
      vtext: function (s, x, top, size, font, c) { s = safe(s); page.drawText(s, { x: x, y: PH - top, size: size, font: font || F.r, color: col(c || INK), rotate: global.PDFLib.degrees(90) }); },
      rect: function (x, top, w, h, c, o) { page.drawRectangle({ x: x, y: PH - top - h, width: w, height: h, color: col(c), opacity: o == null ? 1 : o }); },
      rectB: function (x, top, w, h, c, bw, o, dash) { page.drawRectangle({ x: x, y: PH - top - h, width: w, height: h, borderColor: col(c), borderWidth: bw || 0.6, opacity: 0, borderOpacity: o == null ? 1 : o, borderDashArray: dash || undefined }); },
      line: function (x1, t1, x2, t2, c, w, o, dash) { page.drawLine({ start: { x: x1, y: PH - t1 }, end: { x: x2, y: PH - t2 }, thickness: w || 0.6, color: col(c || LINE), opacity: o == null ? 1 : o, dashArray: dash || undefined }); },
      dot: function (x, top, r, c) { page.drawCircle({ x: x, y: PH - top, size: r, color: col(c) }); },
      circ: function (x, top, r, c, w) { page.drawCircle({ x: x, y: PH - top, size: r, borderColor: col(c), borderWidth: w || 0.6, opacity: 0, borderOpacity: 1 }); },
      image: function (img, x, top, w, h) { page.drawImage(img, { x: x, y: PH - top - h, width: w, height: h }); },
      logo: function (x, top, h, c) { var L0 = lx(); if (L0 && L0.HOUSE) page.drawSvgPath(L0.HOUSE, { x: x, y: PH - top, scale: h / 95, color: col(c || GOLD) }); },
      fadeDown: function (x, top, w, h, c, maxO, steps) { steps = steps || 56; maxO = maxO == null ? 1 : maxO; var slice = h / steps; for (var i = 0; i < steps; i++) { var t = (i + 1) / steps, o = maxO * t * t * (1 - (1 - t) * 0.2); P.rect(x, top + slice * i, w, slice * 1.9, c, o * 0.62); P.rect(x, top + slice * i, w, slice * 1.1, c, o * 0.5); } },
      frame: function (x, top, w, h) { P.rectB(x - 3, top - 3, w + 6, h + 6, GOLD, 0.8, 0.9); },   // the gold picture frame every Sonor PDF uses
      wrap: function (s, font, size, w) { s = safe(s); var words = s.split(/\s+/), lines = [], cur = ''; words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (font.widthOfTextAtSize(t, size) > w && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur); return lines; },
      para: function (s, x, top, w, size, font, c, lh) { var ls = P.wrap(s, font || F.r, size, w); ls.forEach(function (l, i) { P.text(l, x, top + i * (lh || size * 1.45), size, font, c); }); return top + ls.length * (lh || size * 1.45); },
      // image cover-fit into a box
      cover: function (img, x, top, w, h) { var iw = img.width, ih = img.height, s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s; page.pushOperators(global.PDFLib.pushGraphicsState(), global.PDFLib.rectangle(x, PH - top - h, w, h), global.PDFLib.clip(), global.PDFLib.endPath()); page.drawImage(img, { x: x + (w - dw) / 2, y: PH - top - h + (h - dh) / 2, width: dw, height: dh }); page.pushOperators(global.PDFLib.popGraphicsState()); }
    };
    return P;
  }

  // hatch a rectangle (fabric fill) — diagonal lines clipped to the rect
  function hatch(P, page, x, top, w, h, c, step) {
    step = step || 7;
    page.pushOperators(global.PDFLib.pushGraphicsState(), global.PDFLib.rectangle(x, PH - top - h, w, h), global.PDFLib.clip(), global.PDFLib.endPath());
    for (var d = -h; d < w; d += step) P.line(x + d, top + h, x + d + h, top, c || [206, 198, 184], 0.4, 0.9);
    page.pushOperators(global.PDFLib.popGraphicsState());
  }
  // dimension string — horizontal (y = top of line), label centred above, tag in square brackets
  function dimH(P, F, x1, x2, y, label, tag, below) {
    P.line(x1, y, x2, y, INK2, 0.5); P.line(x1, y - 4, x1, y + 4, INK2, 0.5); P.line(x2, y - 4, x2, y + 4, INK2, 0.5);
    var s = label + (tag ? ' [' + tag + ']' : ''); P.center(s, (x1 + x2) / 2, below ? y + 3 : y - 10, 6.5, F.r, tag === 'A' ? ORANGE : INK2);
  }
  function dimV(P, F, x, y1, y2, label, tag, right) {
    P.line(x, y1, x, y2, INK2, 0.5); P.line(x - 4, y1, x + 4, y1, INK2, 0.5); P.line(x - 4, y2, x + 4, y2, INK2, 0.5);
    var s = label + (tag ? ' [' + tag + ']' : '');
    P.vtext(s, right ? x + 9 : x - 3, (y1 + y2) / 2 + F.r.widthOfTextAtSize(s, 6.5) / 2, 6.5, F.r, tag === 'A' ? ORANGE : INK2);
  }

  // ── page furniture ────────────────────────────────────────────────────────
  // luxury pageHead (brand 'large') + sectionHead, redrawn for the sheet
  function head(P, F, m, no, title, sub, drawingNo) {
    P.logo(M, 30, 22, GOLD);
    P.tracked('SONOR', M + 27, 34.5, 14, F.b, INK, 3.6);
    P.tracked(((m.projectNo ? m.projectNo + '  ·  ' : '') + (drawingNo || 'DESIGN & DIMENSION PACK')).toUpperCase(), M + 118, 42, 8, F.r, LABEL, 2.4);
    P.trackedRight(((m.option ? m.option + '  ·  ' : '') + (m.rev || 'R1')).toUpperCase(), PW - M, 42, 8, F.r, LABEL, 2.4);
    P.line(M, 68, PW - M, 68, LINE, 0.8);
    P.tracked((drawingNo ? drawingNo + '  ·  ' : '') + 'DESIGN DEVELOPMENT', M, 88, 8.5, F.r, GOLD, 2.6);
    P.text(title, M - 1, 100, 24, F.b, INK);
    if (sub) P.para(sub, M, 134, Math.min(PW - M * 2, 820), 9.5, F.r, INK2, 13);
  }
  // luxury footerMode 'minimal' (project · Page N) + the pack's standing caveat
  function foot(P, F, m, no, total, ref) {
    P.tracked('NOT FOR CONSTRUCTION  ·  DESIGN DEVELOPMENT  ·  ' + (m.dateText || '').toUpperCase(), M, PH - 30, 6.5, F.r, INFO, 1.4);
    P.trackedRight((m.projectNo ? m.projectNo + '  ·  ' : '') + (ref ? ref + '  ·  ' : '') + 'Page ' + no + ' / ' + total, PW - M, PH - 30, 7, F.r, [164, 164, 164], 1.2);
  }
  // sheet layout for the chosen orientation: the drawing box + the notes column (landscape: beside · portrait: below)
  function lay(opts) {
    opts = opts || {};
    var top = 150, bottom = PH - 96;
    if (LAND) { var nx = Math.round(PW * 0.69); return { box: { x: M + 30, top: top, w: nx - M - 90, h: bottom - top - (opts.dims || 70) }, notes: { x: nx, y: top, w: PW - M - nx }, stack: false }; }
    var bh = Math.round((bottom - top) * (opts.stackH || 0.52));
    return { box: { x: M + 40, top: top, w: PW - M * 2 - 80, h: bh - (opts.dims || 70) }, notes: { x: M, y: top + bh + 24, w: PW - M * 2 }, stack: true };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function scaleOf(k) { return Math.round((72 / 25.4) / k); }   // k = pt per mm → 1:N
  function legend(P, F, y, x) {
    y = y == null ? PH - 58 : y; x = x == null ? M : x; var cx = x;
    P.line(M, y - 10, PW - M, y - 10, GOLD, 0.6, 0.6);
    Object.keys(TAGS).forEach(function (k) { P.text(k, cx, y, 7, F.b, k === 'A' ? ORANGE : INK); P.text(TAGS[k], cx + 10, y + 0.5, 6.5, F.r, MUT); cx += 24 + F.r.widthOfTextAtSize(TAGS[k], 6.5) + 26; });
    P.right('All dimensions in mm. Verify on site. Print at 100%.', PW - M, y + 0.5, 6.5, F.r, MUT);
  }
  function scaleBar(P, F, x, y, sc, label) {
    // sc = pt per mm; bar 0–1–2 m
    P.text(label, x, y - 12, 6.5, F.b, INK2);
    for (var i = 0; i < 4; i++) P.rect(x + i * 500 * sc, y, 500 * sc, 3, i % 2 ? PAPER : INK2); P.rectB(x, y, 2000 * sc, 3, INK2, 0.5);
    [0, 1, 2].forEach(function (k) { P.center(String(k), x + k * 1000 * sc, y + 6, 6, F.r, MUT); }); P.text('metres', x + 2000 * sc + 8, y - 1, 6, F.r, MUT);
  }
  // the luxury table (fabric-pdf.js table): tracked caps + gold rule, hairline rows, bold total rows. cols[].w = fraction of width
  function tableA3(P, F, cols, rows, x, y, opts) {
    opts = opts || {}; var W0 = opts.width || (PW - M * 2), cx = x, size = opts.size || 8, rh = opts.rowH || 19;
    cols = cols.map(function (c) { return Object.assign({}, c, { w: c.w <= 1 ? c.w * W0 : c.w }); });
    cols.forEach(function (c) { if (c.align === 'right') P.trackedRight(String(c.label).toUpperCase(), cx + c.w - 6, y, 6.2, F.r, MUT, 1.2); else P.tracked(String(c.label).toUpperCase(), cx + (cx === x ? 0 : 6), y, 6.2, F.r, MUT, 1.2); cx += c.w; });
    P.line(x, y + 11, x + W0, y + 11, GOLD, 0.8, 0.75);
    y += 22;
    rows.forEach(function (r, ri) {
      var x2 = x, bold = r.__bold, h = rh;
      if (r.__bold) P.rect(x, y - 4, W0, rh, PALE);
      cols.forEach(function (c, ci) {
        var v = r[ci] == null ? '' : String(r[ci]), fnt = bold ? F.b : (ci === 0 ? F.b : F.r), cc = ci === 0 || bold ? INK : INK2;
        if (c.tagCol && /\[A\]/.test(v)) cc = ORANGE;
        var ls = P.wrap(v, fnt, size, c.w - 12); ls = ls.slice(0, c.lines || 2);
        ls.forEach(function (l, li) { if (c.align === 'right') P.right(l, x2 + c.w - 6, y + li * (size + 2.5), size, fnt, cc); else P.text(l, x2 + (ci ? 6 : 0), y + li * (size + 2.5), size, fnt, cc); });
        h = Math.max(h, ls.length * (size + 2.5) + 8);
        x2 += c.w;
      });
      if (ri < rows.length - 1) P.line(x, y + h - 4, x + W0, y + h - 4, LINE, 0.5, 0.6);
      y += h;
    });
    return y;
  }

  // ── geometry helpers ─────────────────────────────────────────────────────
  var SIDES = ['front', 'right', 'rear', 'left'];
  function sideOf(s, i) { if (s.side) return s.side; if (s.kind === 'ceiling') return 'ceiling'; var m = /^w([1-4])$/.exec(s.id || ''); if (m) return SIDES[Number(m[1]) - 1]; if (/^p\d/.test(s.id || '') || /pillar|pier|rear/i.test(s.label || '')) return 'rear'; return SIDES[i % 4]; }
  function openingsOf(s, sc) {
    // set-out: x from the surface's left edge, y = sill from FFL (0 = floor). Fallback: SonorFabricDraw.layoutOpenings (tagged A).
    var auto = global.SonorFabricDraw ? global.SonorFabricDraw.layoutOpenings(s, sc) : [], ai = 0, out = [];
    (sc.openings || []).forEach(function (op, oi) {
      for (var q = 0; q < op.qty; q++) {
        var a = auto[ai++] || { x: 300, y: 0 };
        var x = op.x_mm != null ? op.x_mm + q * (op.w + 300) : a.x;
        var y = op.y_mm != null ? op.y_mm : (sc.h_mm - a.y - op.h);   // sill from FFL
        out.push({ label: op.label, w: op.w, h: op.h, x: x, sill: y, top: y + op.h, src: op.src || 'A', pos_src: op.x_mm != null ? (op.src || 'A') : 'A', frame_mm: op.frame_mm || 0, note: op.note || '', idx: oi });
      }
    });
    return out;
  }
  function ledLen(s, sc, led, ops) {
    // metres along the centreline of the route
    var L = sc.len_mm, H = sc.h_mm, ins = led.inset_mm || 100, ref = ops[led.ref || 0];
    switch (led.type) {
      case 'perimeter': return 2 * ((L - 2 * ins) + (H - 2 * ins)) / 1000;
      case 'frame': return 2 * (L + H) / 1000;
      case 'vertical': return (H - 2 * ins) / 1000;
      case 'horizontal': return (L - 2 * ins) / 1000;
      case 'halo': return ref ? 2 * (ref.w + ref.h) / 1000 + 4 * ins / 1000 : 0;
      case 'inside': return ref ? ref.w / 1000 : 0;
      case 'coffer': return led.len_m || 0;
      default: return led.len_m || 0;
    }
  }
  function ledLabel(t) { return ({ perimeter: 'Perimeter (inside the frame)', frame: 'Four-sided frame, inward wash', vertical: 'Inset vertical strip', horizontal: 'Inset horizontal strip', halo: 'Halo behind the screen', inside: 'Inside the recess, top lip only', coffer: 'Existing coffer, inner perimeter' })[t] || t; }

  // draw one wall elevation into box (fit), returning the scale + origin
  function elevation(P, page, F, s, sc, box, opts) {
    opts = opts || {};
    var L = sc.len_mm, H = sc.h_mm, k = Math.min(box.w / L, box.h / H), x0 = box.x + (box.w - L * k) / 2, y0 = box.top + (box.h - H * k) / 2;
    var X = function (v) { return x0 + v * k; }, Y = function (zFromFloor) { return y0 + (H - zFromFloor) * k; };
    // fabric field
    P.rect(x0, y0, L * k, H * k, FAB); hatch(P, page, x0, y0, L * k, H * k);
    // outer black frame (surface frame_mm)
    var fr = sc.frame_mm || 0;
    if (fr) { P.rect(x0, y0, L * k, fr * k, BLACK); P.rect(x0, y0 + (H - fr) * k, L * k, fr * k, BLACK); P.rect(x0, y0, fr * k, H * k, BLACK); P.rect(x0 + (L - fr) * k, y0, fr * k, H * k, BLACK); }
    P.rectB(x0, y0, L * k, H * k, INK, 0.9);
    // panels / seams
    (sc.panels || []).forEach(function (p, i) { if (i > 0) { P.line(X(p.x_mm) - 0.8, y0, X(p.x_mm) - 0.8, y0 + H * k, GOLD, 0.5, 0.9); P.line(X(p.x_mm) + 0.8, y0, X(p.x_mm) + 0.8, y0 + H * k, GOLD, 0.5, 0.9); } if (p.w_mm * k > 40 && !opts.small) P.center('P' + p.i + ' · ' + mm(p.w_mm), X(p.x_mm + p.w_mm / 2), y0 + 5, 5.5, F.r, MUT); });
    // openings
    var ops = openingsOf(s, sc);
    ops.forEach(function (o) {
      var fill = /tv|screen/i.test(o.label) ? DARK : (/recess|custom/i.test(o.label) && o.h < 600 ? OAK : (/door/i.test(o.label) && !/glaz|garden/i.test(o.note + o.label) ? PAPER : GLASS));
      var ox = X(o.x), oy = Y(o.top), ow = o.w * k, oh = o.h * k;
      if (o.frame_mm) { var f2 = o.frame_mm * k; P.rect(ox - f2, oy - f2, ow + 2 * f2, oh + 2 * f2, BLACK); }
      P.rect(ox, oy, ow, oh, fill); P.rectB(ox, oy, ow, oh, INK, 0.6);
      if (/tv|screen/i.test(o.label)) { P.center(o.label.toUpperCase() + ' ' + mm(o.w) + ' x ' + mm(o.h) + ' [' + o.src + ']', ox + ow / 2, oy + oh / 2 - 4, Math.min(8, ow / 18), F.b, [230, 226, 218]); }
      else if (ow > 50) P.center(safe(o.label).toUpperCase() + ' ' + mm(o.w) + ' x ' + mm(o.h) + ' [' + o.src + ']', ox + ow / 2, oy + oh / 2 - 3, 6, F.b, fill === OAK || fill === DARK ? [240, 236, 228] : INK2);
    });
    // LED routes
    (sc.leds || []).forEach(function (led) {
      var ins = led.inset_mm || 100, ref = ops[led.ref || 0];
      var o = ORANGE, w = 1.6;
      if (led.type === 'perimeter') P.rectB(X(ins), Y(H - ins), (L - 2 * ins) * k, (H - 2 * ins) * k, o, w);
      else if (led.type === 'frame') P.rectB(x0 - 1.5, y0 - 1.5, L * k + 3, H * k + 3, o, w);
      else if (led.type === 'vertical') P.line(X(led.x_mm || ins), Y(H - ins), X(led.x_mm || ins), Y(ins), o, w);
      else if (led.type === 'horizontal') P.line(X(ins), Y(led.z_mm || H - ins), X(L - ins), Y(led.z_mm || H - ins), o, w);
      else if (led.type === 'halo' && ref) P.rectB(X(ref.x - ins), Y(ref.top + ins), (ref.w + 2 * ins) * k, (ref.h + 2 * ins) * k, o, w, 0.9, [3, 2]);
      else if (led.type === 'inside' && ref) P.line(X(ref.x + 40), Y(ref.top - 40), X(ref.x + ref.w - 40), Y(ref.top - 40), o, w);
      if (led.group && !opts.small) { var lx = led.type === 'vertical' ? X(led.x_mm || ins) + 4 : X(ins) + 4, ly = led.type === 'inside' && ref ? Y(ref.top - 40) + 4 : (led.type === 'halo' && ref ? Y(ref.top + ins) - 9 : Y(H - ins) + 3); P.text(led.group, lx, ly, 6, F.b, o); }
    });
    if (opts.small) return { k: k, x0: x0, y0: y0, w: L * k, h: H * k, bottom: y0 + H * k, ops: ops };
    // cut-outs rail
    var nco = sc.n_cutouts || 0; if (nco) { for (var c = 0; c < Math.min(nco, 12); c++) P.circ(x0 + L * k - 12 - c * 12, y0 + H * k - 12, 3, INK2, 0.6); P.right(nco + ' cut-out' + (nco > 1 ? 's' : '') + ' (positions follow equipment)', x0 + L * k - 12 - Math.min(nco, 12) * 12 - 4, y0 + H * k - 16, 6, F.r, MUT); }
    // dimensions
    var tagL = sc.src || opts.srcLen || 'S', tagH = sc.src || opts.srcH || 'S';
    dimH(P, F, x0, x0 + L * k, y0 + H * k + 14, mm(L), tagL, true);
    dimV(P, F, x0 - 14, y0, y0 + H * k, mm(H), tagH);
    // opening set-out chains (x from left) and heights (sill / head) — one chain row per opening
    ops.forEach(function (o, i) {
      var yy = y0 + H * k + 30 + i * 11;
      if (o.x > 0) dimH(P, F, x0, X(o.x), yy, mm(o.x), o.pos_src, true);
      dimH(P, F, X(o.x), X(o.x + o.w), yy, mm(o.w), o.src, true);
      if (o.x + o.w < L) dimH(P, F, X(o.x + o.w), x0 + L * k, yy, mm(L - o.x - o.w), 'D', true);
      var xr = x0 + L * k + 16 + i * 14;
      if (o.sill > 0) dimV(P, F, xr, Y(o.sill), Y(0), mm(o.sill), o.pos_src, true);
      dimV(P, F, xr, Y(o.top), Y(o.sill), mm(o.h), o.src, true);
      if (o.top < H) dimV(P, F, xr, Y(H), Y(o.top), mm(H - o.top), 'D', true);
    });
    return { k: k, x0: x0, y0: y0, w: L * k, h: H * k, bottom: y0 + H * k + 30 + ops.length * 11 + 10, ops: ops };
  }

  // ── pages ─────────────────────────────────────────────────────────────────
  async function generate(m) {
    var PL = global.PDFLib, L = lx();
    if (!PL) throw new Error('pdf-lib not loaded');
    LAND = (m.orient || 'landscape') !== 'portrait'; PW = LAND ? A3.w : A3.h; PH = LAND ? A3.h : A3.w;
    var SCALE = (m.paper || 'A3') === 'A4' ? Math.SQRT1_2 : 1;
    var doc = await PL.PDFDocument.create();
    var F = L ? await L.makeFonts(doc, m.base || '../data/') : { b: await doc.embedFont(PL.StandardFonts.HelveticaBold), r: await doc.embedFont(PL.StandardFonts.Helvetica), l: await doc.embedFont(PL.StandardFonts.Helvetica) };
    var imgs = [];
    for (var i = 0; i < (m.renders || []).length; i++) { try { imgs.push({ img: await L.loadImage(doc, m.renders[i].url), r: m.renders[i] }); } catch (e) { console.warn('[fabric-pack] render skipped', e && e.message); } }
    var swatch = null; if (m.swatchUrl) { try { swatch = await L.loadImage(doc, m.swatchUrl); } catch (e) {} }
    var hero = imgs.find(function (x) { return x.r.hero; }) || imgs[0] || null;
    var rm = m.rooms[0] || null;   // the pack is drawn per ROOM; multi-room projects get one GA set per room
    var sheets = [];
    var add = function (fn) { sheets.push(fn); };

    // 01 cover
    // 01 cover — the Service Contracts cover (sonor-platform §43): hero, dark fade, inset gold frame, eyebrow + title + info row, brand large
    add(function (page, P, no, total) {
      var DK = [9, 8, 7];
      P.rect(0, 0, PW, PH, DK);
      if (hero) { P.cover(hero.img, 0, 0, PW, PH); var fTop = PH * 0.52, fH = PH * 0.3; P.fadeDown(0, fTop, PW, fH, DK, 1, 56); P.rect(0, fTop + fH - 1, PW, PH - (fTop + fH) + 1, DK, 1); }
      P.rectB(M * 0.62, M * 0.62, PW - M * 1.24, PH - M * 1.24, GOLD, 0.7, 0.34);
      P.logo(M, M * 0.62 + 22, 30, GOLD); P.tracked('SONOR', M + 37, M * 0.62 + 28, 18, F.b, CREAM, 4.2);
      var ty = PH * 0.70, title = m.title || 'Room', tsize = F.b.widthOfTextAtSize(title, 54) > PW * 0.6 ? 38 : 54;
      P.line(M, ty - 20, M + 26, ty - 20, GOLD, 1, 0.95); P.tracked('STRETCHED FABRIC  ·  DESIGN & DIMENSION PACK', M + 34, ty - 24, 8.5, F.r, GOLDL, 3.2);
      P.text(title, M - 2, ty, tsize, F.b, CREAM);
      P.text((m.option ? m.option + '  —  ' : '') + (m.scheme.subtitle || 'Stretched fabric scheme'), M, ty + 66, 19, F.l, GOLDL);
      var iy = PH - 76, cw = (PW - M * 2) / 4;
      P.line(M, iy - 16, PW - M, iy - 16, GOLD, 0.5, 0.45);
      [['PROJECT', (m.projectNo ? m.projectNo + '  ·  ' : '') + (m.client || '')], ['REVISION', (m.rev || 'R1') + '  ·  ' + (m.dateText || '')], ['SHEET', (m.paper || 'A3') + ' ' + (LAND ? 'landscape' : 'portrait') + '  ·  ' + total + ' sheets'], ['STATUS', 'Design development  ·  survey confirmation required']].forEach(function (c, i) { var x = M + i * cw; P.tracked(c[0], x, iy, 7, F.r, INFO, 1.8); P.text(c[1] || '—', x, iy + 13, 12.5, F.b, CREAM); });
      P.trackedRight('CEDIA MEMBER', PW - M, PH - 18, 6, F.r, INFO, 1.2);
    });
    // 02 selected scheme
    add(function (page, P, no, total) {
      head(P, F, m, no, m.scheme.title || 'The selected scheme', m.scheme.blurb || '', 'THE SELECTED SCHEME');
      var two = imgs.slice(0, 2), bw = (PW - M * 2 - 24) / 2, bh = Math.min(bw * 0.56, PH * 0.42), iy0 = 170;
      two.forEach(function (x, i) { var bx = M + i * (bw + 24); P.cover(x.img, bx, iy0, bw, bh); P.frame(bx, iy0, bw, bh); P.tracked(pad2(i + 1) + '  ·  ' + safe(x.r.caption || '').toUpperCase().slice(0, 70), bx, iy0 + bh + 14, 6.5, F.r, GOLD, 1.6); P.para(x.r.note || '', bx, iy0 + bh + 28, bw, 8.5, F.r, INK2, 12); });
      var cy = iy0 + bh + 72; [['FABRIC', m.scheme.fabric], ['BORDERS', m.scheme.borders], ['LIGHT', m.scheme.light]].forEach(function (c, i) { var cx = M + i * ((PW - M * 2) / 3); P.tracked(c[0], cx, cy, 6.5, F.r, GOLD, 1.8); P.line(cx, cy + 12, cx + (PW - M * 2) / 3 - 30, cy + 12, LINE, 0.5); P.para(c[1] || '—', cx, cy + 22, (PW - M * 2) / 3 - 40, 10, F.r, INK, 14); });
      P.text('Visualisations show design intent; fabric texture, apparent dimensions and light levels are illustrative.', M, PH - 58, 7.5, F.r, MUT);
      foot(P, F, m, no, total, (m.projectNo || '') + ' / ' + (m.rev || 'R1'));
    });
    if (!rm) { return finish(); }
    var surfs = rm.surfaces.filter(function (s) { return s.on; }), calcS = function (s) { return rm.calc.surfaces.find(function (x) { return x.id === s.id; }); };
    var bySide = {}; surfs.forEach(function (s, i) { var sd = sideOf(s, i); (bySide[sd] = bySide[sd] || []).push(s); });
    var Wr = rm.w_mm || (bySide.front && bySide.front[0].len_mm) || 4000, Dr = rm.d_mm || (bySide.right && bySide.right[0].len_mm) || 4000, Hr = rm.h_mm || 2400, rsrc = rm.src || 'S';
    var dwg = 0, drawingNos = [];

    // GA-01 room plan
    add(function (page, P, no, total) {
      head(P, F, m, no, 'Room plan and fabric extents', 'Overall envelope from the brief. Fabric-covered faces are hatched; opening positions carry their own provenance tag. Survey every opening before procurement.', 'GA-01');
      var LY = lay({ dims: 60, stackH: 0.58 }), box = Object.assign({}, LY.box, { top: LY.box.top + 30, h: LY.box.h - 30 }), k = Math.min(box.w / Wr, box.h / Dr), x0 = box.x + (box.w - Wr * k) / 2, y0 = box.top + (box.h - Dr * k) / 2;
      var X = function (v) { return x0 + v * k; }, Yd = function (v) { return y0 + v * k; };   // plan: front wall at the bottom, rear at the top (reads from the seats)
      var th = 110 * k;   // wall thickness shown
      P.rect(x0 - th, y0 - th, Wr * k + 2 * th, Dr * k + 2 * th, PALE); P.rect(x0, y0, Wr * k, Dr * k, PAPER); P.rectB(x0 - th, y0 - th, Wr * k + 2 * th, Dr * k + 2 * th, INK, 0.8); P.rectB(x0, y0, Wr * k, Dr * k, INK, 0.8);
      // fabric faces (hatch inside the wall band) + openings as gaps
      var faceBand = function (side, s, sc) {
        var L = sc.len_mm, ops = openingsOf(s, sc), off = s.offset_mm || 0;
        var seg = function (a, b, strong) { // a,b along the wall in mm
          if (side === 'front') { P.rect(X(off + a), Yd(Dr), (b - a) * k, th, strong ? FAB : PAPER); if (strong) hatch(P, page, X(off + a), Yd(Dr), (b - a) * k, th); }
          if (side === 'rear') { P.rect(X(Wr - off - b), y0 - th, (b - a) * k, th, strong ? FAB : PAPER); if (strong) hatch(P, page, X(Wr - off - b), y0 - th, (b - a) * k, th); }
          if (side === 'right') { P.rect(X(Wr), Yd(Dr - off - b), th, (b - a) * k, strong ? FAB : PAPER); if (strong) hatch(P, page, X(Wr), Yd(Dr - off - b), th, (b - a) * k); }
          if (side === 'left') { P.rect(x0 - th, Yd(off + a), th, (b - a) * k, strong ? FAB : PAPER); if (strong) hatch(P, page, x0 - th, Yd(off + a), th, (b - a) * k); }
        };
        seg(0, L, true);
        ops.forEach(function (o) { if (o.sill < 300 && o.h > 1500) { seg(o.x, o.x + o.w, false); } });   // floor-level openings (doors, glazing) read as gaps; the TV / recess stay inside the hatched face
        return ops;
      };
      var pillars = [];
      Object.keys(bySide).forEach(function (side) { if (side === 'ceiling') return; bySide[side].forEach(function (s) { var sc = calcS(s); if (!sc) return; if (sc.len_mm < (side === 'front' || side === 'rear' ? Wr : Dr) * 0.6) { pillars.push({ side: side, s: s, sc: sc }); return; } faceBand(side, s, sc); }); });
      // pillars / piers — projecting faces, placed by offset_mm (default: symmetric about the wall centre)
      pillars.forEach(function (p, i) {
        var L = p.sc.len_mm, proj = p.s.proj_mm || 150, n = pillars.filter(function (q) { return q.side === p.side; }).length, idx = pillars.filter(function (q) { return q.side === p.side; }).indexOf(p);
        var wallL = p.side === 'front' || p.side === 'rear' ? Wr : Dr, gap = (wallL - n * L) / (n + 1), off = p.s.offset_mm != null ? p.s.offset_mm : (n === 2 ? (idx === 0 ? 900 : wallL - 900 - L) : gap * (idx + 1) + idx * L);
        if (p.side === 'rear') { P.rect(X(off), y0, L * k, proj * k, FAB); hatch(P, page, X(off), y0, L * k, proj * k); P.rectB(X(off), y0, L * k, proj * k, INK, 0.7); P.center(p.s.id.toUpperCase(), X(off + L / 2), y0 + proj * k + 4, 5.5, F.b, INK2); dimH(P, F, X(off), X(off + L), y0 + proj * k + 18, mm(L), p.s.src || 'P', true); if (idx === 0) dimH(P, F, x0, X(off), y0 + proj * k + 18, mm(off), 'A', true); if (idx === n - 1) dimH(P, F, X(off + L), x0 + Wr * k, y0 + proj * k + 18, mm(wallL - off - L), 'A', true); }
        if (p.side === 'front') { P.rect(X(off), Yd(Dr) - proj * k, L * k, proj * k, FAB); hatch(P, page, X(off), Yd(Dr) - proj * k, L * k, proj * k); P.rectB(X(off), Yd(Dr) - proj * k, L * k, proj * k, INK, 0.7); }
      });
      var ro = rm.pack && rm.pack.rearOpening; if (ro && ro.w) { var rx0 = ro.x != null ? ro.x : (Wr - ro.w) / 2; P.rect(X(Wr - rx0 - ro.w), y0 - th, ro.w * k, th, GLASS); P.line(X(Wr - rx0 - ro.w), y0 - th / 2, X(Wr - rx0), y0 - th / 2, INK2, 0.5); P.center((ro.label || 'WINDOW').toUpperCase() + ' ' + mm(ro.w) + ' [' + (ro.src || 'A') + ']', X(Wr - rx0 - ro.w / 2), y0 - th / 2 - 3, 5, F.b, INK2); }
      // coffer / ceiling feature (dashed)
      var cf = rm.pack && rm.pack.coffer; if (cf && cf.w && cf.h) { P.rectB(X(cf.x || 0), Yd(Dr - (cf.y || 0) - cf.h), cf.w * k, cf.h * k, INK2, 0.5, 0.8, [4, 3]); P.center((cf.label || 'Existing ceiling coffer').toUpperCase() + ' ' + mm(cf.w) + ' x ' + mm(cf.h) + ' [' + (cf.src || 'A') + ']', X((cf.x || 0) + cf.w / 2), Yd(Dr - (cf.y || 0) - cf.h) + 6, 5.5, F.r, MUT); }
      // labels
      P.center(safe(rm.name).toUpperCase(), X(Wr / 2), Yd(Dr / 2) - 10, 9, F.b, INK);
      P.center(fmt(Wr * Dr / 1e6, 2) + ' m2 envelope area [D]  ·  ' + fmt(rm.calc.totals.net_m2, 2) + ' m2 fabric net [D]', X(Wr / 2), Yd(Dr / 2) + 4, 6.5, F.r, MUT);
      P.center('No furniture set-out in this study', X(Wr / 2), Yd(Dr / 2) + 14, 6, F.r, MUT);
      var tagAt = function (side, lab) { if (side === 'front') P.center(lab, X(Wr / 2), Yd(Dr) + th + 6, 6.5, F.b, INK2); if (side === 'rear') P.center(lab, X(Wr / 2), y0 - th - 22, 6.5, F.b, INK2); if (side === 'right') P.text(lab, X(Wr) + th + 6, Yd(Dr / 2), 6.5, F.b, INK2); if (side === 'left') P.right(lab, x0 - th - 6, Yd(Dr / 2), 6.5, F.b, INK2); };
      Object.keys(bySide).forEach(function (side) { if (side !== 'ceiling') tagAt(side, bySide[side].map(function (s) { return s.id.toUpperCase(); }).join(' + ')); });
      dimH(P, F, x0, x0 + Wr * k, y0 + Dr * k + th + 26, mm(Wr), rsrc, true); dimV(P, F, x0 - th - 26, y0, y0 + Dr * k, mm(Dr), rsrc);
      // opening set-out along the top (rear) and left/right walls from the FRONT corner
      scaleBar(P, F, box.x, Math.min(y0 + Dr * k + th + 56, PH - 80), k, '1:' + scaleOf(k) + ' on ' + (m.paper || 'A3'));
      // notes — per wall
      var cx = LY.notes.x, cy = LY.notes.y, cw = LY.notes.w;
      Object.keys(bySide).forEach(function (side) { if (side === 'ceiling') return; bySide[side].forEach(function (s) { var sc = calcS(s); if (!sc) return; P.text(s.id.toUpperCase() + ' / ' + safe(s.label), cx, cy, 8, F.b, INK); cy += 12; cy = P.para(mm(sc.len_mm) + ' x ' + mm(sc.h_mm) + ' [' + (s.src || rsrc) + ']. ' + (sc.openings.length ? sc.openings.map(function (o) { return o.label + ' ' + mm(o.w) + ' x ' + mm(o.h) + ' [' + (o.src || 'A') + ']'; }).join('; ') + '. ' : 'No openings. ') + (s.note || ''), cx, cy, cw, 7.5, F.r, INK2, 10.5) + 10; }); });
      P.text('Room datum', cx, cy + 4, 8, F.b, INK); cy = P.para('Origin is the inside front-left corner at finished floor level. X runs right along the front wall, Y toward the rear, Z rises from FFL. Opening offsets on the elevations run from the LEFT edge of each wall as you face it from inside the room. Dimensions are treated as substrate (behind-fabric) sizes: the ' + mm(rm.opts && rm.opts.trackDepth || 25) + ' mm track and fabric sit inside them.', cx, cy + 16, cw, 7.5, F.r, INK2, 10.5);
      legend(P, F);
      foot(P, F, m, no, total, 'GA-01  1:' + scaleOf(k));
    });

    // GA-02.. elevations — front, rear, then the side walls paired
    var order = ['front', 'rear'];
    var ga = 2;
    order.forEach(function (side) {
      if (!bySide[side]) return;
      var no_ = 'GA-' + pad2(ga++);
      add(function (page, P, no, total) {
        var ss = bySide[side], first = ss[0], sc0 = calcS(first);
        var title = side === 'front' ? 'Front wall - coordinated elevation' : 'Rear wall - ' + (ss.length > 1 ? 'pillars, window and frames' : 'elevation');
        head(P, F, m, no, title, (first.note || '') + (ss.length > 1 ? ' Faces drawn at their set-out; the wall between them is not fabric unless listed.' : ''), no_);
        var LY = lay({ dims: 90, stackH: 0.5 }), box = LY.box, res;
        if (ss.length === 1) res = elevation(P, page, F, first, sc0, box, { srcLen: first.src || rsrc, srcH: first.src || rsrc });
        else {
          // pillars on one wall: draw the wall outline (Wr × Hr) with each face at its offset
          var L = Wr, H = Hr, k = Math.min(box.w / L, box.h / H), x0 = box.x + (box.w - L * k) / 2, y0 = box.top + (box.h - H * k) / 2;
          P.rect(x0, y0, L * k, H * k, PALE); P.rectB(x0, y0, L * k, H * k, INK, 0.9);
          var n = ss.length;
          ss.forEach(function (s, i) { var sc = calcS(s), fl = sc.len_mm, off = s.offset_mm != null ? s.offset_mm : (n === 2 ? (i === 0 ? 900 : L - 900 - fl) : (L - n * fl) / (n + 1) * (i + 1) + i * fl), base = s.base_mm || 100; var sub = elevation(P, page, F, s, sc, { x: x0 + off * k, top: y0 + (H - base - sc.h_mm) * k, w: fl * k, h: sc.h_mm * k }, { small: true, srcLen: s.src || 'P', srcH: s.src || 'P' }); if (i === 0) { dimH(P, F, x0, x0 + off * k, y0 + H * k + 30, mm(off), 'A', true); } if (i === n - 1) dimH(P, F, x0 + (off + fl) * k, x0 + L * k, y0 + H * k + 30, mm(L - off - fl), 'A', true); dimH(P, F, x0 + off * k, x0 + (off + fl) * k, y0 + H * k + 30, mm(fl), s.src || 'P', true); P.center(s.id.toUpperCase() + ' / ' + safe(s.label).toUpperCase().slice(0, 30), x0 + (off + fl / 2) * k, y0 + (H - base - sc.h_mm) * k - 10, 6, F.b, INK2); if (i === n - 1) { dimV(P, F, x0 + L * k + 16, y0 + (H - base) * k, y0 + H * k, mm(base), 'A', true); dimV(P, F, x0 + L * k + 16, y0 + (H - base - sc.h_mm) * k, y0 + (H - base) * k, mm(sc.h_mm), s.src || 'P', true); dimV(P, F, x0 + L * k + 16, y0, y0 + (H - base - sc.h_mm) * k, mm(H - base - sc.h_mm), 'D', true); } });
          // a window / opening recorded on the room (pack.rearOpening) between the pillars
          var ro = rm.pack && rm.pack.rearOpening; if (ro && ro.w) { var rx = ro.x != null ? ro.x : (L - ro.w) / 2, sill = ro.sill || 600; P.rect(x0 + rx * k, y0 + (H - sill - ro.h) * k, ro.w * k, ro.h * k, GLASS); P.rectB(x0 + rx * k, y0 + (H - sill - ro.h) * k, ro.w * k, ro.h * k, INK, 0.6); P.center((ro.label || 'WINDOW').toUpperCase() + ' ' + mm(ro.w) + ' x ' + mm(ro.h) + ' [' + (ro.src || 'A') + ']', x0 + (rx + ro.w / 2) * k, y0 + (H - sill - ro.h / 2) * k - 3, 6.5, F.b, INK2); dimH(P, F, x0 + rx * k, x0 + (rx + ro.w) * k, y0 + H * k + 30, mm(ro.w), ro.src || 'A', true); dimV(P, F, x0 + L * k + 30, y0 + (H - sill) * k, y0 + H * k, mm(sill), ro.src || 'A', true); dimV(P, F, x0 + L * k + 30, y0 + (H - sill - ro.h) * k, y0 + (H - sill) * k, mm(ro.h), ro.src || 'A', true); }
          dimH(P, F, x0, x0 + L * k, y0 + H * k + 14, mm(L), rsrc, true); dimV(P, F, x0 - 14, y0, y0 + H * k, mm(H), rsrc);
          res = { k: k, bottom: y0 + H * k + 50 };
        }
        scaleBar(P, F, box.x, Math.min(res.bottom + 24, PH - 80), res.k, '1:' + scaleOf(res.k) + ' on ' + (m.paper || 'A3'));
        var cx = LY.notes.x, cy = LY.notes.y, cw = LY.notes.w, pre = ss.length > 1 ? function (s) { return s.id.toUpperCase() + ' - '; } : function () { return ''; };
        ss.forEach(function (s) { var sc = calcS(s); var ops = openingsOf(s, sc);
          ops.forEach(function (o) { P.text(pre(s) + safe(o.label) + ' datum', cx, cy, 8, F.b, INK); cy += 12; cy = P.para(mm(o.w) + ' x ' + mm(o.h) + ' [' + o.src + ']; ' + (o.x != null ? 'left edge at ' + mm(o.x) + ' from the ' + (side === 'rear' ? 'right' : 'left') + ' corner [' + o.pos_src + ']; ' : '') + 'sill ' + mm(o.sill) + ', head ' + mm(o.top) + ' from FFL [' + (o.pos_src) + ']. ' + (o.frame_mm ? 'Matt-black frame ' + mm(o.frame_mm) + ' face [A]. ' : '') + (o.note || ''), cx, cy, cw, 7.5, F.r, INK2, 10.5) + 8; });
          if (sc.frame_mm) { P.text(pre(s) + 'Border study', cx, cy, 8, F.b, INK); cy += 12; cy = P.para('Outer frame ' + mm(sc.frame_mm) + ' face [A], solid matt-black, visible outside the fabric. Confirm the frame section and how it meets the ceiling line.', cx, cy, cw, 7.5, F.r, INK2, 10.5) + 8; }
          if ((sc.leds || []).length) { P.text(pre(s) + 'LED set-out', cx, cy, 8, F.b, INK); cy += 12; cy = P.para(sc.leds.map(function (l) { return (l.group ? l.group + ' ' : '') + ledLabel(l.type) + (l.inset_mm ? ' at ' + mm(l.inset_mm) + ' inset' : '') + (l.type === 'vertical' && l.x_mm != null ? ' at X ' + mm(l.x_mm) : '') + ' - ' + fmt(ledLen(s, sc, l, ops), 2) + ' m'; }).join('; ') + '. Routes are indicative [A] - drivers, feeds and corner hardware excluded.', cx, cy, cw, 7.5, F.r, INK2, 10.5) + 8; }
          if (sc.n_cutouts) { P.text(pre(s) + 'Cut-outs', cx, cy, 8, F.b, INK); cy += 12; cy = P.para(sc.cutouts.map(function (c) { return c.qty + ' x ' + c.kind; }).join(', ') + ' - positions follow the installed equipment; not set out here.', cx, cy, cw, 7.5, F.r, INK2, 10.5) + 8; }
          P.text(pre(s) + 'Quantity', cx, cy, 8, F.b, INK); cy += 12; cy = P.para(fmt(sc.gross_m2, 2) + ' m2 gross - ' + fmt(sc.openings_m2, 2) + ' m2 openings = ' + fmt(sc.net_m2, 2) + ' m2 net [D]. Track ' + fmt(sc.track.total_m, 2) + ' m (' + fmt(sc.track.perimeter_m, 2) + ' perimeter + ' + fmt(sc.track.openings_m, 2) + ' openings' + (sc.track.split_m ? ' + ' + fmt(sc.track.split_m, 2) + ' splits' : '') + ') [D]. ' + sc.n_panels + ' panel' + (sc.n_panels > 1 ? 's' : '') + ' at ' + mm(sc.panel_w_mm) + ' mm, ' + sc.orientation + '.', cx, cy, cw, 7.5, F.r, INK2, 10.5) + 10;
        });
        legend(P, F); foot(P, F, m, no, total, no_ + '  1:' + scaleOf(res.k));
      });
    });
    if (bySide.right || bySide.left) {
      var noS = 'GA-' + pad2(ga++);
      add(function (page, P, no, total) {
        head(P, F, m, no, 'Side walls - ' + (((bySide.right || [])[0] || (bySide.left || [])[0]).note ? 'plain fabric' : 'elevations'), 'Opening sizes and offsets are explicit for coordination. Elevations are viewed face-on; front / rear orientation is identified on each wall.', noS);
        var LY = lay({ dims: 0, stackH: 0.6 }), nS = (bySide.right || []).length + (bySide.left || []).length, eh = Math.max(120, (LY.box.h - 60 * nS) / nS), y = LY.box.top + 10, kmin = 1, cx = LY.notes.x, cy = LY.notes.y, cw = LY.notes.w;
        ['right', 'left'].forEach(function (side) { (bySide[side] || []).forEach(function (s) { var sc = calcS(s); var res = elevation(P, page, F, s, sc, { x: LY.box.x + 30, top: y, w: LY.box.w - 60, h: eh }, { srcLen: s.src || rsrc, srcH: s.src || rsrc }); kmin = Math.min(kmin, res.k); P.text(s.id.toUpperCase() + ' / ' + safe(s.label).toUpperCase() + (side === 'right' ? '  -  FRONT AT LEFT, REAR AT RIGHT (viewed from inside the room)' : '  -  REAR AT LEFT, FRONT AT RIGHT (viewed from inside the room)'), LY.box.x + 30, y - 12, 6.5, F.b, INK2); y = res.bottom + 26;
          var ops = openingsOf(s, sc); P.text(s.id.toUpperCase() + ' opening assumption', cx, cy, 8, F.b, INK); cy += 12; cy = P.para((ops.length ? ops.map(function (o) { return o.label + ' ' + mm(o.w) + ' x ' + mm(o.h) + ' [' + o.src + '], left edge ' + mm(o.x) + ' [' + o.pos_src + ']' + (o.note ? ' - ' + o.note : ''); }).join('; ') : 'No openings recorded') + '. ' + fmt(sc.net_m2, 2) + ' m2 net, ' + fmt(sc.track.total_m, 2) + ' m track [D].', cx, cy, cw, 7.5, F.r, INK2, 10.5) + 10; }); });
        P.text('Finish logic', cx, cy, 8, F.b, INK); cy = P.para((rm.pack && rm.pack.sideNote) || 'Plain fabric runs between openings and onto agreed returns. No additional luminous borders, strips or wall lights on either side wall.', cx, cy + 12, cw, 7.5, F.r, INK2, 10.5) + 8;
        P.text('Edges and services', cx, cy, 8, F.b, INK); cy = P.para('Coordinate track around frames, switches and sockets. Keep removable service access. Confirm pull-out so the fabric does not foul door leaves or reveal trims.', cx, cy + 12, cw, 7.5, F.r, INK2, 10.5);
        scaleBar(P, F, LY.box.x + 30, Math.min(y + 6, PH - 80), kmin, '1:' + scaleOf(kmin) + ' on ' + (m.paper || 'A3'));
        legend(P, F); foot(P, F, m, no, total, noS + '  1:' + scaleOf(kmin));
      });
    }
    // GA-0n reflected ceiling & lighting plan
    var noC = 'GA-' + pad2(ga++);
    add(function (page, P, no, total) {
      var ceil = (bySide.ceiling || [])[0], csc = ceil ? calcS(ceil) : null, cf = rm.pack && rm.pack.coffer;
      head(P, F, m, no, 'Reflected ceiling and lighting plan', 'Plan reads from below - front wall at bottom, rear at top. ' + (csc ? 'The ceiling is fabric-covered: panels and seams as set out.' : 'The existing ceiling is retained; ') + (cf ? 'coffer dimensions and the shown LED route are ' + (cf.src === 'S' ? 'supplied.' : 'assumed.') : ''), noC);
      var LY = lay({ dims: 40, stackH: 0.58 }), box = Object.assign({}, LY.box, { top: LY.box.top + 24, h: LY.box.h - 24 }), k = Math.min(box.w / Wr, box.h / Dr), x0 = box.x + (box.w - Wr * k) / 2, y0 = box.top + (box.h - Dr * k) / 2;
      var X = function (v) { return x0 + v * k; }, Yd = function (v) { return y0 + v * k; };
      P.rect(x0, y0, Wr * k, Dr * k, PAPER); P.rectB(x0, y0, Wr * k, Dr * k, INK, 0.8);
      if (csc) { P.rect(x0, y0, Wr * k, Dr * k, FAB); hatch(P, page, x0, y0, Wr * k, Dr * k); (csc.panels || []).forEach(function (p, i) { if (i > 0) P.line(X(p.x_mm), y0, X(p.x_mm), y0 + Dr * k, GOLD, 0.8); }); }
      if (cf && cf.w && cf.h) { var cx0 = X(cf.x || 0), cy0 = Yd(Dr - (cf.y || 0) - cf.h), cw0 = cf.w * k, ch0 = cf.h * k; P.rect(cx0, cy0, cw0, ch0, PALE); for (var sx = cx0 + 6; sx < cx0 + cw0; sx += 6) P.line(sx, cy0 + 4, sx, cy0 + ch0 - 4, [190, 184, 172], 0.4); P.rectB(cx0, cy0, cw0, ch0, INK2, 0.7); var ins = (cf.inset_mm || 50) * k; P.rectB(cx0 + ins, cy0 + ins, cw0 - 2 * ins, ch0 - 2 * ins, ORANGE, 1.6); P.center((cf.label || 'EXISTING COFFER').toUpperCase(), X((cf.x || 0) + cf.w / 2), cy0 + ch0 / 2 - 8, 8, F.b, INK); P.center('Overall ' + mm(cf.w) + ' x ' + mm(cf.h) + ' [' + (cf.src || 'A') + ']', X((cf.x || 0) + cf.w / 2), cy0 + ch0 / 2 + 4, 6.5, F.r, MUT); if (cf.group) P.text(cf.group, cx0 + ins + 4, cy0 + ins + 3, 6, F.b, ORANGE);
        dimH(P, F, x0, cx0, y0 - 12, mm(cf.x || 0), cf.src || 'A'); dimH(P, F, cx0, cx0 + cw0, y0 - 12, mm(cf.w), cf.src || 'A'); dimH(P, F, cx0 + cw0, x0 + Wr * k, y0 - 12, mm(Wr - (cf.x || 0) - cf.w), 'D'); dimV(P, F, x0 - 12, y0, cy0, mm(Dr - (cf.y || 0) - cf.h), 'D'); dimV(P, F, x0 - 12, cy0, cy0 + ch0, mm(cf.h), cf.src || 'A'); }
      // wall LED groups shown at the wall lines
      Object.keys(bySide).forEach(function (side) { if (side === 'ceiling') return; bySide[side].forEach(function (s) { var sc = calcS(s); (sc.leds || []).forEach(function (l) { if (!l.group) return; var px, py; if (side === 'front') { px = X(Wr / 2); py = Yd(Dr) - 8; } else if (side === 'rear') { px = X(Wr / 2); py = y0 + 4; } else if (side === 'right') { px = X(Wr) - 16; py = Yd(Dr / 2); } else { px = x0 + 6; py = Yd(Dr / 2); } P.circ(px + 5, py + 4, 5, ORANGE, 0.8); P.center(l.group, px + 5, py, 5.5, F.b, ORANGE); }); }); });
      dimH(P, F, x0, x0 + Wr * k, y0 + Dr * k + 16, mm(Wr), rsrc, true); dimV(P, F, x0 - 26, y0, y0 + Dr * k, mm(Dr), rsrc);
      scaleBar(P, F, box.x, Math.min(y0 + Dr * k + 40, PH - 80), k, '1:' + scaleOf(k) + ' on ' + (m.paper || 'A3'));
      var cx = LY.notes.x, cy = LY.notes.y, cw = LY.notes.w;
      if (cf) { P.text((cf.group ? cf.group + ' / ' : '') + (cf.label || 'Existing coffer'), cx, cy, 8, F.b, INK); cy = P.para('Concealed 2700 K LED around the inner coffer perimeter, ' + mm(cf.inset_mm || 50) + ' inset [A]. ' + (cf.note || 'Keep existing timber slats and structure.'), cx, cy + 12, cw, 7.5, F.r, INK2, 10.5) + 8; }
      P.text('Ceiling geometry', cx, cy, 8, F.b, INK); cy = P.para(cf ? 'Study margins: ' + mm(cf.x || 0) + ' left, ' + mm(cf.y || 0) + ' rear, ' + mm(Wr - (cf.x || 0) - cf.w) + ' right, ' + mm(Dr - (cf.y || 0) - cf.h) + ' front [D]. Survey coffer opening, drop, lip and access.' : 'No ceiling feature recorded.', cx, cy + 12, cw, 7.5, F.r, INK2, 10.5) + 8;
      P.text('Control intent', cx, cy, 8, F.b, INK); cy = P.para((rm.pack && rm.pack.controlNote) || 'Separate dimming groups per lighting element. Final drivers, power, cabling and grouping by the installer.', cx, cy + 12, cw, 7.5, F.r, INK2, 10.5) + 8;
      legend(P, F); foot(P, F, m, no, total, noC + '  1:' + scaleOf(k));
    });
    // LT-01 lighting schedule
    add(function (page, P, no, total) {
      head(P, F, m, no, 'Lighting intent and indicative routes', 'All strip dimensions below follow this study geometry, not a measured installation. Route allowances, corner hardware, feeds and drivers are excluded.', 'LT-01');
      var rows = [], tot = 0;
      Object.keys(bySide).forEach(function (side) { if (side === 'ceiling') return; bySide[side].forEach(function (s) { var sc = calcS(s), ops = openingsOf(s, sc); (sc.leds || []).forEach(function (l) { var len = ledLen(s, sc, l, ops); tot += len; rows.push([l.group || '-', safe(s.label) + ' - ' + ledLabel(l.type), l.type === 'perimeter' ? mm(sc.len_mm - 2 * (l.inset_mm || 100)) + ' x ' + mm(sc.h_mm - 2 * (l.inset_mm || 100)) + ' rectangle' : l.type === 'vertical' ? '1 x ' + mm(sc.h_mm - 2 * (l.inset_mm || 100)) + (l.x_mm != null ? ' at X ' + mm(l.x_mm) : '') : l.type === 'halo' && ops[l.ref || 0] ? mm(ops[l.ref || 0].w + 2 * (l.inset_mm || 100)) + ' x ' + mm(ops[l.ref || 0].h + 2 * (l.inset_mm || 100)) + ' rectangle' : l.type === 'inside' && ops[l.ref || 0] ? '1 x ' + mm(ops[l.ref || 0].w) + ' head run' : l.type === 'frame' ? mm(sc.len_mm) + ' x ' + mm(sc.h_mm) + ' four-sided' : '-', fmt(len, 2) + ' m', l.intent || '']); }); }); });
      var cf = rm.pack && rm.pack.coffer; if (cf && cf.w) { var cl = 2 * ((cf.w - 2 * (cf.inset_mm || 50)) + (cf.h - 2 * (cf.inset_mm || 50))) / 1000; tot += cl; rows.push([cf.group || '-', (cf.label || 'Existing coffer') + ' - inner perimeter', mm(cf.w - 2 * (cf.inset_mm || 50)) + ' x ' + mm(cf.h - 2 * (cf.inset_mm || 50)) + ' rectangle', fmt(cl, 2) + ' m', cf.intent || 'Concealed inner perimeter']); }
      var totRow = ['', 'Study total', 'Calculated centreline routes', fmt(tot, 2) + ' m', 'Provisional only; not an order quantity']; totRow.__bold = true; rows.push(totRow);
      var y = tableA3(P, F, [{ label: 'Group', w: 0.06 }, { label: 'Location', w: 0.30 }, { label: 'Assumed route [A]', w: 0.27, tagCol: true }, { label: 'Length', w: 0.08, align: 'right' }, { label: 'Intent', w: 0.29 }], rows, M, 170);
      var hw = (PW - M * 2 - 40) / 2;
      P.text('Suggested scene control', M, y + 24, 9, F.b, INK); P.para((rm.pack && rm.pack.sceneNote) || 'Presentation: all groups dimmed on. Film: retain a low TV halo, dim or switch off decorative groups as preferred. These are proposed control scenes, not a selected control product.', M, y + 40, hw, 8.5, F.r, INK2, 12);
      P.text('Coordination before specification', M + hw + 40, y + 24, 9, F.b, INK); P.para('Check usable LED channel dimensions, heat management, fabric clearance, diffusers, driver access and dimming compatibility. No wattage, driver count or cable sizing is inferred from renders.', M + hw + 40, y + 40, hw, 8.5, F.r, INK2, 12);
      if (rm.pack && rm.pack.lightingRule) P.tracked(rm.pack.lightingRule.toUpperCase(), M, PH - 90, 6.5, F.b, ORANGE, 1.4);
      legend(P, F); foot(P, F, m, no, total, 'LT-01');
    });
    // DT-01 details
    add(function (page, P, no, total) {
      head(P, F, m, no, 'Material and edge details', 'Concept sections explain intent only. Manufacturer profiles, substrate fixings, tolerances and installation clearances require installer coordination.', 'DT-01');
      var tr = rm.track, inf = rm.infill, fab = rm.fabric, depth = (tr && tr.depth_mm) || 25;
      var cellW = (PW - M * 2 - 40) / 2, cells = [
        { t: 'D1 / TENSIONED FABRIC BUILD-UP', draw: function (x, y) { // section: substrate · track · infill · fabric
          P.rect(x, y, 24, 120, [200, 196, 188]); P.rect(x + 24, y, 10, 120, INK2); P.rect(x + 34, y + 6, depth * 1.4, 108, [236, 230, 218]); for (var s2 = y + 10; s2 < y + 112; s2 += 7) P.line(x + 36, s2, x + 34 + depth * 1.4 - 2, s2 + 4, [200, 190, 170], 0.4); P.rect(x + 34 + depth * 1.4, y, 3, 120, GOLD); P.text('substrate', x, y + 126, 5.5, F.r, MUT); P.text('track ' + depth, x + 24, y + 134, 5.5, F.r, MUT); P.text('fabric', x + 34 + depth * 1.4 - 6, y + 126, 5.5, F.r, MUT); },
          txt: 'Existing substrate. ' + (tr ? tr.name : depth + ' mm track') + ' [P]. ' + (inf ? inf.name + ' behind the fabric [P]. ' : '') + 'Tensioned ' + (fab ? fab.name : 'fabric') + (rm.colour ? ' ' + rm.colour : '') + '. Actual section and fire / acoustic documentation to be confirmed. ' + depth + ' mm is the proposal system depth, not a verified installed clear dimension.' },
        { t: 'D2 / BLACK BORDER WITH INWARD LED', draw: function (x, y) { P.rect(x, y, 30, 120, BLACK); P.rect(x + 30, y, 70, 120, FAB); hatch(P, page, x + 30, y, 70, 120); P.line(x + 30, y + 4, x + 30, y + 116, ORANGE, 2); for (var r2 = 0; r2 < 5; r2++) P.line(x + 32, y + 20 + r2 * 20, x + 70, y + 12 + r2 * 20, [240, 190, 120], 0.6, 0.8); P.text('frame', x + 2, y + 126, 5.5, F.r, MUT); P.text('LED', x + 32, y + 126, 5.5, F.r, ORANGE); P.text('fabric', x + 70, y + 126, 5.5, F.r, MUT); },
          txt: 'Solid matt-black face remains outside the light. Concealed channel aims inward across the fabric. Frame face sizes on the elevations are design assumptions [A]; LED offsets are not the border face dimension. Confirm the frame section, finish and its junction with the ceiling line.' },
        { t: 'D3 / RECESS - INSIDE ONLY', draw: function (x, y) { P.rect(x, y, 120, 120, BLACK); P.rect(x + 12, y + 12, 96, 96, OAK); P.line(x + 16, y + 18, x + 104, y + 18, ORANGE, 2); for (var r3 = 0; r3 < 6; r3++) P.line(x + 20 + r3 * 15, y + 22, x + 24 + r3 * 15, y + 60, [240, 200, 130], 0.6, 0.7); P.text('existing oak', x + 30, y + 90, 5.5, F.r, [60, 44, 20]); },
          txt: 'Conceal the strip at the internal head of the recess; light falls onto the oak and equipment only. No exterior LED below the frame. Keep equipment access and ventilation. Recess height is approximate [A] - measure before the frame is made.' },
        { t: 'D4 / FABRIC SAMPLE', draw: function (x, y) { if (swatch) P.cover(swatch, x, y, 120, 120); else { P.rect(x, y, 120, 120, fab && fab.hex ? (L ? L.hexRgb(fab.hex) : FAB) : FAB); hatch(P, page, x, y, 120, 120, [120, 110, 95], 5); } P.rectB(x, y, 120, 120, INK, 0.5); },
          txt: (fab ? fab.name + (rm.colour ? ' - ' + rm.colour : '') + '. ' : '') + 'The physical sample governs; renders exaggerate the weave and do not reproduce the exact colour. ' + ((rm.pack && rm.pack.sampleNote) || '') }
      ];
      var rowH = Math.min(290, (PH - 96 - 170) / 2);
      cells.forEach(function (c, i) { var x = M + (i % 2) * (cellW + 40), y = 170 + Math.floor(i / 2) * rowH; P.tracked(c.t, x, y, 7, F.r, GOLD, 1.8); P.line(x, y + 14, x + cellW, y + 14, LINE, 0.5); c.draw(x, y + 30); P.frame(x, y + 30, 120, 120); P.para(c.txt, x + 150, y + 32, cellW - 150, 9, F.r, INK2, 13); });
      legend(P, F); foot(P, F, m, no, total, 'DT-01  NTS');
    });
    // QS-01 quantities
    add(function (page, P, no, total) {
      head(P, F, m, no, 'Quantities - show the working', 'This is the set-out behind the schedule. Gross area per surface, less the recorded openings, equals net fabric. Track = perimeter + around each opening + splits. Nothing here is an order quantity until the survey confirms the geometry.', 'QS-01');
      var rows = [], T = rm.calc.totals;
      surfs.forEach(function (s) { var sc = calcS(s); if (!sc) return; rows.push([s.id.toUpperCase() + ' / ' + safe(s.label), mm(sc.len_mm) + ' x ' + mm(sc.h_mm), fmt(sc.gross_m2, 3), sc.openings.length ? sc.openings.map(function (o) { return o.label + ' ' + fmt(o.area_m2, 3) + (o.qty > 1 ? ' x' + o.qty : ''); }).join(' + ') : 'None', fmt(sc.net_m2, 3), fmt(sc.track.perimeter_m, 2) + ' + ' + fmt(sc.track.openings_m, 2) + (sc.track.split_m ? ' + ' + fmt(sc.track.split_m, 2) : '') + ' = ' + fmt(sc.track.total_m, 2), sc.n_panels + ' x ' + mm(sc.panel_w_mm), String(sc.n_cutouts || 0)]); });
      var tr = ['TOTAL / ' + surfs.length + ' surfaces', '', fmt(T.gross_m2, 3), fmt(T.openings_m2, 3) + ' total deduction', fmt(T.net_m2, 3), fmt(T.track_m, 2) + ' m', T.panels + ' panels', String(T.cutouts || 0)]; tr.__bold = true; rows.push(tr);
      var y = tableA3(P, F, [{ label: 'Surface', w: 0.17 }, { label: 'Size', w: 0.08 }, { label: 'Gross m2', w: 0.07, align: 'right' }, { label: 'Opening deduction', w: 0.27 }, { label: 'Net m2', w: 0.07, align: 'right' }, { label: 'Track m (perimeter + openings + splits)', w: 0.2 }, { label: 'Panels', w: 0.08 }, { label: 'Cut-outs', w: 0.06, align: 'right' }], rows, M, 170);
      var cw = (PW - M * 2 - 40) / 3, y2 = y + 24;
      P.text('Fabric order', M, y2, 8, F.b, INK); P.para(fmt(T.fabric_lm, 2) + ' lm of ' + (rm.opts.rollWidthMm || '-') + ' mm roll = ' + fmt(T.fabric_m2_ordered, 2) + ' m2 ordered for ' + fmt(T.net_m2, 2) + ' m2 finished (' + rm.opts.orientation + ', ' + (rm.opts.wastePct) + '% waste, ' + mm(rm.opts.gripMm) + ' mm grip each edge). Supplier minimum 5 lm.', M, y2 + 13, cw, 7.5, F.r, INK2, 10.5);
      P.text('Track and infill', M + cw + 20, y2, 8, F.b, INK); P.para(fmt(T.track_m, 2) + ' m of ' + (rm.track ? rm.track.name : 'track') + ' (' + fmt(T.track_m - T.split_m, 2) + ' perimeter + openings, ' + fmt(T.split_m, 2) + ' splits) in 2 m lengths. ' + (T.infill_m2 ? fmt(T.infill_m2, 2) + ' m2 of ' + (rm.infill ? rm.infill.name : 'infill') + ' = ' + T.infill_boards + ' sheets.' : 'No infill - fabric-only track.') + ' ' + T.screws + ' fixings at 150 mm.', M + cw + 20, y2 + 13, cw, 7.5, F.r, INK2, 10.5);
      P.text('Excluded from this study', M + 2 * (cw + 20), y2, 8, F.b, INK); P.para('Returns, reveals, frame faces, LED channels, substrate preparation, tolerances, waste beyond the cutting allowance and actual roll yield. Concealed speaker positions are not three visible cut-outs.', M + 2 * (cw + 20), y2 + 13, cw, 7.5, F.r, INK2, 10.5);
      if (m.compare && m.compare.net_m2) { var y3 = y2 + 80; P.text('Reconciliation - ' + (m.compare.label || 'other source'), M, y3, 8, F.b, INK); P.para((m.compare.label || 'The other source') + ' carries ' + fmt(m.compare.net_m2, 2) + ' m2 net' + (m.compare.track_m ? ' and ' + fmt(m.compare.track_m, 2) + ' m track' : '') + '; this set-out gives ' + fmt(T.net_m2, 2) + ' m2 and ' + fmt(T.track_m, 2) + ' m. A gap usually means a different opening assumption (' + (m.compare.note || 'see the dimension register') + ') - reconcile on survey, not by averaging.', M, y3 + 13, PW - M * 2, 7.5, F.r, INK2, 10.5); }
      P.tracked('NO PROCUREMENT TOTAL ISSUED. FABRIC, TRACK, INFILL, LED ROUTES AND DEVICE CUT-OUTS REQUIRE ONE RECONCILED MEASURED SCHEDULE.', M, PH - 68, 6.5, F.b, ORANGE, 1.4);
      foot(P, F, m, no, total, 'QS-01');
    });
    // DR-01 dimension register
    add(function (page, P, no, total) {
      head(P, F, m, no, 'Dimension register and survey priorities', 'No dimension in this issue is site-verified. The tags show where each value came from and how it may be used.', 'DR-01');
      var rows = [];
      rows.push([rsrc, 'Room envelope', mm(Wr) + ' W x ' + mm(Dr) + ' D x ' + mm(Hr) + ' H', m.sources && m.sources.room || 'Client brief / survey app', 'Check substrate vs finished faces; confirm whether lining is included']);
      surfs.forEach(function (s) { var sc = calcS(s); if (!sc) return; if (sc.len_mm !== (sideOf(s, 0) === 'front' || sideOf(s, 0) === 'rear' ? Wr : Dr) || sc.h_mm !== Hr) rows.push([s.src || 'P', s.id.toUpperCase() + ' ' + safe(s.label), mm(sc.len_mm) + ' x ' + mm(sc.h_mm), s.src === 'S' ? 'Supplied' : 'Proposal / photo', 'Measure face, base level and projection']); openingsOf(s, sc).forEach(function (o) { rows.push([o.src, s.id.toUpperCase() + ' ' + safe(o.label), mm(o.w) + ' x ' + mm(o.h) + ', left ' + mm(o.x) + ', sill ' + mm(o.sill), o.src === 'S' ? 'Client brief' : (o.src === 'P' ? 'Source proposal' : 'Photo-informed assumption'), o.note || 'Measure opening, offset and reveal']); }); if (sc.frame_mm) rows.push(['A', s.id.toUpperCase() + ' border face', mm(sc.frame_mm) + ' face', 'Design-development assumption', 'Approve section, finish and channel detail']); });
      var cf = rm.pack && rm.pack.coffer; if (cf && cf.w) rows.push([cf.src || 'A', cf.label || 'Ceiling coffer', mm(cf.w) + ' x ' + mm(cf.h) + ' at ' + mm(cf.x || 0) + ' / ' + mm(cf.y || 0) + ', LED inset ' + mm(cf.inset_mm || 50), cf.src === 'S' ? 'Supplied' : 'Photo-informed', 'Survey opening, drop, lip and access']);
      var ro = rm.pack && rm.pack.rearOpening; if (ro && ro.w) rows.push([ro.src || 'A', ro.label || 'Rear opening', mm(ro.w) + ' x ' + mm(ro.h) + ', sill ' + mm(ro.sill || 0), 'Photo-informed', 'Measure width, reveal and sill']);
      rows.push(['P', 'Track / infill / roll', (rm.track ? rm.track.depth_mm + ' mm track' : '-') + (rm.infill ? ', ' + rm.infill.thickness_mm + ' mm infill' : '') + ', ' + (rm.opts.rollWidthMm || '-') + ' mm roll ' + rm.opts.orientation, 'Source proposal / Library', 'Confirm system, roll orientation and approvals']);
      rows.push(['D', 'Net fabric / track', fmt(rm.calc.totals.net_m2, 2) + ' m2 / ' + fmt(rm.calc.totals.track_m, 2) + ' m', 'Arithmetic from the above', 'Only valid once inputs and set-out are confirmed']);
      var y = tableA3(P, F, [{ label: 'Tag', w: 0.04 }, { label: 'Item', w: 0.2 }, { label: 'Value / basis', w: 0.3 }, { label: 'Provenance', w: 0.17 }, { label: 'Required check', w: 0.29 }], rows.slice(0, LAND ? 18 : 26), M, 170, { size: 7.5 });
      P.text('Survey first', M, Math.min(y + 24, PH - 150), 9, F.b, INK); P.para((rm.pack && rm.pack.surveyNote) || 'Room diagonals and levels; clear wall / reveal dimensions; all opening offsets; pier projections and returns; recess depth and equipment access; ceiling coffer lip and drop; diffuser / speaker positions; services; LED driver access; substrate condition.', M, Math.min(y + 40, PH - 134), PW - M * 2, 8.5, F.r, INK2, 12);
      P.tracked('DRAWINGS ARE COORDINATED STUDY GEOMETRY. DO NOT SCALE FROM AI VISUALISATIONS OR FABRICATE FROM ASSUMPTIONS.', M, PH - 68, 6.5, F.b, ORANGE, 1.4);
      foot(P, F, m, no, total, 'DR-01');
    });
    // closing — remaining renders + source record
    add(function (page, P, no, total) {
      var rest = imgs.slice(2, 4);
      head(P, F, m, no, rest.length ? (m.scheme.altTitle || 'Further views') : 'Source record', rest.length ? (m.scheme.altBlurb || 'The remaining selected visualisations, kept for comparison.') : '', 'RETAINED COMPARISON');
      var bw = (PW - M * 2 - 24) / 2, bh = Math.min(bw * 0.56, PH * 0.42), iy0 = 170;
      rest.forEach(function (x, i) { var bx = M + i * (bw + 24); P.cover(x.img, bx, iy0, bw, bh); P.frame(bx, iy0, bw, bh); P.tracked(safe(x.r.caption || '').toUpperCase().slice(0, 70), bx, iy0 + bh + 14, 6.5, F.r, GOLD, 1.6); P.para(x.r.note || '', bx, iy0 + bh + 28, bw, 8.5, F.r, INK2, 12); });
      var sy = rest.length ? iy0 + bh + 70 : 170;
      P.text('Source record', M, sy, 9, F.b, INK); P.para(m.sourceRecord || ('Drawn from Stretched Fabric design ' + (m.configLabel || '') + ' (fabric_configs), the Library (Cineca pricelist, filed 2026-10-22) and the project record. Every value above can be traced to the app; change the design there and re-issue this pack rather than editing the drawings.'), M, sy + 16, PW - M * 2, 8.5, F.r, INK2, 12);
      if (m.quoteRef) { P.text('Proposal reference', M, sy + 70, 9, F.b, INK); P.text(m.quoteRef, M, sy + 86, 12, F.b, INK); P.text('Commercials are carried on the formal Sonor quotation, which governs. This pack sets out the design and the geometry only.', M, sy + 106, 8, F.r, MUT); }
      foot(P, F, m, no, total, '');
    });
    // rear page — the full contact block, once (luxury rearPage, sonor-platform §43)
    add(function (page, P, no, total) {
      P.rect(0, 0, PW, PH, [22, 19, 24]);
      P.logo(M, M * 0.62 + 22, 30, CREAM); P.tracked('SONOR', M + 37, M * 0.62 + 28, 18, F.b, CREAM, 4.2);
      var ty = PH * 0.42; P.text('Smart homes, beautifully done.', M, ty, 22, F.l, GOLDL); P.line(M, ty + 62, PW - M, ty + 62, GOLD, 0.5, 0.45);
      var cw = (PW - M * 2) / 2, rows = [[['NEW PROJECTS & PROPOSALS', 'projects@sonor.co.uk'], ['SERVICE & SUPPORT', 'service@sonor.co.uk']], [['TELEPHONE', '+44 7933 684 000'], ['WEB', 'sonor.co.uk']]];
      rows.forEach(function (r, ri) { r.forEach(function (c, ci) { var x = M + ci * cw, y = ty + 84 + ri * 46; P.tracked(c[0], x, y, 7, F.r, INFO, 1.8); P.text(c[1], x, y + 13, 13, F.b, CREAM); }); });
      P.text('Sonor Ltd  ·  Chester, England  ·  Trusted by homeowners across the North West & Wales', M, ty + 194, 8.5, F.r, INFO);
      P.tracked('CEDIA MEMBER', M, PH - 46, 6, F.r, INFO, 1.2);
    });

    function finish() {
      var total = sheets.length;
      sheets.forEach(function (fn, i) { var page = doc.addPage([PW * SCALE, PH * SCALE]); if (SCALE !== 1) page.pushOperators(PL.pushGraphicsState(), PL.scale(SCALE, SCALE)); var P = mk(page, F); P.rect(0, 0, PW, PH, PAPER); fn(page, P, i + 1, total); if (SCALE !== 1) page.pushOperators(PL.popGraphicsState()); });
      doc.setTitle('Design & dimension pack - ' + (m.projectNo || '') + ' ' + (m.title || '') + ' ' + (m.rev || 'R1') + ' (' + (m.paper || 'A3') + ' ' + (LAND ? 'landscape' : 'portrait') + ')'); doc.setAuthor('Sonor Ltd');
      return doc.save();
    }
    return finish();
  }

  global.SonorFabricPack = { generate: generate, VERSION: '0.4.0', sideOf: sideOf, openingsOf: openingsOf, ledLen: ledLen, TAGS: TAGS };
})(window);
