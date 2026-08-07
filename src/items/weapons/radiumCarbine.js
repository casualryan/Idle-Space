export default {
  name: "Radium Carbine",
  type: "Weapon",
  weaponType: "Carbine",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 24, max: 24 },
  bAttackSpeed: { min: 1.05, max: 1.25 },
  precision: { min: 1, max: 4 },
  damageTypes: {
    radiation: { min: 210, max: 260 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Titanium Plating", quantity: 1 },
    { name: "Basic Sensor Array", quantity: 1 }
  ],
  description: "A mid-tier radium carbine designed for controllable beam shots."
};

