import fs from 'fs/promises';
import path from 'path';

const RAW_DIR = path.resolve('public/assets/raw_images');
const ITEMS_JSON = path.resolve('public/campaigns/1990_classic_floppy/items.json');

function normalizeName(name: string) {
    let clean = name.toLowerCase().replace(/^item_/, '');
    return clean.replace(/[^a-z0-9]/g, '');
}

async function run() {
    const itemsData = await fs.readFile(ITEMS_JSON, 'utf-8');
    const items = JSON.parse(itemsData) as Array<{ id: string, name: string }>;
    
    const files = await fs.readdir(RAW_DIR);
    
    for (const file of files) {
        if (!file.endsWith('.png')) continue;
        const normImg = normalizeName(file.replace(/\.[^/.]+$/, ''));
        
        // Find matching item
        const match = items.find(item => {
            const normItemName = normalizeName(item.name);
            const normItemId = normalizeName(item.id);
            return normImg === normItemName || normImg === normItemId || normImg.includes(normItemName) || normItemName.includes(normImg);
        });

        if (match) {
            const newPath = path.join(RAW_DIR, `${match.id}.png`);
            const oldPath = path.join(RAW_DIR, file);
            if (oldPath !== newPath) {
                console.log(`Renaming ${file} -> ${match.id}.png`);
                await fs.rename(oldPath, newPath);
            }
        }
    }
}

run().catch(console.error);
