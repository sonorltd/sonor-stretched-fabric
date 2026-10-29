# Stretched Fabric — Claude Code Context (v0.4.0)

> **Active theme: locked custom / slate canvas** — client-facing surface, `data-theme-lock` (sonor-platform §2 exemption); the cross-app ◐ cookie never flips it.

> **v0.4.0 (2026-10-22) — DESIGN & DIMENSION PACK (A3) · internal costing · single-line WeQuote push.** (1) Bryn, holding GPT's "1410 Option 2 Design and Dimension Pack R1": *"do better like this"* → `data/fabric-pack.js` `SonorFabricPack` draws the same 12-sheet set **from the fabric_config itself** (nothing re-typed): cover (hero render) · the selected scheme (two renders + fabric / borders / light) · **GA-01** room plan & fabric extents (hatched faces, opening gaps, pillars, coffer) · **GA-02/03** front and rear elevations (openings with matt-black frames, LED routes in orange, panel seams, set-out chains) · **GA-04** side walls paired · **GA-05** reflected ceiling & lighting plan · **LT-01** lighting schedule (route lengths computed per LED type) · **DT-01** material & edge details · **QS-01** quantities with the working · **DR-01** dimension register & survey priorities · closing (remaining renders, source record). Every dimension carries a **provenance tag — S supplied · P proposal · A assumed / photo-informed · D derived** — and the footer says DESIGN DEVELOPMENT · NOT FOR CONSTRUCTION on every sheet. New Layout-step set-out meta behind it: surface `side` / `src` / `frame_mm` / pillar `offset_mm` `base_mm` `proj_mm`, opening `x_mm` (from the LEFT edge as you face the wall from inside) / `y_mm` (sill from FFL) / `src` / `frame_mm` / `note`, per-surface `leds[]` (perimeter · vertical · horizontal · halo · inside · frame, group, inset, intent), room `pack` (coffer, rearOpening, notes), `cfg.pack` (rev, option, scheme copy, `compare`). Styling is Sonor's own (Bryn 18:07: *"i didnt mean clone it exactly, its a good format but needs to be in our own styling not deviating too far from the other ones like seating etc"*): the luxury chrome's furniture redrawn for a sheet — gold house mark + SONOR wordmark, tracked gold eyebrows, Gilroy titles, gold hairlines, gold-framed images, the Service-Contracts cover (hero · fade · inset frame · info row), minimal footer (project · drawing · Page N), the charcoal rear contact page — on a very slight warm tint (*"drop the cream backgrounds too, or maybe just a very slight tint"* — paper 251/250/247), LED routes and A-tags in amber. **Paper options** `cfg.pack.paper` A3 | A4 and `cfg.pack.orient` landscape | portrait (Summary › pack panel): sheets lay out on a logical A3 canvas in the chosen orientation (landscape = drawing left, notes right; portrait = drawing above, notes below); A4 = the same canvas scaled 1/√2 at page level (`lay()` in fabric-pack.js). Painter is pdf-lib direct (the luxury chrome is A4-bound); Gilroy via `lx.makeFonts`, mark via `lx.HOUSE`. (2) Bryn: *"potentially sometimes we will price all the fabric and build side outside of WQ and just put them in as a single line based on this proposal"* → `data/fabric-cost.js` `SonorFabricCost`: Library trade prices (Cineca pricelist filed 2026-10-22: fabric per roll m² min 5 lm, gripper in 2 m lengths min 10 m, melamine per sheet m²) × calc quantities + labour (calc hours × £31 / £62 from WQ #2805) + typed extras (frames · LED · trims); materials sell = cost ÷ (1 − margin 43 %); per-item rate overrides for anything the sheet lacks (**Lines FR has no trade price — rate TBC until entered**). Summary gets an internal **Costing** panel; the CUT LIST & BOM carries an INTERNAL COSTING block; the client proposal never does. `cfg.wqMode` **'single'** → `SonorFabricWq.buildPlan(model, quote, {mode:'single', costing})` writes ONE line per room on the room's fabric product (qty = finished m², `cost` / `sell` = the all-in £/m², which wq-push 1.4+ maps to cost_price / sell_price) — or on `wq.products.singleLine` (each, totals) once WQ has a "supply & install per proposal" product (WQ-PRODUCTS-NEEDED #30). (3) Library links added: `wf-cineca-lines-fr` → WQ 3457569, `st-split` → 3457582; engine exposes `item.price {trade, unit, min_order, length_mm}`. Opening presets + Recess, Glazed door. 1410 BASIS design carries the full set-out (saved, app_version 0.4.0); `reports/1410-design-dimension-pack-R2_2026-10-22.pdf` is the first pack issued (R2 — it supersedes GPT's R1 as the drawn set).

> **v0.4.0 addendum (22:30) — costing GROUPS + oak trim.** Bryn: *"black stained oak we will do the trim out of, need a price for that, 100mm x 20mm … cost price from builder is 1200 + vat to fit the front and back plus approx same again for the sides. sides are optional, so we need to split the costs out like this"* → `fabric-cost.js` 0.4.1: **`cost.splitSides`** prices each room as two groups — **core** (front + rear walls, piers, ceiling, TV / recess frames) and **sides — optional** (left + right) — from the per-surface calc (fabric lm, track, infill sheets, labour hours, frame metres per surface; the 5 lm fabric minimum tops up the core once); **`cost.trim`** {on, label, w_mm, t_mm, rate £/m, finishRate, wastePct, lengthM} prices the frame run (surface `frame_mm` perimeters + framed openings) in merchant lengths + waste; extras carry `group`. Summary strip shows Core / Sides (optional) / All; the single-line WeQuote push writes one priced line per group, the sides line prefixed OPTIONAL (kind `device-opt` so the delta never dedupes it against the core line). 1410: trim 36.9 m → 17 × 2.4 m at £13.50/m allowance (Wingham oak PAR interpolation — confirm with the merchant), builder £1,200 core + £1,200 sides, core £3,919 / £7,085 · sides £2,534 / £4,570 · all £6,453 / £11,655 — **Lines FR still £0 (rate TBC)**.

> **v0.4.0 addendum (22:00) — ONE PDF pack with tick options.** Bryn: *"should probably just combine all this into one pdf pack though with tick options for export, same as other apps"* → **Export PDF pack…** (Summary primary button and the wizard's last-step footer button) opens the Cinema-Design-style section picker (`PDF_SECTIONS` in fabric-app.js: tiers Front matter · Visualisations · Rooms & surfaces · Design & dimension sheets · Internal · Closing; cover locked; presets Client proposal / Proposal + drawings / Drawings only / Everything (internal); selection saved per browser; drawing-sheet paper A3 | A4 × landscape (default) | portrait). `exportRun()` builds the proposal part A (A4 portrait, luxury), the drawing sheets (fabric-pack.js, chosen paper), the proposal part B (cut list · BOM & costing on the neutral theme · the detail) and the rear contact page, two passes so page numbers run continuously, then merges them with pdf-lib `copyPages` into ONE document `sonor-stretched-fabric-<ref>.pdf`. Both generators now take `m.sections` (keys) + `m.part` / `m.pageStart` / `m.pageTotal`. Visualisations: the first two gallery pictures print full-page (front, rear), the rest two per page (Bryn 20:50). Rear wall is now a fabric surface whose window and pier footprints are openings (`Pier face` preset) with the framed pier faces as their own surfaces; the garden wall is fabric behind the full-wall curtain; openings sit at the low end of GPT's photo ranges (*"cover all wall areas … go higher estimate for now"*). The single-purpose buttons (proposal / cut list / pack) remain callable (`savePdf`, `savePack`) but the UI exposes the one export.

> **v0.3.1 (2026-10-22) — first real room (1410 · 31 Prestbury Road).** Simulator: **+ Hide object** masks (B-568a — sofa / TV / radiator polygons cut out of the fabric + LED paint, `photos[].masks`, in the guide PNG and `brief.json.in_front`); the fabric now holds its own value on a pale wall (the photo's luminosity is gain-matched to the fabric before the `luminosity` blend, then a light multiply toward the colour) — a dark bronze no longer lifts to beige; LED spill toned down; a design opened by deep link (`?config=`) restores its project from the row (uploads were landing under `photos/nop/`). Library: `wf-cineca-lines-fr` (Cineca LINES FR, 3 m AT textured weave) with the client's sample refs #7 / #10 as colourways. Cover = `fabric-cover.jpg` (B-567) confirmed on the proposal.

> **v0.3.0 (2026-10-21) — PHOTOS step: see it in the room + lab renders (Bryn: "similar to the garden lighting app, can we upload photos of an existing room then possibly via the gpt link have it design and super impose a fabric wall and led design" → "do both").** (1) `data/fabric-sim.js` `SonorFabricSim` (Garden `garden-sim.js` pattern — mount / render / renderToDataUrl): photos per room (drop / choose, re-rasterised to ≤1600 px JPEG so EXIF/GPS never travel, uploaded to the new public bucket **`fabric-assets`** `photos/<project>/…`), click the four corners of a wall → the chosen fabric (colour card hex, velvet / suede / weave texture tile) is mapped through a homography with the photo's own luminosity kept underneath (`luminosity` composite) so shadows and light survive, the calc's panel seams drawn as split-track joints, LED cove / skirting / reveal / shelf lines traced along edges (one-sided blurred spill, CCT), room dim + LED sliders; **Save simulation** → `sims/<project>/…` → `rooms[].photos[].simSrc` → the proposal's new **IN THE ROOM** page per saved sim. (2) `data/fabric-render-pack.js` `SonorFabricRenderPack` (CD `28-render-handoff.js` pattern): **📦 Export render pack** → `renders/<WQ>/handoff/fN/` via the directory picker (ZIP fallback) with `brief.json`, the day photos, a geometry guide PNG per photo (wall quads · seams · LED paths), the sims, colour swatches, `prompts.md` (one GPT image-tool prompt per photo: same room, same camera, only the listed walls + LED change) and README; gated on the per-project **client-consent tick** (`cfg.lab.consent`, §32) and the WQ number (the only identifier that crosses the wall, §31). (3) **Add returned renders** → `seating-assets/aesthetic/renders/<project_id>/fabric-…` + `projects.metadata.design_renders` (the ONE gallery, read-fresh → whole-array replace via the merge RPC; entries tagged `app:'stretched-fabric'`, caption / hero / on-off-PDF controls) → the proposal's **VISUALISATIONS** pages after the Introduction, and `design_renders[].hero` becomes the cover photo (platform rule; `fabric-cover.jpg` / SC hero fallback). Steps are now Rooms → System → Fabric → Layout → **Photos** → Summary (`CFG.steps`); `fabric_configs.config` carries `rooms[].photos` + `lab`. B-567 cover change kept.

> **v0.2.1 (2026-10-17) — consistency batch.** Theme boot `data/sonor-theme.js` first in `<head>` (data-theme-lock kept), served kit with `data/kit` mirror fallback, supabase-js pinned to 2.45.4 + SRI, shared masters synced (project-bar 1.14.0, kit 0.7.4 mirror, wq-sync 1.7.3, takeoffs-supabase RPC-first, wq-push 1.1.0). No feature change.

> **v0.2.0 (2026-10-17) — WeQuote-linked mark** (Bryn: "a small wq in their swatch of almost red icon which is a pill bubble against items that are wq linked"): the shared `.wq-pill` (small red WQ, `data/sonor-components.css`, `SonorWQClient.pill()` 1.3.1 — both synced from the root masters) on System track + infill cards and Fabric cards linked through `wq_product_skus` (title = WeQuote product #), the outline `.wq-off` on the ones with no WeQuote product (replaces the old "no WeQuote product" text), beside the paired quote in the Summary WeQuote panel (links to the quote in WeQuote) and on every mapped / unmapped push-plan line. Internal build only — the client build (`__FABRIC_CLIENT__`) shows no WeQuote marks; never on the PDFs.
>
> **v0.1.1 (2026-10-17) — version self-report.** The shell mounts with `supabase:false`, so nothing wrote `app_versions` on boot; the dashboard now calls `db.versions.report('stretched-fabric', APP_VERSION, …)` once after `boot()` (the catalogue load makes the SonorDB client). No feature change.

> **Spine version: 1.3** (SONOR-APP-SPINE.md — SonorShell-mounted like Cinema Aesthetic / Seating / Lighting Design; declared at birth 2026-10-16)
> Inherits: `../CLAUDE.md` (master brand rules + cross-project references)
> Brand source: `../Branding - CORE/brand-core.xml`
> Repo: `sonor-stretched-fabric` · Pages: https://sonorltd.github.io/sonor-stretched-fabric/

## What this is
Client-facing **stretched-fabric calc + design configurator** — walls and ceilings finished in
tensioned fabric over concealed track (B-543). Architecturally cloned from the Cinema Aesthetic /
Seating / Lighting Design wizard pattern. Flow: **Intro → Rooms → System → Fabric → Layout →
Summary**, outputting a branded **STRETCHED FABRIC PROPOSAL** PDF on the shared luxury chrome, an
internal **CUT LIST & BOM** PDF (neutral theme), and a **WeQuote push** in Sonor's existing
"Stretched Fabric Walls" quote shape.

Bryn's brief (2026-10-14): *"we need an app for stretched fabric calc and design, based on the same
styling as seating, cinema aesthetic etc"* · (2026-10-16): *"we need swatches and fabric types from
cineca range … swatch selector similar to seating app"*.

## The calc (data/fabric-calc.js — pure, unit-tested)
- Surface = wall / ceiling with length × height (mm), openings (door / window / screen, qty) and
  device cut-outs. Rooms come from the **Takeoffs polygon** (wall lengths from `areas[].points`
  scaled by `sqm / areaPx`), the **Cinema Design box** (`cinema_designs.room_width/depth/height`)
  or a typed W × D × H. Height = `projects.metadata.ceiling_height_mm` else 2400 *provisional* (flagged).
- Panelisation: **vertical drop** (roll runs across the wall; usable panel width = roll − 2·selvedge
  − 2·grip; `ceil(len / min(usable, panelMax))` panels) or **railroaded** (roll along the wall, seamless
  to `panelMax`, only when the roll covers the height — else falls back to drop, flagged).
- Track = surface perimeter + a **split track** at every seam + the perimeter of every opening.
  Fabric = Σ panel cuts (panel + 2·grip along the roll) × (1 + waste) → lm; m² ordered = lm × roll
  width; **m² net = finished area (the quote line)**. Infill (acoustic tracks only) = net × 1.05 → boards.
  Fixings at 150 mm pitch; internal labour h from `calc.labour` (never on the client PDF).
- Constants live in `fabric-config.js › calc`; every one is overridable per project (System › Allowances).
- `tests/fabric-calc.test.mjs` — `node --test tests/` (6 cases: drops, railroad, fallback, openings +
  infill + cut-outs, project roll-up, polygon → walls). Run before any calc change ships.

## SSOT
- **`aesthetic_items`** (Library-owned) read via **`v_aesthetic_catalogue`** — three categories:
  `wall_fabric` (the Cineca Jan-2026 trade pricelist: Alcantara · Avalon · Emerald · Magnum · Diamond ·
  Screen FR · Spezia FR · Spiral FR · Bora · Kalder · Kala · Base · ALD · Chantan — `metadata.width_m`,
  `acoustically_transparent`, `colours_available`, `kind` velvet | suede | at-weave, `seating_material_id`),
  `stretch_track` (12 mm · 25 mm acoustic · 50 mm acoustic · split — seeded at birth, `needs_review`) and
  `stretch_infill` (RW3 Rockwool 25 / 50 mm · polyester 25 mm — seeded, `needs_review`). This app never
  writes catalogue rows.
- **Colour cards** (Bryn: "swatch selector similar to seating app"): `aesthetic_items.metadata.colourways[]`
  `{name, hex, img}` when the Library files them (ask §6), else **`seating_material_colours`** through
  `metadata.seating_material_id` (Alcantara 16 · Diamond / Avalon 15 — the same cards the Seating app
  shows), else "N colourways in the range — samples at quotation" + a free-text colourway. Read-only.
- **`fabric_configs`** — this app's ONLY table writes (mirror of `lighting_configs`: insert / update,
  soft-delete via `archived`, never DELETE). Created 2026-10-16 (RLS anon+auth select / insert / update).
- **WeQuote links** — `wq_product_skus` `library_type='aesthetic'`: the 14 Cineca fabrics → the existing
  `Stretched Fabric - <name> (AT | non AT)` products (m², unit 4621), 12 / 25 mm gripper → `Fabric Gripper`
  (m, 1049), RW3 → `RW3 Rockwool - Per sq/m` (m², 4621). Fixed products in `config.wq.products`: Device
  Cutout 3457579 · Additional Detailing Factor 3457583 · generic Cineca Stretch Fabric 3457578.
  50 mm gripper, split track, polyester infill have NO WeQuote product → unmapped (WQ-PRODUCTS-NEEDED).
- 4-tier load (Supabase view → localStorage `sonor_fabric_ssot_v1` → bundled seed → empty). Seed =
  `data/fabric-catalogue.js`, regenerated by `data/build-seed.sh`.

## Shared seams consumed
| Seam | How |
|------|-----|
| `takeoffs_floors.content.areas[]` | READ — rooms + wall lengths (PROJECT-ROOM TAG v1 identity `{floor_id, floor_code, name}`) |
| `cinema_designs` | READ — cinema room box; `projects.metadata.cinema_design_summary.materials` shown as the Cinema Takeoff cross-check (CT stays the drawn truth for the cinema room, §40) |
| `projects` + `sonor_merge_project_metadata` | publishes `metadata.stretched_fabric_spec` (this app = the ONLY writer of that key) |
| `v_aesthetic_catalogue` · `seating_material_colours` · `wq_product_skus` · `wq_products` · `wq_quote_links` (slot `fabric-push`) | READ (+ pairing row on `wq_quote_links`) |
| `data/sonor-wq-push.js` + `sonor-wq-client.js` | WeQuote push through the shared root transport, plan v2 shape (one area per room under its floor group) |
| `data/sonor-pdf-luxury.js` | shared luxury PDF chrome · cover = the Service Contracts cover (`contract-hero.jpg`, brandLarge, airy — §43) · `theme('neutral')` for the internal cut list |
| SonorShell + SonorProjectBar/Bus/List, sonor-db.js, brand.css, sonor-components.css | standard synced set |

## Modules (keep modular — no monolith)
```
dashboard/sonor-stretched-fabric.html   host: hidden SonorShell + site header + landing + .sc wizard
data/fabric-config.js                   window.__FABRIC_CONFIG__ — steps, calc constants, WQ shape, copy
data/fabric-catalogue.js                window.__FABRIC_SEED__ — Tier-3 offline snapshot (build-seed.sh)
data/fabric-engine.js                   SonorFabric — SSOT load, colourways, WQ links
data/fabric-calc.js                     SonorFabricCalc — pure maths (node-testable)
data/fabric-draw.js                     SonorFabricDraw — elevation painter: SVG (app) + pdf-lib (proposal)
data/fabric-wq.js                       SonorFabricWq — plan builder + pairing + push
data/fabric-pdf.js                      FabricPdf — proposal (luxury: + visualisations + in-the-room pages) + cut list & BOM (neutral)
data/fabric-sim.js                      SonorFabricSim — room-photo simulator (homography fabric map, seams, LED glow)   v0.3.0
data/fabric-render-pack.js              SonorFabricRenderPack — lab handoff package (consent-gated, WQ number only)      v0.3.0
data/fabric-cost.js                     SonorFabricCost — internal costing: Library trade prices × quantities + labour + extras   v0.4.0
data/fabric-pack.js                     SonorFabricPack — A3 design & dimension pack (plan · elevations · RCP · LT · DT · QS · DR)  v0.4.0
data/fabric-app.js                      FabricApp — wizard UI, photos step, set-out meta, costing, saved designs, spec publish, design_renders
tests/fabric-calc.test.mjs              node --test
```

## Brand
Sonor slate chrome (`data-theme="slate"`, hidden) + the **scoped luxury dark-gold canvas** (`.sc` /
`#intro`) — the SAME documented Brand Override as Seating / Cinema Aesthetic (raw hex confined to
`.sc`/`#intro`; `:root` untouched, S-4.1). Colour-swatch picker CSS (`.cols` / `.col`) lifted verbatim
from the Seating Configurator. PDF: cinema-pdf-luxury skill rules (frame-edge, truncate-vs-wrap,
Gilroy ff/ffl trap — `deepSafe` pass over every dynamic string; no hosted links, §35).

## Drawing model
**Drawing model: n/a (no canvas)** — set-out elevations are generated SVG / pdf-lib vectors from the
calc result; nothing is dragged or stored as geometry beyond mm sizes.

## Rules
1. Consumer reads views only; NEVER write `aesthetic_items`, seating or cinema tables.
2. The **Cinema Takeoff owns the cinema room's drawn fabric** — this app sets out from the room box and
   shows CT's figures as a cross-check; it never overwrites `cinema_design_summary`.
3. No prices anywhere (WeQuote is price SSOT); the client PDF carries quantities only, the internal PDF
   adds cut list / fixings / labour h / the WeQuote plan.
4. Every export mints `SNR-SF-yymmdd-XXXX`; client build gate `window.__FABRIC_CLIENT__` strips the
   project bar, saves and the WeQuote panel.
5. Version bump = atomic (`/version-bump`); never hand-write `app_versions`.
6. Calc changes: tests first (`node --test tests/`), then the app, then re-eyeball a proposal PDF.
9. PDF export (v0.4.0): ONE document from the section picker — never add a second export button for a new page type; add a key to `PDF_SECTIONS` and a `key` on the page/sheet instead.
8. Costing (v0.4.0) is INTERNAL: the client proposal and the design & dimension pack never carry a price; the single-line push sends cost / sell per unit on the fabric line, so the WeQuote line total = the costing total. Every pack dimension carries its S/P/A/D tag — never issue a pack as "for construction".
7. Client photos (v0.3.0): never leave Sonor without the consent tick; the render pack carries the WQ number only (§31/§32); renders live ONLY in `projects.metadata.design_renders` (never a second list in this app).

## Feature timeline
- v0.3.1 (2026-10-22) — masks (+ Hide object), fabric value match on pale walls, deep-link project restore; Lines FR in the Library; first live design (1410).
- v0.3.0 (2026-10-21) — Photos step: room-photo simulator (fabric + seams + LED on the client's own photo, saved to `fabric-assets`, on the proposal), lab render pack export (consent + WQ-only), returned renders → `design_renders` → Visualisations pages + cover hero.
- v0.2.1 (2026-10-17) — consistency batch: theme boot first (lock kept), served kit + mirror fallback, pinned supabase-js, synced masters.
- v0.2.0 (2026-10-17) — shared WeQuote-linked mark (`.wq-pill`) on WQ-linked track / infill / fabric cards (outline `.wq-off` when unlinked), the paired quote (links to WeQuote) and the push-plan lines; internal build only. sonor-components.css + sonor-wq-client.js 1.3.1 synced.
- v0.1.0 (2026-10-16) — app birth (B-543). register-app 10 touchpoints; `fabric_configs` table;
  Library seed rows (4 track · 3 infill) + `kind` / `seating_material_id` stamped on the 14 Cineca wall
  fabrics; 19 `wq_product_skus` aesthetic links to the existing WeQuote stretched-fabric products;
  Rooms (Takeoffs polygons / Cinema Design box / manual) → System (track · infill · orientation ·
  allowances) → Fabric (Cineca cards grouped velvet / suede / AT weave + Seating-style colour swatches)
  → Layout (per-surface sizes, openings, cut-outs, per-room overrides, live SVG elevations) → Summary
  (schedule, CT cross-check, saved designs, WeQuote dry-run / push); proposal PDF (SC cover, intro,
  room pages with elevations, fabric & colour tiles, system, schedule, detail) + internal cut list & BOM.

## Library asks (§6)
- File `colourways[]` `{name, hex, img}` on every `wall_fabric` row (swatch photos → `seating-assets` /
  `av-assets`) so the picker shows the full range, not only the two shared seating colour cards.
- Curate the `stretch_track` / `stretch_infill` seed rows (`needs_review`); link 50 mm gripper, split
  track and polyester infill to WeQuote products when they exist (WQ-PRODUCTS-NEEDED).
- A `ceiling_height_mm` home on `projects.metadata` (Takeoffs / Survey could write it) so heights
  stop being provisional.
