export default {
  name: "Dissolver Carbine",
  type: "Weapon",
  weaponType: "Carbine",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 31, max: 31 },
  bAttackSpeed: { min: 0.98, max: 1.12 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    corrosive: { min: 260, max: 330 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Minor Electronic Circuit", quantity: 1 }
  ],
  description: "A mid-high corrosive carbine designed for accurate dissolving."
};

