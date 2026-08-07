export default {
  name: "Gravity Piston Maul",
  type: "Weapon",
  weaponType: "Piston Maul",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 48, max: 48 },
  bAttackSpeed: { min: 0.6, max: 0.72 },
  damageTypes: {
    kinetic: { min: 560, max: 720 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Flux Crystal", quantity: 1 }
  ],
  description: "A gravity-assisted piston maul for top-tier baseline kinetic strikes."
};

