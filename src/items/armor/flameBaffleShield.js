export default {
  name: "Flame Baffle Shield",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 18, max: 18 },
  energyShieldBonus: { min: 35, max: 70 },
  defenseTypes: { elementalResistance: { min: 5, max: 9 } },
  statModifiers: { damageTypes: { pyro: { min: 6, max: 11 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Copper Coil", quantity: 1 }]
};

