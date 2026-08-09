export default {
  name: "Absolute-Zero Projector",
  type: "Weapon",
  weaponType: "Projector",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 39, max: 39 },
  bAttackSpeed: { min: 0.78, max: 0.9 },
  deflection: { min: 0, max: 1 },
  damageTypes: {
    cryo: { min: 420, max: 540 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 2 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A colder-than-cold projector that trades speed for stopping power."
};

