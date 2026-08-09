export default {
  name: "Static Coil Rod",
  type: "Weapon",
  weaponType: "Rod",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 12, max: 12 },
  bAttackSpeed: { min: 1.0, max: 1.15 },
  precision: { min: 1, max: 3 },
  damageTypes: {
    electric: { min: 75, max: 95 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A stable electric rod with predictable discharge."
};

