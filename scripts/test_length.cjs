const fs = require('fs');
const items = JSON.parse(fs.readFileSync('public/campaigns/1990_classic_floppy/items.json', 'utf8'));
const files = fs.readdirSync('public/assets/raw_images/').filter(f => f.endsWith('.png'));
console.log("Items length:", items.length);
console.log("PNG files length:", files.length);

const itemIds = new Set(items.map(i => i.id));
console.log("Unique Item IDs:", itemIds.size);
