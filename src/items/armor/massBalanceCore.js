export default {
  name: "Mass-Balance Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 35, max: 35 },
  precision: { min: 40, max: 62 },
  defenseTypes: { physicalResistance: { min: 12, max: 18 } },
  statModifiers: { damageTypes: { kinetic: { min: 16, max: 24 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

