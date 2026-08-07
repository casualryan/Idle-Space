export default {
  name: "Leaking Chem Pistol",
  type: "Weapon",
  weaponType: "Pistol",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 8, max: 8 },
  bAttackSpeed: { min: 1.05, max: 1.25 },
  damageTypes: {
    corrosive: { min: 30, max: 45 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A chemically-leaky pistol firing corrosive shots."
};

