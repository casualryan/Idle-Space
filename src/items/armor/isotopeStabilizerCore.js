export default {
  name: "Isotope Stabilizer Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 32, max: 32 },
  precision: { min: 36, max: 60 },
  defenseTypes: { chemicalResistance: { min: 11, max: 18 } },
  statModifiers: { damageTypes: { radiation: { min: 14, max: 22 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

