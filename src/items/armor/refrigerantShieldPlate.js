export default {
  name: "Refrigerant Shield Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 24, max: 24 },
  energyShieldBonus: { min: 70, max: 140 },
  defenseTypes: { elementalResistance: { min: 8, max: 13 } },
  statModifiers: { damageTypes: { cryo: { min: 10, max: 16 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Basic Servo", quantity: 1 }]
};

