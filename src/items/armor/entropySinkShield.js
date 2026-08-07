export default {
  name: "Entropy Sink Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 47, max: 47 },
  energyShieldBonus: { min: 420, max: 700 },
  deflection: { min: 8, max: 13 },
  defenseTypes: { elementalResistance: { min: 23, max: 30 } },
  statModifiers: { damageTypes: { cryo: { min: 28, max: 36 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "Flux Crystal", quantity: 1 }]
};

