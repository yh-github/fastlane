const fs = require('fs');
const path = require('path');

const testFiles = [
  'src/engine/turnProcessor.test.ts',
  'src/engine/eventEngine.test.ts',
  'src/engine/weekendEngine.test.ts',
  'src/engine/economyEngine.test.ts',
  'src/engine/jobEngine.test.ts',
  'src/engine/gameReducer.test.ts',
  'src/engine/gameState.test.ts',
  'src/engine/syncBug.test.ts',
  'src/engine/timeManager.test.ts',
  'src/engine/variant.test.ts'
];

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 'cdrom' string passed to createInitialGameState
  content = content.replace(/, 'cdrom'\)/g, ')');
  content = content.replace(/,\n\s*'cdrom'\n\s*\)/g, '\n)');
  
  // Fix nested Random
  content = content.replace(/new Random\(1, new Random\(1\)\)/g, "new Random(1)");
  
  // Fix variant.test.ts specifics
  if (file.includes('variant.test.ts')) {
    content = content.replace(/clothes: \[\], /g, "");
    content = content.replace(/, stocks: { tBills: 0, holdings: {} }/g, "");
    content = content.replace("let robbedCount = 0;", "let robbedCount = 0;"); // keep it
    content = content.replace(/if \(updated.money === 0\) robbedCount\+\+;/g, "if (updated.money === 0) robbedCount++;"); // keep it
    // Wait, the error said robbedCount is declared but never read at line 104, because I commented it out earlier? 
    // Let's just remove the declaration on line 104.
    content = content.replace(/\s*let robbedCount = 0;\s*$/, "");
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Fixed tests again');
