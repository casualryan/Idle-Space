export default {
  name: "Starfire Incinerator",
  type: "Weapon",
  weaponType: "Incinerator",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 49, max: 49 },
  bAttackSpeed: { min: 0.9, max: 1.05 },
  precision: { min: 2, max: 6 },
  damageTypes: {
    pyro: { min: 650, max: 820 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Neural Network Module", quantity: 1 }
  ],
  description: "A top-tier baseline incinerator fueled by compressed star-grade cells."
};

