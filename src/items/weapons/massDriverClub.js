export default {
  name: "Mass Driver Club",
  type: "Weapon",
  weaponType: "Club",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 36, max: 36 },
  bAttackSpeed: { min: 0.68, max: 0.78 },
  deflection: { min: 1, max: 2 },
  damageTypes: {
    kinetic: { min: 320, max: 420 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A massive club driven by mass-driver rails for late-game kinetic hits."
};

