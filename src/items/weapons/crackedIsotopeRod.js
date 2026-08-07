export default {
  name: "Cracked Isotope Rod",
  type: "Weapon",
  weaponType: "Rod",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 5, max: 5 },
  bAttackSpeed: { min: 0.95, max: 1.05 },
  damageTypes: {
    radiation: { min: 25, max: 35 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A cracked isotope rod that leaks dangerous radiation."
};

