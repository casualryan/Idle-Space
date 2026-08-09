export default {
  name: "Furnace Lance",
  type: "Weapon",
  weaponType: "Lance",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 38, max: 38 },
  bAttackSpeed: { min: 0.85, max: 0.95 },
  damageTypes: {
    pyro: { min: 380, max: 500 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A slow furnace lance that favors devastating pyro impacts."
};

