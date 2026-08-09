export default {
  name: "Pneumatic Hammer",
  type: "Weapon",
  weaponType: "Hammer",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 11, max: 11 },
  bAttackSpeed: { min: 0.85, max: 0.95 },
  damageTypes: {
    kinetic: { min: 55, max: 75 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A pressurized hammer that delivers weighted kinetic impacts."
};

