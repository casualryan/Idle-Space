export default {
  name: "Refrigerant Cannon",
  type: "Weapon",
  weaponType: "Cannon",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 21, max: 21 },
  bAttackSpeed: { min: 0.85, max: 0.95 },
  damageTypes: {
    cryo: { min: 160, max: 210 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A slow cryo cannon meant for heavy, deliberate hits."
};

