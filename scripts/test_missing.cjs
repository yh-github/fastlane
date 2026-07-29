const fs = require('fs');
const items = JSON.parse(fs.readFileSync('public/campaigns/1990_classic_floppy/items.json', 'utf8'));
const files = fs.readdirSync('public/assets/raw_images/');
let missing = 0;
for (const item of items) {
  if (!files.includes(`${item.id}.png`)) {
    console.log("Missing:", item.id);
    missing++;
  }
}
console.log("Total missing:", missing);
