export default {
  name: "Nanofiber Parry Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 43, max: 43 },
  precision: { min: 62, max: 90 },
  criticalMultiplierModifier: { min: 5, max: 9 },
  defenseTypes: { physicalResistance: { min: 17, max: 24 } },
  statModifiers: { damageTypes: { slashing: { min: 24, max: 32 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 1 }, { name: "Neural Processor", quantity: 1 }]
};

