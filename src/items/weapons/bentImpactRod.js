export default {
  name: "Bent Impact Rod",
  type: "Weapon",
  weaponType: "Rod",
  icon: "icons/bent_impact_rod.png",
  slot: "mainHand",
  levelRequirement: { min: 1, max: 1 },
  bAttackSpeed: { min: 1.05, max: 1.15 },
  damageTypes: {
    kinetic: { min: 5, max: 9 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A crude blunt kinetic rod meant for first-line impact training."
};

