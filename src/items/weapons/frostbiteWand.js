export default {
  name: "Frostbite Wand",
  type: "Weapon",
  weaponType: "Wand",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 7, max: 7 },
  bAttackSpeed: { min: 1.05, max: 1.25 },
  precision: { min: 1, max: 3 },
  damageTypes: {
    cryo: { min: 35, max: 50 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A simple early wand that projects steady frost."
};

