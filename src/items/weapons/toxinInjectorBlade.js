export default {
  name: "Toxin Injector Blade",
  type: "Weapon",
  weaponType: "Blade",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 14, max: 14 },
  bAttackSpeed: { min: 1.35, max: 1.55 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    corrosive: { min: 85, max: 115 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Copper Coil", quantity: 2 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A fast corrosive blade for quick toxin injections."
};

