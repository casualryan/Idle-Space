export default {
  name: "Phase Edge Sword",
  type: "Weapon",
  weaponType: "Sword",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 16, max: 16 },
  bAttackSpeed: { min: 1.0, max: 1.15 },
  precision: { min: 2, max: 6 },
  damageTypes: {
    slashing: { min: 120, max: 160 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A phase-edged blade that slices with reliable geometry."
};

