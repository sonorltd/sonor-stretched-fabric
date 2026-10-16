# Stretched Fabric — Integration ideas

## Data this app can provide
- `projects.metadata.stretched_fabric_spec` — per-room fabric / colour / track / infill + net m², track m, panels, cut-outs, project totals (merge RPC, this app is the only writer).
- `fabric_configs` — saved designs per project (config JSONB: rooms, surfaces, openings, cut-outs, defaults).
- A WeQuote plan (v2 shape, slot `fabric-push`) — one area per room, "Stretched Fabric Walls" lines.

## Data this app could consume
- Takeoffs: `takeoffs_floors.content.areas[]` (today) — would prefer stable area ids and a per-room **ceiling height** (`areas[].h_mm`) so heights stop being provisional.
- Takeoffs device placements per room → auto-count **device cut-outs** (speakers, keypads, downlights on fabric surfaces) instead of typing them.
- Cinema Takeoff: `fabricPlacements()` per wall (no-fabric zones, pillasters, bulkheads) → set the cinema room's surfaces from the drawn model rather than the box.
- Cinema Aesthetic: `design_spec.materials.wall_fabric` → preselect the fabric chosen on the mood board.
- Survey: photos tagged to a room → openings / wall photos beside each elevation (sonor-survey-link.js seam, as Garden Lighting did).
- Library: `aesthetic_items.metadata.colourways[]` with swatch photos; WeQuote products for 50 mm gripper / split track / polyester infill.

## Integration notes
- Cinema room: Cinema Takeoff stays the drawn truth (§40). This app seeds four walls + ceiling from the CD box and shows CT's `cinema_design_summary.materials` as a cross-check — never a second geometry owner.
- Colour cards reuse `seating_material_colours` through `metadata.seating_material_id` so the Seating app and this app show the same Cineca swatches.

## Requests to other projects
- Project Master brief page: show the `stretched_fabric_spec` card (rooms · fabric · m²) beside the lighting / garden specs.
- Master Hub project cards: m² of stretched fabric chip when the spec exists.
- Takeoffs: a per-room ceiling height field + stable area ids (shared ask with Cinema Aesthetic v0.11.1).
