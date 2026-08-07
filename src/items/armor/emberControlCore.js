export default {
  name: "Ember Control Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 11, max: 11 },
  defenseTypes: { elementalResistance: { min: 4, max: 7 } },
  statModifiers: { damageTypes: { pyro: { min: 6, max: 12 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

