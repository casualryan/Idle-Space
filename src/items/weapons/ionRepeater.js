export default {
  name: "Ion Repeater",
  type: "Weapon",
  weaponType: "Repeater",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 19, max: 19 },
  bAttackSpeed: { min: 2.0, max: 2.2 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    electric: { min: 120, max: 150 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A rapid ion repeater with low damage per discharge."
};

