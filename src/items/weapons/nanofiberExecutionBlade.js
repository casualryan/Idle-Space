export default {
  name: "Nanofiber Execution Blade",
  type: "Weapon",
  weaponType: "Execution Blade",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 47, max: 47 },
  bAttackSpeed: { min: 0.85, max: 0.98 },
  precision: { min: 3, max: 7 },
  damageTypes: {
    slashing: { min: 600, max: 760 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Neural Processor", quantity: 1 }
  ],
  description: "A nanofiber edge designed for controlled, devastating execution strikes."
};

