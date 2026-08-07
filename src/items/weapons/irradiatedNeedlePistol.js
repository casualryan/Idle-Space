export default {
  name: "Irradiated Needle Pistol",
  type: "Weapon",
  weaponType: "Pistol",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 10, max: 10 },
  bAttackSpeed: { min: 1.4, max: 1.6 },
  precision: { min: 1, max: 3 },
  damageTypes: {
    radiation: { min: 70, max: 95 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A fast pistol firing needle darts saturated with radiation."
};

