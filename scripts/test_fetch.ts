import { JSDOM } from 'jsdom';
const response = await fetch('https://jonesinthefastlane.fandom.com/wiki/Durable_Items', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
});
const html = await response.text();
const dom = new JSDOM(html);
const document = dom.window.document;
const images = document.querySelectorAll('img');
console.log("Found " + images.length + " images");
