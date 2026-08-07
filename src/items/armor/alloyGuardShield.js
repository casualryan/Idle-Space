export default {
  name: "Alloy Guard Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 26, max: 26 },
  healthBonus: { min: 140, max: 220 },
  deflection: { min: 5, max: 9 },
  defenseTypes: { physicalResistance: { min: 9, max: 13 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 2 }, { name: "Titanium Plating", quantity: 1 }]
};

