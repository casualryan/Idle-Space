export default {
  name: "Faulty Grounding Coil",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 2, max: 2 },
  precision: { min: 1, max: 4 },
  defenseTypes: { elementalResistance: { min: 1, max: 2 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 1 }]
};

