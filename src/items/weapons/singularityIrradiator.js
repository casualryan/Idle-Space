export default {
  name: "Singularity Irradiator",
  type: "Weapon",
  weaponType: "Irradiator",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 50, max: 50 },
  bAttackSpeed: { min: 0.75, max: 0.85 },
  damageTypes: {
    radiation: { min: 780, max: 980 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "AI Core Fragment", quantity: 1 }
  ],
  description: "A top-tier baseline irradiator that overwhelms targets with radiation output."
};

