const fs = require('fs');
const path = require('path');

const campaigns = ['1990_classic_floppy', 'qol_improved', 'advanced'];
const basePath = path.join(__dirname, '../public/campaigns');

for (const c of campaigns) {
  const itemsPath = path.join(basePath, c, 'items.json');
  const buildingsPath = path.join(basePath, c, 'buildings.json');

  if (!fs.existsSync(itemsPath)) continue;

  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  let buildings = [];
  if (fs.existsSync(buildingsPath)) {
    buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf8'));
  }

  // Create a mapping of store -> inventory
  const storeInventories = {};

  for (const item of items) {
    if (item.store) {
      if (!storeInventories[item.store]) storeInventories[item.store] = [];
      const inventoryEntry = { itemId: item.id };
      if (item.basePrice !== undefined) inventoryEntry.priceOverride = item.basePrice;
      if (item.tags) inventoryEntry.tags = item.tags;
      
      storeInventories[item.store].push(inventoryEntry);
      
      // Clean up item definition (we can keep tags on item definition as well, but remove store and basePrice)
      delete item.store;
      delete item.basePrice;
      // We don't delete tags from item because they might be global
    }
  }

  // Deduplicate items list (if there are multiple items with the same ID, they used to represent store overrides)
  const uniqueItemsMap = {};
  for (const item of items) {
    if (!uniqueItemsMap[item.id]) {
      uniqueItemsMap[item.id] = item;
    } else {
      // Merge properties if multiple definitions existed (e.g. keeping lifestyleValue if it was in a duplicate)
      Object.assign(uniqueItemsMap[item.id], item);
    }
  }
  const uniqueItems = Object.values(uniqueItemsMap);

  // Update buildings
  for (const b of buildings) {
    if (storeInventories[b.id]) {
      if (!b.inventory) b.inventory = [];
      
      // append items
      for (const inv of storeInventories[b.id]) {
        // avoid duplicates in building
        if (!b.inventory.find(i => i.itemId === inv.itemId)) {
          b.inventory.push(inv);
        }
      }
      delete storeInventories[b.id];
    }
  }

  // For stores that aren't in buildings.json but have items (like in base campaigns inherited),
  // wait, building.json in advanced might NOT contain the building if it's inheriting!
  // If `storeInventories` has leftovers, we should inject them as a delta in `buildings.json`.
  for (const storeId of Object.keys(storeInventories)) {
    let b = buildings.find(b => b.id === storeId);
    if (!b) {
      b = { id: storeId, inventory: [] };
      buildings.push(b);
    }
    for (const inv of storeInventories[storeId]) {
      if (!b.inventory.find(i => i.itemId === inv.itemId)) {
        b.inventory.push(inv);
      }
    }
  }

  fs.writeFileSync(itemsPath, JSON.stringify(uniqueItems, null, 2));
  fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 2));
}

console.log('Migration complete.');
