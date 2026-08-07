export default {
  name: "Serrated Combat Knife",
  type: "Weapon",
  weaponType: "Knife",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 9, max: 9 },
  bAttackSpeed: { min: 1.55, max: 1.75 },
  precision: { min: 2, max: 4 },
  damageTypes: {
    slashing: { min: 60, max: 75 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A fast serrated knife built for clean punctures and accurate strikes."
};

