export default {
    name: "Metal Carapace",
    levelRequirement: 20,
    type: "Armor",
    icon: "icons/heavy_armor.png",
    damageTypes: {},
    attackSpeed: -0.2,  // -20% attack speed (due to weight)
    criticalChance: 0,
    criticalMultiplier: 0,
    defenseTypes: {
        physicalResistance: { min: 20, max: 30 },  // Physical defense
        elementalResistance: { min: 10, max: 10 },   // Elemental defense
        chemicalResistance: { min: 10, max: 10 }    // Chemical defense
    },
    healthBonus: { min: 50, max: 100 },
    healthBonusPercentRange: { min: 15, max: 20 },
    slot: 'chest',
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 3
        },
    ],
    description: 'Heavy plating formed into a durable protective shell.'
};
