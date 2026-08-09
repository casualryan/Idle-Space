export default {
  name: "Arc Control Bracer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 12, max: 12 },
  precision: { min: 11, max: 20 },
  defenseTypes: { elementalResistance: { min: 4, max: 8 } },
  statModifiers: { damageTypes: { electric: { min: 6, max: 12 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

