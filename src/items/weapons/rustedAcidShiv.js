export default {
  name: "Rusted Acid Shiv",
  type: "Weapon",
  weaponType: "Shiv",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 3, max: 3 },
  bAttackSpeed: { min: 1.15, max: 1.35 },
  damageTypes: {
    corrosive: { min: 8, max: 14 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A rusted shiv coated with corrosive residue."
};
