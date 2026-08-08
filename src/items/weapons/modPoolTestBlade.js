// src/items/weapons/modPoolTestBlade.js
export default {
  name: "Mod Pool Test Blade",
  developerOnly: true,
  type: "Weapon",
  weaponType: "Sword",
  icon: "icons/ironsword.png",
  slot: "mainHand",
  levelRequirement: 1,
  // Guaranteed base damage and crit (guaranteed stat)
  damageTypes: {
    kinetic: "5-8"
  },
  criticalChanceModifierRange: { min: 5, max: 5 },
  // One roll group: pick 1-3 choices from the pool
  rollGroups: [
    {
      pick: "1-3",
      from: [
        { path: "damageTypes.slashing", value: "5-10" },
        { path: "statModifiers.damageTypes.pyro", value: "5-10" },
        { path: "statModifiers.damageGroups.physical", value: "5-10" },
        { path: "precision", value: "1-3" },
        { path: "deflection", value: "1-2" },
        { path: "healthBonus", value: "5-15" }
      ]
    }
  ],
  description: "Test blade that picks 1-3 extra mods from a pool, with guaranteed +5% crit.",
  isDisassembleable: true,
  disassembleResults: [ { name: 'Scrap Metal', quantity: 1 } ]
};

