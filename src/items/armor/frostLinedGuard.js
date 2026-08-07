export default {
  name: "Frost-Lined Guard",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 9, max: 9 },
  energyShieldBonus: { min: 10, max: 30 },
  defenseTypes: { elementalResistance: { min: 2, max: 5 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Wire Bundle", quantity: 1 }]
};

