export default {
  name: "Spark Spitter",
  type: "Weapon",
  weaponType: "Spitter",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 6, max: 6 },
  bAttackSpeed: { min: 1.35, max: 1.55 },
  precision: { min: 0, max: 2 },
  damageTypes: {
    pyro: { min: 30, max: 45 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A fast, low-damage pyro spitter tuned for sustained pressure."
};

