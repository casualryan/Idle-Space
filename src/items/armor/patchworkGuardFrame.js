export default {
  name: "Patchwork Guard Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 5, max: 5 },
  defenseTypes: {
    physicalResistance: { min: 0, max: 1 },
    elementalResistance: { min: 0, max: 1 },
    chemicalResistance: { min: 0, max: 1 }
  },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }]
};

