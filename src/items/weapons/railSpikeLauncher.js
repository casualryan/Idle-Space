export default {
  name: "Rail Spike Launcher",
  type: "Weapon",
  weaponType: "Launcher",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 18, max: 18 },
  bAttackSpeed: { min: 0.75, max: 0.9 },
  damageTypes: {
    kinetic: { min: 110, max: 140 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A guided kinetic punch that hurls a spike into armor seams."
};

