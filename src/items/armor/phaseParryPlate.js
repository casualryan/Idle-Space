export default {
  name: "Phase Parry Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 21, max: 21 },
  precision: { min: 22, max: 34 },
  criticalChanceModifier: { min: 2, max: 4 },
  defenseTypes: { physicalResistance: { min: 7, max: 11 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Basic Servo", quantity: 1 }]
};

