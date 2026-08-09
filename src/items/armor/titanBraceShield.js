export default {
  name: "Titan Brace Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 46, max: 46 },
  healthBonus: { min: 780, max: 980 },
  deflection: { min: 10, max: 16 },
  weaponEfficiency: { min: 5, max: 9 },
  defenseTypes: { physicalResistance: { min: 22, max: 28 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "Flux Crystal", quantity: 1 }]
};

