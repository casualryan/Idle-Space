export default {
  name: "Ion Shield Node",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 20, max: 20 },
  energyShieldBonus: { min: 55, max: 100 },
  defenseTypes: { elementalResistance: { min: 6, max: 11 } },
  statModifiers: { damageTypes: { electric: { min: 7, max: 12 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Titanium", quantity: 1 }, { name: "Basic Servo", quantity: 1 }]
};

