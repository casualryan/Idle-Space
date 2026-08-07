export default {
  name: "Braced Wrist Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 4, max: 4 },
  precision: { min: 2, max: 5 },
  defenseTypes: { physicalResistance: { min: 2, max: 3 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }]
};

