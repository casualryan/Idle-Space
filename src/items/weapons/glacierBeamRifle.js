export default {
  name: "Glacier Beam Rifle",
  type: "Weapon",
  weaponType: "Rifle",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 30, max: 30 },
  bAttackSpeed: { min: 0.98, max: 1.12 },
  precision: { min: 2, max: 5 },
  damageTypes: {
    cryo: { min: 250, max: 320 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A consistent cryo rifle with steady aiming stability."
};

