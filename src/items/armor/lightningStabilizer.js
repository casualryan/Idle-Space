export default {
  name: "Lightning Stabilizer",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 29, max: 29 },
  precision: { min: 28, max: 45 },
  criticalChanceModifier: { min: 2, max: 5 },
  statModifiers: { damageTypes: { electric: { min: 11, max: 18 } } },
  defenseTypes: { elementalResistance: { min: 9, max: 14 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 2 }, { name: "Targeting Module", quantity: 1 }]
};
