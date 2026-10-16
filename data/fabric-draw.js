/* Sonor Stretched Fabric — elevation drawing (v0.1.0)
   SonorFabricDraw — ONE geometry model → two painters: inline SVG for the app (Layout step) and
   pdf-lib primitives for the proposal (fabric-pdf.js). Pure: takes a surface + its calc result.
   Layout: panels left→right at the fabric width (seams = split track, drawn as a double line),
   openings spaced from the left edge (no x is recorded — a set-out drawing, not a survey),
   cut-outs as a count rail along the top. Dimensions in mm along the bottom + left.
*/
(function (global) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // openings set-out (shared by both painters) → [{x,y,w,h,label,qty}] in mm, first-come left→right
  function layoutOpenings(surface, calc) {
    var out = [], x = 300, len = calc.len_mm, h = calc.h_mm;
    (calc.openings || []).forEach(function (op) {
      for (var i = 0; i < op.qty; i++) {
        if (x + op.w > len - 150) x = Math.max(150, len - op.w - 150);
        var y = (/door/i.test(op.label) && calc.kind === 'wall') ? h - op.h : (calc.kind === 'ceiling' ? Math.max(150, (h - op.h) / 2) : Math.max(300, (h - op.h) / 2));
        out.push({ x: x, y: Math.max(0, y), w: op.w, h: op.h, label: op.label });
        x += op.w + 300;
      }
    });
    return out;
  }

  // ── SVG (app) ────────────────────────────────────────────────────────────
  function svg(surface, calc, opts) {
    opts = opts || {};
    var len = calc.len_mm || 1, h = calc.h_mm || 1;
    var W = opts.width || 560, pad = 34, padB = 44;
    var sc = (W - pad * 2) / len, H = h * sc + pad + padB;
    var ox = pad, oy = pad - 8;
    var gold = opts.gold || '#ad9978', line = opts.line || 'rgba(244,241,236,.28)', ink = opts.ink || '#8f8574', cream = opts.cream || '#F4F1EC';
    var s = '<svg class="elev" viewBox="0 0 ' + W + ' ' + H + '" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(surface.label) + ' elevation">';
    s += '<rect x="' + ox + '" y="' + oy + '" width="' + (len * sc) + '" height="' + (h * sc) + '" fill="rgba(173,153,120,.07)" stroke="' + gold + '" stroke-width="1.4"/>';
    // panels / seams
    (calc.panels || []).forEach(function (p, i) {
      var px = ox + p.x_mm * sc, pw = p.w_mm * sc;
      if (i > 0) { s += '<line x1="' + (px - 1.2) + '" y1="' + oy + '" x2="' + (px - 1.2) + '" y2="' + (oy + h * sc) + '" stroke="' + gold + '" stroke-width="1" opacity=".9"/><line x1="' + (px + 1.2) + '" y1="' + oy + '" x2="' + (px + 1.2) + '" y2="' + (oy + h * sc) + '" stroke="' + gold + '" stroke-width="1" opacity=".9"/>'; }
      s += '<text x="' + (px + pw / 2) + '" y="' + (oy + 14) + '" text-anchor="middle" font-size="9" fill="' + ink + '" font-family="DM Sans,system-ui,sans-serif" letter-spacing=".08em">P' + p.i + ' · ' + p.w_mm + '</text>';
    });
    // openings
    layoutOpenings(surface, calc).forEach(function (o) {
      s += '<rect x="' + (ox + o.x * sc) + '" y="' + (oy + o.y * sc) + '" width="' + (o.w * sc) + '" height="' + (o.h * sc) + '" fill="rgba(9,8,7,.55)" stroke="' + line + '" stroke-width="1" stroke-dasharray="3 2"/>';
      s += '<text x="' + (ox + (o.x + o.w / 2) * sc) + '" y="' + (oy + (o.y + o.h / 2) * sc + 3) + '" text-anchor="middle" font-size="8.5" fill="' + cream + '" opacity=".75" font-family="DM Sans,system-ui,sans-serif">' + esc(o.label) + ' ' + o.w + '×' + o.h + '</text>';
    });
    // cut-outs rail
    var nco = calc.n_cutouts || 0;
    if (nco) {
      var cx0 = ox + len * sc - 10;
      for (var k = 0; k < Math.min(nco, 12); k++) s += '<circle cx="' + (cx0 - k * 12) + '" cy="' + (oy + h * sc - 12) + '" r="3.2" fill="none" stroke="' + cream + '" stroke-width="1" opacity=".7"/>';
      s += '<text x="' + (cx0 - Math.min(nco, 12) * 12 - 2) + '" y="' + (oy + h * sc - 9) + '" text-anchor="end" font-size="8.5" fill="' + ink + '" font-family="DM Sans,system-ui,sans-serif">' + nco + ' cut-out' + (nco > 1 ? 's' : '') + '</text>';
    }
    // dimensions
    var by = oy + h * sc + 16;
    s += '<line x1="' + ox + '" y1="' + by + '" x2="' + (ox + len * sc) + '" y2="' + by + '" stroke="' + line + '" stroke-width="1"/>';
    s += '<text x="' + (ox + len * sc / 2) + '" y="' + (by + 12) + '" text-anchor="middle" font-size="9.5" fill="' + ink + '" font-family="DM Mono,ui-monospace,monospace">' + len + ' mm</text>';
    s += '<line x1="' + (ox - 12) + '" y1="' + oy + '" x2="' + (ox - 12) + '" y2="' + (oy + h * sc) + '" stroke="' + line + '" stroke-width="1"/>';
    s += '<text transform="translate(' + (ox - 16) + ',' + (oy + h * sc / 2) + ') rotate(-90)" text-anchor="middle" font-size="9.5" fill="' + ink + '" font-family="DM Mono,ui-monospace,monospace">' + h + ' mm</text>';
    s += '</svg>';
    return s;
  }

  // ── pdf-lib (proposal) — P = SonorPdfLuxury.mk(page), box = {x, top, w, h} in pt ──
  function pdf(P, F, lx, surface, calc, box) {
    var len = calc.len_mm || 1, h = calc.h_mm || 1, COL = lx.COL;
    var sc = Math.min(box.w / len, box.h / h);
    var dw = len * sc, dh = h * sc, x0 = box.x + (box.w - dw) / 2, y0 = box.top;
    P.rect(x0, y0, dw, dh, [244, 240, 232], 1);
    P.rectB(x0, y0, dw, dh, COL.GOLD, 0.9);
    (calc.panels || []).forEach(function (p, i) {
      var px = x0 + p.x_mm * sc;
      if (i > 0) { P.vline(px - 0.9, y0, y0 + dh, COL.GOLD, 0.6, 0.9); P.vline(px + 0.9, y0, y0 + dh, COL.GOLD, 0.6, 0.9); }
      if (p.w_mm * sc > 26) P.center('P' + p.i, px + p.w_mm * sc / 2, y0 + 5, 5.5, F.r, COL.MUT, 1);
    });
    layoutOpenings(surface, calc).forEach(function (o) {
      P.rect(x0 + o.x * sc, y0 + o.y * sc, o.w * sc, o.h * sc, [226, 220, 208], 1);
      P.rectB(x0 + o.x * sc, y0 + o.y * sc, o.w * sc, o.h * sc, COL.MUT, 0.5, 0.8);
      if (o.w * sc > 30) P.center(String(o.label).toUpperCase(), x0 + (o.x + o.w / 2) * sc, y0 + (o.y + o.h / 2) * sc - 3, 5, F.r, COL.MUT, 0.8);
    });
    // dims
    P.hline(x0, x0 + dw, y0 + dh + 9, COL.LINE, 0.5);
    P.center(len + ' mm', x0 + dw / 2, y0 + dh + 11, 6.5, F.r, COL.MUT);
    P.vline(x0 - 8, y0, y0 + dh, COL.LINE, 0.5);
    P.text(h + ' mm', x0 - 8 - F.r.widthOfTextAtSize(h + ' mm', 6.5) - 3, y0 + dh / 2 - 3, 6.5, F.r, COL.MUT);
    return { x: x0, top: y0, w: dw, h: dh, bottom: y0 + dh + 22 };
  }

  global.SonorFabricDraw = { svg: svg, pdf: pdf, layoutOpenings: layoutOpenings };
})(window);
