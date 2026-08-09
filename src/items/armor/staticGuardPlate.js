export default {
  name: "Static Guard Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 6, max: 6 },
  energyShieldBonus: { min: 10, max: 25 },
  defenseTypes: { elementalResistance: { min: 2, max: 5 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }, { name: "Wire Bundle", quantity: 1 }]
};

