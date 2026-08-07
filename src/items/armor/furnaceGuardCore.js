export default {
  name: "Furnace Guard Core",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 38, max: 38 },
  energyShieldBonus: { min: 180, max: 300 },
  defenseTypes: { elementalResistance: { min: 14, max: 21 } },
  statModifiers: { damageTypes: { pyro: { min: 17, max: 26 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium Plating", quantity: 2 }, { name: "Advanced Servo", quantity: 1 }]
};

