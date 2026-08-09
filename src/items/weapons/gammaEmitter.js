export default {
  name: "Gamma Emitter",
  type: "Weapon",
  weaponType: "Emitter",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 17, max: 17 },
  bAttackSpeed: { min: 0.98, max: 1.12 },
  damageTypes: {
    radiation: { min: 140, max: 180 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A reliable radiation emitter calibrated for stable output."
};

