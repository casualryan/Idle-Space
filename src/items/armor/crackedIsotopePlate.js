export default {
  name: "Cracked Isotope Plate",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 5, max: 5 },
  energyShieldBonus: { min: 5, max: 15 },
  defenseTypes: { chemicalResistance: { min: 1, max: 3 } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 2 }]
};

