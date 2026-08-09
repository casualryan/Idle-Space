export default {
    name: "Light Armor",
    levelRequirement: 10,
    type: "Armor",
    icon: "icons/light_armor.png",
    damageTypes: {},
    attackSpeed: 0,
    defenseTypes: {
        physicalResistance: { min: 15, max: 20 },
        elementalResistance: { min: 5, max: 10 },
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
    description: 'Flexible armor that provides modest protection without restricting movement.'
};
