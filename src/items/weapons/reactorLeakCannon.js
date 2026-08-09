export default {
  name: "Reactor Leak Cannon",
  type: "Weapon",
  weaponType: "Cannon",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 42, max: 42 },
  bAttackSpeed: { min: 0.8, max: 0.95 },
  deflection: { min: 0, max: 1 },
  damageTypes: {
    radiation: { min: 480, max: 620 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Flux Crystal", quantity: 2 },
    { name: "Neural Network Module", quantity: 1 }
  ],
  description: "A slow leak cannon built from failed reactor valves."
};
