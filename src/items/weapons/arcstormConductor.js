export default {
  name: "Arcstorm Conductor",
  type: "Weapon",
  weaponType: "Conductor",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 49, max: 49 },
  bAttackSpeed: { min: 1.15, max: 1.35 },
  precision: { min: 2, max: 6 },
  damageTypes: {
    electric: { min: 600, max: 750 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Neural Network Module", quantity: 1 }
  ],
  description: "A baseline arcstorm emitter built for sustained electric pressure."
};

