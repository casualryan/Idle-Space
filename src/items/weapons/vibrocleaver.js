export default {
  name: "Vibrocleaver",
  type: "Weapon",
  weaponType: "Cleaver",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 34, max: 34 },
  bAttackSpeed: { min: 0.95, max: 1.05 },
  deflection: { min: 0, max: 1 },
  damageTypes: {
    slashing: { min: 340, max: 420 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A heavier vibro-cleaver tuned for slower, heavier cuts."
};

