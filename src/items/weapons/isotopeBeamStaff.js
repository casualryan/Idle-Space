export default {
  name: "Isotope Beam Staff",
  type: "Weapon",
  weaponType: "Staff",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 32, max: 32 },
  bAttackSpeed: { min: 0.95, max: 1.05 },
  damageTypes: {
    radiation: { min: 300, max: 380 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Nanite Cluster", quantity: 1 },
    { name: "Neural Network Module", quantity: 1 }
  ],
  description: "A beam staff etched with isotopes for high-radiation delivery."
};
