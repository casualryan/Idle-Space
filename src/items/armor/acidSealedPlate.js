export default {
  name: "Acid-Sealed Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 10, max: 10 },
  healthBonus: { min: 24, max: 55 },
  defenseTypes: { chemicalResistance: { min: 2, max: 5 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Synthetic Biofluid", quantity: 1 }]
};

