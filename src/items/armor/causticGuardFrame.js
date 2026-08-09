export default {
  name: "Caustic Guard Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 42, max: 42 },
  healthBonus: { min: 680, max: 950 },
  healthRegen: { min: 0.8, max: 1.4 },
  defenseTypes: { chemicalResistance: { min: 16, max: 25 } },
  statModifiers: { damageTypes: { corrosive: { min: 22, max: 32 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 1 }, { name: "Synthetic Biofluid", quantity: 2 }]
};

