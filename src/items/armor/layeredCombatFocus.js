export default {
  name: "Layered Combat Focus",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 37, max: 37 },
  precision: { min: 45, max: 78 },
  weaponEfficiency: { min: 4, max: 8 },
  defenseTypes: {
    physicalResistance: { min: 5, max: 9 },
    elementalResistance: { min: 5, max: 9 },
    chemicalResistance: { min: 5, max: 9 }
  },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

