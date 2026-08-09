export default {
  name: "Leaking Chem Guard",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 4, max: 4 },
  healthBonus: { min: 8, max: 20 },
  defenseTypes: { chemicalResistance: { min: 1, max: 3 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }]
};

