export default {
  name: "Impact Stabilizer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 19, max: 19 },
  precision: { min: 14, max: 22 },
  deflection: { min: 4, max: 7 },
  defenseTypes: { physicalResistance: { min: 6, max: 9 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Copper Coil", quantity: 1 }]
};

