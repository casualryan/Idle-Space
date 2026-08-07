export default {
  name: "Storm Capacitor Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 39, max: 39 },
  energyShieldBonus: { min: 180, max: 330 },
  defenseTypes: { elementalResistance: { min: 14, max: 21 } },
  statModifiers: { damageTypes: { electric: { min: 16, max: 26 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

