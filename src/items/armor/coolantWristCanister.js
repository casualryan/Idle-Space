export default {
  name: "Coolant Wrist Canister",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 3, max: 3 },
  energyShieldBonus: { min: 4, max: 10 },
  defenseTypes: { elementalResistance: { min: 1, max: 2 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 1 }]
};

