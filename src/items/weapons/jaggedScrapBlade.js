export default {
  name: "Jagged Scrap Blade",
  type: "Weapon",
  weaponType: "Blade",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 1, max: 1 },
  bAttackSpeed: { min: 1.15, max: 1.25 },
  damageTypes: {
    slashing: { min: 5, max: 9 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A crude jagged blade for early slashing practice."
};

