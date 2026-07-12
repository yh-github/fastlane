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

  // Replace vi.spyOn(Math, 'random') with vi.spyOn(Random.prototype, 'next')
  content = content.replace(/vi\.spyOn\(Math,\s*'random'\)/g, "vi.spyOn(Random.prototype, 'next')");
  
  // Make sure Random is imported if we are using it in tests
  if (content.includes('Random.prototype') && !content.includes('Random')) {
    content = "import { Random } from '../utils/rng';\n" + content;
  }

  // Update specific function calls in eventEngine.test.ts to pass a dummy rng
  if (file.includes('eventEngine.test.ts')) {
    content = content.replace(/processApartmentRobbery\(([^,)]+)\)/g, "processApartmentRobbery($1, new Random(1))");
    content = content.replace(/processDoctorVisit\(([^,]+),\s*([^)]+)\)/g, "processDoctorVisit($1, $2, new Random(1))");
    content = content.replace(/processStarvation\(([^,]+),\s*([^)]+)\)/g, "processStarvation($1, $2, new Random(1))");
    content = content.replace(/processStreetRobbery\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "processStreetRobbery($1, $2, $3, new Random(1))");
  }

  // Update specific function calls in weekendEngine.test.ts
  if (file.includes('weekendEngine.test.ts')) {
    content = content.replace(/processWeekend\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "processWeekend($1, $2, $3, $4, new Random(1))");
  }
  
  // Update economyEngine.test.ts
  if (file.includes('economyEngine.test.ts')) {
    content = content.replace(/fluctuateEconomy\(([^)]+)\)/g, "fluctuateEconomy($1, new Random(1))");
    content = content.replace(/applyMarketCrash\(([^,]+),\s*([^)]+)\)/g, "applyMarketCrash($1, $2, new Random(1))");
    content = content.replace(/applyEconomicBoom\(([^,]+),\s*([^)]+)\)/g, "applyEconomicBoom($1, $2, new Random(1))");
  }
  
  // Update jobEngine.test.ts
  if (file.includes('jobEngine.test.ts')) {
    // applyForJob(player, job, 10, {}, 200, rng)
    // Actually the signature has (player, job, timeCost, messages, offeredWage, rng) - oh wait, earlier I modified applyForJob?
    content = content.replace(/applyForJob\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "applyForJob($1, $2, $3, $4, $5, new Random(1))");
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Test files updated.');
