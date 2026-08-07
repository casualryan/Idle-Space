export default {
  name: "Hydraulic Crusher",
  type: "Weapon",
  weaponType: "Crusher",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 27, max: 27 },
  bAttackSpeed: { min: 0.78, max: 0.88 },
  precision: { min: 1, max: 2 },
  damageTypes: {
    kinetic: { min: 200, max: 260 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "Hydraulic crusher tooling built for heavy kinetic punishment."
};

