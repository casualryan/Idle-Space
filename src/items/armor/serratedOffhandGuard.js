export default {
  name: "Serrated Offhand Guard",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 12, max: 12 },
  precision: { min: 11, max: 18 },
  defenseTypes: { physicalResistance: { min: 4, max: 7 } },
  statModifiers: { damageTypes: { slashing: { min: 6, max: 10 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

