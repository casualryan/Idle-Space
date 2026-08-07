export default {
  name: "Acid Sprayer",
  type: "Weapon",
  weaponType: "Sprayer",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 22, max: 22 },
  bAttackSpeed: { min: 1.05, max: 1.25 },
  precision: { min: 0, max: 2 },
  damageTypes: {
    corrosive: { min: 160, max: 210 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A pressure-fed acid sprayer for corrosive damage."
};

