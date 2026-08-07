export default {
  name: "Utility Edge Guard",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 7, max: 7 },
  precision: { min: 5, max: 10 },
  defenseTypes: { physicalResistance: { min: 1, max: 3 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Wire Bundle", quantity: 1 }]
};

