export default {
  name: "Reactor Leak Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 41, max: 41 },
  energyShieldBonus: { min: 220, max: 420 },
  healthRegen: { min: 0.8, max: 1.3 },
  defenseTypes: { chemicalResistance: { min: 15, max: 23 } },
  statModifiers: { damageTypes: { radiation: { min: 20, max: 30 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 1 }, { name: "Flux Crystal", quantity: 1 }]
};

