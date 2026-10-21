/* Sonor Stretched Fabric — LAB RENDER PACK (v0.3.0)
   SonorFabricRenderPack — the Cinema Design render-handoff pattern (js/28-render-handoff.js) for fabric walls:
   exports everything the lab (GPT image tool, LAB - Seam) needs to render the client's own room with the
   chosen fabric and LED design superimposed —
     renders/<WQ>/handoff/fN/           (fN append-only — renders folder law; "f" = fabric, beside the cinema hN)
       brief.json                        rooms · surfaces · fabric + colour hex · panel pitch · seams · LED zones
       photos/<room>-<n>.jpg             the client's day photo (re-rasterised in the browser → no EXIF, no GPS)
       guides/<room>-<n>-guide.png       the same photo with wall quads, seams and LED paths drawn on
       sims/<room>-<n>-sim.jpg           the in-app simulation (layout + colour reference, not the deliverable)
       swatches/<fabric>.png             a flat colour tile per fabric / colourway
       prompts.md                        one copy-paste prompt per photo (fabric, seams, LED, what must not change)
       README.md                         what this is, the return path, the wall rules
   WALL (sonor-platform §31/§32): the package crosses the lab wall. No client name, address or design label
   goes in — the project is its WQ number only. Export is gated on the per-project consent tick in the app
   (cfg.lab.consent). Writing: File System Access API (Chrome) inside the click gesture — Bryn picks
   renders/<WQ>/ once; fallback = store-only ZIP download. Returned renders come back through the app's
   "Add returned renders" control → projects.metadata.design_renders (the ONE gallery, §design_renders).
*/
(function (global) {
  'use strict';
  var VERSION = '0.3.0';
  function toast(m) { try { if (global.SonorShell && global.SonorShell.toast) return global.SonorShell.toast(m); } catch (e) {} console.log('[fabric-pack]', m); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; }
  function projectNumber(ref) { var m = String(ref || '').match(/^\s*(\d{3,5})\b/); return m ? m[1] : null; }
  function dataUrlToBlob(du) { var p = du.split(','), bin = atob(p[1]), mime = /data:([^;]+)/.exec(p[0])[1], u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Blob([u8], { type: mime }); }
  async function urlToBlob(src) { if (/^data:/.test(src)) return dataUrlToBlob(src); var r = await fetch(src, { mode: 'cors' }); if (!r.ok) throw new Error('fetch ' + r.status); return await r.blob(); }
  function swatchPng(hex, name) { var c = document.createElement('canvas'); c.width = 512; c.height = 512; var x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 512, 512); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 440, 512, 72); x.fillStyle = '#fff'; x.font = '700 26px DM Sans, sans-serif'; x.fillText(name + '  ' + hex, 18, 484); return dataUrlToBlob(c.toDataURL('image/png')); }

  // ── prompts (rules: the room is the client's — only the named walls and the light change) ──
  function promptFor(pn, room, ph, i) {
    var walls = (ph.walls || []).map(function (w, k) { return 'W' + (k + 1) + ' (' + (w.label || 'wall') + '): ' + (w.fabricName || room.fabric) + (w.colourName ? ' in ' + w.colourName : '') + ' ' + (w.hex || '') + (w.at ? ' — acoustically transparent weave' : '') + (w.seams && w.seams.length ? ' — ' + (w.seams.length + 1) + ' panels, seams at ' + w.seams.map(function (u) { return Math.round(u * 100) + '%'; }).join(', ') + ' of the wall width (a fine recessed joint line, full height, perfectly vertical)' : ' — one seamless panel'); });
    var leds = (ph.leds || []).map(function (l, k) { return 'L' + (k + 1) + ' (' + (l.label || 'LED') + '): continuous LED line, ' + (l.cct || 2700) + ' K warm white, concealed, light spilling ' + (l.side === -1 ? 'upward / to the left of the traced line' : 'downward / to the right of the traced line') + ' across the fabric'; });
    return [
      '### ' + pn + ' · ' + room.name + ' · photo ' + (i + 1),
      '',
      'Inputs: [0] `photos/' + ph.file + '` (the room as it is) · [1] `guides/' + ph.guideFile + '` (which walls change, where the seams fall, where the LED runs) · [2] `sims/' + ph.simFile + '` (colour and layout reference only — do not copy its flatness) · swatches/ for the exact fabric colour.',
      '',
      'Render the SAME room from the SAME camera as [0], photoreal, matching its lens, exposure and white balance. Keep every element of the photograph that is not listed below exactly as it is — floor, ceiling, windows, doors, furniture, skirting, radiators, people\'s belongings. Do not restyle the room.',
      '',
      'Change ONLY these surfaces, which become tensioned stretched-fabric walls (Cineca-style system: the fabric is tensioned into a concealed perimeter track, so the surface is flat, tailored and seamless except where a split-track joint is specified; no visible fixings, no buttoning, no battens, no wrinkles):',
      walls.map(function (w) { return '- ' + w; }).join('\n') || '- (no walls traced)',
      '',
      'The fabric: ' + room.fabricLine + '. Velvet reads as a soft matt pile with a gentle directional sheen where the light catches it; a weave reads as a fine, even, matt textile. The wall still receives the room\'s real light and shadow.',
      '',
      leds.length ? 'Add these LED lines (switched on; the room otherwise lit as in [0], very slightly dimmed so the LED reads):\n' + leds.map(function (l) { return '- ' + l; }).join('\n') : 'No LED lighting in this view.',
      '',
      'Deliver: 16:9 at 2048 px on the long side, no text, no watermark, no people added. File name `' + pn + '-' + slug(room.name) + '-' + (i + 1) + '-render.jpg`.',
      ''
    ].join('\n');
  }

  function readme(pn, fN, model, written) {
    return [
      '# ' + pn + ' · Stretched Fabric render handoff ' + fN,
      '',
      'Exported by the Sonor Stretched Fabric app v' + VERSION + ' on ' + new Date().toISOString().slice(0, 10) + '.',
      '',
      '**What this is.** The client\'s own room photographs, with the fabric walls and LED lines Sonor has designed for them described exactly (`brief.json`, `guides/`), a quick in-app simulation of each (`sims/`) and a ready prompt per photo (`prompts.md`). The job: photoreal renders of the same rooms, same cameras, with the fabric and light applied — nothing else in the room changed.',
      '',
      '**The wall.** No client name, address or design title is in this package and none may be added — the project is `' + pn + '` only. Photos were re-rasterised in the browser (no EXIF / GPS). Consent to send the photographs to the lab was recorded in the app before export.',
      '',
      '**Rooms:** ' + model.rooms.map(function (r) { return r.name + ' (' + r.photos.length + ' photo' + (r.photos.length === 1 ? '' : 's') + ')'; }).join(' · '),
      '',
      '**Return path.** Save renders as `renders/' + pn + '/f' + fN.slice(1) + '-out/<file>` using the file names in `prompts.md`, then in the Stretched Fabric app › Photos step › **Add returned renders** — they go to the project gallery (`design_renders`, set `fabric-' + fN + '`) and on to the proposal PDF.',
      '',
      'Files: ' + written.join(', ')
    ].join('\n') + '\n';
  }

  // ── writers (CD 28-render-handoff, verbatim pattern) ─────────────────────
  function nextRevision(names) { var n = 0; names.forEach(function (x) { var m = /^f(\d+)$/.exec(x); if (m) n = Math.max(n, Number(m[1])); }); return 'f' + (n + 1); }
  async function writeToDirectory(root, files, fN) {
    var handoff = await root.getDirectoryHandle('handoff', { create: true }), dir = await handoff.getDirectoryHandle(fN, { create: true });
    for (var i = 0; i < files.length; i++) { var parts = files[i].path.split('/'), d = dir; for (var k = 0; k < parts.length - 1; k++) d = await d.getDirectoryHandle(parts[k], { create: true }); var fh = await d.getFileHandle(parts[parts.length - 1], { create: true }); var ws = await fh.createWritable(); await ws.write(files[i].blob); await ws.close(); }
    return fN;
  }
  function crc32(buf) { var t = crc32.t || (crc32.t = (function () { var c, T = []; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } return T; })()); var c = 0xFFFFFFFF; for (var i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function makeZip(files, prefix) {
    var enc = new TextEncoder(), locals = [], centrals = [], off = 0;
    for (var i = 0; i < files.length; i++) {
      var data = new Uint8Array(await files[i].blob.arrayBuffer()), name = enc.encode(prefix + files[i].path), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      locals.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      centrals.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    }
    var cdSize = centrals.reduce(function (s, a) { return s + a.length; }, 0);
    var end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob(locals.concat(centrals, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  // ── build (headless-safe) — model from FabricApp.labModel() ──────────────
  // model = { ref, rooms:[{ name, code, floor_code, fabric, fabricLine, colour, hex, at, track, surfaces:[…], photos:[{ id, daySrc, simSrc, guideSrc, walls, leds }] }], swatches:[{name,hex}] }
  async function build(model, fN) {
    var pn = projectNumber(model.ref); if (!pn) throw new Error('the active project needs a WQ number in its ref');
    fN = fN || 'f1';
    var files = [], prompts = ['# ' + pn + ' · Stretched Fabric · render prompts ' + fN, '', 'Rules: same room, same camera, same light as the photo; only the listed walls and the LED lines change; the fabric is a tensioned, seamless, tailored surface (seams only where listed). One render per photo. No client-identifying content.', ''];
    var brief = { project: pn, handoff_revision: fN, app_version: VERSION, exported_at: new Date().toISOString(), coordinate_frame: 'wall quads and LED paths are normalised image coordinates (0–1, x right, y down) on the photo as shipped; seams are fractions of the wall width left→right as you face the wall', rooms: [] };
    for (var ri = 0; ri < model.rooms.length; ri++) {
      var r = model.rooms[ri], rs = slug(r.name), br = { name: r.name, code: r.code || null, floor: r.floor_code || null, fabric: r.fabric, colour: r.colour, hex: r.hex, acoustically_transparent: !!r.at, track: r.track, surfaces: r.surfaces, photos: [] };
      for (var pi = 0; pi < r.photos.length; pi++) {
        var ph = r.photos[pi], base = rs + '-' + (pi + 1);
        ph.file = base + '.jpg'; ph.guideFile = base + '-guide.png'; ph.simFile = base + '-sim.jpg';
        try { files.push({ path: 'photos/' + ph.file, blob: await urlToBlob(ph.daySrc) }); } catch (e) { console.warn('[fabric-pack] photo', e); continue; }
        if (ph.guideSrc) files.push({ path: 'guides/' + ph.guideFile, blob: dataUrlToBlob(ph.guideSrc) });
        if (ph.simSrc) { try { files.push({ path: 'sims/' + ph.simFile, blob: await urlToBlob(ph.simSrc) }); } catch (e) {} }
        br.photos.push({ file: ph.file, guide: ph.guideFile, sim: ph.simSrc ? ph.simFile : null, walls: (ph.walls || []).map(function (w, k) { return { id: 'W' + (k + 1), label: w.label, surface: w.surfaceId || null, quad: w.quad, fabric: w.fabricName || r.fabric, colour: w.colourName || r.colour, hex: w.hex, seams: w.seams || [], panels: (w.seams || []).length + 1 }; }), leds: (ph.leds || []).map(function (l, k) { return { id: 'L' + (k + 1), label: l.label, path: l.path, cct: l.cct || 2700, side: l.side == null ? 1 : l.side }; }) });
        prompts.push(promptFor(pn, r, ph, pi));
      }
      brief.rooms.push(br);
    }
    (model.swatches || []).forEach(function (s) { files.push({ path: 'swatches/' + slug(s.name) + '.png', blob: swatchPng(s.hex, s.name) }); });
    files.unshift({ path: 'brief.json', blob: new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }) });
    files.push({ path: 'prompts.md', blob: new Blob([prompts.join('\n')], { type: 'text/markdown' }) });
    var written = files.map(function (f) { return f.path; });
    files.push({ path: 'README.md', blob: new Blob([readme(pn, fN, model, written)], { type: 'text/markdown' }) });
    return { pn: pn, fN: fN, files: files, written: written, brief: brief };
  }

  // ── export (the button: picker → build → write) ──────────────────────────
  var _busy = false;
  async function exportPack(getModel) {
    if (_busy) return; _busy = true;
    try {
      var model = typeof getModel === 'function' ? getModel() : getModel;
      var pn = projectNumber(model && model.ref);
      if (!pn) { toast('Render pack: the active project needs a WQ number in its ref.'); return; }
      if (!model.consent) { toast('Render pack: tick the client-consent box first — photos of a client\'s home never leave Sonor without it.'); return; }
      if (!model.rooms.some(function (r) { return r.photos.length; })) { toast('Render pack: no room photos yet.'); return; }
      var root = null, fN = 'f1';
      if (typeof global.showDirectoryPicker === 'function') {   // folder FIRST — inside the click's user activation (CD 1.0.1)
        try { root = await global.showDirectoryPicker({ mode: 'readwrite', id: 'sonor-renders-' + pn }); } catch (e) { root = null; }
        if (root) { try { var hd = await root.getDirectoryHandle('handoff', { create: true }); var ex = []; for await (var en of hd.values()) if (en.kind === 'directory') ex.push(en.name); fN = nextRevision(ex); } catch (_) {} }
      }
      toast('Render pack: gathering photos, guides and prompts…');
      if (model.prepare) model = await model.prepare();   // the app renders the guide / sim images (needs the DOM)
      var pkg = await build(model, fN);
      if (root) { await writeToDirectory(root, pkg.files, fN); toast('Render pack ' + fN + ' written — ' + pkg.files.length + ' files into ' + root.name + '/handoff/' + fN); }
      else { var zip = await makeZip(pkg.files, pn + '-fabric-' + fN + '/'); var a = document.createElement('a'); a.href = URL.createObjectURL(zip); a.download = pn + '-fabric-' + fN + '.zip'; document.body.appendChild(a); a.click(); a.remove(); toast('Render pack ' + fN + ' downloaded as a ZIP (' + pkg.files.length + ' files) — unzip into renders/' + pn + '/handoff/'); }
      document.dispatchEvent(new CustomEvent('sonor:fabric-render-pack-written', { detail: { project: pn, revision: fN, files: pkg.written } }));
      return pkg;
    } catch (e) { console.error('[fabric-pack]', e); toast('Render pack failed — ' + (e && e.message ? e.message : e)); }
    finally { _busy = false; }
  }

  global.SonorFabricRenderPack = { VERSION: VERSION, build: build, export: exportPack, projectNumber: projectNumber, makeZip: makeZip, promptFor: promptFor };
})(window);
