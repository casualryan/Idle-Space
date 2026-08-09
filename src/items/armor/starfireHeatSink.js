export default {
  name: "Starfire Heat Sink",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 49, max: 49 },
  precision: { min: 68, max: 102 },
  energyShieldBonus: { min: 420, max: 620 },
  defenseTypes: { elementalResistance: { min: 24, max: 30 } },
  statModifiers: { damageTypes: { pyro: { min: 30, max: 38 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "Neural Network Module", quantity: 1 }]
};

