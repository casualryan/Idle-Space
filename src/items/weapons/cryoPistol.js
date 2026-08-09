export default {
  name: "Cryo Pistol",
  type: "Weapon",
  weaponType: "Pistol",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 13, max: 13 },
  bAttackSpeed: { min: 1.35, max: 1.55 },
  damageTypes: {
    cryo: { min: 80, max: 105 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A faster cryo pistol that delivers quick freezes."
};

