export default {
  name: "Gamma Control Bracer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 18, max: 18 },
  precision: { min: 14, max: 24 },
  defenseTypes: { chemicalResistance: { min: 6, max: 10 } },
  statModifiers: { damageTypes: { radiation: { min: 6, max: 11 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Basic Sensor Array", quantity: 1 }]
};

