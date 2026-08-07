export default {
  name: "Toxin Regulator Bracer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 16, max: 16 },
  precision: { min: 12, max: 22 },
  defenseTypes: { chemicalResistance: { min: 4, max: 9 } },
  statModifiers: { damageTypes: { corrosive: { min: 7, max: 12 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Synthetic Biofluid", quantity: 1 }]
};

