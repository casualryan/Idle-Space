export default {
  name: "Dissolver Control Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 33, max: 33 },
  precision: { min: 38, max: 62 },
  defenseTypes: { chemicalResistance: { min: 11, max: 18 } },
  statModifiers: { damageTypes: { corrosive: { min: 15, max: 24 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

