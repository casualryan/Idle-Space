export default {
  name: "Corrosion Baffle Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 23, max: 23 },
  healthBonus: { min: 130, max: 210 },
  defenseTypes: { chemicalResistance: { min: 7, max: 13 } },
  statModifiers: { damageTypes: { corrosive: { min: 10, max: 15 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Synthetic Biofluid", quantity: 1 }]
};

