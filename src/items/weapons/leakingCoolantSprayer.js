export default {
  name: "Leaking Coolant Sprayer",
  type: "Weapon",
  weaponType: "Sprayer",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 3, max: 3 },
  bAttackSpeed: { min: 1.0, max: 1.2 },
  damageTypes: {
    cryo: { min: 8, max: 14 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A crude coolant sprayer that still freezes targets."
};

