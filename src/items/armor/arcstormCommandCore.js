export default {
  name: "Arcstorm Command Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 50, max: 50 },
  energyShieldBonus: { min: 420, max: 760 },
  precision: { min: 70, max: 112 },
  defenseTypes: { elementalResistance: { min: 24, max: 30 } },
  statModifiers: { damageTypes: { electric: { min: 30, max: 38 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "Neural Network Module", quantity: 1 }]
};

