import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_HTML_FILES = [
    '/home/yoavh/.gemini/antigravity/brain/544dfaac-6802-453b-b814-ce2626de3a31/.system_generated/steps/17/content.md',
    '/home/yoavh/.gemini/antigravity/brain/544dfaac-6802-453b-b814-ce2626de3a31/.system_generated/steps/64/content.md',
    '/home/yoavh/.gemini/antigravity/brain/544dfaac-6802-453b-b814-ce2626de3a31/.system_generated/steps/67/content.md'
];

const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/raw_images');
const ITEMS_JSON_PATH = path.resolve(__dirname, '../public/campaigns/1990_classic_floppy/items.json');

function normalizeName(name: string) {
    let clean = name.toLowerCase().replace(/^item_/, '');
    return clean.replace(/[^a-z0-9]/g, '');
}

async function downloadImages() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const downloadedNames: string[] = [];

    for (const filePath of LOCAL_HTML_FILES) {
        console.log(`Parsing ${filePath}...`);
        const html = await fs.readFile(filePath, 'utf-8');
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const images = document.querySelectorAll('img');

        let count = 0;
        for (const img of Array.from(images)) {
            const imgElement = img as HTMLImageElement;
            let src = imgElement.getAttribute('data-src') || imgElement.src;
            
            if (src.startsWith('//')) {
                src = 'https:' + src;
            }

            if (!src || src.includes('data:image')) {
                continue;
            }

            const cleanSrcMatch = src.match(/(.*?\.(?:png|gif|jpg|jpeg))/i);
            const cleanSrc = cleanSrcMatch ? cleanSrcMatch[1] : src;

            let filename = imgElement.getAttribute('data-image-name') || cleanSrc.split('/').pop() || `image_${Date.now()}.png`;
            filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

            if (filename.includes('FandomFireLogo') || filename.includes('sprite') || filename.includes('Logo') || filename.includes('Site-background')) {
                continue;
            }

            // check if already downloaded
            if (downloadedNames.includes(filename)) continue;

            console.log(`Downloading ${filename} from ${cleanSrc}...`);
            try {
                const imgRes = await fetch(cleanSrc);
                const buffer = await imgRes.arrayBuffer();
                const outPath = path.join(OUTPUT_DIR, filename);
                await fs.writeFile(outPath, Buffer.from(buffer));
                downloadedNames.push(filename);
                count++;
            } catch (err) {
                console.error(`Failed to download ${filename}:`, err);
            }
        }
        console.log(`Downloaded ${count} images from ${filePath}`);
    }

    // Check items
    console.log('\n--- Checking for missing items ---');
    try {
        const itemsData = await fs.readFile(ITEMS_JSON_PATH, 'utf-8');
        const items = JSON.parse(itemsData) as Array<{ id: string, name: string }>;
        
        let missing = 0;
        for (const item of items) {
            const normItemName = normalizeName(item.name);
            const normItemId = normalizeName(item.id);
            
            const found = downloadedNames.some(imgName => {
                const normImg = normalizeName(imgName.replace(/\.[^/.]+$/, ''));
                return normImg === normItemName || normImg === normItemId || normImg.includes(normItemName) || normItemName.includes(normImg);
            });

            if (!found) {
                console.log(`Warning: No image found for item "${item.name}" (ID: ${item.id})`);
                missing++;
            }
        }
        console.log(`\nSummary: ${items.length - missing}/${items.length} items have images.`);
    } catch (e) {
        console.error('Failed to read items.json', e);
    }
}

downloadImages().catch(console.error);
