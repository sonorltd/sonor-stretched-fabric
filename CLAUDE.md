# Stretched Fabric — Claude Code Context (v0.2.0)

> **Active theme: locked custom / slate canvas** — client-facing surface, `data-theme-lock` (sonor-platform §2 exemption); the cross-app ◐ cookie never flips it.

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
data/fabric-pdf.js                      FabricPdf — proposal (luxury) + cut list & BOM (neutral)
data/fabric-app.js                      FabricApp — wizard UI, saved designs, spec publish
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

## Feature timeline
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
