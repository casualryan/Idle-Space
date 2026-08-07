export default {
  name: "Faulty Shock Baton",
  type: "Weapon",
  weaponType: "Baton",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 2, max: 2 },
  bAttackSpeed: { min: 1.1, max: 1.3 },
  precision: { min: 0, max: 2 },
  damageTypes: {
    electric: { min: 10, max: 15 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A wobbly shock baton that still delivers reliable electric jolts."
};

