export default {
  name: "Glacier Control Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 34, max: 34 },
  precision: { min: 40, max: 65 },
  defenseTypes: { elementalResistance: { min: 12, max: 19 } },
  statModifiers: { damageTypes: { cryo: { min: 15, max: 24 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

