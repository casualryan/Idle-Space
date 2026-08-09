export default {
  name: "Irradiation Dampener",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 25, max: 25 },
  energyShieldBonus: { min: 75, max: 150 },
  defenseTypes: { chemicalResistance: { min: 8, max: 13 } },
  statModifiers: { damageTypes: { radiation: { min: 10, max: 16 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 2 }, { name: "Basic Servo", quantity: 1 }]
};

