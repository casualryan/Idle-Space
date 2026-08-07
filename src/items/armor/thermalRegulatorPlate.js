export default {
  name: "Thermal Regulator Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 6, max: 6 },
  healthBonus: { min: 20, max: 40 },
  defenseTypes: { elementalResistance: { min: 2, max: 5 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Wire Bundle", quantity: 1 }]
};

