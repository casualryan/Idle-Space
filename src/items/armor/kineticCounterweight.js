export default {
  name: "Kinetic Counterweight",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 13, max: 13 },
  precision: { min: 10, max: 16 },
  defenseTypes: { physicalResistance: { min: 4, max: 6 } },
  statModifiers: { damageTypes: { kinetic: { min: 6, max: 10 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

