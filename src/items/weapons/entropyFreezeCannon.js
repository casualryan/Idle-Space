export default {
  name: "Entropy Freeze Cannon",
  type: "Weapon",
  weaponType: "Cannon",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 50, max: 50 },
  bAttackSpeed: { min: 0.65, max: 0.8 },
  precision: { min: 2, max: 5 },
  damageTypes: {
    cryo: { min: 700, max: 900 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 2 },
    { name: "Flux Crystal", quantity: 1 }
  ],
  description: "A pinnacle freeze cannon designed to lock targets in place."
};

