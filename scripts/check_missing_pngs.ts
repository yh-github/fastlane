import fs from 'fs';
const items = JSON.parse(fs.readFileSync('public/campaigns/1990_classic_floppy/items.json', 'utf8'));
const files = fs.readdirSync('public/assets/raw_images/');
for (const item of items) {
  if (!files.includes(`${item.id}.png`)) {
    console.log("Missing:", item.id);
  }
}
