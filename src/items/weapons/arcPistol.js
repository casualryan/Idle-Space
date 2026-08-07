export default {
  name: "Arc Pistol",
  type: "Weapon",
  weaponType: "Pistol",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 6, max: 6 },
  bAttackSpeed: { min: 1.45, max: 1.65 },
  damageTypes: {
    electric: { min: 35, max: 50 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "An arc pistol for quick electric bursts."
};

