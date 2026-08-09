export default {
  name: "Singularity Dampening Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 50, max: 50 },
  energyShieldBonus: { min: 450, max: 820 },
  precision: { min: 75, max: 115 },
  defenseTypes: { chemicalResistance: { min: 24, max: 30 } },
  statModifiers: { damageTypes: { radiation: { min: 30, max: 38 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "AI Core Fragment", quantity: 1 }]
};

