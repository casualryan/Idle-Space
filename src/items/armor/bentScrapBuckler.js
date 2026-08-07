export default {
  name: "Bent Scrap Buckler",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 1, max: 1 },
  healthBonus: { min: 5, max: 10 },
  defenseTypes: { physicalResistance: { min: 1, max: 2 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 1 }]
};

