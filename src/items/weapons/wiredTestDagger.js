// src/items/weapons/wiredTestDagger.js
export default {
  name: "Wired Test Dagger",
  developerOnly: true,
  type: "Weapon",
  weaponType: "Dagger",
  icon: "icons/ironsword.png",
  slot: "mainHand",
  levelRequirement: 1,
  bAttackSpeed: "1.6-1.9",
  damageTypes: { kinetic: "6-12" },
  salePrice: 100,
  // Some random extras so it's clearly rolling
  criticalChanceModifier: "2-6",
  statModifiers: {
    damageTypes: { kinetic: "3-8" },
    precision: "1-3"
  },
  // Wires: 0–1 total sockets; allow any color (caps 0–1 each). Black cap at 1.
  // This effectively means: picks 1 slot (chance via 0–1), color can be Red/Green/Blue/Black.
  wires: {
    totalSlots: "2-2",
    blackSlotsMax: 1,
    colors: { red: "2-2", green: "2-2", blue: "2-2", black: "1-1" }
  },
  isDisassembleable: true,
  disassembleResults: [ { name: 'Scrap Metal', quantity: 1 } ],
  description: "Test dagger with a chance to spawn 1 wire socket that can be any color."
};

