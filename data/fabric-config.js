/* Sonor Stretched Fabric — static config (v0.3.0)
   window.__FABRIC_CONFIG__ — flow rules, surface defaults, calc constants, WeQuote shape, copy.
   Engineering refs only. Project data lives in Supabase (fabric_configs); the catalogue is the
   Library (aesthetic_items → v_aesthetic_catalogue: wall_fabric · stretch_track · stretch_infill).
*/
(function () {
  'use strict';
  window.__FABRIC_CONFIG__ = {
    version: '0.3.0',
    buildDate: '2026-10-21',
    cacheKey: 'sonor_fabric_ssot_v1',
    steps: ['Rooms', 'System', 'Fabric', 'Layout', 'Photos', 'Summary'],
    bucket: 'fabric-assets',             // v0.3.0 — room photos + simulations (public bucket, photos/<project>/… sims/<project>/…)
    heroImage: null,                      // null = branded gradient hero on the landing

    // Library categories this app reads (aesthetic_items via v_aesthetic_catalogue)
    cats: { fabric: 'wall_fabric', track: 'stretch_track', infill: 'stretch_infill' },

    // ── calc constants (fabric-calc.js reads these; every one overridable per project) ──
    calc: {
      gripMm: 100,            // fabric allowance tucked into the track, each edge
      selvedgeMm: 20,         // unusable roll edge, each side
      panelMaxMm: 5000,       // longest comfortable panel between split tracks (handling limit)
      wastePct: 10,           // cutting waste on the fabric order
      infillWastePct: 5,      // infill board waste
      screwPitchMm: 150,      // track fixing pitch
      infillBoardMm: [1200, 600],
      defaultHeightMm: 2400,  // provisional room height when nothing is recorded (flagged)
      // internal labour estimate — never on the client PDF (WeQuote carries labour)
      labour: { wallM2: 0.9, ceilingM2: 1.3, perPanel: 0.4, perCutout: 0.25, perOpening: 0.5, trackM: 0.08 }
    },

    orientations: [
      { id: 'drop',     label: 'Vertical drop',  note: 'Roll width runs across the wall — one drop per panel, seams vertical. Any height.' },
      { id: 'railroad', label: 'Railroaded',     note: 'Roll runs along the wall — seamless runs up to the panel limit; needs roll width ≥ height.' }
    ],
    surfaceKinds: [
      { id: 'wall',    label: 'Wall' },
      { id: 'ceiling', label: 'Ceiling' }
    ],
    openingPresets: [
      { label: 'Door',          w: 900,  h: 2100 },
      { label: 'Double door',   w: 1800, h: 2100 },
      { label: 'Window',        w: 1200, h: 1200 },
      { label: 'Screen / TV',   w: 2400, h: 1400 },
      { label: 'Custom',        w: 1000, h: 1000 }
    ],
    cutoutKinds: [
      { id: 'speaker',  label: 'Speaker' },
      { id: 'light',    label: 'Downlight / light' },
      { id: 'socket',   label: 'Socket / keypad' },
      { id: 'vent',     label: 'Vent / grille' },
      { id: 'other',    label: 'Other' }
    ],

    // ── WeQuote push (fabric-wq.js) — Sonor's existing quote shape for fabric walls ──
    wq: {
      slot: 'fabric-push',
      floorGroup: null,                 // null = the room's own floor (GF / 1F / …) like Takeoffs
      libraryType: 'aesthetic',         // wq_product_skus.library_type for fabrics / track / infill
      units: { m2: 4621, m: 1049, each: 3660 },   // WeQuote unit ids (verified 2026-10-16)
      products: {                       // fixed Sonor products (ids from wq_products)
        cutout:    3457579,             // Stretch Fabric Device Cutout (each)
        detailing: 3457583,             // Stretch Fabric Additional Detailing Factor (each)
        fabricGeneric: 3457578          // Cineca Stretch Fabric — generic when the fabric has no product
      },
      categoryId: 47243,                // "Stretched Fabric Walls" · Construction, Treatment & Decor
      infillCategoryId: 47244           // "Acoustic Treatment"
    },

    // ── copy ──
    sectionBlurbs: {
      intro: 'Stretched fabric turns walls and ceilings into one seamless, tailored surface — the fabric is tensioned into a concealed perimeter track with acoustic infill behind, so speakers, lighting and the structure disappear into a single finish.',
      rooms: 'Every surface is set out from the room geometry — wall lengths from the room plan, heights from the project record — so what is shown here is what will be installed.',
      system: 'The track depth sets what sits behind the fabric. A 12 mm track carries fabric alone; 25 mm and 50 mm acoustic tracks hold a mineral-wool infill that lets the surface absorb sound as well as look the part.',
      fabric: 'Fabrics are chosen from the Sonor library — luxury velvets and FR weaves for feature walls, acoustically transparent cloths where loudspeakers sit behind the finish. Physical samples are approved before any order is placed.',
      layout: 'Each surface is divided into panels at the fabric width, with split tracks at every seam. The elevations below show exactly where seams, openings and cut-outs fall.',
      photos: 'Photographs of the room as it is today, with the chosen fabric and lighting laid over the walls — the panel seams fall exactly where the set-out puts them, and the room keeps its own light.',
      renders: 'Visualisations of the finished room, produced from the photographs and the design — the fabric, the seams and the light as they will be.',
      schedule: 'Quantities carried on the quotation: fabric by the square metre per surface, track by the metre, infill by the square metre, and a cut-out for every device that passes through the finish.'
    },
    termsLines: [
      'Fabric quantities are calculated from the surfaces shown, with a cutting allowance for tensioning into the track. Final quantities are confirmed on site survey.',
      'All fabrics are supplied from the chosen manufacturer\'s current range; physical samples are approved before any order is placed and colourways are subject to availability.',
      'Acoustically transparent fabrics are required wherever loudspeakers sit behind the finish; non-AT velvets are for feature walls and ceilings only.',
      'Device cut-outs are formed for every speaker, light, keypad and grille that passes through the fabric; positions follow the installed equipment.',
      'Substrates are assumed flat, dry and ready to receive track. Battening, boarding or making good is not included unless stated on the quotation.',
      'Commercials are carried on the formal Sonor quotation, which governs. This proposal sets out the design and the quantities only.'
    ],
    // Gilroy ff/ffl ligature trap (cinema-pdf-luxury §4) — copy above is ff-safe; the app's deepSafe pass guards dynamic names.
    pdfSafe: [[/coffer/gi, 'cove'], [/m²/g, 'sqm'], [/take-off/gi, 'room plan']]
  };
})();
