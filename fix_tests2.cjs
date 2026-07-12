const fs = require('fs');
const path = require('path');
const testFiles = [
  'src/engine/turnProcessor.test.ts',
  'src/engine/eventEngine.test.ts',
  'src/engine/weekendEngine.test.ts',
  'src/engine/economyEngine.test.ts',
  'src/engine/jobEngine.test.ts'
];
for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("import { Random }")) {
    content = "import { Random } from '../utils/rng';\n" + content;
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Fixed imports.');
