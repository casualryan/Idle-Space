export default {
  name: "Monowire Control Bracer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 31, max: 31 },
  precision: { min: 36, max: 56 },
  criticalChanceModifier: { min: 3, max: 6 },
  statModifiers: { damageTypes: { slashing: { min: 13, max: 20 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 1 }, { name: "Advanced Servo", quantity: 1 }]
};

