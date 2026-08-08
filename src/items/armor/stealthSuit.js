export default {
    name: "Stealth Suit",
    levelRequirement: 15,
    type: "Armor",
    icon: "icons/stealth_armor.png",
    damageTypes: {},
    attackSpeed: 0.1,  // +10% attack speed
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
        elementalResistance: { min: 10, max: 15 },
        chemicalResistance: { min: 5, max: 10 }
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
    description: 'A low-profile combat suit tuned for mobility and electronic concealment.'
};
