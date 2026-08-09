export default {
  name: "Thermal Carbine",
  type: "Weapon",
  weaponType: "Carbine",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 12, max: 12 },
  bAttackSpeed: { min: 1.05, max: 1.15 },
  damageTypes: {
    pyro: { min: 70, max: 95 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A reliable thermal carbine for consistent pyro damage."
};

