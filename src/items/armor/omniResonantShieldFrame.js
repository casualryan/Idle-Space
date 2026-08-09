export default {
  name: "Omni-Resonant Shield Frame",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 48, max: 48 },
  energyShieldBonus: { min: 380, max: 700 },
  precision: { min: 68, max: 110 },
  weaponEfficiency: { min: 6, max: 11 },
  defenseTypes: {
    physicalResistance: { min: 8, max: 13 },
    elementalResistance: { min: 8, max: 13 },
    chemicalResistance: { min: 8, max: 13 }
  },
  isDisassembleable: true,
  disassembleResults: [{ name: "Nanite Cluster", quantity: 2 }, { name: "Neural Network Module", quantity: 1 }]
};

