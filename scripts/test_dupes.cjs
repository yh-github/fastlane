const fs = require('fs');
const items = JSON.parse(fs.readFileSync('public/campaigns/1990_classic_floppy/items.json', 'utf8'));

const counts = {};
for (const item of items) {
  counts[item.id] = (counts[item.id] || 0) + 1;
}

for (const [id, count] of Object.entries(counts)) {
  if (count > 1) {
    console.log(`${id}: ${count}`);
  }
}
