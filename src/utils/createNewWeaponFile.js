// createNewWeaponFile.js
// A utility to create individual weapon files from weapons.js

const fs = require('fs');
const path = require('path');

// Check if weapons.js exists
if (!fs.existsSync(path.join(process.cwd(), 'weapons.js'))) {
  console.error('weapons.js file not found. Make sure you run this script from the project root.');
  process.exit(1);
}

// Read the weapons.js file
const weaponsContent = fs.readFileSync(path.join(process.cwd(), 'weapons.js'), 'utf8');

// Simple regex to extract the weapons array
// This is a very basic approach, for complex files you might need a JS parser
const weaponsMatch = weaponsContent.match(/const\s+weapons\s*=\s*\[([\s\S]*?)\];/);

if (!weaponsMatch) {
  console.error('Could not find weapons array in weapons.js');
  process.exit(1);
}

// Split the weapons array content into individual weapon objects
const weaponsArrayContent = weaponsMatch[1].trim();
let currentWeapon = '';
let openBraces = 0;
let weapons = [];

// Parse the weapons manually
for (let i = 0; i < weaponsArrayContent.length; i++) {
  const char = weaponsArrayContent[i];
  
  if (char === '{') {
    openBraces++;
    currentWeapon += char;
  } else if (char === '}') {
    openBraces--;
    currentWeapon += char;
    
    if (openBraces === 0) {
      weapons.push(currentWeapon.trim());
      currentWeapon = '';
      // Skip the comma after the closing brace
      if (weaponsArrayContent[i+1] === ',') {
        i++;
      }
    }
  } else {
    currentWeapon += char;
  }
}

// Create the weapons directory if it doesn't exist
const weaponsDir = path.join(process.cwd(), 'src', 'items', 'weapons');
if (!fs.existsSync(weaponsDir)) {
  fs.mkdirSync(weaponsDir, { recursive: true });
}

// Process each weapon and create a file for it
weapons.forEach((weaponCode, index) => {
  // Try to extract the weapon name
  const nameMatch = weaponCode.match(/name:\s*["']([^"']+)["']/);
  if (!nameMatch) {
    console.error(`Could not extract name for weapon at index ${index}`);
    return;
  }
  
  const weaponName = nameMatch[1];
  // Convert to camelCase for filename
  const fileName = weaponName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove non-word characters
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase()) // Convert to camelCase
    .replace(/\s/g, '') // Remove remaining spaces
    + '.js';
  
  // Create the file content
  const fileContent = `// src/items/weapons/${fileName}
export default ${weaponCode.trim()};`;
  
  // Write the file
  fs.writeFileSync(path.join(weaponsDir, fileName), fileContent);
  console.log(`Created weapon file: ${fileName}`);
});

// Now create the index.js file
const importLines = weapons.map((weaponCode) => {
  const nameMatch = weaponCode.match(/name:\s*["']([^"']+)["']/);
  if (!nameMatch) return null;
  
  const weaponName = nameMatch[1];
  const varName = weaponName
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/\s/g, '');
  
  const fileName = varName + '.js';
  
  return `import ${varName} from './${varName}.js';`;
}).filter(Boolean);

const exportContent = `// src/items/weapons/index.js
${importLines.join('\n')}

// Add all weapons to this array
const weapons = [
  ${weapons.map((weaponCode) => {
    const nameMatch = weaponCode.match(/name:\s*["']([^"']+)["']/);
    if (!nameMatch) return null;
    
    const weaponName = nameMatch[1];
    return weaponName
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
      .replace(/\s/g, '');
  }).filter(Boolean).join(',\n  ')}
];

export default weapons;`;

fs.writeFileSync(path.join(weaponsDir, 'index.js'), exportContent);
console.log('Created weapons index.js file');

console.log('\nDone! Added all weapons from weapons.js to individual files.');
console.log('You can now modify the index.html to use the Vite bundle instead of weapons.js'); 