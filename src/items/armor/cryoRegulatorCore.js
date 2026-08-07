export default {
  name: "Cryo Regulator Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 15, max: 15 },
  precision: { min: 11, max: 18 },
  defenseTypes: { elementalResistance: { min: 5, max: 8 } },
  statModifiers: { damageTypes: { cryo: { min: 7, max: 12 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

