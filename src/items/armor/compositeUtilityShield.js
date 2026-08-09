export default {
  name: "Composite Utility Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 14, max: 14 },
  healthBonus: { min: 60, max: 120 },
  defenseTypes: {
    physicalResistance: { min: 2, max: 4 },
    elementalResistance: { min: 2, max: 4 },
    chemicalResistance: { min: 2, max: 4 }
  },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

