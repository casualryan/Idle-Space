export default {
  name: "Rad-Sealed Buckler",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 11, max: 11 },
  energyShieldBonus: { min: 25, max: 55 },
  defenseTypes: { chemicalResistance: { min: 4, max: 8 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Copper Coil", quantity: 1 }, { name: "Minor Electronic Circuit", quantity: 1 }]
};

