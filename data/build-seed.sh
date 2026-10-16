#!/bin/bash
# Regenerates data/fabric-catalogue.js (Tier-3 offline seed) from the live Library:
#   v_aesthetic_catalogue  → wall_fabric · stretch_track · stretch_infill rows
#   seating_material_colours → the Cineca colour cards the fabrics share (metadata.seating_material_id)
#   wq_product_skus (aesthetic) → WeQuote product ids ride along as metadata.wq
# Usage: bash data/build-seed.sh   (needs network; anon key read from ../sonor-db.js)
set -e
cd "$(dirname "$0")"
K=$(grep -o "eyJ[A-Za-z0-9_.-]*" ../sonor-db.js | head -1)
U="https://ysmvklstkzodlocttspy.supabase.co/rest/v1"
H=(-H "apikey: $K" -H "Authorization: Bearer $K")
curl -s "$U/v_aesthetic_catalogue?select=*&category=in.(wall_fabric,stretch_track,stretch_infill)&order=category,sort_order,name" "${H[@]}" > /tmp/_fabric_items.json
curl -s "$U/seating_material_colours?select=material_id,name,hex,sort_order,metadata&order=material_id,sort_order" "${H[@]}" > /tmp/_fabric_colours.json
curl -s "$U/wq_product_skus?select=item_id,wq_product_id,wq_description,metadata&library_type=eq.aesthetic&enabled=eq.true" "${H[@]}" > /tmp/_fabric_wq.json
python3 - <<'PY'
import json, datetime
items = json.load(open('/tmp/_fabric_items.json'))
cols = json.load(open('/tmp/_fabric_colours.json'))
wq = {r['item_id']: r for r in json.load(open('/tmp/_fabric_wq.json')) if r.get('wq_product_id')}
want = {i.get('metadata', {}).get('seating_material_id') for i in items} - {None}
colours = {}
for c in cols:
    if c['material_id'] in want:
        colours.setdefault(c['material_id'], []).append({'name': c['name'], 'hex': c.get('hex'), 'img': (c.get('metadata') or {}).get('img')})
for i in items:
    md = i.get('metadata') or {}
    if i['id'] in wq:
        w = wq[i['id']]; md['wq'] = {'product_id': w['wq_product_id'], 'unit': (w.get('metadata') or {}).get('unit'), 'description': w.get('wq_description')}
    i['metadata'] = md
d = datetime.date.today().isoformat()
out = "/* Sonor Stretched Fabric — Tier-3 offline seed (GENERATED %s)\n   window.__FABRIC_SEED__ — snapshot of v_aesthetic_catalogue (wall_fabric · stretch_track · stretch_infill)\n   + the Cineca colour cards (seating_material_colours) + WeQuote links (wq_product_skus, aesthetic).\n   Regenerate: bash data/build-seed.sh. No trade pricing.\n*/\n(function () {\n  window.__FABRIC_SEED__ = { generated: '%s',\n  colours: %s,\n  items:\n" % (d, d, json.dumps(colours, ensure_ascii=False))
out += json.dumps(items, indent=1, ensure_ascii=False) + "\n  };\n})();\n"
open('fabric-catalogue.js', 'w').write(out)
print('seed regenerated:', len(items), 'items ·', sum(len(v) for v in colours.values()), 'colour cards')
PY
