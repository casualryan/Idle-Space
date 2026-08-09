export default {
  name: "Molecular Dissolution Rifle",
  type: "Weapon",
  weaponType: "Rifle",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 50, max: 50 },
  bAttackSpeed: { min: 0.75, max: 0.9 },
  damageTypes: {
    corrosive: { min: 720, max: 900 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Flux Crystal", quantity: 1 }
  ],
  description: "A top-tier corrosive rifle built to dissolve targets at close-range stability."
};

