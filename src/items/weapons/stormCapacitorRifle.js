export default {
  name: "Storm Capacitor Rifle",
  type: "Weapon",
  weaponType: "Rifle",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 37, max: 37 },
  bAttackSpeed: { min: 0.95, max: 1.1 },
  damageTypes: {
    electric: { min: 360, max: 460 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Advanced Servo", quantity: 1 }
  ],
  description: "A high-voltage rifle that rewards careful timing."
};

