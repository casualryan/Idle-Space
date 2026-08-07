export default {
  name: "Caustic Lance",
  type: "Weapon",
  weaponType: "Lance",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 40, max: 40 },
  bAttackSpeed: { min: 0.78, max: 0.9 },
  deflection: { min: 0, max: 1 },
  damageTypes: {
    corrosive: { min: 420, max: 540 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 2 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A heavy caustic lance that favors slow, high damage thrusts."
};

