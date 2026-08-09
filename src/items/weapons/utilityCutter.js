export default {
  name: "Utility Cutter",
  type: "Weapon",
  weaponType: "Cutter",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 4, max: 4 },
  bAttackSpeed: { min: 1.45, max: 1.65 },
  precision: { min: 1, max: 3 },
  damageTypes: {
    slashing: { min: 15, max: 25 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A quick cutter meant for safe, controlled early cuts."
};

