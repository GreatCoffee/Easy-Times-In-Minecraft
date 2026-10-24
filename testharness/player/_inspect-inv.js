const fs = require('fs'), zlib = require('zlib'), nbt = require('prismarine-nbt');
const path = process.argv[2];
const buf = zlib.gunzipSync(fs.readFileSync(path));
nbt.parse(buf, (err, data) => {
  if (err) { console.error(err.message); process.exit(1); }
  const d = nbt.simplify(data);
  const inv = (d.Inventory || []).concat(d.EnderChestInventory || []);
  for (const it of inv) {
    const name = it.id || (it.__split__ && it.id);
    if (!name) continue;
    const hasEtim = it.tag && it.tag.etim !== undefined;
    console.log(JSON.stringify({
      slot: it.Slot, id: name, count: it.Count,
      nbtKeys: it.tag ? Object.keys(it.tag) : [],
      etim: hasEtim ? JSON.stringify(it.tag.etim) : undefined
    }));
  }
});
