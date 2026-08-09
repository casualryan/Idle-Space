export default {
  name: "Molecular Sealant Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 50, max: 50 },
  healthBonus: { min: 900, max: 1300 },
  precision: { min: 72, max: 110 },
  defenseTypes: { chemicalResistance: { min: 24, max: 30 } },
  statModifiers: { damageTypes: { corrosive: { min: 30, max: 38 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "AI Core Fragment", quantity: 1 }]
};

