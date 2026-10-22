/* Sonor Stretched Fabric — ROOM PHOTO SIMULATOR (v0.3.1 — masks · wall-luminance match · deep-link project)
   SonorFabricSim — the Garden Lighting sim pattern (data/garden-sim.js: mount / render / renderToDataUrl)
   turned on a room photo: the client's existing wall becomes the chosen fabric, with the panel seams
   from the calc, and LED coves / skirting glow along traced edges.

   photo = { src, w, h, dim, walls:[…], leds:[…] }
     wall = { id, surfaceId, label, quad:[[x,y]×4]  (normalised, TL TR BR BL as you face the wall),
              hex, kind ('velvet'|'suede'|'at-weave'|'fabric'), seams:[u…] (0–1 along the wall), sheen, grain }
     led  = { id, path:[[x,y]…] (normalised polyline), cct, hex, intensity, spread (px/H), side (+1 below/right, −1 above/left), label }

   Fabric is painted in WALL SPACE (a texture tile) and mapped through the homography unit-square → quad
   (grid of affine triangles, Canvas 2D). The photo's own luminosity is kept under the colour
   ('luminosity' composite) so shadows, skirting and the light falling on the wall survive — the fabric
   reads as the real wall re-covered, not a flat decal. Seams are drawn through the same homography.
   LED glow = the Garden 'path' light (additive, one-sided spill) over a dim-graded photo.
   House pattern: IIFE, one global, no deps.
*/
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;

  // ── maths ────────────────────────────────────────────────────────────────
  function hexRgb(h) { h = String(h || '#777').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16); if (!isFinite(n)) return [120, 120, 120]; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)) + ')'; }
  function cctRgb(k) { k = Math.max(1800, Math.min(6500, Number(k) || 2700)) / 100; var r, g, b; if (k <= 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; b = k <= 19 ? 0 : 138.52 * Math.log(k - 10) - 305.04; } else { r = 329.7 * Math.pow(k - 60, -0.1332); g = 288.12 * Math.pow(k - 60, -0.0755); b = 255; } return [r, g, b].map(function (v) { return Math.round(Math.max(0, Math.min(255, v))); }); }
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

  // homography unit square (u,v) → quad [TL,TR,BR,BL] (screen px) — the standard 8-dof solve
  function homography(q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1], x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var det = dx1 * dy2 - dx2 * dy1; if (!det) det = 1e-9;
    var g = (dx3 * dy2 - dx2 * dy3) / det, h = (dx1 * dy3 - dx3 * dy1) / det;
    var a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
    return function (u, v) { var w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
  }
  function quadPx(w, W, H) { return w.quad.map(function (p) { return [p[0] * W, p[1] * H]; }); }
  function quadArea(q) { var s = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function pointInQuad(q, p) { var sgn = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4]; var c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (c) { if (sgn && Math.sign(c) !== sgn) return false; sgn = Math.sign(c); } } return true; }

  // ── fabric texture tile (wall space) ─────────────────────────────────────
  var _tiles = {};
  function tile(hex, kind, sheen) {
    var key = hex + '|' + kind + '|' + (sheen || 0); if (_tiles[key]) return _tiles[key];
    var S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S; var c = cv.getContext('2d'), rgb = hexRgb(hex);
    c.fillStyle = rgba(rgb, 1); c.fillRect(0, 0, S, S);
    var id = c.getImageData(0, 0, S, S), d = id.data, seed = 1234567;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var grain = kind === 'at-weave' || kind === 'fabric' ? 14 : kind === 'suede' ? 9 : 7;
    for (var i = 0; i < d.length; i += 4) { var n = (rnd() - 0.5) * grain; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(id, 0, 0);
    if (kind === 'at-weave' || kind === 'fabric') {   // fine weave: hairline cross-hatch
      c.globalAlpha = 0.05; c.strokeStyle = '#000'; c.lineWidth = 1;
      for (var x = 0; x < S; x += 2) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, S); c.stroke(); }
      for (var y = 0; y < S; y += 2) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(S, y + 0.5); c.stroke(); }
      c.globalAlpha = 1;
    }   // velvet / suede: the sheen is laid across the WHOLE wall in wallTexture (a per-tile gradient reads as patches)
    _tiles[key] = cv; return cv;
  }

  // one wall-sized texture (the tile repeated with createPattern, one soft sheen across the whole wall) — mapped
  // through the homography as a grid of affine triangles with LINEAR texture coords (no per-cell wrap → no grid lines)
  var _walls = {};
  function wallTexture(hex, kind, sheen, repU, repV) {
    var key = [hex, kind, sheen, repU, repV].join('|'); if (_walls[key]) return _walls[key];
    var t = tile(hex, kind, sheen), W = Math.min(2048, 256 * repU), H = Math.min(1024, 256 * repV);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
    c.fillStyle = c.createPattern(t, 'repeat'); c.fillRect(0, 0, W, H);
    if (kind !== 'at-weave' && kind !== 'fabric') { var g = c.createLinearGradient(0, 0, W, H * 0.6); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,' + (0.04 + 0.07 * (sheen == null ? 0.5 : sheen)) + ')'); g.addColorStop(1, 'rgba(0,0,0,.06)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    _walls[key] = cv; return cv;
  }
  // mean luminance (0–1) of the photo inside a quad — sampled on a small canvas
  var _lumCv = null;
  function meanLum(img, q, W, H) {
    try {
      var S = 96; if (!_lumCv) _lumCv = document.createElement('canvas'); _lumCv.width = S; _lumCv.height = S;
      var c = _lumCv.getContext('2d'); c.clearRect(0, 0, S, S); c.drawImage(img, 0, 0, W, H, 0, 0, S, S);
      var d = c.getImageData(0, 0, S, S).data, sum = 0, n = 0;
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { if (!pointInQuad(q, [(x + 0.5) / S * W, (y + 0.5) / S * H])) continue; var i = (y * S + x) * 4; sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
      return n ? sum / n : null;
    } catch (e) { return null; }
  }
  var _lumLay = null;
  function lumLayer(W, H) { if (!_lumLay) _lumLay = document.createElement('canvas'); if (_lumLay.width !== W || _lumLay.height !== H) { _lumLay.width = W; _lumLay.height = H; } return _lumLay; }
  function drawTexturedQuad(ctx, tex, q, cols, rows) {
    var H = homography(q), tw = tex.width, th = tex.height;
    cols = cols || 20; rows = rows || 14;
    function tri(p0, p1, p2, t0, t1, t2) {
      var x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
      var u0 = t0[0], v0 = t0[1], u1 = t1[0], v1 = t1[1], u2 = t2[0], v2 = t2[1];
      var det = u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1); if (Math.abs(det) < 1e-9) return;
      var a = (x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1)) / det, b = (y0 * (v1 - v2) - y1 * (v0 - v2) + y2 * (v0 - v1)) / det;
      var c = (u0 * (x1 - x2) - u1 * (x0 - x2) + u2 * (x0 - x1)) / det, d = (u0 * (y1 - y2) - u1 * (y0 - y2) + u2 * (y0 - y1)) / det;
      var e = (u0 * (v1 * x2 - v2 * x1) - u1 * (v0 * x2 - v2 * x0) + u2 * (v0 * x1 - v1 * x0)) / det, f = (u0 * (v1 * y2 - v2 * y1) - u1 * (v0 * y2 - v2 * y0) + u2 * (v0 * y1 - v1 * y0)) / det;
      ctx.save();
      var cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, k = 1.004;   // a hair of overlap so cells never show a hairline gap
      ctx.beginPath(); ctx.moveTo(cx + (x0 - cx) * k, cy + (y0 - cy) * k); ctx.lineTo(cx + (x1 - cx) * k, cy + (y1 - cy) * k); ctx.lineTo(cx + (x2 - cx) * k, cy + (y2 - cy) * k); ctx.closePath(); ctx.clip();
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(tex, 0, 0);
      ctx.restore();
    }
    for (var r = 0; r < rows; r++) for (var cI = 0; cI < cols; cI++) {
      var u0 = cI / cols, u1 = (cI + 1) / cols, v0 = r / rows, v1 = (r + 1) / rows;
      var P00 = H(u0, v0), P10 = H(u1, v0), P11 = H(u1, v1), P01 = H(u0, v1);
      var t00 = [u0 * tw, v0 * th], t10 = [u1 * tw, v0 * th], t11 = [u1 * tw, v1 * th], t01 = [u0 * tw, v1 * th];
      tri(P00, P10, P11, t00, t10, t11); tri(P00, P11, P01, t00, t11, t01);
    }
  }

  // ── paint one wall ───────────────────────────────────────────────────────
  function paintWall(ctx, img, W, H, w, opts) {
    var q = quadPx(w, W, H); if (quadArea(q) < 50) return;
    var hex = w.hex || '#4a4642', kind = w.kind || 'velvet';
    var aspect = Math.max(0.3, Math.min(6, (w.len_mm || 4000) / (w.h_mm || 2400)));
    var repU = Math.max(1, Math.round(aspect * 3)), repV = 3;
    var tex = wallTexture(hex, kind, w.sheen == null ? 0.5 : w.sheen, repU, repV);
    ctx.save();
    ctx.beginPath(); q.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.clip();
    // 1 — flat fabric colour + texture through the homography
    drawTexturedQuad(ctx, tex, q, 22, 14);
    // 2 — the photo's own light back on top (luminosity of the photo, hue/sat of the fabric) — the wall's mean
    //     luminance inside the quad is first scaled to the fabric's own value, so a pale painted wall does not
    //     lift a dark velvet to beige: shading and light stay, the level is the fabric's
    var keep = opts && opts.keepLight != null ? opts.keepLight : (w.keepLight == null ? 0.62 : w.keepLight);
    var rgb = hexRgb(hex), lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    if (keep > 0) {
      var wallLum = meanLum(img, q, W, H) || 0.6, gain = Math.max(0.25, Math.min(1.6, (lum + 0.06) / (wallLum + 0.06)));
      // the gain is applied on an offscreen copy (source-over, so the filter is guaranteed) — a filter on a
      // non-source-over composite is not honoured everywhere
      var lv = lumLayer(W, H), lc2 = lv.getContext('2d'); lc2.clearRect(0, 0, W, H);
      if ('filter' in lc2) lc2.filter = 'brightness(' + gain.toFixed(3) + ')';
      lc2.drawImage(img, 0, 0, W, H); lc2.filter = 'none';
      if (!('filter' in lc2) && gain < 1) { lc2.globalCompositeOperation = 'multiply'; lc2.fillStyle = 'rgba(0,0,0,' + (1 - gain) + ')'; lc2.fillRect(0, 0, W, H); lc2.globalCompositeOperation = 'source-over'; }
      ctx.globalCompositeOperation = 'luminosity'; ctx.globalAlpha = keep;
      ctx.drawImage(lv, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // 3 — hold the fabric's own value: a light multiply toward the fabric colour (stronger the darker the fabric)
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(rgb, 0.22 + 0.3 * (1 - lum)); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    // 4 — seams = split track at every panel joint (drawn in wall space: u fractions, full height)
    var Hm = homography(q), seams = w.seams || [];
    if (seams.length && w.showSeams !== false) {
      var n = 18;
      seams.forEach(function (u) {
        if (u <= 0.002 || u >= 0.998) return;
        ctx.beginPath(); for (var i = 0; i <= n; i++) { var p = Hm(u, i / n); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
        ctx.lineWidth = Math.max(1, H * 0.0022); ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.stroke();
        ctx.beginPath(); for (var j = 0; j <= n; j++) { var p2 = Hm(u + 0.0025, j / n); if (j) ctx.lineTo(p2[0], p2[1]); else ctx.moveTo(p2[0], p2[1]); }
        ctx.lineWidth = Math.max(0.6, H * 0.0012); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.stroke();
      });
    }
    // 4b — railroaded runs: the seams are horizontal (v fractions)
    (w.hseams || []).forEach(function (v) {
      if (v <= 0.002 || v >= 0.998 || w.showSeams === false) return;
      ctx.beginPath(); for (var i = 0; i <= 18; i++) { var p = Hm(i / 18, v); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      ctx.lineWidth = Math.max(1, H * 0.0022); ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.stroke();
    });
    // 5 — perimeter shadow line (the track reveal) so the wall reads as a tailored panel
    ctx.beginPath(); q.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.lineWidth = Math.max(1.2, H * 0.003); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
    ctx.restore();
  }

  // ── LED glow along a traced edge (Garden 'path' light: one-sided spill, painted on a layer and blurred) ──
  var _lay = null, _lctx = null;
  function layer(W, H) { if (!_lay) { _lay = document.createElement('canvas'); _lctx = _lay.getContext('2d'); } if (_lay.width !== W || _lay.height !== H) { _lay.width = W; _lay.height = H; } _lctx.setTransform(1, 0, 0, 1, 0, 0); _lctx.globalCompositeOperation = 'source-over'; _lctx.filter = 'none'; _lctx.clearRect(0, 0, W, H); return _lctx; }
  function paintLedTo(lc, W, H, l, I) {
    var pts = (l.path || []).map(function (q) { return [q[0] * W, q[1] * H]; }); if (pts.length < 2) return;
    var c = l.hex ? hexRgb(l.hex) : cctRgb(l.cct || 2700);
    I = (I == null ? 1 : I) * (l.intensity == null ? 0.8 : l.intensity);
    var thick = Math.max(4, H * 0.010 * Math.max(0.3, (l.spread || 60) / 60)), side = l.side == null ? 1 : l.side, spill = Math.max(10, (l.len || 0.22) * H);
    lc.save(); lc.globalCompositeOperation = 'lighter'; lc.lineCap = 'round'; lc.lineJoin = 'round';
    function strokePath(w, col) { lc.lineWidth = w; lc.strokeStyle = col; lc.beginPath(); pts.forEach(function (q, i) { if (i) lc.lineTo(q[0], q[1]); else lc.moveTo(q[0], q[1]); }); lc.stroke(); }
    // one-sided spill: a fan of offset strokes, wide and faint, fading away from the edge (blurred afterwards)
    var n = 14;
    for (var sp = 1; sp <= n; sp++) {
      var off = spill * sp / n, a2 = I * 0.028 * Math.pow(1 - sp / (n + 1), 2.2);
      lc.beginPath();
      pts.forEach(function (q, i) {
        var pr = pts[Math.max(0, i - 1)], nx2 = pts[Math.min(pts.length - 1, i + 1)], tx = nx2[0] - pr[0], ty = nx2[1] - pr[1], L = Math.hypot(tx, ty) || 1;
        var ox = -ty / L * off * side, oy = tx / L * off * side;
        if (i) lc.lineTo(q[0] + ox, q[1] + oy); else lc.moveTo(q[0] + ox, q[1] + oy);
      });
      lc.lineWidth = spill / n * 1.6; lc.strokeStyle = rgba(c, a2); lc.stroke();
    }
    strokePath(thick * 3.2, rgba(c, I * 0.16)); strokePath(thick * 1.4, rgba(c, I * 0.35));
    lc.restore();
  }
  function paintLeds(ctx, W, H, leds, I) {
    var hasFilter = 'filter' in ctx, blurPx = Math.max(2, Math.round(H * 0.012));
    var lc = layer(W, H);
    leds.forEach(function (l) { paintLedTo(lc, W, H, l, I); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (hasFilter) ctx.filter = 'blur(' + blurPx + 'px)';
    ctx.drawImage(_lay, 0, 0); ctx.filter = 'none';
    // the bright core line itself (crisp)
    leds.forEach(function (l) {
      var pts = (l.path || []).map(function (q) { return [q[0] * W, q[1] * H]; }); if (pts.length < 2) return;
      var c = l.hex ? hexRgb(l.hex) : cctRgb(l.cct || 2700), Ii = (I == null ? 1 : I) * (l.intensity == null ? 0.8 : l.intensity), thick = Math.max(4, H * 0.010 * Math.max(0.3, (l.spread || 60) / 60));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.lineWidth = thick * 0.45; ctx.strokeStyle = rgba([255, 250, 236], Ii * 0.8); ctx.stroke();
      ctx.lineWidth = thick * 1.1; ctx.strokeStyle = rgba(c, Ii * 0.3); ctx.stroke();
    });
    ctx.restore();
  }

  // ── full render ──────────────────────────────────────────────────────────
  function render(ctx, img, W, H, photo, opts) {
    opts = opts || {};
    var dim = Math.max(0, Math.min(1, photo.dim == null ? 0 : photo.dim)), hasLed = (photo.leds || []).length > 0;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    if ('filter' in ctx && dim) ctx.filter = 'brightness(' + (1 - 0.55 * dim).toFixed(3) + ') saturate(' + (1 - 0.25 * dim).toFixed(3) + ')';
    ctx.drawImage(img, 0, 0, W, H); ctx.filter = 'none';
    if (!('filter' in ctx) && dim) { ctx.fillStyle = 'rgba(0,0,0,' + 0.5 * dim + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    // walls — the fabric is sampled from the UNDIMMED photo's light, then dimmed with the room
    var base = img;
    if (dim) { var dc = document.createElement('canvas'); dc.width = W; dc.height = H; var d2 = dc.getContext('2d'); if ('filter' in d2) d2.filter = 'brightness(' + (1 - 0.55 * dim).toFixed(3) + ')'; d2.drawImage(img, 0, 0, W, H); base = dc; }
    // v0.3.0 masks: photo.masks[] polygons (normalised) — anything standing in front of the wall (sofa, TV, radiator) is cut out of every paint
    ctx.save(); blockMasks(ctx, W, H, photo.masks);
    (photo.walls || []).forEach(function (w) { if (w.quad && w.quad.length === 4) paintWall(ctx, base, W, H, w, opts); });
    if (hasLed) {
      paintLeds(ctx, W, H, photo.leds || [], opts.ledPct == null ? 1 : opts.ledPct);
      // warm lift so additive glow does not clip to white
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,200,120,' + (0.06 * dim) + ')'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.restore();
  }
  function blockMasks(ctx, W, H, masks) {
    masks = (masks || []).filter(function (m) { return m.points && m.points.length >= 3; }); if (!masks.length) return;
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    masks.forEach(function (m) { m.points.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * W, p[1] * H); else ctx.moveTo(p[0] * W, p[1] * H); }); ctx.closePath(); });
    ctx.clip('evenodd');
  }

  // ── editor mount ─────────────────────────────────────────────────────────
  // mount(host, photo, hooks{onChange,onSelect,onMode}) → ctl
  function mount(host, photo, hooks) {
    hooks = hooks || {};
    host.innerHTML = ''; host.classList.add('fs-host');
    var cv = document.createElement('canvas'); cv.className = 'fs-canvas'; host.appendChild(cv);
    var ctx = cv.getContext('2d'), work = document.createElement('canvas'), wctx = work.getContext('2d');
    var img = null, W = 0, H = 0, dpr = Math.max(1, global.devicePixelRatio || 1);
    var ctl = { mode: null, draft: [], preset: null, selected: null, selKind: null, dragging: null, dirty: true, showMarkers: true, ledPct: 1 };
    photo.walls = photo.walls || []; photo.leds = photo.leds || []; photo.masks = photo.masks || []; if (photo.dim == null) photo.dim = 0;

    function fit() { if (!img) return; var w = host.clientWidth || 800, s = w / W, h = Math.round(H * s); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctl.dirty = true; draw(); }
    function draw() {
      if (!img) return;
      if (ctl.dirty) { render(wctx, img, W, H, photo, { ledPct: ctl.ledPct }); ctl.dirty = false; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(work, 0, 0, cv.width, cv.height);
      if (!ctl.showMarkers) return;
      function poly(pts, col, close, width) { if (!pts || pts.length < 2) return; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * cv.width, p[1] * cv.height); else ctx.moveTo(p[0] * cv.width, p[1] * cv.height); }); if (close) ctx.closePath(); ctx.setLineDash([5 * dpr, 4 * dpr]); ctx.lineWidth = (width || 1.4) * dpr; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]); }
      function dots(pts, fill, stroke, r) { (pts || []).forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * cv.width, p[1] * cv.height, (r || 4.5) * dpr, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = stroke; ctx.stroke(); }); }
      photo.walls.forEach(function (w) { var sel = ctl.selKind === 'wall' && ctl.selected === w.id; poly(w.quad, sel ? 'rgba(201,168,92,.95)' : 'rgba(201,168,92,.45)', true, sel ? 1.8 : 1.2); if (sel) dots(w.quad, '#fff', '#c9a85c'); var cxy = w.quad.reduce(function (a, p) { return [a[0] + p[0] / 4, a[1] + p[1] / 4]; }, [0, 0]); ctx.fillStyle = sel ? 'rgba(201,168,92,.95)' : 'rgba(9,8,7,.7)'; ctx.font = '700 ' + (9 * dpr) + 'px Gilroy, DM Sans, sans-serif'; ctx.textAlign = 'center'; var lab = w.label || 'Wall'; var tw = ctx.measureText(lab).width + 12 * dpr; ctx.fillRect(cxy[0] * cv.width - tw / 2, cxy[1] * cv.height - 8 * dpr, tw, 15 * dpr); ctx.fillStyle = sel ? '#15120c' : '#f4f1ec'; ctx.textBaseline = 'middle'; ctx.fillText(lab, cxy[0] * cv.width, cxy[1] * cv.height); ctx.textBaseline = 'alphabetic'; });
      (photo.masks || []).forEach(function (m) { var sel = ctl.selKind === 'mask' && ctl.selected === m.id; poly(m.points, sel ? 'rgba(236,96,97,.95)' : 'rgba(236,96,97,.55)', true, sel ? 1.8 : 1.2); ctx.fillStyle = 'rgba(236,96,97,.10)'; ctx.fill(); if (sel) dots(m.points, '#fff', '#ec6061', 4); });
      photo.leds.forEach(function (l) { var sel = ctl.selKind === 'led' && ctl.selected === l.id; poly(l.path, sel ? 'rgba(245,208,92,.95)' : 'rgba(245,208,92,.5)', false, sel ? 1.8 : 1.2); if (sel) dots(l.path, '#fff', '#f5d05c', 4); });
      if (ctl.mode && ctl.draft.length) { var dc = ctl.mode === 'wall' ? 'rgba(201,168,92,.95)' : ctl.mode === 'mask' ? 'rgba(236,96,97,.95)' : 'rgba(245,208,92,.95)'; poly(ctl.draft, dc, false); dots(ctl.draft, '#fff', ctl.mode === 'wall' ? '#c9a85c' : ctl.mode === 'mask' ? '#ec6061' : '#f5d05c', 3.5); }
    }
    function toRel(ev) { var r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))]; }
    function near(p, rel, px) { return Math.hypot((p[0] - rel[0]) * cv.width, (p[1] - rel[1]) * cv.height) <= (px || 9) * dpr; }
    function selectedObj() { if (ctl.selKind === 'wall') return photo.walls.find(function (w) { return w.id === ctl.selected; }) || null; if (ctl.selKind === 'led') return photo.leds.find(function (l) { return l.id === ctl.selected; }) || null; if (ctl.selKind === 'mask') return photo.masks.find(function (m) { return m.id === ctl.selected; }) || null; return null; }
    function ptsOf(kind, o) { return kind === 'wall' ? o.quad : kind === 'led' ? o.path : o.points; }
    function changed() { ctl.dirty = true; draw(); if (hooks.onChange) hooks.onChange(); }
    function select(kind, id) { ctl.selKind = kind; ctl.selected = id; draw(); if (hooks.onSelect) hooks.onSelect(kind, id); }
    function finishDraft() {
      var need = ctl.mode === 'wall' ? 4 : ctl.mode === 'mask' ? 3 : 2;
      if (ctl.draft.length < need) { if (ctl.mode === 'wall' && ctl.draft.length) return; ctl.draft = []; var m0 = ctl.mode; ctl.mode = null; cv.style.cursor = 'default'; draw(); if (hooks.onMode) hooks.onMode(null, m0); return; }
      var pts = ctl.draft.slice(); ctl.draft = [];
      if (ctl.mode === 'mask') { var mk = { id: 'm' + Date.now().toString(36), points: pts, label: (ctl.preset && ctl.preset.label) || 'Hidden' }; photo.masks.push(mk); select('mask', mk.id); }
      else if (ctl.mode === 'wall') { var w = Object.assign({ id: 'w' + Date.now().toString(36), label: 'Wall', hex: '#4a4642', kind: 'velvet', seams: [], keepLight: 0.62 }, ctl.preset || {}, { quad: orderQuad(pts.slice(0, 4)) }); photo.walls.push(w); select('wall', w.id); }
      else { var l = Object.assign({ id: 'l' + Date.now().toString(36), cct: 2700, hex: null, intensity: 0.8, spread: 60, len: 0.22, side: 1, label: 'LED' }, ctl.preset || {}, { path: pts }); photo.leds.push(l); select('led', l.id); }
      ctl.mode = null; cv.style.cursor = 'default'; changed(); if (hooks.onMode) hooks.onMode(null);
    }
    // order 4 clicked corners TL TR BR BL whatever order they were clicked
    function orderQuad(p) { var cx = p.reduce(function (a, q) { return a + q[0]; }, 0) / 4, cy = p.reduce(function (a, q) { return a + q[1]; }, 0) / 4; var s = p.slice().sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx); }); var tl = 0; for (var i = 1; i < 4; i++) if (s[i][0] + s[i][1] < s[tl][0] + s[tl][1]) tl = i; return [s[tl], s[(tl + 1) % 4], s[(tl + 2) % 4], s[(tl + 3) % 4]]; }
    cv.addEventListener('dblclick', function (ev) { if (ctl.mode === 'led' || ctl.mode === 'mask') { ev.preventDefault(); finishDraft(); } });
    cv.addEventListener('mousedown', function (ev) {
      var rel = toRel(ev);
      if (ctl.mode) { if (ev.detail > 1) return; var f0 = ctl.draft[0]; if (ctl.mode === 'mask' && f0 && ctl.draft.length >= 3 && near(f0, rel)) { finishDraft(); return; } ctl.draft.push(rel); draw(); if (ctl.mode === 'wall' && ctl.draft.length === 4) finishDraft(); return; }
      var sel = selectedObj();
      if (sel) { var pts = ptsOf(ctl.selKind, sel); for (var i = 0; i < pts.length; i++) if (near(pts[i], rel)) { ctl.dragging = { kind: 'pt', obj: sel, i: i }; return; } }
      for (var mi = photo.masks.length - 1; mi >= 0; mi--) { var mk2 = photo.masks[mi]; for (var mp = 0; mp < mk2.points.length; mp++) if (near(mk2.points[mp], rel, 7)) { select('mask', mk2.id); ctl.dragging = { kind: 'pt', obj: mk2, i: mp }; return; } }
      for (var li = photo.leds.length - 1; li >= 0; li--) { var l = photo.leds[li]; for (var pi = 0; pi < l.path.length; pi++) if (near(l.path[pi], rel, 7)) { select('led', l.id); ctl.dragging = { kind: 'pt', obj: l, i: pi }; return; } }
      for (var wi = photo.walls.length - 1; wi >= 0; wi--) { var w = photo.walls[wi]; if (pointInQuad(w.quad, rel)) { select('wall', w.id); ctl.dragging = { kind: 'move', obj: w, last: rel }; return; } }
      select(null, null);
    });
    cv.addEventListener('mousemove', function (ev) {
      var rel = toRel(ev);
      if (!ctl.dragging) { if (ctl.mode) { cv.style.cursor = 'crosshair'; return; } var s = selectedObj(), hot = false; if (s) { ptsOf(ctl.selKind, s).forEach(function (p) { if (near(p, rel)) hot = true; }); } cv.style.cursor = hot ? 'grab' : (photo.walls.some(function (w) { return pointInQuad(w.quad, rel); }) ? 'move' : 'default'); return; }
      var d = ctl.dragging;
      if (d.kind === 'pt') { ptsOf(ctl.selKind, d.obj)[d.i] = rel; }
      else { var dx = rel[0] - d.last[0], dy = rel[1] - d.last[1]; d.obj.quad = d.obj.quad.map(function (p) { return [p[0] + dx, p[1] + dy]; }); d.last = rel; }
      ctl.dirty = true; draw();
    });
    global.addEventListener('mouseup', function () { if (ctl.dragging) { ctl.dragging = null; changed(); } });
    function keys(ev) {
      if (ctl.mode) { if (ev.key === 'Enter') { finishDraft(); ev.preventDefault(); } if (ev.key === 'Escape') { ctl.draft = []; ctl.mode = null; cv.style.cursor = 'default'; draw(); if (hooks.onMode) hooks.onMode(null); } if (ev.key === 'Backspace' && ctl.draft.length) { ctl.draft.pop(); draw(); ev.preventDefault(); } return; }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && ctl.selected && document.activeElement && /^(body|canvas)$/i.test(document.activeElement.tagName)) { remove(); ev.preventDefault(); }
    }
    document.addEventListener('keydown', keys);
    function remove() { var s = selectedObj(); if (!s) return; if (ctl.selKind === 'wall') photo.walls = photo.walls.filter(function (w) { return w !== s; }); else if (ctl.selKind === 'mask') photo.masks = photo.masks.filter(function (m) { return m !== s; }); else photo.leds = photo.leds.filter(function (l) { return l !== s; }); select(null, null); changed(); }

    async function load() {
      try { img = await loadImg(photo.src); } catch (e) { img = null; host.innerHTML = '<div class="fs-err">Photo could not be loaded.</div>'; return; }
      var maxPx = 1600, s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      W = Math.round(img.naturalWidth * s); H = Math.round(img.naturalHeight * s); work.width = W; work.height = H; photo.w = W; photo.h = H;
      fit();
    }
    var ro = global.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(host);
    load();

    return {
      redraw: function () { ctl.dirty = true; draw(); },
      // 'wall' → click the 4 corners of a wall (any order) ; 'led' → click along the edge, double-click / Enter to finish ; 'mask' → click round an object in front of the wall (sofa, TV), close on the first point / Enter
      setMode: function (m, preset) { ctl.mode = m || null; ctl.preset = preset || null; ctl.draft = []; cv.style.cursor = m ? 'crosshair' : 'default'; draw(); },
      mode: function () { return ctl.mode; },
      draftCount: function () { return ctl.draft.length; },
      selected: selectedObj, selectedKind: function () { return ctl.selKind; },
      select: select,
      update: function (patch) { var s = selectedObj(); if (!s) return; Object.assign(s, patch); changed(); },
      updateWalls: function (fn) { photo.walls.forEach(fn); changed(); },
      remove: remove,
      setDim: function (v) { photo.dim = v; changed(); },
      setLedPct: function (p) { ctl.ledPct = p; ctl.dirty = true; draw(); },
      setMarkers: function (on) { ctl.showMarkers = !!on; draw(); },
      count: function () { return { walls: photo.walls.length, leds: photo.leds.length, masks: photo.masks.length }; },
      export: function (maxPx, quality, ledPct) { if (!img) return null; var s = Math.min(1, (maxPx || 1600) / Math.max(W, H)); var o = document.createElement('canvas'); o.width = Math.round(W * s); o.height = Math.round(H * s); render(o.getContext('2d'), img, o.width, o.height, photo, { ledPct: ledPct == null ? 1 : ledPct }); return o.toDataURL('image/jpeg', quality || 0.86); },
      // the GEOMETRY GUIDE for the lab: the day photo with wall quads, seams and LED paths drawn on (no fabric paint)
      exportGuide: function (maxPx) { if (!img) return null; var s = Math.min(1, (maxPx || 1600) / Math.max(W, H)); var o = document.createElement('canvas'); o.width = Math.round(W * s); o.height = Math.round(H * s); guide(o.getContext('2d'), img, o.width, o.height, photo); return o.toDataURL('image/png'); },
      exportDay: function (maxPx) { if (!img) return null; var s = Math.min(1, (maxPx || 1600) / Math.max(W, H)); var o = document.createElement('canvas'); o.width = Math.round(W * s); o.height = Math.round(H * s); o.getContext('2d').drawImage(img, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.86); },
      destroy: function () { document.removeEventListener('keydown', keys); if (ro) ro.disconnect(); host.innerHTML = ''; }
    };
  }

  // guide overlay (no fabric paint): wall outlines + seams + LED paths + labels — the lab's geometry reference
  function guide(ctx, img, W, H, photo) {
    ctx.drawImage(img, 0, 0, W, H);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    (photo.walls || []).forEach(function (w, i) {
      var q = quadPx(w, W, H), Hm = homography(q);
      ctx.save(); ctx.beginPath(); q.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
      ctx.fillStyle = rgba(hexRgb(w.hex || '#777'), 0.28); ctx.fill(); ctx.lineWidth = Math.max(2, H * 0.004); ctx.strokeStyle = '#c9a85c'; ctx.stroke();
      (w.seams || []).forEach(function (u) { ctx.beginPath(); for (var k = 0; k <= 12; k++) { var p = Hm(u, k / 12); if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.setLineDash([8, 6]); ctx.lineWidth = Math.max(1.5, H * 0.0025); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke(); ctx.setLineDash([]); });
      var c = Hm(0.5, 0.5); ctx.font = '700 ' + Math.round(H * 0.028) + 'px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('W' + (i + 1) + ' · ' + (w.label || 'Wall'), c[0] + 2, c[1] + 2); ctx.fillStyle = '#fff'; ctx.fillText('W' + (i + 1) + ' · ' + (w.label || 'Wall'), c[0], c[1]);
      ctx.restore();
    });
    (photo.masks || []).forEach(function (m) { if (!m.points || m.points.length < 3) return; ctx.save(); ctx.beginPath(); m.points.forEach(function (p, k) { if (k) ctx.lineTo(p[0] * W, p[1] * H); else ctx.moveTo(p[0] * W, p[1] * H); }); ctx.closePath(); ctx.setLineDash([8, 6]); ctx.lineWidth = Math.max(2, H * 0.003); ctx.strokeStyle = '#ec6061'; ctx.stroke(); ctx.fillStyle = 'rgba(236,96,97,.15)'; ctx.fill(); ctx.restore(); });
    (photo.leds || []).forEach(function (l, i) {
      var pts = (l.path || []).map(function (q) { return [q[0] * W, q[1] * H]; }); if (pts.length < 2) return;
      ctx.save(); ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, H * 0.006); ctx.strokeStyle = '#f5d05c'; ctx.stroke();
      ctx.font = '700 ' + Math.round(H * 0.024) + 'px DM Sans, sans-serif'; ctx.fillStyle = '#f5d05c'; ctx.fillText('L' + (i + 1) + ' · ' + (l.label || 'LED') + ' ' + (l.cct || 2700) + 'K', pts[0][0] + 8, pts[0][1] - 8);
      ctx.restore();
    });
  }

  async function renderToDataUrl(photo, maxPx, opts) {
    var img = await loadImg(photo.src);
    var s = Math.min(1, (maxPx || 1400) / Math.max(img.naturalWidth, img.naturalHeight));
    var o = document.createElement('canvas'); o.width = Math.round(img.naturalWidth * s); o.height = Math.round(img.naturalHeight * s);
    render(o.getContext('2d'), img, o.width, o.height, photo, opts || {});
    return o.toDataURL('image/jpeg', 0.86);
  }

  async function guideToDataUrl(photo, maxPx) {
    var img = await loadImg(photo.src);
    var s = Math.min(1, (maxPx || 1400) / Math.max(img.naturalWidth, img.naturalHeight));
    var o = document.createElement('canvas'); o.width = Math.round(img.naturalWidth * s); o.height = Math.round(img.naturalHeight * s);
    guide(o.getContext('2d'), img, o.width, o.height, photo);
    return o.toDataURL('image/png');
  }

  global.SonorFabricSim = { mount: mount, render: render, renderToDataUrl: renderToDataUrl, guideToDataUrl: guideToDataUrl, hexRgb: hexRgb, cctRgb: cctRgb, homography: homography, loadImg: loadImg };
})(window);
