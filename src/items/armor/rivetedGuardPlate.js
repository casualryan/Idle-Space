export default {
  name: "Riveted Guard Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 8, max: 8 },
  healthBonus: { min: 30, max: 45 },
  defenseTypes: { physicalResistance: { min: 3, max: 5 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Wire Bundle", quantity: 1 }]
};

