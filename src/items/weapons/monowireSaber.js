export default {
  name: "Monowire Saber",
  type: "Weapon",
  weaponType: "Saber",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 25, max: 25 },
  bAttackSpeed: { min: 1.55, max: 1.75 },
  precision: { min: 2, max: 5 },
  damageTypes: {
    slashing: { min: 210, max: 260 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A high-speed monofilament saber with sharp slashing geometry."
};

