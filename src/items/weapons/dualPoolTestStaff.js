// src/items/weapons/dualPoolTestStaff.js
export default {
  name: "Dual Pool Test Staff",
  developerOnly: true,
  type: "Weapon",
  weaponType: "Staff",
  icon: "icons/elemental_staff.png",
  slot: "mainHand",
  levelRequirement: 1,
  // Guaranteed baseline
  bAttackSpeed: "1.2",
  // Two separate pools:
  // - Pool 1: choose element for base damage (exactly 1)
  // - Pool 2: choose 2 passives out of 4
  rollGroups: [
    {
      pick: 1,
      from: [
        { path: "damageTypes.pyro", value: "10-15" },
        { path: "damageTypes.electric", value: "10-15" },
        { path: "damageTypes.cryo", value: "10-15" }
      ]
    },
    {
      pick: 2,
      from: [
        { path: "passiveBonuses.Swift Strikes", value: "1-1" },
        { path: "passiveBonuses.Kinetic Focus", value: "1-2" },
        { path: "passiveBonuses.Physical Mastery", value: "1-2" }
      ]
    }
  ],
  // Guaranteed minor crit to verify top-level percent mapping works
  criticalChanceModifierRange: { min: 3, max: 5 },
  description: "Test staff with two separate pools: pick 1 element for base damage and 2 passives from a list.",
  isDisassembleable: true,
  disassembleResults: [ { name: 'Flux Crystal', quantity: 1 } ]
};
