export default {
  name: "Combustion Rifle",
  type: "Weapon",
  weaponType: "Rifle",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 29, max: 29 },
  bAttackSpeed: { min: 0.98, max: 1.12 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    pyro: { min: 230, max: 300 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Basic Servo", quantity: 1 }
  ],
  description: "A mid-range combustion rifle for dependable pyro output."
};

