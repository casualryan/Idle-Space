export default {
  name: "Scrap Parrying Hook",
  type: "Shield",
  icon: "icons/energy_shield.png",
  slot: "offHand",
  levelRequirement: { min: 3, max: 3 },
  precision: { min: 2, max: 5 },
  statModifiers: { damageTypes: { slashing: { min: 2, max: 4 } } },
  isDisassembleable: true,
  disassembleResults: [{ name: "Scrap Metal", quantity: 1 }]
};

