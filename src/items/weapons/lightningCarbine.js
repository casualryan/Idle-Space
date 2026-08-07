export default {
  name: "Lightning Carbine",
  type: "Weapon",
  weaponType: "Carbine",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 28, max: 28 },
  bAttackSpeed: { min: 1.05, max: 1.25 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    electric: { min: 200, max: 260 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A mid electric carbine tuned for consistent aim."
};

