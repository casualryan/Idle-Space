export default {
  name: "Combustion Stabilizer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 28, max: 28 },
  precision: { min: 24, max: 40 },
  defenseTypes: { elementalResistance: { min: 9, max: 14 } },
  statModifiers: { damageTypes: { pyro: { min: 12, max: 18 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 2 }, { name: "Basic Servo", quantity: 1 }]
};

