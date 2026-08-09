export default {
  name: "Flame Projector Mk1",
  type: "Weapon",
  weaponType: "Projector",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 20, max: 20 },
  bAttackSpeed: { min: 1.25, max: 1.45 },
  damageTypes: {
    pyro: { min: 140, max: 180 }
  },
  precision: { min: 1, max: 3 },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 1 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A fast flame projector built for close-range pressure."
};

