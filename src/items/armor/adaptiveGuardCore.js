export default {
  name: "Adaptive Guard Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 27, max: 27 },
  energyShieldBonus: { min: 80, max: 170 },
  precision: { min: 22, max: 42 },
  defenseTypes: {
    physicalResistance: { min: 3, max: 6 },
    elementalResistance: { min: 3, max: 6 },
    chemicalResistance: { min: 3, max: 6 }
  },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 2 }, { name: "Basic Servo", quantity: 1 }]
};

